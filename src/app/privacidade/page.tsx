'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowLeft, ShieldCheck, Lock, Eye } from 'lucide-react';
import { laxPrivacyPolicy } from '@/docs/lax-automacoes/privacy';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0A0D0D] text-white selection:bg-[#FFE600] selection:text-[#404F4F]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#1A2020]/80 backdrop-blur-md border-b border-white/5 px-6 py-4">
        <div className="container mx-auto max-w-[1200px] flex items-center justify-between">
          <Link href="/conheca" className="flex items-center gap-2 group">
            <div className="p-2 bg-white/5 rounded-lg group-hover:bg-[#FFE600] group-hover:text-[#404F4F] transition-all">
              <ArrowLeft size={20} />
            </div>
            <span className="text-sm font-bold text-gray-400 group-hover:text-white transition-colors">Voltar para o Início</span>
          </Link>
          <Image 
            src="/logo-full.png" 
            alt="CRM LAX" 
            width={140} 
            height={40} 
            className="h-9 w-auto object-contain"
          />
          <div className="w-[120px] hidden md:block" /> {/* Spacer */}
        </div>
      </header>

      <main className="pt-32 pb-24 px-6">
        <div className="container mx-auto max-w-[800px]">
          {/* Hero Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16 space-y-6"
          >
            <div className="inline-flex items-center justify-center p-4 bg-[#FFE600]/10 rounded-2xl mb-4">
              <ShieldCheck className="text-[#FFE600] w-12 h-12" />
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Política de Privacidade</h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto font-medium">
              Sua privacidade é a nossa prioridade. Entenda como protegemos seus dados na plataforma CRM LAX.
            </p>
            <div className="flex items-center justify-center gap-6 text-xs font-bold uppercase tracking-widest text-gray-500">
              <span className="flex items-center gap-2"><Lock size={14} className="text-[#FFE600]" /> Dados Protegidos</span>
              <span className="flex items-center gap-2"><Eye size={14} className="text-[#FFE600]" /> Transparência Total</span>
            </div>
          </motion.div>

          {/* Content Card */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#1A2020] border border-white/10 rounded-[32px] p-8 md:p-12 shadow-2xl relative overflow-hidden"
          >
            {/* Decorative element */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFE600]/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />

            <div className="prose prose-invert prose-lg max-w-none relative z-10">
              <p className="text-gray-300 leading-relaxed whitespace-pre-wrap font-medium">
                {laxPrivacyPolicy}
              </p>
            </div>

            <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-gray-500 text-sm">
                Última atualização: <span className="text-gray-400 font-bold">12 de Abril, 2026</span>
              </div>
              <Link 
                href="/conheca" 
                className="bg-[#FFE600] text-[#404F4F] px-8 py-3 rounded-xl text-sm font-bold hover:bg-[#F2DB00] transition-all transform active:scale-95 shadow-lg shadow-[#FFE600]/10"
              >
                Aceitar e Voltar
              </Link>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer minimal */}
      <footer className="py-12 border-t border-white/5 text-center">
        <p className="text-gray-600 text-xs font-bold uppercase tracking-widest">
          &copy; {new Date().getFullYear()} CRM LAX - LAX Automações
        </p>
      </footer>
    </div>
  );
}
