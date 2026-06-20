import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import HotDogCustomizer from './components/HotDogCustomizer';
import AdminPanel from './components/AdminPanel';
import OrderSummaryAndCheckout from './components/OrderSummaryAndCheckout';
import { useFirebaseData } from './hooks/useFirebaseData';
import { useCart } from './hooks/useCart';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart } from 'lucide-react';

export default function App() {
  // Navigation tabs state: 'montar' | 'admin' | 'carrinho'
  const [activeTab, setActiveTab] = useState<'montar' | 'admin' | 'carrinho'>('montar');

  // Consume our Custom Hooks
  const {
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
  } = useFirebaseData();

  const {
    cart,
    cartCount,
    subtotal,
    handleAddHotDog,
    handleRemoveHotDog,
    handleUpdateHotDogQty,
    handleUpdateDrinkQty,
    handleClearCart
  } = useCart(drinksMenu);

  // States for notifications
  const [showAdminToast, setShowAdminToast] = useState(false);
  const [latestOrderId, setLatestOrderId] = useState<string | null>(null);

  // Monitor when new orders arrive (only if admin is logged in) to show a toast
  const prevPendingCountRef = useRef(0);

  useEffect(() => {
    if (!isUserLoggedIn) return;

    const pendingOrders = orders.filter(o => !o.confirmed);
    const pendingCount = pendingOrders.length;

    if (pendingCount > prevPendingCountRef.current) {
      // New order arrived!
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

  // Auto-dismiss admin notification toast after 6 seconds
  useEffect(() => {
    if (showAdminToast) {
      const timer = setTimeout(() => {
        setShowAdminToast(false);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [showAdminToast]);

  // Dynamic labels mapping for proteins
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
        setForceSuccessOrderId(orderId);
        setActiveTab('carrinho');
        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };
    handleRedirectReturn();
  }, []);

  if (isLoading) {
    return (
      <div 
        className="min-h-screen text-white flex flex-col items-center justify-center font-sans relative overflow-hidden"
        style={{ backgroundImage: 'radial-gradient(circle at center, #CF0004 0%, #A80003 75%, #7A0002 100%)' }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-amber/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center gap-6 text-center px-4">
          <motion.div
            animate={{ 
              scale: [1, 1.08, 1],
              rotate: [0, 4, -4, 0]
            }}
            transition={{ 
              repeat: Infinity,
              duration: 2.2,
              ease: "easeInOut"
            }}
            className="w-24 h-24 sm:w-28 sm:h-28 bg-white/10 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center shadow-2xl relative"
          >
            <div className="absolute inset-0.5 rounded-full border-2 border-transparent border-t-brand-amber border-r-brand-amber animate-spin duration-1000" />
            <span className="text-4xl sm:text-5xl">🌭</span>
          </motion.div>
          
          <div className="space-y-2">
            <h1 className="font-display font-black text-2xl sm:text-3xl tracking-wide uppercase text-white animate-pulse">
              Divino Lanches
            </h1>
            <p className="text-xs sm:text-sm text-red-100 font-medium tracking-wider max-w-xs font-sans">
              Carregando o cardápio divino...
            </p>
          </div>
        </div>
      </div>
    );
  }

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
                      deliveryFees={deliveryFees}
                      onUpdateDeliveryFees={handleUpdateDeliveryFees}
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
                      deliveryFees={deliveryFees}
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
                  deliveryFees={deliveryFees}
                  onUpdateDeliveryFees={handleUpdateDeliveryFees}
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
                  deliveryFees={deliveryFees}
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
                <div className="space-y-4">
                  <div className="max-h-60 overflow-y-auto pr-1 space-y-3">
                    {cart.hotDogs.map((dog) => (
                      <div key={dog.id} className="text-left text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex justify-between items-start gap-1.5">
                        <div>
                          <strong className="text-slate-700 capitalize font-extrabold block">
                            Dog de {dynamicProteinLabels[dog.type] || dog.type}
                          </strong>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Qtd: {dog.quantity} • R$ {dog.price.toFixed(2)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveHotDog(dog.id)}
                          className="text-stone-300 hover:text-red-500 font-bold transition-colors cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {cart.drinks.map((drink) => (
                      <div key={drink.id} className="text-left text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex justify-between items-start gap-1.5">
                        <div>
                          <strong className="text-slate-700 capitalize font-extrabold block">
                            {drink.name}
                          </strong>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Qtd: {drink.quantity} • R$ {drink.price.toFixed(2)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUpdateDrinkQty(drink.drinkId, -drink.quantity)}
                          className="text-stone-300 hover:text-red-500 font-bold transition-colors cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">Subtotal:</span>
                    <strong className="text-sm font-mono font-black text-brand-red">
                      R$ {subtotal.toFixed(2)}
                    </strong>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('carrinho')}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3 rounded-xl transition-all cursor-pointer shadow-xs hover:shadow-md"
                  >
                    Ir para o Checkout ➔
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* 4. Bottom Menu Navigation (Sticky bar on Mobile viewports) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-stone-200 p-2 z-40 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] flex justify-around">
        <button
          onClick={() => setActiveTab('montar')}
          className={`flex flex-col items-center gap-1.5 py-1 px-3.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'montar'
              ? 'text-brand-red font-black scale-105'
              : 'text-slate-450 hover:text-slate-700'
          }`}
        >
          <span className="text-lg">🌭</span>
          <span className="text-[10px] uppercase tracking-wide font-extrabold">Montar</span>
        </button>

        <button
          onClick={() => setActiveTab('carrinho')}
          className={`flex flex-col items-center gap-1.5 py-1 px-3.5 rounded-xl transition-all cursor-pointer relative ${
            activeTab === 'carrinho'
              ? 'text-brand-red font-black scale-105'
              : 'text-slate-450 hover:text-slate-700'
          }`}
        >
          <span className="text-lg">🛒</span>
          <span className="text-[10px] uppercase tracking-wide font-extrabold">Carrinho</span>
          {cartCount > 0 && (
            <span className="absolute top-0 right-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-brand-red text-[9px] font-black text-white shadow-sm font-mono">
              {cartCount}
            </span>
          )}
        </button>

        {isAdminMode && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex flex-col items-center gap-1.5 py-1 px-3.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'admin'
                ? 'text-brand-red font-black scale-105'
                : 'text-slate-450 hover:text-slate-700'
            }`}
          >
            <span className="text-lg">🔐</span>
            <span className="text-[10px] uppercase tracking-wide font-extrabold">Admin</span>
          </button>
        )}
      </nav>

      {/* 5. Floating Action Bar for Quick Admin Notifications */}
      <AnimatePresence>
        {showAdminToast && latestOrderId && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed top-4 right-4 left-4 sm:left-auto z-50 bg-brand-charcoal text-white rounded-2xl p-4 shadow-2xl border border-slate-700 flex items-center gap-3.5 max-w-sm"
          >
            <div className="w-9.5 h-9.5 bg-brand-red rounded-xl flex items-center justify-center text-lg animate-bounce">
              🔔
            </div>
            <div className="flex-1 text-left">
              <h5 className="font-black text-xs uppercase tracking-wide text-brand-red">Novo Pedido Recebido!</h5>
              <p className="text-[10.5px] text-slate-300 mt-0.5 leading-snug">
                Pedido <strong>{latestOrderId}</strong> acaba de chegar e precisa de aprovação.
              </p>
            </div>
            <button
              onClick={() => {
                setActiveTab('admin');
                setShowAdminToast(false);
              }}
              className="text-[10px] bg-brand-red hover:bg-red-700 text-white font-extrabold px-3 py-2 rounded-xl transition-colors cursor-pointer uppercase tracking-wider"
            >
              Ver
            </button>
            <button
              onClick={() => setShowAdminToast(false)}
              className="text-slate-400 hover:text-white font-bold cursor-pointer"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
