// api/process-card-payment.js
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
    const { cardFormData, orderId, customerName } = req.body;

    if (!cardFormData || !orderId) {
      return res.status(400).json({ message: 'Dados do pagamento ou ID do pedido ausentes.' });
    }

    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      return res.status(500).json({ 
        message: 'Token de Acesso do Mercado Pago não configurado no servidor.' 
      });
    }

    // Prepare payment payload for Mercado Pago
    const payload = {
      token: cardFormData.token,
      issuer_id: cardFormData.issuer_id,
      payment_method_id: cardFormData.payment_method_id,
      transaction_amount: Number(cardFormData.transaction_amount),
      installments: Number(cardFormData.installments),
      description: `Pedido Divino Lanches ${orderId}`,
      payer: {
        email: cardFormData.payer.email,
        identification: cardFormData.payer.identification,
        first_name: customerName ? customerName.split(' ')[0] : 'Cliente',
        last_name: customerName && customerName.split(' ').length > 1 ? customerName.split(' ').slice(1).join(' ') : 'Divino',
      },
      external_reference: orderId,
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
      console.error('Erro na API Mercado Pago Card:', data);
      return res.status(mpResponse.status).json({ 
        message: 'Erro ao processar pagamento com cartão no Mercado Pago', 
        error: data 
      });
    }

    // Return status of the payment
    return res.status(200).json({
      status: data.status,
      statusDetail: data.status_detail,
      paymentId: data.id
    });
  } catch (error) {
    console.error('Erro ao processar pagamento com cartão:', error);
    return res.status(500).json({ 
      message: 'Erro interno no servidor de pagamento com cartão', 
      error: error.message 
    });
  }
}
