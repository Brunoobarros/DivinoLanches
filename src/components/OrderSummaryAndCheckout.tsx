import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cart, HotDogItem, DrinkCartItem, OrderType, CustomerOrder } from '../types';
import { NEIGHBORHOODS, WHATSAPP_NUMBER } from '../constants';
import { ShoppingCart, Trash2, MapPin, CheckCircle, Smartphone, Send, DollarSign, Copy, AlertTriangle, ArrowLeft } from 'lucide-react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

interface OrderSummaryAndCheckoutProps {
  cart: Cart;
  onRemoveHotDog: (id: string) => void;
  onUpdateHotDogQty: (id: string, delta: number) => void;
  onUpdateDrinkQty: (drinkId: string, delta: number) => void;
  onClearCart: () => void;
  onNavigateToMenu?: () => void;
  proteinLabels?: Record<string, string>;
  forceSuccessOrderId?: string | null;
  onClearForceSuccess?: () => void;
}

// Helper to calculate CRC16 CCITT for static Pix payload
function crc16CCITT(str: string): string {
  let crc = 0xFFFF;
  for (let c = 0; c < str.length; c++) {
    crc ^= str.charCodeAt(c) << 8;
    for (let i = 0; i < 8; i++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
  }
  let hex = (crc & 0xFFFF).toString(16).toUpperCase();
  return hex.padStart(4, '0');
}

// Helper to generate static Pix payload string
function generateStaticPix(key: string, name: string, city: string, amount: number, txid: string = '***'): string {
  const f = (id: string, val: string) => id + String(val.length).padStart(2, '0') + val;

  const cleanKey = key.replace(/\s+/g, '');
  const merchantAccountInfo = f('00', 'br.gov.bcb.pix') + f('01', cleanKey);

  const cleanTxid = txid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || '***';
  const additionalData = f('05', cleanTxid);

  let payload = 
    f('00', '01') + // Format indicator
    f('26', merchantAccountInfo) +
    f('52', '0000') + // Merchant Category
    f('53', '986') + // BRL Currency
    f('54', Number(amount).toFixed(2)) + // Amount
    f('58', 'BR') + // Country
    f('59', name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 25)) + // Name
    f('60', city.normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 15)) + // City
    f('62', additionalData);

  payload += '6304'; // CRC16 indicator
  payload += crc16CCITT(payload);

  return payload;
}

export default function OrderSummaryAndCheckout({
  cart,
  onRemoveHotDog,
  onUpdateHotDogQty,
  onUpdateDrinkQty,
  onClearCart,
  onNavigateToMenu,
  proteinLabels,
  forceSuccessOrderId,
  onClearForceSuccess,
}: OrderSummaryAndCheckoutProps) {
  // Checkout Details Status
  const [orderType, setOrderType] = useState<OrderType>('retirada');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [street, setStreet] = useState('');
  const [num, setNum] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [reference, setReference] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro'>('pix');
  const [changeFor, setChangeFor] = useState('');
  
  const [validationError, setValidationError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCardBrickLoading, setIsCardBrickLoading] = useState(false);

  // Transparent Pix States
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixQrCodeUrl, setPixQrCodeUrl] = useState('');
  const [pixCopyPasteKey, setPixCopyPasteKey] = useState('');
  const [pixPaymentId, setPixPaymentId] = useState('');
  const [copiedPix, setCopiedPix] = useState(false);

  const currentOrderIdRef = useRef('');
  const [manualPixConfig, setManualPixConfig] = useState<{ key: string; name: string; city: string } | null>(null);

  // Calculators
  const calculateSubtotal = () => {
    const hotDogsTotal = cart.hotDogs.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const drinksTotal = cart.drinks.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return hotDogsTotal + drinksTotal;
  };

  const getDeliveryFee = () => {
    if (orderType === 'retirada') return 0;
    if (!neighborhood.trim()) return 0;
    
    // Smart case-insensitive matching ignoring accents
    const normalize = (str: string) => 
      str.toLowerCase()
         .normalize('NFD')
         .replace(/[\u0300-\u036f]/g, '')
         .trim();
         
    const normalizedInput = normalize(neighborhood);
    const found = NEIGHBORHOODS.find((n) => normalize(n.name) === normalizedInput);
    
    if (found) return found.fee;
    
    // Fallback: If not found, use the fee of 'Outros' or default to 12.00
    const outros = NEIGHBORHOODS.find((n) => n.name.toLowerCase().includes('outros'));
    return outros ? outros.fee : 12.00;
  };

  const subtotal = calculateSubtotal();
  const deliveryFee = getDeliveryFee();
  const grandTotal = subtotal + deliveryFee;

  // Carrega em tempo real a chave Pix configurada no admin
  useEffect(() => {
    const unsubPix = onSnapshot(doc(db, 'config', 'pix_key'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setManualPixConfig({
          key: data.key || '',
          name: data.name || '',
          city: data.city || 'Maceio'
        });
      }
    });
    return () => unsubPix();
  }, []);

  const formDataRef = useRef<any>(null);
  formDataRef.current = {
    customerName,
    customerPhone,
    street,
    num,
    neighborhood,
    reference,
    paymentMethod,
    changeFor,
    orderType,
    cart,
    subtotal,
    deliveryFee,
    grandTotal
  };

  const cardBrickInstanceRef = useRef<any>(null);
  const cardBrickContainerRef = useRef<HTMLDivElement | null>(null);
  const brickInitializingRef = useRef(false);

  const cleanupCardBrick = async () => {
    if (cardBrickInstanceRef.current) {
      try {
        await cardBrickInstanceRef.current.unmount();
      } catch (e) {
        console.warn('Error unmounting card brick:', e);
      }
      cardBrickInstanceRef.current = null;
    }
    // Clear the container DOM to avoid stale nodes
    if (cardBrickContainerRef.current) {
      cardBrickContainerRef.current.innerHTML = '';
    }
  };

  const initCardBrick = async () => {
    const container = cardBrickContainerRef.current;
    if (!container) return;

    // Prevent concurrent initializations
    if (brickInitializingRef.current) return;
    brickInitializingRef.current = true;
    // Clean up previous instance if any
    await cleanupCardBrick();

    setIsCardBrickLoading(true);
    // Clear container before re-creating
    container.innerHTML = '';

    if (!(window as any).MercadoPago) {
      setValidationError('Erro: O SDK do Mercado Pago não foi carregado. Verifique sua conexão ou bloqueador de anúncios.');
      setIsCardBrickLoading(false);
      brickInitializingRef.current = false;
      return;
    }

    const publicKey = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY;
    console.log("=== PUBLIC KEY USADA NO FRONTEND ===", publicKey);
    if (!publicKey) {
      setValidationError('Erro: Chave pública do Mercado Pago não configurada.');
      setIsCardBrickLoading(false);
      brickInitializingRef.current = false;
      return;
    }

    try {
      const mp = new (window as any).MercadoPago(publicKey, {
        locale: 'pt-BR'
      });

      const bricksBuilder = mp.bricks();
      const safeEmail = `cliente_${String(Date.now()).slice(-6)}@divinolanches.com.br`;

      const isDebit = paymentMethod === 'cartao_debito';
      const settings = {
        initialization: {
          amount: grandTotal,
          payer: {
            email: safeEmail
          }
        },
        customization: {
          visual: {
            style: {
              theme: 'flat'
            }
          },
          paymentMethods: {
            minInstallments: 1,
            maxInstallments: isDebit ? 1 : 12,
            types: {
              excluded: isDebit ? ['credit_card'] : ['debit_card']
            }
          }
        },
        callbacks: {
          onReady: () => {
            console.log('Card Payment Brick ready');
            setIsCardBrickLoading(false);
          },
          onSubmit: (cardFormData: any) => {
            return new Promise<void>(async (resolve, reject) => {
              const current = formDataRef.current;
              if (!current.customerName.trim()) {
                setValidationError('Por favor, informe seu nome!');
                reject();
                return;
              }
              const phoneDigits = current.customerPhone.replace(/\D/g, '');
              if (!current.customerPhone.trim()) {
                setValidationError('Por favor, informe seu celular/WhatsApp!');
                reject();
                return;
              }
              if (phoneDigits.length < 10 || phoneDigits.length > 11) {
                setValidationError('Telefone inválido! Digite um número de telefone válido com DDD (ex:82 99671-4559).');
                reject();
                return;
              }
              if (current.orderType === 'entrega') {
                if (!current.street.trim()) {
                  setValidationError('Por favor, preencha o nome da rua para a entrega!');
                  reject();
                  return;
                }
                if (!current.num.trim()) {
                  setValidationError('Por favor, informe o número da casa/apto!');
                  reject();
                  return;
                }
                if (!current.neighborhood.trim()) {
                  setValidationError('Por favor, informe o seu bairro!');
                  reject();
                  return;
                }
              }

              setIsProcessing(true);
              setValidationError('');

              const orderId = `PED-${String(Date.now()).slice(-4)}-${Math.floor(10 + Math.random() * 90)}`;

              try {
                const response = await fetch('/api/process-card-payment', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    cardFormData,
                    orderId,
                    customerName: current.customerName,
                    customerPhone: current.customerPhone,
                    cart: current.cart,
                    orderType: current.orderType,
                    neighborhood: current.neighborhood
                  })
                });

                if (!response.ok) {
                  throw new Error('Falha ao processar pagamento com cartão.');
                }

                const paymentResult = await response.json();

                if (paymentResult.status === 'approved') {
                  const savedOrder = {
                    id: orderId,
                    customerName: current.customerName,
                    customerPhone: current.customerPhone,
                    orderType: current.orderType,
                    street: current.street,
                    num: current.num,
                    neighborhood: current.neighborhood,
                    reference: current.reference,
                    paymentMethod: current.paymentMethod,
                    changeFor: current.changeFor,
                    hotDogs: current.cart.hotDogs.map((d: any) => ({
                      type: d.type,
                      quantity: d.quantity,
                      price: d.price,
                      details: formatHotDogIngredients(d)
                    })),
                    drinks: current.cart.drinks.map((dr: any) => ({
                      name: dr.name,
                      quantity: dr.quantity,
                      price: dr.price
                    })),
                    subtotal: current.subtotal,
                    deliveryFee: current.deliveryFee,
                    grandTotal: current.grandTotal,
                    timestamp: new Date().toISOString(),
                    confirmed: true,
                    delivered: false,
                    paid: true
                  };

                  const orderRef = doc(db, 'orders', orderId);
                  await setDoc(orderRef, savedOrder);

                  const whatsappMsg = generateOrderMessage(orderId);
                  const payLabels = {
                    pix: 'Pix ⚡',
                    cartao_credito: 'Cartão de Crédito 💳 (PAGO ONLINE - APROVADO)',
                    cartao_debito: 'Cartão de Débito 💳 (PAGO ONLINE - APROVADO)',
                    dinheiro: 'Dinheiro 💵',
                  };
                  const customMessage = whatsappMsg.replace(
                    /💳 \*Forma de Pagamento\*: .*/,
                    `💳 *Forma de Pagamento:* ${payLabels[current.paymentMethod as keyof typeof payLabels]}`
                  );
                  const encoded = encodeURIComponent(customMessage);
                  const whatsappUrl = `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${encoded}`;

                  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                  if (isMobile) {
                    window.location.href = whatsappUrl;
                  } else {
                    window.open(whatsappUrl, '_blank');
                  }

                  onClearCart();
                  setOrderSent(true);
                  resolve();
                } else {
                  const statusMessages: Record<string, string> = {
                    rejected: 'Pagamento rejeitado. Verifique os dados ou saldo do cartão.',
                    in_process: 'Pagamento em análise. O pedido foi registrado, mas o pagamento está pendente.',
                    cancelled: 'Pagamento cancelado pelo emissor do cartão.'
                  };
                  const msg = statusMessages[paymentResult.status] || `Pagamento com status: ${paymentResult.status} (${paymentResult.statusDetail})`;
                  setValidationError(msg);
                  setIsProcessing(false);
                  reject();
                }
              } catch (err: any) {
                console.error(err);
                setValidationError('Erro ao processar o cartão com o servidor. Tente novamente ou escolha pagar na entrega.');
                setIsProcessing(false);
                reject();
              }
            });
          },
          onError: (error: any) => {
            console.error('Card Brick Error:', error);
            setValidationError('Erro na inicialização do formulário de cartão.');
            setIsCardBrickLoading(false);
          }
        }
      };

      const brickController = await bricksBuilder.create('cardPayment', 'cardPaymentBrick_container', settings);
      cardBrickInstanceRef.current = brickController;
    } catch (e) {
      console.error('Error rendering Card Brick:', e);
      setValidationError('Não foi possível carregar o formulário do cartão. Verifique a conexão.');
      setIsCardBrickLoading(false);
    } finally {
      brickInitializingRef.current = false;
    }
  };

  // Initialize/re-initialize the Card Brick when payment method or total changes
  const isCardMethod = paymentMethod === 'cartao_credito' || paymentMethod === 'cartao_debito';

  useEffect(() => {
    if (!isCardMethod) {
      cleanupCardBrick();
      return;
    }

    // Small delay to ensure the container DOM is mounted
    const timer = setTimeout(() => {
      initCardBrick();
    }, 100);

    return () => {
      clearTimeout(timer);
      cleanupCardBrick();
    };
  }, [isCardMethod, grandTotal, paymentMethod]);

  // Lock body scroll when Pix modal is open
  useEffect(() => {
    if (showPixModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showPixModal]);

  // Polling for Pix Payment Status
  useEffect(() => {
    let intervalId: any;

    if (showPixModal && pixPaymentId) {
      const checkStatus = async () => {
        try {
          const response = await fetch(`/api/check-payment?id=${pixPaymentId}`);
          if (!response.ok) return;
          const data = await response.json();

          if (data.status === 'approved') {
            // Payment approved!
            // 1. Update Firestore
            const orderRef = doc(db, 'orders', currentOrderIdRef.current);
            await setDoc(orderRef, { paid: true, confirmed: true }, { merge: true });

            // 2. Open WhatsApp link
            const whatsappMsg = generateOrderMessage(currentOrderIdRef.current);
            // Append paid badge to WhatsApp
            const payLabels = {
              pix: 'Pix ⚡ (PAGO ONLINE - CONFIRMADO)',
              cartao_credito: 'Cartão de Crédito 💳',
              cartao_debito: 'Cartão de Débito 💳',
              dinheiro: 'Dinheiro 💵',
            };
            const customMessage = whatsappMsg.replace(
              /💳 \*Forma de Pagamento\*: .*/,
              `💳 *Forma de Pagamento:* ${payLabels.pix}`
            );
            const encoded = encodeURIComponent(customMessage);
            const whatsappUrl = `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${encoded}`;
            
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            if (isMobile) {
              window.location.href = whatsappUrl;
            } else {
              window.open(whatsappUrl, '_blank');
            }

            // 3. Clear cart and set success screen
            setShowPixModal(false);
            onClearCart();
            setOrderSent(true);
          } else if (data.status === 'rejected' || data.status === 'cancelled') {
            setValidationError('Pagamento Pix rejeitado ou cancelado pelo Mercado Pago. Por favor, tente novamente.');
            setShowPixModal(false);
          }
        } catch (err) {
          console.error('Erro ao verificar status do Pix:', err);
        }
      };

      intervalId = setInterval(checkStatus, 4000);
      // Run once immediately
      checkStatus();
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [showPixModal, pixPaymentId]);

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

  // Calculators have been moved to the top of the component

  // Render text for hot dog ingredients to display clearly in cart and WhatsApp
  const formatHotDogIngredients = (dog: HotDogItem) => {
    const parts: string[] = [];
    
    // Base ingredients
    const missingBases: string[] = [];
    if (!dog.baseToppings.milhoErvilha) missingBases.push('sem milho/ervilha');
    if (!dog.baseToppings.vinagrete) missingBases.push('sem vinagrete');
    if (!dog.baseToppings.cenoura) missingBases.push('sem cenoura');
    if (!dog.baseToppings.batataPalha) missingBases.push('sem batata palha');
    if (!dog.baseToppings.salsicha) missingBases.push('sem salsicha');
    if (!dog.baseToppings.pao) missingBases.push('sem pão');
    
    if (missingBases.length > 0) {
      parts.push(`(${missingBases.join(', ')})`);
    } else {
      parts.push('(com todos os acompanhamentos básicos)');
    }

    // Extras
    const extrasList: string[] = [];
    if (dog.extras.queijo) extrasList.push('Queijo Derretido');

    if (extrasList.length > 0) {
      parts.push(`+ Adicionais: ${extrasList.join(', ')}`);
    }

    if (dog.notes) {
      parts.push(`Obs: "${dog.notes}"`);
    }

    return parts.join(' • ');
  };

  // Compile final WhatsApp text
  const generateOrderMessage = (orderId: string) => {
    const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    let text = `✨ *NOVO PEDIDO - ${orderId}* ✨\n`;
    text += `🕒 Feito em: ${timeStr}\n`;
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

    return text.trim();
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
      setValidationError('Telefone inválido! Digite um número de telefone válido com DDD (ex:82 99671-4559).');
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
      if (!neighborhood.trim()) {
        setValidationError('Por favor, informe o seu bairro!');
        return;
      }
    }

    if (paymentMethod === 'dinheiro' && !changeFor.trim()) {
      // Prompt warning but let configure
    }

    // Generate unique ID using last 4 digits of timestamp + random 2-digit number (e.g. PED-5921-12)
    const orderId = `PED-${String(Date.now()).slice(-4)}-${Math.floor(10 + Math.random() * 90)}`;

    const message = generateOrderMessage(orderId);
    const encoded = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${encoded}`;

    // Salva o pedido no Firestore e no histórico local
    try {
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
        delivered: false,
        paid: false
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

    // Se o pagamento for em dinheiro ou cartão, vai direto para o WhatsApp (pagamento na entrega/retirada)
    if (paymentMethod === 'dinheiro' || paymentMethod === 'cartao_credito' || paymentMethod === 'cartao_debito') {
      try {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
          window.location.href = whatsappUrl;
        } else {
          window.open(whatsappUrl, '_blank');
        }
      } catch (e) {
        console.error('Erro ao abrir o WhatsApp', e);
      }
      setOrderSent(true);
    } else if (paymentMethod === 'pix') {
      setIsProcessing(true);
      
      // Se tiver uma chave Pix cadastrada no painel admin, usa a geração de Pix estático local
      if (manualPixConfig && manualPixConfig.key.trim() !== '') {
        try {
          const staticPixPayload = generateStaticPix(
            manualPixConfig.key,
            manualPixConfig.name || 'Divino Lanches',
            manualPixConfig.city || 'Maceio',
            grandTotal,
            orderId
          );
          
          currentOrderIdRef.current = orderId;
          setPixQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(staticPixPayload)}`);
          setPixCopyPasteKey(staticPixPayload);
          setPixPaymentId(''); // Indica que é Pix manual (desativa o polling)
          setShowPixModal(true);
          setIsProcessing(false);
        } catch (err) {
          console.error('Erro ao gerar Pix estático:', err);
          setValidationError('Erro ao processar a chave Pix manual. Por favor, selecione outra forma de pagamento.');
          setIsProcessing(false);
        }
      } else {
        // Se NÃO tiver chave cadastrada no admin, usa o Mercado Pago automático
        try {
          const response = await fetch('/api/create-pix-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              orderId,
              customerName,
              customerPhone,
              cart,
              orderType,
              neighborhood
            })
          });

          if (!response.ok) {
            throw new Error('Falha ao gerar cobrança Pix.');
          }

          const data = await response.json();
          
          currentOrderIdRef.current = orderId;
          setPixQrCodeUrl(`data:image/jpeg;base64,${data.qrCodeBase64}`);
          setPixCopyPasteKey(data.qrCode);
          setPixPaymentId(data.paymentId);
          setShowPixModal(true);
          setIsProcessing(false);
        } catch (err) {
          console.error('Erro ao processar Pix Transparente:', err);
          setValidationError('Erro ao gerar a cobrança Pix. Por favor, tente novamente ou escolha pagar na entrega.');
          setIsProcessing(false);
        }
      }
    }
  };

  const copyToClipboard = () => {
    const tempId = `PED-${String(Date.now()).slice(-4)}-${Math.floor(10 + Math.random() * 90)}`;
    const text = generateOrderMessage(tempId);
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
    setNeighborhood('');
    setReference('');
    setChangeFor('');
  };

  const isOnlinePaidSuccess = !!forceSuccessOrderId;
  const showSuccess = orderSent || isOnlinePaidSuccess;

  if (showSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 text-center shadow-lg"
      >
        <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-md">
          <CheckCircle className="w-10 h-10 stroke-[2.5]" />
        </div>
        <h3 className="text-2xl font-black text-emerald-950 mb-2">
          {isOnlinePaidSuccess ? 'Pagamento Aprovado!' : 'Pedido Recebido com Sucesso!'}
        </h3>
        <p className="text-emerald-800 text-sm max-w-md mx-auto mb-6 leading-relaxed">
          {isOnlinePaidSuccess ? (
            <span>
              Seu pagamento online foi confirmado com sucesso. Seu pedido (ID: <strong>{forceSuccessOrderId}</strong>) foi registrado e o chapeiro já está preparando o seu delicioso dogão!
            </span>
          ) : (
            <span>
              Seu pedido foi registrado em nosso sistema e o chapeiro já está preparando o seu delicioso dogão. 
              Lembrando que o pagamento será realizado diretamente no momento da entrega ou retirada.
            </span>
          )}
        </p>

        <div className="flex justify-center mt-2">
          <button
            type="button"
            onClick={() => {
              resetAllAfterSuccess();
              if (onClearForceSuccess) onClearForceSuccess();
            }}
            className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-extrabold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all cursor-pointer"
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
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Bairro para Entrega *</label>
                    <input
                      type="text"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      placeholder="Ex: Centro ou Alvorada"
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-hidden focus:ring-1 focus:ring-red-500 focus:bg-white"
                      required={orderType === 'entrega'}
                    />
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
            <p className="text-[10px] text-slate-455 font-medium italic mt-1.5 animate-fade-in">
              {paymentMethod === 'cartao_credito' || paymentMethod === 'cartao_debito'
                ? '* O pagamento por cartão é processado de forma 100% segura e online agora mesmo.'
                : paymentMethod === 'pix'
                ? (manualPixConfig && manualPixConfig.key.trim() !== ''
                  ? '* Transfira o valor exato para a chave Pix e nos envie o comprovante via WhatsApp.'
                  : '* O pagamento via Pix é gerado e confirmado automaticamente em tempo real.')
                : '* O pagamento em dinheiro será realizado no momento da entrega ou retirada.'}
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
            {paymentMethod === 'cartao_credito' || paymentMethod === 'cartao_debito' ? (
              <div className="relative w-full">
                {isCardBrickLoading && (
                  <div className="w-full py-6 flex flex-col gap-4 animate-pulse">
                    {/* Card outline skeleton */}
                    <div className="h-40 bg-slate-100/80 rounded-2xl w-full border border-slate-200/50 p-4 flex flex-col justify-between">
                      <div className="flex justify-between items-center">
                        <div className="h-8 w-12 bg-slate-200 rounded-md" />
                        <div className="h-6 w-10 bg-slate-200 rounded-md" />
                      </div>
                      <div className="h-4 bg-slate-200 rounded-md w-3/4" />
                      <div className="flex gap-4">
                        <div className="h-4 bg-slate-200 rounded-md w-1/2" />
                        <div className="h-4 bg-slate-200 rounded-md w-1/4" />
                      </div>
                    </div>
                    {/* Fields placeholder skeletons */}
                    <div className="space-y-3">
                      <div className="h-10 bg-slate-100/70 rounded-xl w-full" />
                      <div className="grid grid-cols-2 gap-3">
                        <div className="h-10 bg-slate-100/70 rounded-xl" />
                        <div className="h-10 bg-slate-100/70 rounded-xl" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 justify-center text-xs text-slate-400 font-bold mt-2">
                      <span className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                      <span>Carregando formulário seguro...</span>
                    </div>
                  </div>
                )}
                <div 
                  ref={cardBrickContainerRef} 
                  id="cardPaymentBrick_container" 
                  className={`w-full mt-2 ${isCardBrickLoading ? 'absolute top-0 left-0 opacity-0 pointer-events-none' : ''}`} 
                />
              </div>
            ) : (
              <motion.button
                whileTap={isProcessing ? undefined : { scale: 0.98 }}
                type="button"
                onClick={isProcessing ? undefined : handleSendOrder}
                disabled={isProcessing}
                className={`w-full font-extrabold py-4 px-6 rounded-2xl flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg transition-all text-base focus:ring-2 ${
                  isProcessing
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer focus:ring-emerald-300'
                }`}
              >
                {isProcessing ? (
                  <>
                    <span className="w-5 h-5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                    <span>Redirecionando para o Pagamento...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 stroke-[2.5]" />
                    <span>Finalizar Pedido</span>
                  </>
                )}
              </motion.button>
            )}
          </div>

        </div>
      )}

      {/* Pix Payment Modal Overlay */}
      <AnimatePresence>
        {showPixModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full border border-amber-100 shadow-2xl flex flex-col items-center gap-5 relative"
            >
              <div className="text-center w-full">
                <span className="text-3xl">⚡</span>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mt-2">
                  {pixPaymentId ? 'Pagamento via Pix' : 'Transferência Pix'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {pixPaymentId 
                    ? 'Escaneie o código abaixo com o aplicativo do seu banco' 
                    : 'Transfira o valor para a chave Pix abaixo e envie o comprovante'}
                </p>
              </div>

              {/* QR Code Container */}
              <div className="w-48 h-48 bg-linear-to-b from-stone-50 to-stone-100 border border-stone-200 rounded-2xl flex items-center justify-center p-2.5 shadow-inner">
                {pixQrCodeUrl ? (
                  <img
                    src={pixQrCodeUrl}
                    alt="QR Code Pix"
                    className="w-full h-full object-contain rounded-xl"
                  />
                ) : (
                  <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
                )}
              </div>

              {/* Valor Total a Pagar */}
              <div className="bg-amber-50/60 border border-amber-100/80 rounded-2xl py-2.5 px-5 text-center w-full max-w-[240px] shadow-2xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Valor Total a Pagar</span>
                <span className="text-xl font-black text-brand-red font-mono">R$ {grandTotal.toFixed(2)}</span>
              </div>

              {/* Copy & Paste Code */}
              <div className="w-full space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">
                  {pixPaymentId ? 'Código Pix Copia e Cola' : 'Chave Pix (Copia e Cola)'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={pixCopyPasteKey}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-655 font-mono focus:outline-hidden"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(pixCopyPasteKey);
                      setCopiedPix(true);
                      setTimeout(() => setCopiedPix(false), 2000);
                    }}
                    className={`px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                      copiedPix
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-brand-charcoal text-white hover:bg-slate-850 shadow-sm'
                    }`}
                  >
                    {copiedPix ? 'Copiado! ✓' : 'Copiar'}
                  </button>
                </div>
              </div>



              {/* Polling Spinner (Only for automated Mercado Pago Pix) */}
              {pixPaymentId ? (
                <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-150 px-4 py-2.5 rounded-2xl w-full justify-center">
                  <span className="w-4.5 h-4.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin shrink-0" />
                  <span className="text-xs font-bold text-emerald-850 animate-pulse">Aguardando pagamento pelo banco...</span>
                </div>
              ) : (
                /* WhatsApp Submit Button (Only for manual Pix key) */
                <button
                  type="button"
                  onClick={async () => {
                    const whatsappMsg = generateOrderMessage(currentOrderIdRef.current);
                    const payLabels = {
                      pix: 'Pix ⚡ (Transferência Manual - Enviar Comprovante)',
                      cartao_credito: 'Cartão de Crédito 💳',
                      cartao_debito: 'Cartão de Débito 💳',
                      dinheiro: 'Dinheiro 💵',
                    };
                    const customMessage = whatsappMsg.replace(
                      /💳 \*Forma de Pagamento\*: .*/,
                      `💳 *Forma de Pagamento:* ${payLabels.pix}`
                    );
                    const encoded = encodeURIComponent(customMessage);
                    const whatsappUrl = `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${encoded}`;
                    
                    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                    if (isMobile) {
                      window.location.href = whatsappUrl;
                    } else {
                      window.open(whatsappUrl, '_blank');
                    }

                    // Salva com paid: false, pois precisa que o administrador valide o Pix manualmente
                    const orderRef = doc(db, 'orders', currentOrderIdRef.current);
                    await setDoc(orderRef, { confirmed: false, paid: false }, { merge: true });

                    setShowPixModal(false);
                    onClearCart();
                    setOrderSent(true);
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-4 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg cursor-pointer transition-all text-sm focus:ring-2 focus:ring-emerald-300"
                >
                  <CheckCircle className="w-5 h-5 stroke-[2.5]" />
                  <span>Já paguei! Confirmar no WhatsApp</span>
                </button>
              )}

              {/* Footer Actions */}
              <div className="w-full flex flex-col gap-2 pt-2 border-t border-slate-100">
                <p className="text-[9.5px] text-slate-450 text-center leading-relaxed font-medium">
                  {pixPaymentId 
                    ? '* Não feche esta janela. O site confirmará seu pedido automaticamente em tempo real assim que o Pix for recebido.' 
                    : '* Transfira o valor exato pelo seu banco. Em seguida, clique no botão acima para nos enviar o comprovante via WhatsApp.'}
                </p>
                
                <button
                  type="button"
                  onClick={() => {
                    const confirmMsg = pixPaymentId
                      ? 'Deseja cancelar o pagamento Pix? Seu pedido não será enviado.'
                      : 'Deseja fechar a janela? Seu pedido ainda não foi enviado para o WhatsApp.';
                    if (window.confirm(confirmMsg)) {
                      setShowPixModal(false);
                      setPixPaymentId('');
                      if (pixPaymentId) {
                        setValidationError('Pagamento Pix cancelado pelo usuário.');
                      }
                    }
                  }}
                  className="w-full py-2.5 text-center text-xs font-extrabold text-red-500 hover:text-red-750 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                >
                  {pixPaymentId ? 'Cancelar Pagamento' : 'Fechar Janela'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
