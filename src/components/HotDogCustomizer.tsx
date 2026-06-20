import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HotDogType, BaseToppings, ExtraToppings, HotDogItem } from '../types';
import { EXTRA_PRICES } from '../constants';
import HotDogVisualBuilder from './HotDogVisualBuilder';
import { Plus, Minus, ShoppingCart, ArrowLeft, ArrowRight, Check, AlertTriangle } from 'lucide-react';

import { MenuItem } from '../types';

interface HotDogCustomizerProps {
  onAddHotDog: (item: Omit<HotDogItem, 'id'>) => void;
  onNavigateToCart?: () => void;
  onUpdateDrinkQty: (drinkId: string, delta: number) => void;
  disabledItems: string[];
  hotDogsMenu: MenuItem[];
  drinksMenu: MenuItem[];
}

export default function HotDogCustomizer({ onAddHotDog, onNavigateToCart, onUpdateDrinkQty, disabledItems, hotDogsMenu, drinksMenu }: HotDogCustomizerProps) {
  // Stepper state: 1, 2, 3, 4
  const [currentStep, setCurrentStep] = useState<number>(1);

  // State for customization
  const [type, setType] = useState<HotDogType | null>(null);
  const [baseToppings, setBaseToppings] = useState<BaseToppings>({
    milhoErvilha: true,
    vinagrete: true,
    cenoura: true,
    batataPalha: true,
    salsicha: true,
    pao: true,
  });
  const [extras, setExtras] = useState<ExtraToppings>({
    queijo: false,
  });
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [selectedDrinks, setSelectedDrinks] = useState<Record<string, number>>({});

  // Reset selections if items are disabled in Admin Panel
  useEffect(() => {
    // 1. Check proteins
    const active = getSelectedProteins();
    const hasDisabledProtein = active.some(p => disabledItems.includes(p));
    if (hasDisabledProtein) {
      setType(null);
    }

    // 2. Check basic toppings
    setBaseToppings((prev) => {
      let updated = { ...prev };
      let changed = false;
      (Object.keys(prev) as Array<keyof BaseToppings>).forEach((k) => {
        if (disabledItems.includes(k) && prev[k]) {
          updated[k] = false;
          changed = true;
        }
      });
      return changed ? updated : prev;
    });

    // 3. Check extra toppings
    setExtras((prev) => {
      let updated = { ...prev };
      let changed = false;
      (Object.keys(prev) as Array<keyof ExtraToppings>).forEach((k) => {
        if (disabledItems.includes(k) && prev[k]) {
          updated[k] = false;
          changed = true;
        }
      });
      return changed ? updated : prev;
    });

    // 4. Check drinks
    setSelectedDrinks((prev) => {
      let updated = { ...prev };
      let changed = false;
      Object.keys(prev).forEach((k) => {
        if (disabledItems.includes(k) && prev[k] > 0) {
          delete updated[k];
          changed = true;
        }
      });
      return changed ? updated : prev;
    });
  }, [disabledItems, type]);

  // Helper selectors
  const toggleBaseTopping = (key: keyof BaseToppings) => {
    setBaseToppings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleExtra = (key: keyof ExtraToppings) => {
    setExtras((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateLocalDrinkQty = (drinkId: string, delta: number) => {
    setSelectedDrinks((prev) => {
      const current = prev[drinkId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[drinkId];
        return copy;
      }
      return { ...prev, [drinkId]: next };
    });
  };

  const getSelectedProteins = (): ('boi' | 'frango' | 'calabresa')[] => {
    if (!type) return [];
    if (type === 'boi') return ['boi'];
    if (type === 'frango') return ['frango'];
    if (type === 'calabresa') return ['calabresa'];
    if (type === 'boi_frango') return ['boi', 'frango'];
    if (type === 'boi_calabresa') return ['boi', 'calabresa'];
    if (type === 'frango_calabresa') return ['frango', 'calabresa'];
    return [];
  };

  const handleToggleProtein = (protein: 'boi' | 'frango' | 'calabresa') => {
    const current = getSelectedProteins();
    const exists = current.includes(protein);
    
    if (exists) {
      if (current.length === 1) {
        setType(null);
        return;
      }
      const next = current.filter(p => p !== protein);
      setType(next[0] as HotDogType);
    } else {
      if (current.length >= 2) return; // Limite de 2 sabores
      const next = [...current, protein].sort();
      
      if (next.length === 1) {
        setType(next[0] as HotDogType);
      } else if (next.includes('boi') && next.includes('frango')) {
        setType('boi_frango');
      } else if (next.includes('boi') && next.includes('calabresa')) {
        setType('boi_calabresa');
      } else if (next.includes('frango') && next.includes('calabresa')) {
        setType('frango_calabresa');
      }
    }
  };

  // Generate dynamic protein label for display
  const getDynamicProteinLabel = (dogType: string | null): string => {
    if (!dogType) return 'Nenhum sabor selecionado';
    if (dogType === 'boi') return hotDogsMenu.find(h => h.id === 'boi')?.name || 'Salsicha de Boi';
    if (dogType === 'frango') return hotDogsMenu.find(h => h.id === 'frango')?.name || 'Frango Desfiado';
    if (dogType === 'calabresa') return hotDogsMenu.find(h => h.id === 'calabresa')?.name || 'Calabresa Defumada';
    if (dogType === 'boi_frango') {
      const p1 = hotDogsMenu.find(h => h.id === 'boi')?.name || 'Boi';
      const p2 = hotDogsMenu.find(h => h.id === 'frango')?.name || 'Frango';
      return `Misto (${p1} & ${p2})`;
    }
    if (dogType === 'boi_calabresa') {
      const p1 = hotDogsMenu.find(h => h.id === 'boi')?.name || 'Boi';
      const p2 = hotDogsMenu.find(h => h.id === 'calabresa')?.name || 'Calabresa';
      return `Misto (${p1} & ${p2})`;
    }
    if (dogType === 'frango_calabresa') {
      const p1 = hotDogsMenu.find(h => h.id === 'frango')?.name || 'Frango';
      const p2 = hotDogsMenu.find(h => h.id === 'calabresa')?.name || 'Calabresa';
      return `Misto (${p1} & ${p2})`;
    }
    return dogType;
  };

  // Helper to get hot dog price from dynamic menu
  const getHotDogPrice = (dogType: string | null): number => {
    if (!dogType) return 0;
    // For single protein types, find directly
    const simpleId = dogType.split('_')[0];
    const item = hotDogsMenu.find(h => h.id === simpleId);
    if (!item) return 15.0;
    
    // For mixed types, use the max price among components
    if (dogType.includes('_')) {
      const parts = dogType.split('_');
      const prices = parts.map(p => hotDogsMenu.find(h => h.id === p)?.price || 15.0);
      return Math.max(...prices);
    }
    return item.price;
  };

  // Live price calculation
  const calculateSinglePrice = (): number => {
    let total = getHotDogPrice(type);
    
    if (extras.queijo) total += EXTRA_PRICES.queijo;

    return total;
  };

  const singlePrice = calculateSinglePrice();

  // Calculate local drinks total price
  const calculateLocalDrinksTotal = (): number => {
    return Object.entries(selectedDrinks).reduce((sum, [drinkId, qty]) => {
      const drink = drinksMenu.find((d) => d.id === drinkId);
      return sum + (drink ? drink.price : 0) * qty;
    }, 0);
  };
  
  const drinksTotal = calculateLocalDrinksTotal();
  const totalPrice = singlePrice * quantity + drinksTotal;

  const handleNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAdd = () => {
    if (!type) return;
    onAddHotDog({
      type,
      baseToppings,
      extras,
      quantity,
      notes: notes.trim() || undefined,
      price: singlePrice,
    });

    // Add selected drinks to the master cart in App.tsx
    Object.entries(selectedDrinks).forEach(([drinkId, qty]) => {
      if (qty > 0) {
        onUpdateDrinkQty(drinkId, qty);
      }
    });

    // Reset everything for next purchase
    setBaseToppings({
      milhoErvilha: true,
      vinagrete: true,
      cenoura: true,
      batataPalha: true,
      salsicha: true,
      pao: true,
    });
    setExtras({
      queijo: false,
    });
    setSelectedDrinks({});
    setNotes('');
    setQuantity(1);
    setType(null); // Reset type to null
    setCurrentStep(1); // Back to beginning

    // Display temporary Toast
    setShowSuccessToast(true);
    setTimeout(() => {
      setShowSuccessToast(false);
    }, 4000);
  };

  const stepLabels = [
    { num: 1, title: 'Proteína', desc: 'Escolha a base do dogão' },
    { num: 2, title: 'Ingredientes', desc: 'Ingredientes inclusos' },
    { num: 3, title: 'Bebidas', desc: 'Refrigerantes e sucos' },
    { num: 4, title: 'Confirmar', desc: 'Quantidade e notas' },
  ];

  return (
    <div id="builder-section" className="bg-white rounded-3xl p-5 md:p-6 border border-amber-100 shadow-sm flex flex-col gap-5">
      
      {/* Toast Success Message */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-emerald-600 text-white rounded-xl py-2 px-3.5 flex items-center justify-between shadow-md text-xs font-bold"
          >
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white text-[10px]">✓</span>
              <span>Divino adicionado ao carrinho!</span>
            </div>
            {onNavigateToCart && (
              <button
                type="button"
                onClick={onNavigateToCart}
                className="bg-white text-emerald-700 hover:bg-emerald-50 px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer"
              >
                Ver Carrinho
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Steppers Graphic Indicator */}
      <div className="border-b border-stone-100 pb-3 -mt-1">
        <div className="flex items-center justify-between gap-1.5">
          {stepLabels.map((step) => {
            const isActive = currentStep === step.num;
            const isCompleted = currentStep > step.num;
            const isClickable = step.num <= currentStep;

            return (
              <button
                key={step.num}
                type="button"
                onClick={() => isClickable && setCurrentStep(step.num)}
                disabled={!isClickable}
                className={`flex-1 focus:outline-hidden group text-left ${
                  isClickable ? 'cursor-pointer' : 'cursor-not-allowed'
                }`}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-[10px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center transition-all shrink-0 ${
                        isActive
                          ? 'bg-brand-red text-white'
                          : isCompleted
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {isCompleted ? <Check className="w-3 h-3" /> : step.num}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider hidden sm:inline leading-none ${
                        isActive 
                          ? 'text-brand-red' 
                          : isClickable 
                            ? 'text-slate-400 group-hover:text-slate-600' 
                            : 'text-slate-300'
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                  <div
                    className={`h-1 rounded-full transition-all ${
                      isActive
                        ? 'bg-brand-red'
                        : isCompleted
                        ? 'bg-emerald-500'
                        : 'bg-slate-100'
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>
        
        {/* Mobile current step indicator text helper */}
        <div className="mt-1.5 flex items-center justify-between sm:hidden text-[10px]">
          <span className="font-extrabold text-slate-400 uppercase tracking-widest">
            Etapa {currentStep}/4
          </span>
          <span className="font-bold text-slate-700">
            {stepLabels[currentStep - 1].title}: {stepLabels[currentStep - 1].desc}
          </span>
        </div>
      </div>

      {/* INNER WIZARD STEPS */}
      <div className="min-h-[220px] flex flex-col justify-between">
        
        {/* Animation container for transitions */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: PROTEIN CHOICE */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.18 }}
              >
                <div className="mb-2">
                  <h3 className="text-base font-extrabold text-slate-800">
                    Passo 1: Qual a proteína do seu cachorro-quente?
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Selecione 1 ou até 2 carnes para o seu dogão (se escolher 2, faremos meio a meio!).
                  </p>
                </div>

                {/* STEP 1 Warning if all proteins are disabled */}
                {(() => {
                  const allProteinsDisabled = disabledItems.includes('boi') && disabledItems.includes('frango') && disabledItems.includes('calabresa');
                  return allProteinsDisabled && (
                    <div className="p-4 bg-red-50 border border-red-200 text-red-750 rounded-2xl text-xs font-bold flex items-center gap-2 mb-4 leading-snug">
                      <AlertTriangle className="w-5 h-5 shrink-0 text-red-600" />
                      <span>Desculpe! Todos os nossos ingredientes principais (Salsicha de Boi, Frango Desfiado e Calabresa) estão esgotados no momento. Não é possível montar novos cachorros-quentes agora.</span>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Opção 1: Boi */}
                  {(() => {
                    const isProductDisabled = disabledItems.includes('boi');
                    const isSelected = !isProductDisabled && (type === 'boi' || type === 'boi_frango' || type === 'boi_calabresa');
                    const currentSelected = getSelectedProteins();
                    const isMaxReached = currentSelected.length >= 2;
                    const isDisabled = (isMaxReached && !isSelected) || isProductDisabled;
                    return (
                      <button
                        type="button"
                        onClick={() => !isDisabled && handleToggleProtein('boi')}
                        disabled={isDisabled}
                        className={`relative p-5 rounded-2xl border-2 text-left transition-all ${
                          isSelected
                            ? 'border-brand-red bg-brand-red/5 text-brand-red font-bold cursor-pointer'
                            : isDisabled
                              ? 'border-slate-100 opacity-40 text-slate-400 bg-stone-50/30 cursor-not-allowed'
                              : 'border-slate-155 hover:border-slate-300 text-slate-600 bg-stone-50/50 cursor-pointer'
                        }`}
                      >
                        <div className="flex-1">
                          <p className="text-sm font-extrabold text-slate-900">{hotDogsMenu.find(h => h.id === 'boi')?.name || 'Carne de Boi'}</p>
                          <p className="text-xs text-slate-500 leading-tight">{hotDogsMenu.find(h => h.id === 'boi')?.description || 'Salsicha tradicional bovina grelhada.'}</p>
                          {isProductDisabled ? (
                            <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-md mt-1.5 inline-block font-mono">
                              Esgotado
                            </span>
                          ) : (
                              <span className="text-xs font-bold text-brand-red bg-brand-red/10 px-2 py-0.5 rounded-md mt-1.5 inline-block font-mono">
                              R$ {getHotDogPrice('boi').toFixed(2)}
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <span className="absolute top-3 right-3 w-5 h-5 bg-brand-red rounded-full flex items-center justify-center text-white text-[10px]">✓</span>
                        )}
                      </button>
                    );
                  })()}

                  {/* Opção 2: Frango */}
                  {(() => {
                    const isProductDisabled = disabledItems.includes('frango');
                    const isSelected = !isProductDisabled && (type === 'frango' || type === 'boi_frango' || type === 'frango_calabresa');
                    const currentSelected = getSelectedProteins();
                    const isMaxReached = currentSelected.length >= 2;
                    const isDisabled = (isMaxReached && !isSelected) || isProductDisabled;
                    return (
                      <button
                        type="button"
                        onClick={() => !isDisabled && handleToggleProtein('frango')}
                        disabled={isDisabled}
                        className={`relative p-5 rounded-2xl border-2 text-left transition-all ${
                          isSelected
                            ? 'border-brand-red bg-brand-red/5 text-brand-red font-bold cursor-pointer'
                            : isDisabled
                              ? 'border-slate-100 opacity-40 text-slate-400 bg-stone-50/30 cursor-not-allowed'
                              : 'border-slate-155 hover:border-slate-300 text-slate-650 bg-stone-50/50 cursor-pointer'
                        }`}
                      >
                        <div className="flex-1">
                          <p className="text-sm font-extrabold text-slate-900">{hotDogsMenu.find(h => h.id === 'frango')?.name || 'Frango Desfiado'}</p>
                          <p className="text-xs text-slate-500 leading-tight">{hotDogsMenu.find(h => h.id === 'frango')?.description || 'Frango desfiado cremoso e temperado.'}</p>
                          {isProductDisabled ? (
                            <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-md mt-1.5 inline-block font-mono">
                              Esgotado
                            </span>
                          ) : (
                              <span className="text-xs font-bold text-brand-red bg-brand-red/10 px-2 py-0.5 rounded-md mt-1.5 inline-block font-mono">
                              R$ {getHotDogPrice('frango').toFixed(2)}
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <span className="absolute top-3 right-3 w-5 h-5 bg-brand-red rounded-full flex items-center justify-center text-white text-[10px]">✓</span>
                        )}
                      </button>
                    );
                  })()}

                  {/* Opção 3: Calabresa */}
                  {(() => {
                    const isProductDisabled = disabledItems.includes('calabresa');
                    const isSelected = !isProductDisabled && (type === 'calabresa' || type === 'boi_calabresa' || type === 'frango_calabresa');
                    const currentSelected = getSelectedProteins();
                    const isMaxReached = currentSelected.length >= 2;
                    const isDisabled = (isMaxReached && !isSelected) || isProductDisabled;
                    return (
                      <button
                        type="button"
                        onClick={() => !isDisabled && handleToggleProtein('calabresa')}
                        disabled={isDisabled}
                        className={`relative p-5 rounded-2xl border-2 text-left transition-all ${
                          isSelected
                            ? 'border-brand-red bg-brand-red/5 text-brand-red font-bold cursor-pointer'
                            : isDisabled
                              ? 'border-slate-100 opacity-40 text-slate-400 bg-stone-50/30 cursor-not-allowed'
                              : 'border-slate-155 hover:border-slate-300 text-slate-650 bg-stone-50/50 cursor-pointer'
                        }`}
                      >
                        <div className="flex-1">
                          <p className="text-sm font-extrabold text-slate-900">{hotDogsMenu.find(h => h.id === 'calabresa')?.name || 'Calabresa Defumada'}</p>
                          <p className="text-xs text-slate-500 leading-tight">{hotDogsMenu.find(h => h.id === 'calabresa')?.description || 'Calabresa grelhada com cebola na chapa.'}</p>
                          {isProductDisabled ? (
                            <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-md mt-1.5 inline-block font-mono">
                              Esgotado
                            </span>
                          ) : (
                              <span className="text-xs font-bold text-brand-red bg-brand-red/10 px-2 py-0.5 rounded-md mt-1.5 inline-block font-mono">
                              R$ {getHotDogPrice('calabresa').toFixed(2)}
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <span className="absolute top-3 right-3 w-5 h-5 bg-brand-red rounded-full flex items-center justify-center text-white text-[10px]">✓</span>
                        )}
                      </button>
                    );
                  })()}
                </div>
              </motion.div>
            )}

            {/* STEP 2: INGREDIENTES (BÁSICOS E ADICIONAIS) */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.18 }}
              >
                <div className="mb-3">
                  <h3 className="text-base font-extrabold text-slate-800">
                    Passo 2: Escolha os Ingredientes do seu Dogão
                  </h3>
                  <p className="text-xs text-slate-500">
                    Personalize seu lanche ativando ou desativando os ingredientes inclusos do dogão.
                  </p>
                </div>

                <div className="max-h-[280px] overflow-y-auto pr-1 flex flex-col gap-4">
                  {/* Básicos */}
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                      Ingredientes Básicos (Já Inclusos)
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                      {[
                        { key: 'pao' as const, label: 'Pão de Hotdog', desc: 'Pão de hotdog fofinho' },
                        { key: 'salsicha' as const, label: 'Salsicha', desc: 'Salsicha cozida' },
                        { key: 'vinagrete' as const, label: 'Vinagrete Picadinho', desc: 'Tomate fresco e cebola' },
                        { key: 'cenoura' as const, label: 'Cenoura Raladinha', desc: 'Fina e nutritiva' },
                        { key: 'milhoErvilha' as const, label: 'Milho & Ervilha Dupla', desc: 'Docinho e crocante' },
                        { key: 'batataPalha' as const, label: 'Batata Palha Crocante', desc: 'Sempre fresquinha' },
                      ].map(({ key, label, desc }) => {
                        const isProductDisabled = disabledItems.includes(key);
                        const isSelected = baseToppings[key] && !isProductDisabled;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => !isProductDisabled && toggleBaseTopping(key)}
                            disabled={isProductDisabled}
                            className={`p-2.5 rounded-xl flex flex-col items-center justify-center border text-center transition-all ${
                              isProductDisabled
                                ? 'bg-slate-100 opacity-40 border-slate-200 text-slate-400 cursor-not-allowed line-through'
                                : isSelected
                                  ? 'bg-brand-amber/10 border-brand-amber text-brand-amber font-semibold cursor-pointer'
                                  : 'bg-slate-50 border-slate-150 text-slate-400 line-through decoration-slate-350 cursor-pointer'
                            }`}
                          >
                            <h5 className="text-[11px] font-bold leading-tight mb-1">{label}</h5>
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full tracking-wider mt-1 ${
                              isProductDisabled
                                ? 'text-red-750 bg-red-100'
                                : isSelected ? 'text-emerald-700 bg-emerald-100' : 'text-slate-450 bg-slate-150'
                            }`}>
                              {isProductDisabled ? 'ESGOTADO' : isSelected ? 'INCLUSO' : 'REMOVIDO'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: BEBIDAS */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.18 }}
              >
                <div className="mb-3">
                  <h3 className="text-base font-extrabold text-slate-800">
                    Passo 3: Acompanhe com uma Bebida Gelada
                  </h3>
                  <p className="text-xs text-slate-500">
                    Selecione os refrigerantes, sucos ou água para acompanhar o seu dogão divino (opcional).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[280px] overflow-y-auto pr-1">
                  {drinksMenu.map((drink) => {
                    const qty = selectedDrinks[drink.id] || 0;
                    const isProductDisabled = disabledItems.includes(drink.id);
                    
                    return (
                      <div
                        key={drink.id}
                        className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                          isProductDisabled
                            ? 'border-slate-100 bg-stone-50/30 opacity-40 cursor-not-allowed'
                            : qty > 0 
                              ? 'border-brand-red bg-brand-red/5 shadow-2xs' 
                              : 'border-slate-100 bg-stone-50/50 hover:border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-800 leading-tight truncate">{drink.name}</h4>
                            {drink.description && (
                              <p className="text-[10px] text-slate-400 leading-tight mt-0.5 truncate">{drink.description}</p>
                            )}
                            {isProductDisabled ? (
                              <span className="text-[10px] bg-red-100 text-red-750 px-2 py-0.5 rounded-md font-bold mt-0.5 inline-block">
                                Esgotada
                              </span>
                            ) : (
                              <span className="text-xs font-mono font-semibold text-brand-red mt-0.5 block">
                                R$ {drink.price.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stepper */}
                        <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-xl border border-slate-200">
                          {isProductDisabled ? (
                            <button
                              type="button"
                              disabled
                              className="h-6 px-2.5 flex items-center gap-1 bg-slate-200 text-slate-400 rounded-md text-[10px] font-black cursor-not-allowed"
                            >
                              Indisponível
                            </button>
                          ) : qty > 0 ? (
                            <>
                              <button
                                type="button"
                                onClick={() => updateLocalDrinkQty(drink.id, -1)}
                                className="w-6 h-6 flex items-center justify-center bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md transition-all cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-5 text-center font-bold text-xs font-mono text-slate-850">{qty}</span>
                              <button
                                type="button"
                                onClick={() => updateLocalDrinkQty(drink.id, 1)}
                                className="w-6 h-6 flex items-center justify-center bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md transition-all cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => updateLocalDrinkQty(drink.id, 1)}
                              className="h-6 px-2.5 flex items-center gap-1 bg-brand-red hover:bg-brand-red-dark text-white rounded-md text-[10px] font-black transition-all cursor-pointer"
                            >
                              <Plus className="w-2.5 h-2.5" />
                              <span>Adicionar</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* STEP 4: NOTES & QUANTITY / FINALIZE */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col gap-3"
              >
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">
                    Passo 4: Observações e Quantidade do Dogão
                  </h3>
                  <p className="text-xs text-slate-500">
                    Instruções para o chapeiro, quantidade de combos/unidades desejadas e revisão de preço.
                  </p>
                </div>

                {/* Notes Input */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 tracking-wide uppercase mb-1">
                    Como o chefe deve preparar? (Opcional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: sem cebola no vinagrete / bem tostado"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-hidden focus:ring-1 focus:ring-red-500 focus:bg-white placeholder-slate-400 transition-all font-sans"
                  />
                </div>

                {/* Interactive configuration summary */}
                <div className="p-3 bg-brand-red/5 rounded-xl border border-brand-red/10 flex flex-col gap-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-slate-500 font-medium">Dogão personalizado:</span>
                      <p className="font-extrabold text-brand-red capitalize">
                        {getDynamicProteinLabel(type)} {quantity}x
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 font-medium">Valor Unitário</span>
                      <p className="font-mono font-bold text-slate-800">R$ {singlePrice.toFixed(2)}</p>
                    </div>
                  </div>

                  {drinksTotal > 0 && (
                    <div className="border-t border-brand-red/10 pt-2 flex flex-col gap-1">
                      <span className="text-slate-500 font-medium text-[10px] font-black uppercase tracking-wider">Bebidas selecionadas no combo:</span>
                      {Object.entries(selectedDrinks).map(([drinkId, qty]) => {
                        const drink = drinksMenu.find((d) => d.id === drinkId);
                        if (!drink) return null;
                        return (
                          <div key={drinkId} className="flex justify-between text-[11px] text-slate-650">
                            <span>{qty}x {drink.name}</span>
                            <span className="font-mono font-medium">R$ {(drink.price * qty).toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* STEPPER CONTROL BUTTONS */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 mt-4">
          
          {/* Back button */}
          <button
            type="button"
            onClick={handlePrevStep}
            disabled={currentStep === 1}
            className={`px-4 py-3.5 rounded-2xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
              currentStep === 1
                ? 'opacity-40 text-slate-350 cursor-not-allowed'
                : 'text-slate-600 hover:bg-slate-150 border border-slate-200'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>

          {/* Forward or Add Button */}
          {(() => {
            const allProteinsDisabled = disabledItems.includes('boi') && disabledItems.includes('frango') && disabledItems.includes('calabresa');
            const isNextDisabled = allProteinsDisabled || (currentStep === 1 && !type);
            return currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                disabled={isNextDisabled}
                className={`flex-1 font-black py-3.5 px-4 rounded-2xl flex items-center justify-center gap-1.5 text-xs shadow-md transition-all ${
                  isNextDisabled
                    ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed opacity-40'
                    : 'bg-brand-red hover:bg-brand-red-dark text-white hover:shadow-lg cursor-pointer focus:ring-2 focus:ring-brand-amber/40'
                }`}
              >
                <span>Avançar Passo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex-1 flex items-center gap-2">
                
                {/* Hot dog quantity adjust */}
                <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={allProteinsDisabled}
                    className="w-8 h-8 flex items-center justify-center bg-white hover:bg-stone-50 text-slate-800 rounded-lg shadow-2xs border border-stone-200/50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center font-bold font-mono text-slate-800 text-xs">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    disabled={allProteinsDisabled}
                    className="w-8 h-8 flex items-center justify-center bg-white hover:bg-stone-50 text-slate-800 rounded-lg shadow-2xs border border-stone-200/50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Add to Cart button */}
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={allProteinsDisabled}
                  className={`flex-1 font-black py-3.5 px-4 rounded-2xl flex items-center justify-center gap-1.5 text-xs shadow-md transition-all ${
                    allProteinsDisabled
                      ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed opacity-40'
                      : 'bg-brand-red hover:bg-brand-red-dark text-white hover:shadow-lg cursor-pointer focus:ring-2 focus:ring-brand-amber/40'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Adicionar • R$ {totalPrice.toFixed(2)}</span>
                </button>
              </div>
            );
          })()}

        </div>

      </div>
    </div>
  );
}
