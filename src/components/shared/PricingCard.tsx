'use client';

import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface FeatureObject {
  content: React.ReactNode;
  hideIcon?: boolean;
}

interface PricingCardProps {
  title: string;
  price: string;
  description: string;
  features: (React.ReactNode | FeatureObject)[];
  isPopular?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
}

export default function PricingCard({ 
  title, 
  price, 
  description, 
  features, 
  isPopular,
  isSelected,
  onClick
}: PricingCardProps) {
  return (
    <motion.div 
      onClick={onClick}
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.98 }}
      className={`relative p-8 rounded-2xl border transition-all cursor-pointer flex flex-col h-full ${
        isSelected 
          ? 'border-[#FFE600] bg-[#1A2020] shadow-xl ring-1 ring-[#FFE600]' 
          : 'border-white/5 bg-[#1A2020] hover:border-[#FFE600]/20 shadow-sm'
      }`}
    >
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#FFE600] text-[#404F4F] px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider z-10">
          Mais Popular
        </div>
      )}

      <div className="mb-8">
        <h3 className="text-xl md:text-2xl font-black text-[#FFE600] mb-2 tracking-tight uppercase">{title}</h3>
        <p className="text-sm text-white font-medium leading-relaxed">{description}</p>
      </div>

      <div className="mb-8">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-white">{price}</span>
          {price !== 'Grátis' && <span className="text-white font-medium">/mês</span>}
        </div>
      </div>

      <ul className="space-y-4 mb-10">
        {features.map((feature, index) => {
          const isObject = typeof feature === 'object' && feature !== null && 'content' in feature;
          const content = isObject ? (feature as FeatureObject).content : feature;
          const hideIcon = isObject ? (feature as FeatureObject).hideIcon : false;

          return (
            <li key={index} className="flex items-start gap-3">
              {!hideIcon && (
                <div className="mt-1 bg-white/5 rounded-full p-0.5">
                  <Check className="w-4 h-4 text-[#FFE600]" />
                </div>
              )}
              <span className={`text-sm font-medium ${typeof content === 'string' ? 'text-gray-300' : ''} ${hideIcon ? 'flex-1' : ''}`}>
                {content}
              </span>
            </li>
          );
        })}
      </ul>

      <Link
        href="/register"
        className={`mt-auto block w-full py-3 px-6 rounded-lg text-sm font-bold text-center transition-all ${
          isSelected
            ? 'bg-[#FFE600] text-[#404F4F] hover:bg-[#F2DB00] shadow-md active:scale-95'
            : 'bg-white/10 text-white hover:bg-white/20 active:scale-95 border border-white/10'
        }`}
      >
        Começar Agora
      </Link>
    </motion.div>
  );
}
