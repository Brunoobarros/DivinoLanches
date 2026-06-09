import React from 'react';
import { motion } from 'motion/react';
import { Clock, Crown } from 'lucide-react';

export default function Header() {
  return (
    <header 
      className="relative text-white overflow-hidden shadow-xl border-b-4 border-brand-amber"
      style={{ backgroundImage: 'radial-gradient(circle at center, #8f0f1c 0%, #470208 75%, #230104 100%)' }}
    >
      {/* Subtle brand patterns / ambient highlights */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 left-10 w-96 h-20 bg-brand-amber/10 rotate-6 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 py-4 md:py-5 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
        {/* Logo and Brand Name matching the uploaded artwork 1:1 */}
        <div className="flex flex-row items-center gap-4 text-left">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 180, damping: 15 }}
            className="w-14 h-14 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.4)] relative shrink-0 border-2 border-amber-200/40"
          >
            {/* Crown placed beautifully above and slightly left-titled over the letter D just like the art */}
            <Crown className="w-7 h-7 text-yellow-300 fill-yellow-400 absolute -top-3 -left-1.5 rotate-[-15deg] drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" />
            <span className="text-3xl font-black font-display text-brand-red-dark select-none leading-none pt-0.5">D</span>
          </motion.div>
          
          <div className="flex flex-col">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight font-display text-white uppercase leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
              DIVINO
            </h1>
            <span className="text-[10px] md:text-xs font-extrabold tracking-[0.35em] text-brand-amber uppercase font-sans mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
              LANCHES
            </span>
          </div>
          
          <p className="text-stone-300 text-xs font-sans leading-relaxed max-w-[200px] opacity-80 hidden lg:block border-l border-white/20 pl-4 py-1 ml-2">
            O autêntico sabor artesanal feito com excelência divina.
          </p>
        </div>

        {/* Info badges */}
        <div className="flex flex-wrap justify-center sm:justify-end gap-2.5 text-sm">
          <div className="flex items-center gap-2 bg-black/15 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-white/10">
            <Clock className="w-3.5 h-3.5 text-brand-amber" />
            <div>
              <p className="text-[9px] text-red-200 font-bold uppercase tracking-wider">Funcionamento</p>
              <p className="font-bold text-xs text-white font-mono">18:00 às 23:30</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
