import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HotDogType, BaseToppings, ExtraToppings } from '../types';
import { PROTEIN_LABELS } from '../constants';

interface HotDogVisualBuilderProps {
  type: HotDogType;
  baseToppings: BaseToppings;
  extras: ExtraToppings;
}

export default function HotDogVisualBuilder({
  type,
  baseToppings,
  extras,
}: HotDogVisualBuilderProps) {
  return (
    <div className="relative w-full h-64 bg-amber-50/40 rounded-3xl border-2 border-dashed border-amber-200 overflow-hidden flex flex-col items-center justify-center p-4 shadow-inner">
      <div className="absolute top-3 left-4 text-xs font-mono text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
        Visualizador Interativo
      </div>

      <div className="relative w-72 h-44 flex items-center justify-center">
        {/* Bread Back / Bun bottom */}
        <div 
          className="absolute w-64 h-16 bg-amber-600 rounded-b-full shadow-md z-10 bottom-8 border-b-4 border-amber-700" 
          style={{ transform: 'rotate(-2deg)' }}
        />

        {/* Protein: Salsicha (Boi), Frango Desfiado (Chicken), and/or Calabresa */}
        <AnimatePresence>
          {(type === 'boi' || type === 'boi_frango' || type === 'boi_calabresa') && (
            <motion.div
              key="sausage"
              initial={{ y: -60, opacity: 0, rotate: -5 }}
              animate={{ y: -2, opacity: 1, rotate: -2 }}
              exit={{ y: 30, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="absolute w-60 h-8 bg-red-500 rounded-full z-20 bottom-12 border-t-2 border-red-400 border-b-2 border-red-600 shadow-inner"
              title="Salsicha de Boi"
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {(type === 'calabresa' || type === 'boi_calabresa' || type === 'frango_calabresa') && (
            <motion.div
              key="calabresa"
              initial={{ y: -60, opacity: 0, rotate: 5 }}
              animate={{ y: -2, opacity: 1, rotate: 1 }}
              exit={{ y: 30, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="absolute w-60 h-8 bg-red-950 rounded-full z-21 bottom-13 border-t-2 border-red-800 border-b-2 border-stone-900 shadow-inner"
              title="Calabresa Defumada"
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {(type === 'frango' || type === 'boi_frango' || type === 'frango_calabresa') && (
            <motion.div
              key="chicken"
              initial={{ y: -60, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 30, opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="absolute w-56 h-10 bg-amber-400 rounded-full z-22 bottom-11 flex flex-wrap justify-around items-center px-4 overflow-hidden border border-amber-500 shadow-sm"
              title="Frango Cremoso Desfiado"
            >
              {/* Shredded texture look */}
              <div className="w-4 h-3 bg-amber-200/80 rounded-full rotate-45" />
              <div className="w-5 h-2 bg-amber-300 rounded-full -rotate-12" />
              <div className="w-6 h-3 bg-amber-200/90 rounded-full rotate-30" />
              <div className="w-4 h-2 bg-amber-300 rounded-full rotate-12" />
              <div className="w-5 h-3 bg-amber-100 rounded-full -rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Base Topping: Milho e Ervilha */}
        <AnimatePresence>
          {baseToppings.milhoErvilha && (
            <motion.div
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute w-52 h-6 z-30 bottom-14 flex justify-around px-8"
            >
              {/* Peas and Corn Seeds */}
              <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-xs self-start" />
              <div className="w-3.5 h-3.5 bg-yellow-400 rounded-full shadow-xs self-end" />
              <div className="w-3.5 h-3.5 bg-yellow-300 rounded-full shadow-xs self-center" />
              <div className="w-3 h-3 bg-emerald-600 rounded-full shadow-xs self-center" />
              <div className="w-3.5 h-3.5 bg-yellow-400 rounded-full shadow-xs self-start" />
              <div className="w-3.5 h-3.5 bg-yellow-300 rounded-full shadow-xs self-end" />
              <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-xs self-center" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Base Topping: Cenoura Ralada */}
        <AnimatePresence>
          {baseToppings.cenoura && (
            <motion.div
              initial={{ y: -50, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute w-52 h-6 z-32 bottom-15 flex flex-wrap justify-between items-center px-4"
            >
              <div className="w-6 h-1 bg-orange-500 rounded-full rotate-45" />
              <div className="w-5 h-1.5 bg-orange-600 rounded-full -rotate-12" />
              <div className="w-4 h-1 bg-orange-400 rounded-full rotate-45" />
              <div className="w-7 h-1 bg-orange-500 rounded-full -rotate-45" />
              <div className="w-5 h-1 bg-orange-600 rounded-full rotate-12" />
              <div className="w-6 h-1 bg-orange-400 rounded-full -rotate-30" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Base Topping: Vinagrete */}
        <AnimatePresence>
          {baseToppings.vinagrete && (
            <motion.div
              initial={{ y: -45, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28 }}
              className="absolute w-52 h-8 z-35 bottom-12 flex flex-wrap justify-around px-6"
            >
              {/* Tomato and Onion cubes */}
              <div className="w-2.5 h-2.5 bg-red-600 rounded-xs rotate-12 shadow-xs" />
              <div className="w-2.5 h-2.5 bg-slate-100 rounded-xs -rotate-45 shadow-xs border border-slate-200" />
              <div className="w-3 h-3 bg-red-700 rounded-xs rotate-3 shadow-xs" />
              <div className="w-2 h-2 bg-emerald-700 rounded-full" /> {/* coriander touchs */}
              <div className="w-2.5 h-2.5 bg-slate-100 rounded-xs rotate-45 shadow-xs border border-slate-200" />
              <div className="w-3 h-3 bg-red-600 rounded-xs -rotate-12 shadow-xs" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Extra Topping: Queijo Derretido */}
        <AnimatePresence>
          {extras.queijo && (
            <motion.div
              initial={{ opacity: 0, y: -25, scaleY: 0.3 }}
              animate={{ opacity: 0.95, y: 0, scaleY: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 120 }}
              className="absolute w-56 h-10 z-40 bottom-12 bg-amber-200/90 rounded-full shadow-md backdrop-blur-3xs border-b-2 border-amber-300"
              style={{ borderRadius: '40% 40% 20% 20%' }}
            >
              {/* Cheese drip blobs */}
              <div className="absolute w-5 h-5 bg-amber-200 rounded-full -bottom-2 left-6" />
              <div className="absolute w-4 h-6 bg-amber-200 rounded-full -bottom-3 left-24" />
              <div className="absolute w-5 h-4 bg-amber-200 rounded-full -bottom-1 right-8" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Extra Topping: Batata Palha */}
        <AnimatePresence>
          {baseToppings.batataPalha && (
            <motion.div
              initial={{ y: -60, opacity: 0, scale: 0.7 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 140 }}
              className="absolute w-54 h-8 z-42 bottom-14 flex flex-wrap justify-between px-2 overflow-hidden"
            >
              {/* Tons of light golden matchsticks */}
              <div className="w-5 h-1 bg-yellow-200 rounded-full rotate-45 shadow-2xs" />
              <div className="w-6 h-1 bg-yellow-300 rounded-full -rotate-12" />
              <div className="w-4 h-1 bg-yellow-200 rounded-full rotate-30" />
              <div className="w-5 h-1 bg-yellow-300 rounded-full -rotate-45" />
              <div className="w-5 h-1 bg-yellow-100 rounded-full rotate-12" />
              <div className="w-6 h-1 bg-yellow-300 rounded-full rotate-45" />
              <div className="w-4 h-1 bg-yellow-200 rounded-full -rotate-30" />
              <div className="w-5 h-1 bg-yellow-300 rounded-full rotate-15" />
              <div className="w-5 h-1 bg-yellow-100 rounded-full -rotate-15" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Extra Toppings: Sauces (Molhos) */}
        {/* Molho Verde */}
        <AnimatePresence>
          {extras.molhoVerde && (
            <motion.svg
              initial={{ strokeDasharray: 100, strokeDashoffset: 100 }}
              animate={{ strokeDashoffset: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="absolute w-52 h-12 z-45 bottom-12 stroke-lime-500 fill-none stroke-[4px]"
              viewBox="0 0 100 20"
            >
              <path d="M5,10 Q15,0 25,10 T45,10 T65,10 T85,10 T95,10" strokeLinecap="round" />
            </motion.svg>
          )}
        </AnimatePresence>

        {/* Molho Barbecue */}
        <AnimatePresence>
          {extras.molhoBarbecue && (
            <motion.svg
              initial={{ strokeDasharray: 100, strokeDashoffset: 100 }}
              animate={{ strokeDashoffset: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
              className="absolute w-52 h-12 z-46 bottom-11 stroke-amber-950 fill-none stroke-[3.5px]"
              viewBox="0 0 100 20"
            >
              <path d="M10,8 Q20,18 30,8 T50,8 T70,8 T90,8" strokeLinecap="round" />
            </motion.svg>
          )}
        </AnimatePresence>

        {/* Molho Especial Divino */}
        <AnimatePresence>
          {extras.molhoEspecial && (
            <motion.svg
              initial={{ strokeDasharray: 100, strokeDashoffset: 100 }}
              animate={{ strokeDashoffset: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
              className="absolute w-52 h-12 z-47 bottom-10 stroke-orange-500 fill-none stroke-[3px]"
              viewBox="0 0 100 20"
            >
              <path d="M2,15 C20,-5 40,30 60,10 C80,-10 90,20 100,10" strokeLinecap="round" />
            </motion.svg>
          )}
        </AnimatePresence>

        {/* Bread Front / Bun top */}
        <div 
          className="absolute w-64 h-12 bg-amber-500 rounded-t-full bg-linear-to-b from-amber-400 to-amber-600 opacity-90 z-48 bottom-12 border-t-2 border-amber-300"
          style={{ transform: 'rotate(-2deg)' }}
        />
      </div>

      <div className="text-center mt-2">
        <span className="text-xs text-amber-900 bg-amber-100/60 px-3 py-1 rounded-full font-medium">
          Hot Dog de{' '}
          <strong className="text-red-700 capitalize font-bold">
            {PROTEIN_LABELS[type] || type}
          </strong>
        </span>
      </div>
    </div>
  );
}
