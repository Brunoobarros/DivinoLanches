// api/mercadopago-webhook.js
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

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
    const { action, data, type } = req.body;
    
    // Mercado Pago webhook sends type = 'payment' and action = 'payment.created' or 'payment.updated'
    // Or topic = 'payment' (legacy IPN notifications)
    const topic = req.query.topic || type;
    const paymentId = data?.id || req.query.id;

    if (topic === 'payment' || action?.startsWith('payment.')) {
      if (!paymentId) {
        return res.status(400).json({ message: 'ID do pagamento ausente' });
      }

      const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
      if (!accessToken) {
        return res.status(500).json({ 
          message: 'Token de Acesso do Mercado Pago não configurado no servidor.' 
        });
      }

      // Fetch payment details from Mercado Pago to verify the status
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!mpResponse.ok) {
        const errData = await mpResponse.json();
        console.error(`Erro ao consultar pagamento ${paymentId} no Mercado Pago:`, errData);
        throw new Error(`Erro ao consultar pagamento: ${mpResponse.statusText}`);
      }

      const paymentInfo = await mpResponse.json();
      const orderId = paymentInfo.external_reference;
      const status = paymentInfo.status;

      console.log(`Webhook MP: ID ${paymentId}, Pedido ${orderId}, Status: ${status}`);

      if (orderId && status === 'approved') {
        await setDoc(orderRef, {
          paid: true,
          confirmed: true
        }, { merge: true });
        console.log(`[SUCESSO] Pedido ${orderId} atualizado para PAGO e CONFIRMADO via Webhook.`);
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Erro ao processar Webhook do Mercado Pago:', error);
    return res.status(500).json({ 
      message: 'Erro interno ao processar Webhook', 
      error: error.message 
    });
  }
}
