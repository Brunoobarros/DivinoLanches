import React from 'react';
import { motion } from 'motion/react';
import { Clock } from 'lucide-react';
import logoImg from '../../assets/logo.png';

export default function Header() {
  return (
    <header className="relative bg-linear-to-r from-brand-red-dark via-brand-red to-brand-red-dark text-white overflow-hidden shadow-md border-b-4 border-brand-amber">
      {/* Subtle brand patterns / ambient highlights */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 left-10 w-96 h-20 bg-brand-amber/15 rotate-6 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 py-3 md:py-4 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
        {/* Logo and Brand Name matching the uploaded artwork 1:1 */}
        <div className="flex flex-row items-center gap-4 text-left">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 180, damping: 15 }}
            className="shrink-0"
          >
            <img 
              src={logoImg} 
              alt="Divino Lanches Logo" 
              className="h-14 md:h-18 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]" 
            />
          </motion.div>
          
          <p className="text-stone-200 text-xs font-sans leading-relaxed max-w-[200px] opacity-90 hidden lg:block border-l border-white/20 pl-4 py-1">
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
          <div className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-1.5 rounded-xl shadow-xs border border-emerald-500/30 font-sans font-bold text-xs uppercase tracking-wider">
            <span className="w-1.5 h-1.5 bg-white rounded-full block animate-ping" />
            <span className="text-[10px]">Aberto</span>
          </div>
        </div>
      </div>
    </header>
  );
}
