import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import HotDogCustomizer from './components/HotDogCustomizer';
import DrinkSelector from './components/DrinkSelector';
import OrderSummaryAndCheckout from './components/OrderSummaryAndCheckout';
import { Cart, HotDogItem, DrinkCartItem } from './types';
import { DRINKS_MENU } from './constants';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Crown, 
  Bike, 
  ShoppingBag, 
  UtensilsCrossed, 
  CupSoda, 
  ShoppingCart, 
  Store, 
  Flame, 
  Sparkles,
  Info
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'divino_lanches_cart';

export default function App() {
  // Navigation tabs state: 'montar' | 'bebidas' | 'carrinho' | 'sobre'
  const [activeTab, setActiveTab] = useState<'montar' | 'bebidas' | 'carrinho'>('montar');

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
      const drinkInfo = DRINKS_MENU.find((d) => d.id === drinkId);

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
    <div className="min-h-screen bg-linear-to-b from-stone-50 to-stone-100/90 text-slate-800 flex flex-col font-sans selection:bg-red-500 selection:text-white pb-24 md:pb-8">
      
      {/* 1. Header Banner */}
      <Header />

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
                    />
                  </motion.div>
                )}

                {activeTab === 'bebidas' && (
                  <motion.div
                    key="bebidas"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="p-0.5"
                  >
                    <DrinkSelector 
                      drinksInCart={cart.drinks} 
                      onUpdateDrinkQty={handleUpdateDrinkQty} 
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
                    onClick={() => setActiveTab('bebidas')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'bebidas'
                        ? 'bg-brand-charcoal text-white shadow-xs'
                        : 'bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    2. Bebidas Geladas
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
                    3. Carrinho & Checkout
                  </button>
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
                />
              )}
              {activeTab === 'bebidas' && (
                <DrinkSelector 
                  drinksInCart={cart.drinks} 
                  onUpdateDrinkQty={handleUpdateDrinkQty} 
                />
              )}
              {activeTab === 'carrinho' && (
                <OrderSummaryAndCheckout
                  cart={cart}
                  onRemoveHotDog={handleRemoveHotDog}
                  onUpdateHotDogQty={handleUpdateHotDogQty}
                  onUpdateDrinkQty={handleUpdateDrinkQty}
                  onClearCart={handleClearCart}
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
                        <p className="font-black text-slate-800 capitalize">
                          {d.quantity}x Dog de {d.type}
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
        👑 Divino Lanches • São Paulo SP
      </div>

      {/* 5. FLOATING MOBILE/DESKTOP BOTTOM TAB MENU (Fixed structure) */}
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
            <span className="text-[10px] md:text-xs font-display">1. Montar Dog</span>
          </button>

          {/* TAB 2: BEBIDAS */}
          <button
            type="button"
            onClick={() => setActiveTab('bebidas')}
            className={`flex flex-col items-center justify-center transition-all cursor-pointer relative py-1 px-3 rounded-2xl ${
              activeTab === 'bebidas'
                ? 'text-brand-red font-bold scale-105'
                : 'text-slate-400 hover:text-slate-650'
            }`}
          >
            {activeTab === 'bebidas' && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute inset-0 bg-brand-red/10 rounded-2xl -z-10"
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              />
            )}
            <CupSoda className="w-5.5 h-5.5 mb-1" />
            <span className="text-[10px] md:text-xs font-display">2. Bebidas</span>
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
              3. Carrinho {subtotal > 0 && `(R$ ${subtotal.toFixed(0)})`}
            </span>
          </button>

        </div>
      </div>

    </div>
  );
}
