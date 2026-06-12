// api/check-payment.js
export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ message: 'ID do pagamento ausente.' });
  }

  try {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      return res.status(500).json({ 
        message: 'Token de Acesso do Mercado Pago não configurado no servidor.' 
      });
    }

    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const data = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error(`Erro ao consultar pagamento ${id}:`, data);
      return res.status(mpResponse.status).json({ 
        message: 'Erro ao consultar pagamento no Mercado Pago', 
        error: data 
      });
    }

    return res.status(200).json({ status: data.status });
  } catch (error) {
    console.error('Erro ao consultar pagamento:', error);
    return res.status(500).json({ 
      message: 'Erro interno ao consultar pagamento', 
      error: error.message 
    });
  }
}
