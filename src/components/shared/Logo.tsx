import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  src?: string;
  height?: number;
}

export function Logo({ className = '', size = 'md', src, height }: LogoProps) {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  const defaultHeight = size === 'sm' ? 32 : size === 'md' ? 40 : 220;
  let logoHeight = height || defaultHeight;
  
  if (size === 'lg' && (!height || height < 220)) {
    logoHeight = 220;
  }

  if (src) {
    return (
      <div className={`flex items-center justify-center gap-2 ${className}`}>
        <img 
          src={src} 
          alt="Logo" 
          style={{ height: `${logoHeight}px` }} 
          className="object-contain w-auto block max-w-full"
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
