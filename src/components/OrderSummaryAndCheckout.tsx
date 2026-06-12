import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cart, HotDogItem, DrinkCartItem, OrderType, CustomerOrder } from '../types';
import { NEIGHBORHOODS, WHATSAPP_NUMBER } from '../constants';
import { ShoppingCart, Trash2, MapPin, CheckCircle, Smartphone, Send, DollarSign, Copy, AlertTriangle, ArrowLeft } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface OrderSummaryAndCheckoutProps {
  cart: Cart;
  onRemoveHotDog: (id: string) => void;
  onUpdateHotDogQty: (id: string, delta: number) => void;
  onUpdateDrinkQty: (drinkId: string, delta: number) => void;
  onClearCart: () => void;
  onNavigateToMenu?: () => void;
  proteinLabels?: Record<string, string>;
}

export default function OrderSummaryAndCheckout({
  cart,
  onRemoveHotDog,
  onUpdateHotDogQty,
  onUpdateDrinkQty,
  onClearCart,
  onNavigateToMenu,
  proteinLabels,
}: OrderSummaryAndCheckoutProps) {
  // Checkout Details Status
  const [orderType, setOrderType] = useState<OrderType>('retirada');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [street, setStreet] = useState('');
  const [num, setNum] = useState('');
  const [neighborhood, setNeighborhood] = useState(NEIGHBORHOODS[0].name);
  const [reference, setReference] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro'>('pix');
  const [changeFor, setChangeFor] = useState('');
  
  const [validationError, setValidationError] = useState('');

  // Format phone number as user types: (82) 99603-5476
  const formatPhone = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    // Limit to 11 digits (Brazilian phone number)
    const limited = digits.slice(0, 11);
    
    if (limited.length <= 2) {
      return limited.length > 0 ? `(${limited}` : '';
    }
    if (limited.length <= 7) {
      return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    }
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
  };

  const isValidPhone = (phone: string): boolean => {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 11;
  };
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [orderSent, setOrderSent] = useState(false);

  // Cart helper functions
  const hasItems = cart.hotDogs.length > 0 || cart.drinks.length > 0;

  // Calculators
  const calculateSubtotal = () => {
    const hotDogsTotal = cart.hotDogs.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const drinksTotal = cart.drinks.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return hotDogsTotal + drinksTotal;
  };

  const getDeliveryFee = () => {
    if (orderType === 'retirada') return 0;
    const found = NEIGHBORHOODS.find((n) => n.name === neighborhood);
    return found ? found.fee : 0;
  };

  const subtotal = calculateSubtotal();
  const deliveryFee = getDeliveryFee();
  const grandTotal = subtotal + deliveryFee;

  // Render text for hot dog ingredients to display clearly in cart and WhatsApp
  const formatHotDogIngredients = (dog: HotDogItem) => {
    const parts: string[] = [];
    
    // Base ingredients
    const missingBases: string[] = [];
    if (!dog.baseToppings.milhoErvilha) missingBases.push('sem milho/ervilha');
    if (!dog.baseToppings.vinagrete) missingBases.push('sem vinagrete');
    if (!dog.baseToppings.cenoura) missingBases.push('sem cenoura');
    if (!dog.baseToppings.batataPalha) missingBases.push('sem batata palha');
    
    if (missingBases.length > 0) {
      parts.push(`(${missingBases.join(', ')})`);
    } else {
      parts.push('(com todos os acompanhamentos básicos)');
    }

    // Extras
    const extrasList: string[] = [];
    if (dog.extras.queijo) extrasList.push('Queijo Derretido');
    if (dog.extras.molhoEspecial) extrasList.push('Molho Especial');
    if (dog.extras.molhoVerde) extrasList.push('Molho Verde');
    if (dog.extras.molhoBarbecue) extrasList.push('Molho Barbecue');

    if (extrasList.length > 0) {
      parts.push(`+ Adicionais: ${extrasList.join(', ')}`);
    }

    if (dog.notes) {
      parts.push(`Obs: "${dog.notes}"`);
    }

    return parts.join(' • ');
  };

  // Compile final WhatsApp text
  const generateOrderMessage = () => {
    let text = `✨ *NOVO PEDIDO - DIVINO DOG* ✨\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `👤 *Cliente:* ${customerName}\n`;
    text += `📞 *WhatsApp:* ${customerPhone}\n`;
    text += `🛵 *Tipo:* ${orderType === 'entrega' ? 'Entrega em Casa' : 'Vou retirar na lanchonete'}\n\n`;

    if (orderType === 'entrega') {
      text += `📍 *Endereço de Entrega:*\n`;
      text += `  • Rua: ${street}, Nº ${num}\n`;
      text += `  • Bairro: ${neighborhood}\n`;
      if (reference) text += `  • Ref: ${reference}\n`;
      text += `\n`;
    }

    text += `🛒 *Itens do Pedido:*\n`;
    
    // List Hot Dogs
    cart.hotDogs.forEach((dog, idx) => {
      const label = proteinLabels?.[dog.type] || dog.type;
      text += `• *${dog.quantity}x Dog de ${label}* - R$ ${(dog.price * dog.quantity).toFixed(2)}\n`;
      text += `  _Detalhe: ${formatHotDogIngredients(dog)}_\n\n`;
    });

    // List drinks
    cart.drinks.forEach((drink) => {
      text += `• *${drink.quantity}x ${drink.name}* - R$ ${(drink.price * drink.quantity).toFixed(2)}\n\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💵 *Subtotal:* R$ ${subtotal.toFixed(2)}\n`;
    if (orderType === 'entrega') {
      text += `🛵 *Taxa de Entrega:* R$ ${deliveryFee.toFixed(2)}\n`;
    }
    text += `💰 *TOTAL GERAL:* R$ ${grandTotal.toFixed(2)}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    const payLabels = {
      pix: 'Pix ⚡',
      cartao_credito: 'Cartão de Crédito 💳',
      cartao_debito: 'Cartão de Débito 💳',
      dinheiro: 'Dinheiro 💵',
    };
    text += `💳 *Forma de Pagamento:* ${payLabels[paymentMethod]}\n`;
    if (paymentMethod === 'dinheiro' && changeFor) {
      text += `💵 *Troco para:* R$ ${changeFor}\n`;
    }

    text += `\n🕒 Feito em: ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n`;
    text += `💡 Obrigado pela preferência! Divino Lanches agradece. 🙏👑`;

    return text;
  };

  const handleSendOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    // Field Verifications
    if (!customerName.trim()) {
      setValidationError('Por favor, informe seu nome!');
      return;
    }
    const phoneDigits = customerPhone.replace(/\D/g, '');
    if (!customerPhone.trim()) {
      setValidationError('Por favor, informe seu celular/WhatsApp!');
      return;
    }
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      setValidationError('Telefone inválido! Digite um número de telefone válido com DDD (ex: 82 99603-5476).');
      return;
    }

    if (orderType === 'entrega') {
      if (!street.trim()) {
        setValidationError('Por favor, preencha o nome da rua para a entrega!');
        return;
      }
      if (!num.trim()) {
        setValidationError('Por favor, informe o número da casa/apto!');
        return;
      }
    }

    if (paymentMethod === 'dinheiro' && !changeFor.trim()) {
      // Prompt warning but let configure
    }

    const message = generateOrderMessage();
    const encoded = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${encoded}`;

    // Salva o pedido no Firestore e no histórico local
    try {
      // Generate unique ID using last 4 digits of timestamp + random 2-digit number (e.g. PED-5921-12)
      const orderId = `PED-${String(Date.now()).slice(-4)}-${Math.floor(10 + Math.random() * 90)}`;
      
      const savedOrder = {
        id: orderId,
        customerName,
        customerPhone,
        orderType,
        street,
        num,
        neighborhood,
        reference,
        paymentMethod,
        changeFor,
        hotDogs: cart.hotDogs.map(d => ({
          type: d.type,
          quantity: d.quantity,
          price: d.price,
          details: formatHotDogIngredients(d)
        })),
        drinks: cart.drinks.map(dr => ({
          name: dr.name,
          quantity: dr.quantity,
          price: dr.price
        })),
        subtotal,
        deliveryFee,
        grandTotal,
        timestamp: new Date().toISOString(),
        confirmed: false,
        delivered: false
      };
      
      // Save to Firestore (non-blocking)
      setDoc(doc(db, 'orders', orderId), savedOrder).catch(err => {
        console.error('Erro ao salvar no Firestore:', err);
      });

      // Fallback: Save to LocalStorage
      const prevOrdersStr = localStorage.getItem('divino_lanches_orders');
      const prevOrders = prevOrdersStr ? JSON.parse(prevOrdersStr) : [];
      prevOrders.unshift(savedOrder);
      localStorage.setItem('divino_lanches_orders', JSON.stringify(prevOrders));
    } catch (e) {
      console.error('Erro ao salvar pedido', e);
    }

    // Redireciona para o WhatsApp
    try {
      window.open(whatsappUrl, '_blank');
    } catch (e) {
      console.error('Erro ao abrir o WhatsApp', e);
    }

    // Mark as sent
    setOrderSent(true);
  };

  const copyToClipboard = () => {
    const text = generateOrderMessage();
    navigator.clipboard.writeText(text).then(() => {
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 3000);
    });
  };

  const resetAllAfterSuccess = () => {
    onClearCart();
    setOrderSent(false);
    setCustomerName('');
    setCustomerPhone('');
    setStreet('');
    setNum('');
    setReference('');
    setChangeFor('');
  };

  if (orderSent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 text-center shadow-lg"
      >
        <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-md">
          <CheckCircle className="w-10 h-10 stroke-[2.5]" />
        </div>
        <h3 className="text-2xl font-black text-emerald-950 mb-2">Pedido Recebido com Sucesso!</h3>
        <p className="text-emerald-800 text-sm max-w-md mx-auto mb-6 leading-relaxed">
          Seu pedido foi registrado em nosso sistema e o chapeiro já está preparando o seu delicioso dogão. 
          Lembrando que o pagamento será realizado diretamente no momento da entrega ou retirada.
        </p>

        <div className="flex justify-center mt-2">
          <button
            type="button"
            onClick={resetAllAfterSuccess}
            className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-extrabold text-sm bg-emerald-650 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            Fazer Novo Pedido 🌭
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-amber-100 shadow-sm flex flex-col gap-6">
      
      {/* 1. Header with Cart Summary */}
      <div className="flex items-center justify-between pb-4 border-b border-stone-100 gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-red/10 text-brand-red text-xs font-bold font-mono">3</span>
          <h2 className="text-xl font-bold text-slate-800">Carrinho de Pedidos</h2>
        </div>
        
        <div className="flex items-center gap-2">
          {onNavigateToMenu && (
            <button
              type="button"
              onClick={onNavigateToMenu}
              className="md:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-650 text-[11px] font-extrabold transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Menu</span>
            </button>
          )}

          {hasItems && (
            <button
              type="button"
              onClick={onClearCart}
              className="text-xs text-red-500 hover:text-red-700 hover:underline flex items-center gap-1 cursor-pointer font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Esvaziar
            </button>
          )}
        </div>
      </div>

      {/* 2. Cart items list */}
      {!hasItems ? (
        <div className="text-center py-12 px-4 bg-stone-50/50 rounded-2xl border-2 border-dashed border-stone-200">
          <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3 text-stone-400">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <p className="text-slate-500 font-bold mb-1">Seu carrinho está vazio!</p>
          <p className="text-slate-400 text-xs max-w-xs mx-auto">
            Por favor, escolha se quer Dog de Frango ou Boi, customize ao seu gosto e adicione ao carrinho para ver os totais.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          
          {/* Custom Hot Dogs */}
          {cart.hotDogs.map((dog) => (
            <div key={dog.id} className="flex gap-3 justify-between p-3.5 rounded-2xl bg-linear-to-r from-red-50/30 to-amber-50/30 border border-amber-100/60 shadow-2xs">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-slate-800 uppercase tracking-tight">
                    {dog.type === 'boi' ? '🌭' : dog.type === 'frango' ? '🍗' : dog.type === 'calabresa' ? '🍕' : '✨'} Dog de {proteinLabels?.[dog.type] || dog.type}
                  </span>
                  <span className="text-xs font-bold bg-amber-400/20 text-amber-900 border border-amber-300/30 px-1.5 py-0.5 rounded-sm">
                    R$ {dog.price.toFixed(2)}
                  </span>
                </div>

                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {formatHotDogIngredients(dog)}
                </p>
              </div>

              {/* Quantity steppers and trash */}
              <div className="flex flex-col items-end gap-3 justify-between min-w-24">
                <button
                  type="button"
                  onClick={() => onRemoveHotDog(dog.id)}
                  className="text-stone-300 hover:text-red-600 p-1 rounded-md transition-colors cursor-pointer"
                  title="Remover item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => onUpdateHotDogQty(dog.id, -1)}
                    className="w-5.5 h-5.5 flex items-center justify-center bg-stone-100 font-bold hover:bg-stone-200 text-slate-750 text-xs rounded-sm cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-5 text-center font-bold font-mono text-xs">{dog.quantity}</span>
                  <button
                    type="button"
                    onClick={() => onUpdateHotDogQty(dog.id, 1)}
                    className="w-5.5 h-5.5 flex items-center justify-center bg-stone-100 font-bold hover:bg-stone-200 text-slate-750 text-xs rounded-sm cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Drinks */}
          {cart.drinks.map((drink) => (
            <div key={drink.id} className="flex gap-3 justify-between p-3.5 rounded-2xl bg-linear-to-r from-emerald-50/10 to-teal-50/10 border border-teal-100/40 shadow-2xs">
              <div className="flex-1 flex items-center gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 capitalize leading-none">{drink.name}</h4>
                  <span className="text-xs text-slate-500 mt-1 block">R$ {drink.price.toFixed(2)} cada</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200 self-center">
                <button
                  type="button"
                  onClick={() => onUpdateDrinkQty(drink.drinkId, -1)}
                  className="w-5.5 h-5.5 flex items-center justify-center bg-stone-100 font-bold hover:bg-stone-200 text-slate-755 text-xs rounded-sm cursor-pointer"
                >
                  -
                </button>
                <span className="w-5 text-center font-bold font-mono text-xs">{drink.quantity}</span>
                <button
                  type="button"
                  onClick={() => onUpdateDrinkQty(drink.drinkId, 1)}
                  className="w-5.5 h-5.5 flex items-center justify-center bg-stone-100 font-bold hover:bg-stone-200 text-slate-755 text-xs rounded-sm cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          ))}

          {/* 3. Delivery Method Toggle */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-700 tracking-wide uppercase mb-3 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-brand-red" />
              Opção de Entrega
            </h3>

            <div className="grid grid-cols-2 gap-2 mb-4 bg-stone-100/60 border border-stone-200/50 p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() => setOrderType('retirada')}
                className={`py-3.5 px-3 rounded-xl text-center text-sm font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  orderType === 'retirada'
                    ? 'bg-white text-slate-850 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="text-lg">🏪</span>
                <span>Vou Retirar</span>
                <span className="text-[10px] font-normal text-slate-400">Sem taxa adicional</span>
              </button>

              <button
                type="button"
                onClick={() => setOrderType('entrega')}
                className={`py-3.5 px-3 rounded-xl text-center text-sm font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  orderType === 'entrega'
                    ? 'bg-white text-slate-850 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="text-lg">🛵</span>
                <span>Receber em Casa</span>
                <span className="text-[10px] font-normal text-slate-400">Entrega rápida com taxa</span>
              </button>
            </div>

            {/* Delivery Fields (Animated entrance based on type) */}
            <AnimatePresence>
              {orderType === 'entrega' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden flex flex-col gap-3 py-1"
                >
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Rua / Logradouro *</label>
                      <input
                        type="text"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        placeholder="Av. Getúlio Vargas"
                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-hidden focus:ring-1 focus:ring-red-500 focus:bg-white"
                        required={orderType === 'entrega'}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Número *</label>
                      <input
                        type="text"
                        value={num}
                        onChange={(e) => setNum(e.target.value)}
                        placeholder="1420"
                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-hidden focus:ring-1 focus:ring-red-500 focus:bg-white"
                        required={orderType === 'entrega'}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Bairro para Entrega (Com taxa) *</label>
                    <select
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-hidden focus:ring-1 focus:ring-red-500 focus:bg-white cursor-pointer"
                    >
                      {NEIGHBORHOODS.map((item) => (
                        <option key={item.name} value={item.name}>
                          {item.name} - R$ {item.fee.toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Ponto de Referência <span className="font-normal text-slate-400">(Opcional)</span></label>
                    <input
                      type="text"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="Próximo à padaria central"
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-hidden focus:ring-1 focus:ring-red-500 focus:bg-white"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 4. Payment Method & Client Infos */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-700 tracking-wide uppercase mb-3 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-brand-red" />
              Seus Dados
            </h3>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Seu Nome Completo *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-hidden focus:ring-1 focus:ring-red-500 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">WhatsApp / Telefone *</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(formatPhone(e.target.value))}
                  placeholder=""
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-hidden focus:ring-1 focus:ring-red-500 focus:bg-white"
                  required
                  autoComplete="off"
                />
              </div>
            </div>
          </div>

          {/* 5. Payment Details */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-700 tracking-wide uppercase mb-3 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-brand-red" />
              Forma de Pagamento
            </h3>

            <div className="grid grid-cols-2 gap-2 mb-2">
              {[
                { method: 'pix' as const, label: 'Pix ⚡' },
                { method: 'cartao_credito' as const, label: 'Crédito 💳' },
                { method: 'cartao_debito' as const, label: 'Débito 💳' },
                { method: 'dinheiro' as const, label: 'Dinheiro 💵' },
              ].map(({ method, label }) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    paymentMethod === method
                      ? 'border-brand-red bg-brand-red/5 text-slate-900 shadow-2xs'
                      : 'border-slate-100 bg-stone-50/30 hover:border-slate-200 text-slate-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-450 font-medium italic mt-1.5">
              * O pagamento é realizado diretamente no momento da entrega ou retirada (cartão, Pix ou dinheiro).
            </p>

            {/* Change input for cash */}
            <AnimatePresence>
              {paymentMethod === 'dinheiro' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-2"
                >
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Troco para quanto?</label>
                  <input
                    type="text"
                    value={changeFor}
                    onChange={(e) => setChangeFor(e.target.value)}
                    placeholder="Ex: R$ 50,00"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-hidden focus:ring-1 focus:ring-red-500 focus:bg-white"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 6. Invoice table */}
          <div className="mt-4 p-4 bg-linear-to-b from-stone-50 to-stone-100 rounded-2xl border border-stone-200 flex flex-col gap-2 font-sans">
            <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
              <span>Subtotal dos itens</span>
              <span className="font-mono">R$ {subtotal.toFixed(2)}</span>
            </div>
            
            {orderType === 'entrega' && (
              <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
                <span>Taxa de entrega ({neighborhood})</span>
                <span className="font-mono text-emerald-600 font-bold">+ R$ {deliveryFee.toFixed(2)}</span>
              </div>
            )}

            <div className="h-px bg-slate-300/60 my-1" />

            <div className="flex justify-between items-center text-slate-900 font-black">
              <span className="text-sm">Total do Pedido</span>
              <span className="text-lg font-mono text-brand-red font-bold">R$ {grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Validation Alert */}
          {validationError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2.5 text-xs text-red-700 animate-shake">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Submit Actions */}
          <div className="grid grid-cols-1 gap-2 pt-2">
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleSendOrder}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-4 px-6 rounded-2xl flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg transition-all text-base cursor-pointer focus:ring-2 focus:ring-emerald-300"
            >
              <CheckCircle className="w-5 h-5 stroke-[2.5]" />
              <span>Finalizar Pedido</span>
            </motion.button>
          </div>

        </div>
      )}

    </div>
  );
}
