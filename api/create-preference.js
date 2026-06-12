// api/create-preference.js
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
    const { orderId, items, deliveryFee, customerName } = req.body;
    
    if (!orderId || !items || !Array.isArray(items)) {
      return res.status(400).json({ message: 'Dados do pedido ausentes ou inválidos.' });
    }

    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      return res.status(500).json({ 
        message: 'Token de Acesso do Mercado Pago não configurado no servidor.' 
      });
    }

    // Format items for Mercado Pago format
    const mpItems = items.map(item => ({
      title: item.name,
      quantity: item.quantity,
      unit_price: Number(item.price),
      currency_id: 'BRL',
    }));

    // Append delivery fee as an item if applicable
    if (deliveryFee && Number(deliveryFee) > 0) {
      mpItems.push({
        title: 'Taxa de Entrega',
        quantity: 1,
        unit_price: Number(deliveryFee),
        currency_id: 'BRL',
      });
    }

    // Configure the redirect back URLs
    // Vercel auto-injects VERCEL_URL. If not found, default to app URL
    const host = req.headers.host || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const appUrl = `${protocol}://${host}`;

    const preferenceData = {
      items: mpItems,
      payer: {
        name: customerName || 'Cliente Divino Dog',
      },
      external_reference: orderId,
      back_urls: {
        success: `${appUrl}/`,
        failure: `${appUrl}/`,
        pending: `${appUrl}/`,
      },
      auto_return: 'approved',
      payment_methods: {
        excluded_payment_types: [
          { id: 'ticket' } // Exclude boleto (cash ticket) to ensure quick approvals
        ],
        installments: 12,
      },
    };

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferenceData),
    });

    if (!mpResponse.ok) {
      const errorData = await mpResponse.json();
      console.error('Erro na API do Mercado Pago:', errorData);
      return res.status(mpResponse.status).json({ 
        message: 'Erro ao gerar checkout no Mercado Pago', 
        error: errorData 
      });
    }

    const preference = await mpResponse.json();
    return res.status(200).json({
      id: preference.id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
    });
  } catch (error) {
    console.error('Erro ao processar checkout:', error);
    return res.status(500).json({ 
      message: 'Erro interno no servidor de pagamento', 
      error: error.message 
    });
  }
}
