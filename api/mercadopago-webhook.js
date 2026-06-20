// api/mercadopago-webhook.js
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import crypto from 'crypto';

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

    // --- ASSINATURA DE SEGURANÇA (WEBHOOK SIGNATURE VERIFICATION) ---
    const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
    if (webhookSecret) {
      const xSignature = req.headers['x-signature'];
      const xRequestId = req.headers['x-request-id'];

      if (!xSignature || !xRequestId) {
        console.warn('❌ [Assinatura Inválida] Cabeçalhos x-signature ou x-request-id ausentes.');
        return res.status(401).json({ message: 'Não autorizado: Cabeçalhos ausentes.' });
      }

      // Extrair ts e v1 do x-signature (ts=12345678,v1=hash_sha256)
      const parts = String(xSignature).split(',');
      let ts = '';
      let receivedHash = '';
      parts.forEach(part => {
        const [key, value] = part.split('=');
        if (key === 'ts') ts = value;
        if (key === 'v1') receivedHash = value;
      });

      if (!ts || !receivedHash) {
        console.warn('❌ [Assinatura Inválida] Formato de x-signature incorreto.');
        return res.status(401).json({ message: 'Não autorizado: Assinatura malformada.' });
      }

      // Construir o manifesto v2 e gerar o HMAC-SHA256 local
      const manifest = `id:${paymentId};request-id:${xRequestId};ts:${ts};`;
      const hmac = crypto.createHmac('sha256', webhookSecret);
      hmac.update(manifest);
      const generatedHash = hmac.digest('hex');

      if (generatedHash !== receivedHash) {
        console.warn('❌ [Assinatura Inválida] Assinatura do webhook não confere.');
        return res.status(401).json({ message: 'Não autorizado: Assinatura inválida.' });
      }
      
      console.log('✅ [Assinatura Válida] Webhook autenticado com sucesso.');
    } else {
      console.warn('⚠️ [Aviso de Segurança] MERCADO_PAGO_WEBHOOK_SECRET não configurado. Ignorando validação de assinatura em ambiente de teste/dev.');
    }

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
        const orderRef = doc(db, 'orders', orderId);
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
