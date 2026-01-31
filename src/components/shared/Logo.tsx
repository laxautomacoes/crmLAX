import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  src?: string;
  height?: number;
  loading?: boolean;
}

export function Logo({ className = '', size = 'md', src, height, loading }: LogoProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const defaultHeight = size === 'sm' ? 40 : size === 'md' ? 48 : 100;
  
  // O height passado como prop tem precedência sobre o default do tamanho
  let logoHeight = height || defaultHeight;
  
  // Para o tamanho 'md' (Sidebar/Header), limitamos o máximo para não quebrar o layout
  if (size === 'md') {
    logoHeight = Math.min(logoHeight, 60); 
  }
  
  // No tamanho LG (login ou preview), garantimos que o height seja respeitado
  // Se não houver height definido e for LG, usamos 100px para manter o padrão 2:1 sugerido
  if (size === 'lg' && !height) {
    logoHeight = 100;
  }

  if (loading) {
    return (
      <div 
        className={`flex items-center justify-center ${className}`} 
        style={{ height: `${logoHeight}px` }}
      />
    );
  }

  if (src) {
    return (
      <div className={`flex items-center justify-center gap-2 ${className}`}>
        <img 
          src={src} 
          alt="Logo" 
          style={{ 
            height: `${logoHeight}px`,
            width: `${logoHeight * 2}px` // Mantém a proporção 2:1 visualmente
          }} 
          className="object-contain block max-w-full"
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <div className={`${sizeClasses[size]} font-bold tracking-tight text-center`}>
        CRM <span className="text-secondary inline-block transform -skew-x-12">LAX</span>
      </div>
    </div>
  );
}
