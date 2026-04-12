'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Instagram, 
  Linkedin, 
  Facebook, 
  Youtube, 
  MessageCircle,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { laxPrivacyPolicy } from '@/docs/lax-automacoes/privacy';
import { laxTermsOfService } from '@/docs/lax-automacoes/terms';

interface LandingFooterProps {
  branding?: any;
}

export default function LandingFooter({ branding }: LandingFooterProps) {

  const address = branding?.address;
  const social = branding?.social_links;

  const socialIcons = [
    { id: 'instagram', icon: <Instagram size={20} />, href: social?.instagram },
    { id: 'facebook', icon: <Facebook size={20} />, href: social?.facebook },
    { id: 'linkedin', icon: <Linkedin size={20} />, href: social?.linkedin },
    { id: 'youtube', icon: <Youtube size={20} />, href: social?.youtube },
    { id: 'whatsapp', icon: <MessageCircle size={20} />, href: social?.whatsapp },
  ].filter(s => s.href);

  return (
    <footer className="pt-20 pb-12 bg-[#0A0D0D] border-t border-white/5 relative overflow-hidden">
      <div className="container mx-auto px-6 max-w-[1200px] relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          {/* Brand & About */}
          <div className="md:col-span-1 space-y-6">
            <Image 
              src="/logo-full.png" 
              alt="CRM LAX" 
              width={180} 
              height={50} 
              className="h-12 w-auto object-contain opacity-90"
            />
            <p className="text-gray-400 text-sm leading-relaxed font-medium">
              O CRM LAX é a solução líder em automação e inteligência artificial para o mercado imobiliário brasileiro.
            </p>
            <div className="flex items-center gap-4">
              {socialIcons.map((s) => (
                <a
                  key={s.id}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-400 hover:text-[#FFE600] border border-white/5 hover:border-[#FFE600]/30 rounded-xl bg-white/5 transition-all"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h4 className="text-white font-bold text-lg">Navegação</h4>
            <ul className="space-y-4">
              <li><a href="#funcoes" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 group"><div className="w-1.5 h-1.5 rounded-full bg-white/10 group-hover:bg-[#FFE600] transition-all" /> Funcionalidades</a></li>
              <li><a href="#planos" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 group"><div className="w-1.5 h-1.5 rounded-full bg-white/10 group-hover:bg-[#FFE600] transition-all" /> Planos</a></li>
              <li><a href="#garantias" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 group"><div className="w-1.5 h-1.5 rounded-full bg-white/10 group-hover:bg-[#FFE600] transition-all" /> Garantias</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-6">
            <h4 className="text-white font-bold text-lg">Suporte & Legal</h4>
            <ul className="space-y-4">
              <li>
                <Link 
                  href="/privacidade" 
                  className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 group"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-white/10 group-hover:bg-[#FFE600] transition-all" /> 
                  Privacidade
                </Link>
              </li>
              <li>
                <Link 
                  href="/termos" 
                  className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 group"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-white/10 group-hover:bg-[#FFE600] transition-all" /> 
                  Termos de Uso
                </Link>
              </li>
              <li>
                <a href="mailto:contato@laxperience.online" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 group">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/10 group-hover:bg-[#FFE600] transition-all" /> 
                  Falar com o Suporte
                </a>
              </li>
            </ul>
          </div>

          {/* Address */}
          <div className="space-y-6">
            <h4 className="text-white font-bold text-lg">Localização</h4>
            {address ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-white/5 border border-white/5 rounded-2xl">
                  <MapPin className="text-[#FFE600] w-5 h-5 shrink-0 mt-1" />
                  <div className="text-gray-400 text-sm font-medium leading-relaxed">
                    {address.street}, {address.number}
                    {address.complement && <><br />{address.complement}</>}
                    <br />
                    {address.neighborhood} - {address.city}, {address.state}
                    <br />
                    CEP: {address.zip_code}
                  </div>
                </div>
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address.street}, ${address.number}, ${address.city}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-bold text-[#FFE600] hover:underline"
                >
                  Ver no Google Maps <ExternalLink size={12} />
                </a>
              </div>
            ) : (
              <p className="text-gray-500 text-sm italic">Informações de localização indisponíveis.</p>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-xs font-medium">
            &copy; {new Date().getFullYear()} CRM LAX. Desenvolvido por <span className="text-gray-400 font-bold">LAX Automações</span>. 
            Alguns direitos reservados.
          </p>
          <div className="flex items-center gap-6">
            <span className="text-gray-600 text-[10px] uppercase font-bold tracking-widest">v2.4.0</span>
            <div className="flex items-center gap-2 h-4">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Sistema Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Blur */}
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#FFE600]/5 rounded-full blur-[100px] translate-y-1/2 translate-x-1/2 pointer-events-none" />
    </footer>
  );
}
