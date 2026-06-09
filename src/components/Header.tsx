import React from 'react';
import { motion } from 'motion/react';
import { Clock } from 'lucide-react';
import logoImg from '../../assets/logo.png';

export default function Header() {
  return (
    <header 
      className="relative text-white overflow-hidden shadow-xl border-b-4 border-brand-amber"
      style={{ backgroundImage: 'radial-gradient(circle at center, #8f0f1c 0%, #470208 75%, #230104 100%)' }}
    >
      {/* Subtle brand patterns / ambient highlights */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 left-10 w-96 h-20 bg-brand-amber/10 rotate-6 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 py-3 md:py-4 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
        {/* Logo Image on the Left */}
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
              className="h-16 md:h-20 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]" 
            />
          </motion.div>
          
          <p className="text-stone-300 text-xs font-sans leading-relaxed max-w-[200px] opacity-80 hidden lg:block border-l border-white/20 pl-4 py-1 ml-2">
            O autêntico sabor artesanal feito com excelência divina.
          </p>
        </div>

        {/* Functioning hours on the Right */}
        <div className="flex flex-wrap justify-center sm:justify-end gap-2.5 text-sm">
          <div className="flex items-center gap-2 bg-black/20 backdrop-blur-xs px-4 py-2 rounded-2xl border border-white/10 shadow-inner">
            <Clock className="w-4 h-4 text-brand-amber" />
            <div>
              <p className="text-[9px] text-red-200 font-bold uppercase tracking-wider leading-none mb-1">Funcionamento</p>
              <p className="font-bold text-xs text-white font-mono leading-none">18:00 às 23:30</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
