import { useState, useEffect } from 'react';
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
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase';
import { MenuItem, SavedOrder, BasicIngredientConfig, ExtraConfig, NeighborhoodFee } from '../types';
import { NEIGHBORHOODS } from '../constants';

export function useFirebaseData() {
  const [isLoading, setIsLoading] = useState(true);
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
    { id: 'batataPalha', name: 'Batata Palha Crocante', description: 'Sempre fresquinha' },
    { id: 'salsicha', name: 'Salsicha', description: 'Salsicha cozida' },
    { id: 'pao', name: 'Pão', description: 'Pão de hotdog fofinho' }
  ]);
  const [extrasConfig, setExtrasConfig] = useState<ExtraConfig[]>([
    { id: 'queijo', name: 'Queijo Muçarela', price: 3.00, description: 'Derretido na chapa' }
  ]);
  const [disabledItems, setDisabledItems] = useState<string[]>([]);
  const [deliveryFees, setDeliveryFees] = useState<NeighborhoodFee[]>(NEIGHBORHOODS);
  const [orders, setOrders] = useState<SavedOrder[]>([]);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('admin') === 'true';
    } catch (e) {
      return false;
    }
  });

  // Check and Initialize Default Data on Firebase
  useEffect(() => {
    const checkAndInitialize = async () => {
      try {
        const statusDocRef = doc(db, 'config', 'status');
        const statusSnap = await getDoc(statusDocRef);
        if (!statusSnap.exists() || !statusSnap.data()?.initialized) {
          const batch = writeBatch(db);
          batch.set(statusDocRef, { initialized: true });
          
          const defaultHotdogs = [
            { id: 'boi', name: 'Salsicha de Boi', price: 15.0, description: 'Salsicha tradicional bovina grelhada.' },
            { id: 'frango', name: 'Frango Desfiado', price: 16.0, description: 'Frango desfiado cremoso e temperado.' },
            { id: 'calabresa', name: 'Calabresa Defumada', price: 16.0, description: 'Calabresa grelhada com cebola na chapa.' }
          ];
          defaultHotdogs.forEach(item => {
            batch.set(doc(db, 'menu_hotdogs', item.id), { name: item.name, price: item.price, description: item.description });
          });
          
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
          
          const defaultBasic = [
            { id: 'milhoErvilha', name: 'Milho & Ervilha Dupla', description: 'Docinho e crocante' },
            { id: 'vinagrete', name: 'Vinagrete Picadinho', description: 'Tomate fresco e cebola' },
            { id: 'cenoura', name: 'Cenoura Raladinha', description: 'Fina e nutritiva' },
            { id: 'batataPalha', name: 'Batata Palha Crocante', description: 'Sempre fresquinha' },
            { id: 'salsicha', name: 'Salsicha', description: 'Salsicha cozida' },
            { id: 'pao', name: 'Pão', description: 'Pão de hotdog fofinho' }
          ];
          defaultBasic.forEach(item => {
            batch.set(doc(db, 'basic_ingredients', item.id), { name: item.name, description: item.description });
          });
          
          const defaultExtras = [
            { id: 'queijo', name: 'Queijo Muçarela', price: 3.00, description: 'Derretido na chapa' }
          ];
          defaultExtras.forEach(item => {
            batch.set(doc(db, 'extras_config', item.id), { name: item.name, price: item.price, description: item.description });
          });
          
          batch.set(doc(db, 'config', 'disabled_items'), { items: [] });

          NEIGHBORHOODS.forEach(item => {
            batch.set(doc(db, 'delivery_fees', item.id), { name: item.name, fee: item.fee });
          });
          
          await batch.commit();
          console.log('Firebase initialized with default data.');
        } else {
          const salsichaSnap = await getDoc(doc(db, 'basic_ingredients', 'salsicha'));
          const paoSnap = await getDoc(doc(db, 'basic_ingredients', 'pao'));
          
          const specialRef = doc(db, 'extras_config', 'molhoEspecial');
          const verdeRef = doc(db, 'extras_config', 'molhoVerde');
          const bbqRef = doc(db, 'extras_config', 'molhoBarbecue');
          const specialSnap = await getDoc(specialRef);
          const verdeSnap = await getDoc(verdeRef);
          const bbqSnap = await getDoc(bbqRef);
          
          const batch = writeBatch(db);
          let needsCommit = false;
          
          if (!salsichaSnap.exists()) {
            batch.set(doc(db, 'basic_ingredients', 'salsicha'), { name: 'Salsicha', description: 'Salsicha cozida' });
            needsCommit = true;
          }
          if (!paoSnap.exists()) {
            batch.set(doc(db, 'basic_ingredients', 'pao'), { name: 'Pão', description: 'Pão de hotdog fofinho' });
            needsCommit = true;
          }
          if (specialSnap.exists()) {
            batch.delete(specialRef);
            needsCommit = true;
          }
          if (verdeSnap.exists()) {
            batch.delete(verdeRef);
            needsCommit = true;
          }
          if (bbqSnap.exists()) {
            batch.delete(bbqRef);
            needsCommit = true;
          }
          
          if (needsCommit) {
            await batch.commit();
            console.log('Firebase migrated: basic ingredients updated & unused sauces deleted.');
          }

          const centroFeeSnap = await getDoc(doc(db, 'delivery_fees', 'centro'));
          if (!centroFeeSnap.exists()) {
            const deliveryBatch = writeBatch(db);
            NEIGHBORHOODS.forEach(item => {
              deliveryBatch.set(doc(db, 'delivery_fees', item.id), { name: item.name, fee: item.fee });
            });
            await deliveryBatch.commit();
            console.log('Firebase migrated: initialized delivery_fees collection.');
          }
        }
      } catch (e) {
        console.error('Error checking or initializing Firebase data', e);
      }
    };
    checkAndInitialize();
  }, []);

  // Monitor Authentication State
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsUserLoggedIn(true);
        setIsAdminMode(true);
      } else {
        setIsUserLoggedIn(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Subscribe to real-time updates from Firestore
  useEffect(() => {
    const loaded = {
      hotdogs: false,
      drinks: false,
      basic: false,
      extras: false,
      disabled: false,
      deliveryFees: false
    };

    const checkLoadingComplete = () => {
      if (
        loaded.hotdogs && 
        loaded.drinks && 
        loaded.basic && 
        loaded.extras && 
        loaded.disabled &&
        loaded.deliveryFees
      ) {
        setIsLoading(false);
      }
    };

    const unsubHotdogs = onSnapshot(collection(db, 'menu_hotdogs'), (snapshot) => {
      const items: MenuItem[] = [];
      snapshot.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() } as MenuItem);
      });
      const orderMap = { boi: 1, frango: 2, calabresa: 3 };
      items.sort((a, b) => (orderMap[a.id as keyof typeof orderMap] || 99) - (orderMap[b.id as keyof typeof orderMap] || 99));
      if (items.length > 0) setHotDogsMenu(items);
      loaded.hotdogs = true;
      checkLoadingComplete();
    }, (err) => {
      console.error('Erro ao escutar hotdogs:', err);
      loaded.hotdogs = true;
      checkLoadingComplete();
    });

    const unsubDrinks = onSnapshot(collection(db, 'menu_drinks'), (snapshot) => {
      const items: MenuItem[] = [];
      snapshot.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() } as MenuItem);
      });
      const orderMap = { coca_lata: 1, guarana_lata: 2, fanta_lata: 3, suco_laranja: 4, agua: 5 };
      items.sort((a, b) => (orderMap[a.id as keyof typeof orderMap] || 99) - (orderMap[b.id as keyof typeof orderMap] || 99));
      if (items.length > 0) setDrinksMenu(items);
      loaded.drinks = true;
      checkLoadingComplete();
    }, (err) => {
      console.error('Erro ao escutar bebidas:', err);
      loaded.drinks = true;
      checkLoadingComplete();
    });

    const unsubBasic = onSnapshot(collection(db, 'basic_ingredients'), (snapshot) => {
      const items: BasicIngredientConfig[] = [];
      snapshot.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() } as BasicIngredientConfig);
      });
      const orderMap = { pao: 1, salsicha: 2, vinagrete: 3, cenoura: 4, milhoErvilha: 5, batataPalha: 6 };
      items.sort((a, b) => (orderMap[a.id as keyof typeof orderMap] || 99) - (orderMap[b.id as keyof typeof orderMap] || 99));
      if (items.length > 0) setBasicIngredients(items);
      loaded.basic = true;
      checkLoadingComplete();
    }, (err) => {
      console.error('Erro ao escutar ingredientes básicos:', err);
      loaded.basic = true;
      checkLoadingComplete();
    });

    const unsubExtras = onSnapshot(collection(db, 'extras_config'), (snapshot) => {
      const items: ExtraConfig[] = [];
      snapshot.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() } as ExtraConfig);
      });
      const orderMap = { queijo: 1 };
      items.sort((a, b) => (orderMap[a.id as keyof typeof orderMap] || 99) - (orderMap[b.id as keyof typeof orderMap] || 99));
      if (items.length > 0) setExtrasConfig(items);
      loaded.extras = true;
      checkLoadingComplete();
    }, (err) => {
      console.error('Erro ao escutar extras:', err);
      loaded.extras = true;
      checkLoadingComplete();
    });

    const unsubDisabled = onSnapshot(doc(db, 'config', 'disabled_items'), (docSnap) => {
      if (docSnap.exists()) {
        setDisabledItems(docSnap.data().items || []);
      }
      loaded.disabled = true;
      checkLoadingComplete();
    }, (err) => {
      console.error('Erro ao escutar itens desabilitados:', err);
      loaded.disabled = true;
      checkLoadingComplete();
    });

    const unsubDeliveryFees = onSnapshot(collection(db, 'delivery_fees'), (snapshot) => {
      const items: NeighborhoodFee[] = [];
      snapshot.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() } as NeighborhoodFee);
      });
      const orderMap = { centro: 1, alvorada: 2, novo_horizonte: 3, jardim_primavera: 4, vila_imperial: 5, parque_nacoes: 6, outros: 7 };
      items.sort((a, b) => (orderMap[a.id as keyof typeof orderMap] || 99) - (orderMap[b.id as keyof typeof orderMap] || 99));
      if (items.length > 0) setDeliveryFees(items);
      loaded.deliveryFees = true;
      checkLoadingComplete();
    }, (err) => {
      console.error('Erro ao escutar taxas de entrega:', err);
      loaded.deliveryFees = true;
      checkLoadingComplete();
    });

    return () => {
      unsubHotdogs();
      unsubDrinks();
      unsubBasic();
      unsubExtras();
      unsubDisabled();
      unsubDeliveryFees();
    };
  }, []);

  // Subscribe to real-time updates of orders ONLY for authenticated admins
  useEffect(() => {
    if (!isUserLoggedIn) {
      setOrders([]);
      return;
    }

    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const items: SavedOrder[] = [];
      snapshot.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() } as SavedOrder);
      });
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setOrders(items);
    });

    return () => unsubOrders();
  }, [isUserLoggedIn]);

  // Update handlers
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
      console.error('Erro ao atualizar bebidas', e);
    }
  };

  const handleUpdateBasicIngredients = async (newIngredients: BasicIngredientConfig[]) => {
    try {
      const batch = writeBatch(db);
      newIngredients.forEach(item => {
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

  const handleUpdateDeliveryFees = async (newFees: NeighborhoodFee[]) => {
    try {
      const batch = writeBatch(db);
      newFees.forEach(item => {
        batch.set(doc(db, 'delivery_fees', item.id), {
          name: item.name,
          fee: item.fee
        });
      });
      await batch.commit();
    } catch (e) {
      console.error('Erro ao atualizar taxas de entrega', e);
    }
  };

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

  return {
    isLoading,
    hotDogsMenu,
    drinksMenu,
    basicIngredients,
    extrasConfig,
    disabledItems,
    deliveryFees,
    orders,
    isUserLoggedIn,
    isAdminMode,
    setIsAdminMode,
    handleUpdateHotDogsMenu,
    handleUpdateDrinksMenu,
    handleUpdateBasicIngredients,
    handleUpdateExtrasConfig,
    handleUpdateDeliveryFees,
    handleToggleDisabledItem,
    handleConfirmOrder,
    handleUnconfirmOrder,
    handleMarkAsDelivered,
    handleDeleteOrder,
    handleClearAllOrders
  };
}
