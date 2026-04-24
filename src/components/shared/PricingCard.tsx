'use client';

import { Check, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface PricingCardProps {
  title: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  aiFeatures?: string[];
  isPopular?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  onAction?: () => void;
  loading?: boolean;
  icon?: React.ReactNode;
}

export default function PricingCard({ 
  title, 
  price, 
  period = '/mês',
  description, 
  features, 
  aiFeatures = [],
  isPopular,
  isSelected,
  onClick,
  onAction,
  loading,
  icon
}: PricingCardProps) {
  return (
    <motion.div 
      onClick={onClick}
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.98 }}
      className={`relative flex flex-col rounded-2xl border bg-card p-6 transition-all cursor-pointer ${
        isSelected
            ? 'border-accent-icon shadow-xl shadow-accent-icon/10 ring-1 ring-accent-icon'
            : 'border-muted-foreground/50 hover:border-accent-icon/20'
      }`}
    >
      {isPopular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#FFE600] px-4 py-0.5 text-xs font-bold text-black z-10">
          Mais Popular
        </div>
      )}

      <div className="mb-4 flex items-center gap-2 text-left">
        <div className={`flex h-9 w-9 items-center justify-center rounded-full ${isPopular ? 'bg-accent-icon/20' : 'bg-white/5'}`}>
          {icon || <Sparkles className="h-5 w-5 text-accent-icon" />}
        </div>
        <div>
          <p className="font-bold text-foreground text-base">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="mb-6 text-left">
        <span className="text-3xl font-bold text-foreground">{price}</span>
        <span className="text-sm text-muted-foreground ml-1">{period}</span>
      </div>

      <ul className="mb-4 flex-1 space-y-2.5 text-left">
        {features.map((f, index) => {
          const hasNoIcon = f.startsWith('[no-icon]');
          const displayText = hasNoIcon ? f.replace('[no-icon]', '').trim() : f;
          return (
            <li key={index} className={`flex items-start gap-2 text-sm text-foreground/80 ${hasNoIcon ? 'ml-6' : ''}`}>
              {!hasNoIcon && <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#00B087]" />}
              {displayText}
            </li>
          );
        })}
      </ul>

      {aiFeatures.length > 0 && (
        <div className="mb-6 rounded-xl bg-accent-icon/5 p-3 space-y-2 border border-accent-icon/10 text-left">
          <p className="flex items-center gap-1.5 text-xs font-black text-accent-icon uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" /> Inteligência Artificial
          </p>
          {aiFeatures.map((f, index) => {
            const hasNoIcon = f.startsWith('[no-icon]');
            const displayText = hasNoIcon ? f.replace('[no-icon]', '').trim() : f.replace('IA: ', '');
            return (
              <p key={index} className={`flex items-start gap-2 text-xs text-foreground/80 ${hasNoIcon ? 'ml-5' : ''}`}>
                {!hasNoIcon && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-icon" />}
                {displayText}
              </p>
            );
          })}
        </div>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          onAction?.();
        }}
        disabled={loading}
        className={`flex w-full items-center justify-center gap-2 rounded-lg py-3 text-center text-sm font-bold transition-all active:scale-[0.99] disabled:opacity-50 ${
          isSelected
            ? 'bg-[#FFE600] text-black hover:bg-[#F2DB00] shadow-lg shadow-accent-icon/20'
            : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
        }`}
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          isSelected ? 'Começar Agora' : 'Selecionar'
        )}
      </button>
    </motion.div>
  );
}
