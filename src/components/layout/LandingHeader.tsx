'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function LandingHeader() {
  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 bg-[#1A2020]/80 backdrop-blur-md border-b border-white/5"
    >
      <div className="flex items-center gap-2">
        <Image 
          src="/logo-full.png" 
          alt="CRM LAX" 
          width={180} 
          height={48} 
          className="h-11 w-auto object-contain"
          priority
        />
      </div>

      <nav className="hidden md:flex items-center gap-8">
        <a href="#funcoes" className="text-base font-bold text-white hover:opacity-80 transition-opacity">
          Funcionalidades
        </a>
        <a href="#planos" className="text-base font-bold text-white hover:opacity-80 transition-opacity">
          Planos
        </a>
        <a href="#garantias" className="text-base font-bold text-white hover:opacity-80 transition-opacity">
          Garantias
        </a>
      </nav>

      <div className="flex items-center gap-4">
        <Link 
          href="/login" 
          className="text-sm font-bold text-white hover:text-[#FFE600] transition-colors"
        >
          Entrar
        </Link>
        <a 
          href="#planos" 
          className="bg-[#FFE600] text-[#404F4F] px-5 py-2 rounded-lg text-sm font-bold hover:bg-[#F2DB00] transition-all transform active:scale-95 shadow-sm"
        >
          Criar Conta
        </a>
      </div>
    </motion.header>
  );
}
