import React from 'react';

interface LiquidCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  icon?: React.ReactNode;
}

export const LiquidCard: React.FC<LiquidCardProps> = ({ children, className = '', title, icon }) => {
  return (
    <div className={`relative group overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-[0_20px_40px_0_rgba(0,0,0,0.4)] hover:bg-white/[0.07] ${className}`}>
      {/* Glossy sheen effect */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-400/30 transition-all duration-700 ease-in-out" />
      
      <div className="p-6 relative z-10 h-full flex flex-col">
        {(title || icon) && (
          <div className="flex items-center gap-3 mb-4 border-b border-white/5 pb-2">
            {icon && <div className="text-cyan-300">{icon}</div>}
            {title && <h3 className="text-lg font-semibold text-white/90 tracking-wide">{title}</h3>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
};