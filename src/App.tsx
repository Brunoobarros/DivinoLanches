import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import HotDogCustomizer from './components/HotDogCustomizer';
import AdminPanel from './components/AdminPanel';
import OrderSummaryAndCheckout from './components/OrderSummaryAndCheckout';
import { 
  Cart, 
  HotDogItem, 
  DrinkCartItem, 
  MenuItem,
  SavedOrder,
  BasicIngredientConfig,
  ExtraConfig
} from './types';
import { PROTEIN_LABELS, WHATSAPP_NUMBER } from './constants';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Crown, 
  Bike, 
  ShoppingBag, 
  UtensilsCrossed, 
  Shield, 
  ShoppingCart, 
  Store, 
  Flame, 
  Sparkles,
  Info
} from 'lucide-react';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  getDoc, 
  writeBatch,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

const LOCAL_STORAGE_KEY = 'divino_lanches_cart';

export default function App() {
  // Navigation tabs state: 'montar' | 'admin' | 'carrinho'
  const [activeTab, setActiveTab] = useState<'montar' | 'admin' | 'carrinho'>('montar');

  // Dynamic cardápio (menu) state with local defaults/fallbacks
  const [hotDogsMenu, setHotDogsMenu] = useState<MenuItem[]>([
    { id: 'boi', name: 'Salsicha de Boi', price: 15.0, description: 'Salsicha tradicional bovina grelhada.' },
    { id: 'frango', name: 'Frango Desfiado', price: 16.0, description: 'Frango desfiado cremoso e temperado.' },
    { id: 'calabresa', name: 'Calabresa Defumada', price: 16.0, description: 'Calabresa grelhada com cebola na chapa.' }
  ]);
  const [drinksMenu, setDrinksMenu] = useState<MenuItem[]>([
    { id: 'coca_lata', name: 'Coca-Cola (Lata)', price: 6.00, description: 'Lata de 350ml bem gelada' },
    { id: 'guarana_lata', name: 'Guaraná Antarctica (Lata)', price: 5.50, description: 'Lata de 350ml bem gelada' },
    { id: 'fanta_lata', name: 'Fanta Laranja (Lata)', price: 5.50, description: 'Lata de 350ml bem gelada' },
    { id: 'suco_laranja', name: 'Suco de Laranja (300ml)', price: 8.00, description: 'Suco natural e refrescante' },
    { id: 'agua', name: 'Água Mineral Sem Gás (500ml)', price: 4.00, description: 'Água mineral fresca' }
  ]);
  const [basicIngredients, setBasicIngredients] = useState<BasicIngredientConfig[]>([
    { id: 'milhoErvilha', name: 'Milho & Ervilha Dupla', description: 'Docinho e crocante' },
    { id: 'vinagrete', name: 'Vinagrete Picadinho', description: 'Tomate fresco e cebola' },
    { id: 'cenoura', name: 'Cenoura Raladinha', description: 'Fina e nutritiva' },
    { id: 'batataPalha', name: 'Batata Palha Crocante', description: 'Sempre fresquinha' }
  ]);
  const [extrasConfig, setExtrasConfig] = useState<ExtraConfig[]>([
    { id: 'queijo', name: 'Queijo Muçarela', price: 3.00, description: 'Derretido na chapa' },
    { id: 'molhoEspecial', name: 'Molho Especial', price: 1.50, description: 'Receita secreta da casa' },
    { id: 'molhoVerde', name: 'Molho Verde', price: 1.50, description: 'Sabor marcante' },
    { id: 'molhoBarbecue', name: 'Molho Barbecue', price: 1.50, description: 'Defumado e adocicado' }
  ]);
  const [disabledItems, setDisabledItems] = useState<string[]>([]);
  const [orders, setOrders] = useState<SavedOrder[]>([]);

  // Check and Initialize Default Data on Firebase
  useEffect(() => {
    const checkAndInitialize = async () => {
      try {
        const statusDocRef = doc(db, 'config', 'status');
        const statusSnap = await getDoc(statusDocRef);
        if (!statusSnap.exists() || !statusSnap.data()?.initialized) {
          const batch = writeBatch(db);
          
          // status
          batch.set(statusDocRef, { initialized: true });
          
          // default hotdogs
          const defaultHotdogs = [
            { id: 'boi', name: 'Salsicha de Boi', price: 15.0, description: 'Salsicha tradicional bovina grelhada.' },
            { id: 'frango', name: 'Frango Desfiado', price: 16.0, description: 'Frango desfiado cremoso e temperado.' },
            { id: 'calabresa', name: 'Calabresa Defumada', price: 16.0, description: 'Calabresa grelhada com cebola na chapa.' }
          ];
          defaultHotdogs.forEach(item => {
            batch.set(doc(db, 'menu_hotdogs', item.id), { name: item.name, price: item.price, description: item.description });
          });
          
          // default drinks
          const defaultDrinks = [
            { id: 'coca_lata', name: 'Coca-Cola (Lata)', price: 6.00, description: 'Lata de 350ml bem gelada' },
            { id: 'guarana_lata', name: 'Guaraná Antarctica (Lata)', price: 5.50, description: 'Lata de 350ml bem gelada' },
            { id: 'fanta_lata', name: 'Fanta Laranja (Lata)', price: 5.50, description: 'Lata de 350ml bem gelada' },
            { id: 'suco_laranja', name: 'Suco de Laranja (300ml)', price: 8.00, description: 'Suco natural e refrescante' },
            { id: 'agua', name: 'Água Mineral Sem Gás (500ml)', price: 4.00, description: 'Água mineral fresca' }
          ];
          defaultDrinks.forEach(item => {
            batch.set(doc(db, 'menu_drinks', item.id), { name: item.name, price: item.price, description: item.description });
          });
          
          // default basic ingredients
          const defaultBasic = [
            { id: 'milhoErvilha', name: 'Milho & Ervilha Dupla', description: 'Docinho e crocante' },
            { id: 'vinagrete', name: 'Vinagrete Picadinho', description: 'Tomate fresco e cebola' },
            { id: 'cenoura', name: 'Cenoura Raladinha', description: 'Fina e nutritiva' },
            { id: 'batataPalha', name: 'Batata Palha Crocante', description: 'Sempre fresquinha' }
          ];
          defaultBasic.forEach(item => {
            batch.set(doc(db, 'basic_ingredients', item.id), { name: item.name, description: item.description });
          });
          
          // default extras
          const defaultExtras = [
            { id: 'queijo', name: 'Queijo Muçarela', price: 3.00, description: 'Derretido na chapa' },
            { id: 'molhoEspecial', name: 'Molho Especial', price: 1.50, description: 'Receita secreta da casa' },
            { id: 'molhoVerde', name: 'Molho Verde', price: 1.50, description: 'Sabor marcante' },
            { id: 'molhoBarbecue', name: 'Molho Barbecue', price: 1.50, description: 'Defumado e adocicado' }
          ];
          defaultExtras.forEach(item => {
            batch.set(doc(db, 'extras_config', item.id), { name: item.name, price: item.price, description: item.description });
          });
          
          // default disabled items
          batch.set(doc(db, 'config', 'disabled_items'), { items: [] });
          
          await batch.commit();
          console.log('Firebase initialized with default data.');
        }
      } catch (e) {
        console.error('Error checking or initializing Firebase data', e);
      }
    };
    checkAndInitialize();
  }, []);

  // Subscribe to real-time updates from Firestore
  useEffect(() => {
    const unsubHotdogs = onSnapshot(collection(db, 'menu_hotdogs'), (snapshot) => {
      const items: MenuItem[] = [];
      snapshot.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() } as MenuItem);
      });
      const orderMap = { boi: 1, frango: 2, calabresa: 3 };
      items.sort((a, b) => (orderMap[a.id as keyof typeof orderMap] || 99) - (orderMap[b.id as keyof typeof orderMap] || 99));
      if (items.length > 0) setHotDogsMenu(items);
    });

    const unsubDrinks = onSnapshot(collection(db, 'menu_drinks'), (snapshot) => {
      const items: MenuItem[] = [];
      snapshot.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() } as MenuItem);
      });
      const orderMap = { coca_lata: 1, guarana_lata: 2, fanta_lata: 3, suco_laranja: 4, agua: 5 };
      items.sort((a, b) => (orderMap[a.id as keyof typeof orderMap] || 99) - (orderMap[b.id as keyof typeof orderMap] || 99));
      if (items.length > 0) setDrinksMenu(items);
    });

    const unsubBasic = onSnapshot(collection(db, 'basic_ingredients'), (snapshot) => {
      const items: BasicIngredientConfig[] = [];
      snapshot.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() } as BasicIngredientConfig);
      });
      const orderMap = { milhoErvilha: 1, vinagrete: 2, cenoura: 3, batataPalha: 4 };
      items.sort((a, b) => (orderMap[a.id as keyof typeof orderMap] || 99) - (orderMap[b.id as keyof typeof orderMap] || 99));
      if (items.length > 0) setBasicIngredients(items);
    });

    const unsubExtras = onSnapshot(collection(db, 'extras_config'), (snapshot) => {
      const items: ExtraConfig[] = [];
      snapshot.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() } as ExtraConfig);
      });
      const orderMap = { queijo: 1, molhoEspecial: 2, molhoVerde: 3, molhoBarbecue: 4 };
      items.sort((a, b) => (orderMap[a.id as keyof typeof orderMap] || 99) - (orderMap[b.id as keyof typeof orderMap] || 99));
      if (items.length > 0) setExtrasConfig(items);
    });

    const unsubDisabled = onSnapshot(doc(db, 'config', 'disabled_items'), (docSnap) => {
      if (docSnap.exists()) {
        setDisabledItems(docSnap.data().items || []);
      }
    });

    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const items: SavedOrder[] = [];
      snapshot.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() } as SavedOrder);
      });
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setOrders(items);
    });

    return () => {
      unsubHotdogs();
      unsubDrinks();
      unsubBasic();
      unsubExtras();
      unsubDisabled();
      unsubOrders();
    };
  }, []);

  const handleUpdateHotDogsMenu = async (newMenu: MenuItem[]) => {
    try {
      const batch = writeBatch(db);
      newMenu.forEach(item => {
        batch.set(doc(db, 'menu_hotdogs', item.id), {
          name: item.name,
          price: item.price,
          description: item.description
        });
      });
      await batch.commit();
    } catch (e) {
      console.error('Erro ao atualizar cardápio de hotdogs', e);
    }
  };

  const handleUpdateDrinksMenu = async (newMenu: MenuItem[]) => {
    try {
      const batch = writeBatch(db);
      newMenu.forEach(item => {
        batch.set(doc(db, 'menu_drinks', item.id), {
          name: item.name,
          price: item.price,
          description: item.description
        });
      });
      await batch.commit();
    } catch (e) {
      console.error('Erro ao atualizar cardápio de bebidas', e);
    }
  };

  const handleUpdateBasicIngredients = async (newBasic: BasicIngredientConfig[]) => {
    try {
      const batch = writeBatch(db);
      newBasic.forEach(item => {
        batch.set(doc(db, 'basic_ingredients', item.id), {
          name: item.name,
          description: item.description
        });
      });
      await batch.commit();
    } catch (e) {
      console.error('Erro ao atualizar ingredientes básicos', e);
    }
  };

  const handleUpdateExtrasConfig = async (newExtras: ExtraConfig[]) => {
    try {
      const batch = writeBatch(db);
      newExtras.forEach(item => {
        batch.set(doc(db, 'extras_config', item.id), {
          name: item.name,
          price: item.price,
          description: item.description
        });
      });
      await batch.commit();
    } catch (e) {
      console.error('Erro ao atualizar adicionais/extras', e);
    }
  };

  // Dynamic labels mapping for components
  const dynamicProteinLabels: Record<string, string> = {
    boi: hotDogsMenu.find(h => h.id === 'boi')?.name || 'Salsicha de Boi',
    frango: hotDogsMenu.find(h => h.id === 'frango')?.name || 'Frango Desfiado',
    calabresa: hotDogsMenu.find(h => h.id === 'calabresa')?.name || 'Calabresa Defumada',
    boi_frango: `Misto (${hotDogsMenu.find(h => h.id === 'boi')?.name || 'Boi'} & ${hotDogsMenu.find(h => h.id === 'frango')?.name || 'Frango'})`,
    boi_calabresa: `Misto (${hotDogsMenu.find(h => h.id === 'boi')?.name || 'Boi'} & ${hotDogsMenu.find(h => h.id === 'calabresa')?.name || 'Calabresa'})`,
    frango_calabresa: `Misto (${hotDogsMenu.find(h => h.id === 'frango')?.name || 'Frango'} & ${hotDogsMenu.find(h => h.id === 'calabresa')?.name || 'Calabresa'})`,
  };

  const [forceSuccessOrderId, setForceSuccessOrderId] = useState<string | null>(null);

  // Handle Mercado Pago Redirect return (approved payment)
  useEffect(() => {
    const handleRedirectReturn = async () => {
      const params = new URLSearchParams(window.location.search);
      const paymentStatus = params.get('status') || params.get('collection_status');
      const orderId = params.get('external_reference');

      if (paymentStatus === 'approved' && orderId) {
        try {
          const orderRef = doc(db, 'orders', orderId);
          const orderSnap = await getDoc(orderRef);

          if (orderSnap.exists()) {
            const orderData = { id: orderSnap.id, ...orderSnap.data() } as SavedOrder;

            // Only trigger if it wasn't already marked as paid
            if (!orderData.paid) {
              // 1. Update Firestore status to paid and confirmed
              await updateDoc(orderRef, { paid: true, confirmed: true });
              
              // 2. Clear cart locally
              setCart({ hotDogs: [], drinks: [] });

              // 3. Set state to force success screen inside the Carrinho/Checkout Tab
              setForceSuccessOrderId(orderId);
              setActiveTab('carrinho');

              // 4. Compile the paid message and open WhatsApp
              const compileMessage = () => {
                let text = `✨ *NOVO PEDIDO - ${orderData.id}* ✨\n`;
                text += `🕒 Feito em: ${new Date(orderData.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n`;
                text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
                text += `👤 *Cliente:* ${orderData.customerName}\n`;
                text += `📞 *WhatsApp:* ${orderData.customerPhone}\n`;
                text += `🛵 *Tipo:* ${orderData.orderType === 'entrega' ? 'Entrega em Casa' : 'Vou retirar na lanchonete'}\n\n`;

                if (orderData.orderType === 'entrega') {
                  text += `📍 *Endereço de Entrega:*\n`;
                  text += `  • Rua: ${orderData.street}, Nº ${orderData.num}\n`;
                  text += `  • Bairro: ${orderData.neighborhood}\n`;
                  if (orderData.reference) text += `  • Ref: ${orderData.reference}\n`;
                  text += `\n`;
                }

                text += `🛒 *Itens do Pedido:*\n`;
                
                orderData.hotDogs.forEach((dog) => {
                  text += `• *${dog.quantity}x Dog de ${dynamicProteinLabels[dog.type] || dog.type}* - R$ ${(dog.price * dog.quantity).toFixed(2)}\n`;
                  text += `  _Detalhe: ${dog.details}_\n\n`;
                });

                orderData.drinks.forEach((drink) => {
                  text += `• *${drink.quantity}x ${drink.name}* - R$ ${(drink.price * drink.quantity).toFixed(2)}\n\n`;
                });

                text += `━━━━━━━━━━━━━━━━━━━━━\n`;
                text += `💵 *Subtotal:* R$ ${orderData.subtotal.toFixed(2)}\n`;
                if (orderData.orderType === 'entrega') {
                  text += `🛵 *Taxa de Entrega:* R$ ${orderData.deliveryFee.toFixed(2)}\n`;
                }
                text += `💰 *TOTAL GERAL:* R$ ${orderData.grandTotal.toFixed(2)}\n`;
                text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

                const payLabels = {
                  pix: 'Pix ⚡ (PAGO ONLINE)',
                  cartao_credito: 'Cartão de Crédito 💳 (PAGO ONLINE)',
                  cartao_debito: 'Cartão de Débito 💳 (PAGO ONLINE)',
                  dinheiro: 'Dinheiro 💵',
                };
                text += `💳 *Forma de Pagamento:* ${payLabels[orderData.paymentMethod as keyof typeof payLabels] || orderData.paymentMethod}\n`;
                return text.trim();
              };

              const whatsappMessage = compileMessage();
              const encoded = encodeURIComponent(whatsappMessage);
              const whatsappUrl = `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${encoded}`;
              
              // Open WhatsApp redirection
              const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
              if (isMobile) {
                window.location.href = whatsappUrl;
              } else {
                window.open(whatsappUrl, '_blank');
              }
            }
          }
        } catch (e) {
          console.error("Erro ao tratar retorno de pagamento:", e);
        } finally {
          // Remove parameters from URL so that reloading the page doesn't run this logic again
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }
      }
    };

    handleRedirectReturn();
  }, [orders, dynamicProteinLabels]);

  // Check if admin mode is active (either in query parameter or saved in sessionStorage)
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('admin') === 'true';
    } catch (e) {
      return false;
    }
  });

  // Escuta o login do Firebase Auth para ativar o admin mode e persistir de forma reativa
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsUserLoggedIn(true);
        setIsAdminMode(true);
      } else {
        setIsUserLoggedIn(false);
        const params = new URLSearchParams(window.location.search);
        if (params.get('admin') !== 'true') {
          setIsAdminMode(false);
          setActiveTab((current) => (current === 'admin' ? 'montar' : current));
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Estados para notificação de novos pedidos do administrador
  const [showAdminToast, setShowAdminToast] = useState(false);
  const [latestOrderId, setLatestOrderId] = useState('');
  const prevPendingCountRef = useRef<number | null>(null);

  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      gain1.gain.setValueAtTime(0, audioCtx.currentTime);
      gain1.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      osc1.start(audioCtx.currentTime);
      osc1.stop(audioCtx.currentTime + 0.4);
      
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1);
      gain2.gain.setValueAtTime(0, audioCtx.currentTime + 0.1);
      gain2.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      osc2.start(audioCtx.currentTime + 0.1);
      osc2.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.warn('Erro ao tocar som de notificação:', e);
    }
  };

  useEffect(() => {
    if (!isUserLoggedIn) {
      prevPendingCountRef.current = null;
      return;
    }

    const pendingOrders = orders.filter((o) => !o.confirmed);
    const pendingCount = pendingOrders.length;

    if (prevPendingCountRef.current !== null && pendingCount > prevPendingCountRef.current) {
      playNotificationSound();
      
      if (pendingOrders.length > 0) {
        const sorted = [...pendingOrders].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setLatestOrderId(sorted[0].id);
        setShowAdminToast(true);
      }
    }

    prevPendingCountRef.current = pendingCount;
  }, [orders, isUserLoggedIn]);

  // Auto-dispensa do toast de notificação do admin após 6 segundos
  useEffect(() => {
    if (showAdminToast) {
      const timer = setTimeout(() => {
        setShowAdminToast(false);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [showAdminToast]);

  const handleToggleDisabledItem = async (itemKey: string) => {
    try {
      const updated = disabledItems.includes(itemKey)
        ? disabledItems.filter((k) => k !== itemKey)
        : [...disabledItems, itemKey];
      await setDoc(doc(db, 'config', 'disabled_items'), { items: updated });
    } catch (e) {
      console.error('Erro ao alternar disponibilidade do item', e);
    }
  };

  // Order Handlers
  const handleConfirmOrder = async (orderId: string) => {
    await updateDoc(doc(db, 'orders', orderId), { confirmed: true, paid: true });
  };

  const handleUnconfirmOrder = async (orderId: string) => {
    await updateDoc(doc(db, 'orders', orderId), { confirmed: false, delivered: false, paid: false });
  };

  const handleMarkAsDelivered = async (orderId: string) => {
    await updateDoc(doc(db, 'orders', orderId), { delivered: true });
  };

  const handleDeleteOrder = async (orderId: string) => {
    await deleteDoc(doc(db, 'orders', orderId));
  };

  const handleClearAllOrders = async () => {
    const batch = writeBatch(db);
    orders.forEach(o => {
      batch.delete(doc(db, 'orders', o.id));
    });
    await batch.commit();
  };

  // Master Cart State
  const [cart, setCart] = useState<Cart>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Erro ao recuperar carrinho', e);
    }
    return { hotDogs: [], drinks: [] };
  });

  // Synch Cart with localStorage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  // Handler: Add customized hot dog
  const handleAddHotDog = (newDog: Omit<HotDogItem, 'id'>) => {
    setCart((prev) => {
      // Find exact same configuration to compress quantity, or insert as new
      const matchIdx = prev.hotDogs.findIndex(
        (dog) =>
          dog.type === newDog.type &&
          JSON.stringify(dog.baseToppings) === JSON.stringify(newDog.baseToppings) &&
          JSON.stringify(dog.extras) === JSON.stringify(newDog.extras) &&
          dog.notes === newDog.notes
      );

      if (matchIdx !== -1) {
        const updated = [...prev.hotDogs];
        updated[matchIdx].quantity += newDog.quantity;
        return { ...prev, hotDogs: updated };
      } else {
        const uniqueId = `dog_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        return {
          ...prev,
          hotDogs: [...prev.hotDogs, { ...newDog, id: uniqueId }],
        };
      }
    });
  };

  // Handler: Remove customized hot dog completely
  const handleRemoveHotDog = (id: string) => {
    setCart((prev) => ({
      ...prev,
      hotDogs: prev.hotDogs.filter((dog) => dog.id !== id),
    }));
  };

  // Handler: Update hot dog quantity
  const handleUpdateHotDogQty = (id: string, delta: number) => {
    setCart((prev) => {
      const updated = prev.hotDogs
        .map((dog) => {
          if (dog.id === id) {
            return { ...dog, quantity: Math.max(1, dog.quantity + delta) };
          }
          return dog;
        })
        .filter((dog) => dog.quantity > 0);
      return { ...prev, hotDogs: updated };
    });
  };

  // Handler: Update drink quantity (handles adding or adjusting)
  const handleUpdateDrinkQty = (drinkId: string, delta: number) => {
    setCart((prev) => {
      const existingIdx = prev.drinks.findIndex((d) => d.drinkId === drinkId);
      const drinkInfo = drinksMenu.find((d) => d.id === drinkId);

      if (!drinkInfo) return prev;

      if (existingIdx !== -1) {
        const updated = [...prev.drinks];
        const newQty = updated[existingIdx].quantity + delta;
        if (newQty <= 0) {
          updated.splice(existingIdx, 1);
        } else {
          updated[existingIdx].quantity = newQty;
        }
        return { ...prev, drinks: updated };
      } else if (delta > 0) {
        const newCartItem: DrinkCartItem = {
          id: `drink_${Date.now()}`,
          drinkId,
          name: drinkInfo.name,
          price: drinkInfo.price,
          quantity: delta,
        };
        return {
          ...prev,
          drinks: [...prev.drinks, newCartItem],
        };
      }
      return prev;
    });
  };

  // Handler: Clear entire cart
  const handleClearCart = () => {
    setCart({ hotDogs: [], drinks: [] });
  };

  // Helper selectors
  const getCartItemsCount = (): number => {
    const hotDogsQty = cart.hotDogs.reduce((sum, item) => sum + item.quantity, 0);
    const drinksQty = cart.drinks.reduce((sum, item) => sum + item.quantity, 0);
    return hotDogsQty + drinksQty;
  };

  const getSubtotalValue = (): number => {
    const hotDogsTotal = cart.hotDogs.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const drinksTotal = cart.drinks.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return hotDogsTotal + drinksTotal;
  };

  const cartCount = getCartItemsCount();
  const subtotal = getSubtotalValue();

  return (
    <div className={`min-h-screen bg-linear-to-b from-stone-50 to-stone-100/90 text-slate-800 flex flex-col font-sans selection:bg-red-500 selection:text-white md:pb-8 ${isAdminMode ? 'pb-24' : 'pb-8'}`}>
      
      {/* 1. Header Banner */}
      <Header 
        isAdminMode={isAdminMode} 
        activeTab={activeTab} 
        onNavigateToAdmin={() => setActiveTab('admin')} 
      />

      {/* 3. Main Body Container */}
      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full">
        
        {/* DISTRIBUTE LAYOUT: Responsive view panels based on Bottom Menu selection */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Work Area (Switches tabs dynamically on mobile, also customizable) */}
          <div className="col-span-1 lg:col-span-8">
            <div className="md:hidden">
              {/* Render only selected tab on small devices */}
              <AnimatePresence mode="wait">
                {activeTab === 'montar' && (
                  <motion.div
                    key="montar"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="p-0.5"
                  >
                    <HotDogCustomizer 
                      onAddHotDog={handleAddHotDog} 
                      onNavigateToCart={() => setActiveTab('carrinho')}
                      onUpdateDrinkQty={handleUpdateDrinkQty}
                      disabledItems={disabledItems}
                      hotDogsMenu={hotDogsMenu}
                      drinksMenu={drinksMenu}
                    />
                  </motion.div>
                )}

                {activeTab === 'admin' && (
                  <motion.div
                    key="admin"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="p-0.5"
                  >
                    <AdminPanel 
                      onClose={() => setActiveTab('montar')} 
                      disabledItems={disabledItems}
                      onToggleDisabledItem={handleToggleDisabledItem}
                      onLoginSuccess={() => setIsAdminMode(true)}
                      onLogout={() => setIsAdminMode(false)}
                      hotDogsMenu={hotDogsMenu}
                      drinksMenu={drinksMenu}
                      onUpdateHotDogsMenu={handleUpdateHotDogsMenu}
                      onUpdateDrinksMenu={handleUpdateDrinksMenu}
                      basicIngredients={basicIngredients}
                      extrasConfig={extrasConfig}
                      onUpdateBasicIngredients={handleUpdateBasicIngredients}
                      onUpdateExtrasConfig={handleUpdateExtrasConfig}
                      orders={orders}
                      onConfirmOrder={handleConfirmOrder}
                      onUnconfirmOrder={handleUnconfirmOrder}
                      onMarkAsDelivered={handleMarkAsDelivered}
                      onDeleteOrder={handleDeleteOrder}
                      onClearAllOrders={handleClearAllOrders}
                    />
                  </motion.div>
                )}

                {activeTab === 'carrinho' && (
                  <motion.div
                    key="carrinho"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="p-0.5"
                  >
                    <OrderSummaryAndCheckout
                      cart={cart}
                      onRemoveHotDog={handleRemoveHotDog}
                      onUpdateHotDogQty={handleUpdateHotDogQty}
                      onUpdateDrinkQty={handleUpdateDrinkQty}
                      onClearCart={handleClearCart}
                      onNavigateToMenu={() => setActiveTab('montar')}
                      proteinLabels={dynamicProteinLabels}
                      forceSuccessOrderId={forceSuccessOrderId}
                      onClearForceSuccess={() => setForceSuccessOrderId(null)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Desktop View: Show customizer & drinks logically or categorized */}
            <div className="hidden md:flex flex-col gap-6">
              {/* Desktop Workspace Navigation Tabs */}
              <div className="bg-white p-2.5 rounded-2xl border border-stone-200 shadow-2xs flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('montar')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'montar'
                        ? 'bg-brand-charcoal text-white shadow-xs'
                        : 'bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    1. Customizar Dogão
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('carrinho')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'carrinho'
                        ? 'bg-brand-charcoal text-white shadow-xs'
                        : 'bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    2. Carrinho & Checkout
                  </button>
                  {isAdminMode && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('admin')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeTab === 'admin'
                          ? 'bg-brand-charcoal text-white shadow-xs'
                          : 'bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      🔐 Painel Admin
                    </button>
                  )}
                </div>
                <div className="text-[10px] bg-slate-50 text-slate-600 border border-slate-100 px-3 py-1.5 rounded-lg font-mono font-bold">
                  Total Carrinho: R$ {subtotal.toFixed(2)}
                </div>
              </div>
              
              {activeTab === 'montar' && (
                <HotDogCustomizer 
                  onAddHotDog={handleAddHotDog} 
                  onNavigateToCart={() => setActiveTab('carrinho')}
                  onUpdateDrinkQty={handleUpdateDrinkQty}
                  disabledItems={disabledItems}
                  hotDogsMenu={hotDogsMenu}
                  drinksMenu={drinksMenu}
                />
              )}
              {activeTab === 'admin' && (
                <AdminPanel 
                  onClose={() => setActiveTab('montar')} 
                  disabledItems={disabledItems}
                  onToggleDisabledItem={handleToggleDisabledItem}
                  onLoginSuccess={() => setIsAdminMode(true)}
                  onLogout={() => setIsAdminMode(false)}
                  hotDogsMenu={hotDogsMenu}
                  drinksMenu={drinksMenu}
                  onUpdateHotDogsMenu={handleUpdateHotDogsMenu}
                  onUpdateDrinksMenu={handleUpdateDrinksMenu}
                  basicIngredients={basicIngredients}
                  extrasConfig={extrasConfig}
                  onUpdateBasicIngredients={handleUpdateBasicIngredients}
                  onUpdateExtrasConfig={handleUpdateExtrasConfig}
                  orders={orders}
                  onConfirmOrder={handleConfirmOrder}
                  onUnconfirmOrder={handleUnconfirmOrder}
                  onMarkAsDelivered={handleMarkAsDelivered}
                  onDeleteOrder={handleDeleteOrder}
                  onClearAllOrders={handleClearAllOrders}
                />
              )}
              {activeTab === 'carrinho' && (
                <OrderSummaryAndCheckout
                  cart={cart}
                  onRemoveHotDog={handleRemoveHotDog}
                  onUpdateHotDogQty={handleUpdateHotDogQty}
                  onUpdateDrinkQty={handleUpdateDrinkQty}
                  onClearCart={handleClearCart}
                  onNavigateToMenu={() => setActiveTab('montar')}
                  proteinLabels={dynamicProteinLabels}
                  forceSuccessOrderId={forceSuccessOrderId}
                  onClearForceSuccess={() => setForceSuccessOrderId(null)}
                />
              )}
            </div>
          </div>

          {/* Desktop Right Sidebar containing Cart Review for convenience */}
          <div className="hidden lg:block lg:col-span-4 lg:sticky lg:top-4 m-0.5">
            <div className="bg-white rounded-3xl p-5 border border-slate-200/60 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4 text-red-500" />
                  Resumo Rápido
                </h3>
                {cartCount > 0 && (
                  <span className="bg-red-150 text-red-650 text-[10px] font-black px-2 py-0.5 rounded-full">
                    {cartCount} {cartCount === 1 ? 'item' : 'itens'}
                  </span>
                )}
              </div>

              {cartCount === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  <p className="text-xs font-bold">Nenhum item adicionado ainda.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Monte seu dogão de frango ou boi para iniciar.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {cart.hotDogs.map((d) => (
                    <div key={d.id} className="text-xs pb-2 border-b border-dashed border-stone-100 flex items-center justify-between gap-1">
                      <div>
                        <p className="font-black text-slate-800">
                          {d.quantity}x Dog de {dynamicProteinLabels[d.type] || d.type}
                        </p>
                        <p className="text-[10px] text-slate-400 line-clamp-1">{d.notes || 'Sem observações'}</p>
                      </div>
                      <span className="font-mono font-bold text-slate-700 shrink-0">R$ {(d.price * d.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  {cart.drinks.map((dr) => (
                    <div key={dr.id} className="text-xs pb-2 border-b border-dashed border-stone-100 flex items-center justify-between gap-1">
                      <p className="font-black text-slate-700">{dr.quantity}x {dr.name}</p>
                      <span className="font-mono font-bold text-slate-700 shrink-0">R$ {(dr.price * dr.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs font-bold text-slate-500">Parcial:</span>
                    <span className="font-bold font-mono text-red-650">R$ {subtotal.toFixed(2)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('carrinho')}
                    className="w-full mt-3 bg-brand-red hover:bg-brand-red-dark text-white text-xs font-black py-2.5 rounded-xl text-center shadow-xs transition-colors cursor-pointer"
                  >
                    Revisar & Finalizar Pedido
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* 4. Footer Padding */}
      <div className="py-4 text-center text-[11px] text-slate-400">
        👑 Divino Lanches • Todos os direitos reservados
      </div>

      {/* 5. FLOATING MOBILE/DESKTOP BOTTOM TAB MENU (Fixed structure) */}
      {isAdminMode && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] z-50 py-2.5 px-4">
          <div className="max-w-md mx-auto flex items-center justify-around">
            
            {/* TAB 1: MONTAR DOGÃO */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('montar');
                // Auto scroll to customizer if wanted
                document.getElementById('builder-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`flex flex-col items-center justify-center transition-all cursor-pointer relative py-1 px-3 rounded-2xl ${
                activeTab === 'montar'
                  ? 'text-brand-red font-bold scale-105'
                  : 'text-slate-400 hover:text-slate-650'
              }`}
            >
              {activeTab === 'montar' && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-brand-red/10 rounded-2xl -z-10"
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                />
              )}
              <UtensilsCrossed className="w-5.5 h-5.5 mb-1" />
              <span className="text-[10px] md:text-xs font-display">1. Montar </span>
            </button>

            {/* TAB 3: CARRINHO & CHECKOUT */}
            <button
              type="button"
              onClick={() => setActiveTab('carrinho')}
              className={`flex flex-col items-center justify-center transition-all cursor-pointer relative py-1 px-3 rounded-2xl ${
                activeTab === 'carrinho'
                  ? 'text-brand-red font-bold scale-105'
                  : 'text-slate-400 hover:text-slate-650'
              }`}
            >
              {activeTab === 'carrinho' && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-brand-red/10 rounded-2xl -z-10"
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                />
              )}
              
              <div className="relative">
                <ShoppingCart className="w-5.5 h-5.5 mb-1" />
                {/* Dynamic Notification badge */}
                <AnimatePresence>
                  {cartCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-1.5 -right-2 bg-brand-red text-white text-[9px] font-black rounded-full h-4 min-w-4 flex items-center justify-center px-1 border border-white shadow-sm font-mono"
                    >
                      {cartCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              
              <span className="text-[10px] md:text-xs font-display">
                2. Carrinho {subtotal > 0 && `(R$ ${subtotal.toFixed(0)})`}
              </span>
            </button>

            {/* TAB 2: ADMIN */}
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className={`flex flex-col items-center justify-center transition-all cursor-pointer relative py-1 px-3 rounded-2xl ${
                activeTab === 'admin'
                  ? 'text-brand-red font-bold scale-105'
                  : 'text-slate-400 hover:text-slate-650'
              }`}
            >
              {activeTab === 'admin' && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-brand-red/10 rounded-2xl -z-10"
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                />
              )}
              <Shield className="w-5.5 h-5.5 mb-1" />
              <span className="text-[10px] md:text-xs font-display">Admin</span>
            </button>

          </div>
        </div>
      )}

      {/* Floating Cart Button for Mobile (when bottom menu is hidden) */}
      {!isAdminMode && cartCount > 0 && activeTab === 'montar' && (
        <button
          type="button"
          onClick={() => setActiveTab('carrinho')}
          className="fixed bottom-6 right-6 bg-brand-red hover:bg-brand-red-dark text-white p-4.5 rounded-full shadow-lg z-45 md:hidden flex items-center justify-center cursor-pointer transition-all active:scale-95 duration-200"
        >
          <div className="relative">
            <ShoppingCart className="w-6 h-6 stroke-[2.5]" />
            <span className="absolute -top-2.5 -right-3 bg-brand-amber text-slate-950 text-[10px] font-black rounded-full h-4.5 min-w-4.5 flex items-center justify-center border border-white shadow-sm font-mono px-1">
              {cartCount}
            </span>
          </div>
        </button>
      )}

      {/* Toast de Notificação Global para o Administrador */}
      <AnimatePresence>
        {showAdminToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            onClick={() => {
              setActiveTab('admin');
              setShowAdminToast(false);
            }}
            className="fixed top-4 right-4 z-[9999] bg-brand-charcoal border border-amber-500/30 text-white rounded-xl py-2 px-3.5 shadow-xl flex items-center gap-2 cursor-pointer hover:bg-slate-800 transition-all select-none max-w-xs text-xs font-bold"
          >
            <span className="animate-bounce text-sm shrink-0">🔔</span>
            <span className="text-slate-200 leading-none">
              Novo Pedido: <strong className="text-amber-400 font-extrabold">{latestOrderId}</strong> (Ver)
            </span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
