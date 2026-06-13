// api/create-pix-payment.js
import { calculateOrderTotal } from './utils.js';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const { orderId, cart, orderType, neighborhood, customerName, customerPhone } = req.body;
    
    if (!orderId || !cart) {
      return res.status(400).json({ message: 'Dados do pedido ou carrinho ausentes.' });
    }

    // Recalcular valor no servidor de forma segura
    const { grandTotal } = await calculateOrderTotal(cart, orderType, neighborhood);

    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      return res.status(500).json({ 
        message: 'Token de Acesso do Mercado Pago não configurado no servidor.' 
      });
    }

    // Format safe email for payer (required field for Pix payments)
    const safeEmail = `cliente_${orderId.replace(/[^a-zA-Z0-9]/g, '')}@divinolanches.com.br`;

    const host = req.headers.host || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const appUrl = `${protocol}://${host}`;

    const payload = {
      transaction_amount: Number(grandTotal.toFixed(2)),
      description: `Pedido Divino Lanches ${orderId}`,
      payment_method_id: 'pix',
      payer: {
        email: safeEmail,
        first_name: customerName ? customerName.split(' ')[0] : 'Cliente',
        last_name: customerName && customerName.split(' ').length > 1 ? customerName.split(' ').slice(1).join(' ') : 'Divino',
      },
      external_reference: orderId,
      notification_url: host.includes('localhost') ? undefined : `${appUrl}/api/mercadopago-webhook`,
    };

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': orderId,
      },
      body: JSON.stringify(payload),
    });

    const data = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('Erro na API Mercado Pago Pix:', data);
      return res.status(mpResponse.status).json({ 
        message: 'Erro ao gerar Pix no Mercado Pago', 
        error: data 
      });
    }

    return res.status(200).json({
      paymentId: data.id,
      qrCode: data.point_of_interaction.transaction_data.qr_code,
      qrCodeBase64: data.point_of_interaction.transaction_data.qr_code_base64,
    });
  } catch (error) {
    console.error('Erro ao processar Pix:', error);
    return res.status(500).json({ 
      message: 'Erro interno no servidor de pagamento Pix', 
      error: error.message 
    });
  }
}
