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
  
    const socialItems = [
        { id: 'instagram', name: 'Instagram', icon: <Instagram size={18} />, href: social?.instagram },
        { id: 'facebook', name: 'Facebook', icon: <Facebook size={18} />, href: social?.facebook },
        { id: 'linkedin', name: 'LinkedIn', icon: <Linkedin size={18} />, href: social?.linkedin },
        { id: 'youtube', name: 'YouTube', icon: <Youtube size={18} />, href: social?.youtube },
        { id: 'whatsapp', name: 'WhatsApp', icon: <MessageCircle size={18} />, href: social?.whatsapp },
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

          {/* Social Networks */}
          <div className="space-y-6">
            <h4 className="text-white font-bold text-lg">Redes Sociais</h4>
            {socialItems.length > 0 ? (
              <ul className="space-y-4">
                {socialItems.map((s) => (
                  <li key={s.id}>
                    <a 
                      href={s.href} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white transition-colors flex items-center gap-3 group"
                    >
                      <div className="p-2 rounded-lg bg-white/5 border border-white/5 group-hover:bg-[#FFE600]/10 group-hover:border-[#FFE600]/30 group-hover:text-[#FFE600] transition-all">
                        {s.icon}
                      </div>
                      <span className="font-medium">{s.name}</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm italic">Nenhuma rede social configurada.</p>
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
