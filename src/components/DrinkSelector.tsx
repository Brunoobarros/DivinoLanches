import React from 'react';
import { motion } from 'motion/react';
import { Drink, DrinkCartItem } from '../types';
import { DRINKS_MENU } from '../constants';
import { Plus, Minus, GlassWater, Flame } from 'lucide-react';

interface DrinkSelectorProps {
  drinksInCart: DrinkCartItem[];
  onUpdateDrinkQty: (drinkId: string, delta: number) => void;
}

export default function DrinkSelector({ drinksInCart, onUpdateDrinkQty }: DrinkSelectorProps) {
  
  // Helper to discover active quantity in cart
  const getQtyInCart = (drinkId: string): number => {
    const item = drinksInCart.find((d) => d.drinkId === drinkId);
    return item ? item.quantity : 0;
  };

  // Map local visual emojis/styles based on name
  const getDrinkStyle = (id: string) => {
    switch (id) {
      case 'coca_lata':
        return { emoji: '🥤', bgColor: 'bg-red-500/10 border-red-500/30 text-red-700', activeBg: 'bg-red-500/20' };
      case 'guarana_lata':
        return { emoji: '🟢', bgColor: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700', activeBg: 'bg-emerald-500/20' };
      case 'fanta_lata':
        return { emoji: '🍊', bgColor: 'bg-orange-500/10 border-orange-500/30 text-orange-700', activeBg: 'bg-orange-500/20' };
      case 'suco_laranja':
        return { emoji: '🍹', bgColor: 'bg-amber-400/10 border-amber-400/30 text-amber-700', activeBg: 'bg-amber-400/20' };
      default:
        return { emoji: '💧', bgColor: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-700', activeBg: 'bg-cyan-500/20' };
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-amber-100 shadow-sm">
      <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-4">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600 text-xs font-bold">2</span>
        Bebidas Geladas
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {DRINKS_MENU.map((drink) => {
          const qty = getQtyInCart(drink.id);
          const style = getDrinkStyle(drink.id);

          return (
            <div
              key={drink.id}
              className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                qty > 0 
                  ? 'border-red-500 bg-red-50/20 shadow-xs' 
                  : 'border-slate-100 bg-stone-50/50 hover:border-slate-250'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{style.emoji}</span>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 leading-tight">{drink.name}</h4>
                  <span className="text-xs font-mono font-semibold text-red-600 mt-0.5 block">
                    R$ {drink.price.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Stepper */}
              <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-slate-200">
                {qty > 0 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onUpdateDrinkQty(drink.id, -1)}
                      className="w-7 h-7 flex items-center justify-center bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md transition-all cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center font-bold text-sm font-mono text-slate-800">{qty}</span>
                    <button
                      type="button"
                      onClick={() => onUpdateDrinkQty(drink.id, 1)}
                      className="w-7 h-7 flex items-center justify-center bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => onUpdateDrinkQty(drink.id, 1)}
                    className="h-7 px-3 flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-bold transition-all cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Adicionar</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
