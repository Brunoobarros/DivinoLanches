import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// Neighborhood delivery fee mapping matching constants.ts exactly
const NEIGHBORHOODS = [
  { name: 'Centro', fee: 5.00 },
  { name: 'Alvorada', fee: 6.00 },
  { name: 'Novo Horizonte', fee: 7.00 },
  { name: 'Jardim Primavera', fee: 8.00 },
  { name: 'Vila Imperial', fee: 9.00 },
  { name: 'Parque das Nações', fee: 10.00 },
  { name: 'Outros (Consultar taxa)', fee: 12.00 },
];

export async function calculateOrderTotal(cart, orderType, neighborhood) {
  if (!cart) return { subtotal: 0, deliveryFee: 0, grandTotal: 0 };

  // Fetch prices from Firestore in real-time to prevent tampering
  const hotdogsSnap = await getDocs(collection(db, 'menu_hotdogs'));
  const hotdogsMenu = {};
  hotdogsSnap.forEach(doc => {
    hotdogsMenu[doc.id] = doc.data().price;
  });

  const drinksSnap = await getDocs(collection(db, 'menu_drinks'));
  const drinksMenu = {};
  drinksSnap.forEach(doc => {
    const data = doc.data();
    drinksMenu[doc.id] = data.price;
    // Normalizar pelo nome amigável para segurança
    const normName = (data.name || '').toLowerCase().trim();
    if (normName) {
      drinksMenu[normName] = data.price;
    }
  });

  const extrasSnap = await getDocs(collection(db, 'extras_config'));
  const extrasMenu = {};
  extrasSnap.forEach(doc => {
    extrasMenu[doc.id] = doc.data().price;
  });

  // 1. Calcular Hotdogs
  let hotDogsTotal = 0;
  const hotDogsList = cart.hotDogs || [];
  
  for (const dog of hotDogsList) {
    const dogType = dog.type;
    let basePrice = 15.0; // Valor fallback caso não encontre
    
    if (dogType.includes('_')) {
      const parts = dogType.split('_');
      const prices = parts.map(p => hotdogsMenu[p] !== undefined ? hotdogsMenu[p] : 15.0);
      basePrice = Math.max(...prices);
    } else {
      basePrice = hotdogsMenu[dogType] !== undefined ? hotdogsMenu[dogType] : 15.0;
    }

    // Calcular Adicionais (extras)
    let extrasPrice = 0;
    if (dog.extras) {
      Object.entries(dog.extras).forEach(([extraId, active]) => {
        if (active && extrasMenu[extraId] !== undefined) {
          extrasPrice += extrasMenu[extraId];
        }
      });
    }

    hotDogsTotal += (basePrice + extrasPrice) * (dog.quantity || 1);
  }

  // 2. Calcular Bebidas
  let drinksTotal = 0;
  const drinksList = cart.drinks || [];
  for (const drink of drinksList) {
    let price = 0;
    // Tenta encontrar por drinkId, id ou nome amigável normalizado
    const key = drink.drinkId || drink.id || '';
    const nameKey = (drink.name || '').toLowerCase().trim();
    
    if (drinksMenu[key] !== undefined) {
      price = drinksMenu[key];
    } else if (drinksMenu[nameKey] !== undefined) {
      price = drinksMenu[nameKey];
    } else {
      price = Number(drink.price) || 0; // Fallback se não bater dados
    }
    drinksTotal += price * (drink.quantity || 1);
  }

  const subtotal = hotDogsTotal + drinksTotal;

  // 3. Calcular Taxa de Entrega
  let deliveryFee = 0;
  if (orderType === 'entrega' && neighborhood) {
    const found = NEIGHBORHOODS.find(n => n.name.toLowerCase().trim() === neighborhood.toLowerCase().trim());
    deliveryFee = found ? found.fee : 12.00; // Taxa padrão "Outros" como contingência
  }

  const grandTotal = subtotal + deliveryFee;

  return {
    subtotal,
    deliveryFee,
    grandTotal
  };
}
