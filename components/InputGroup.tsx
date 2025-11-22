import React from 'react';

interface InputGroupProps {
  label: string | React.ReactNode;
  value: number | string;
  onChange: (val: string) => void;
  placeholder?: string;
  unit?: string;
  type?: 'text' | 'number';
  readOnly?: boolean;
  step?: string;
}

export const InputGroup: React.FC<InputGroupProps> = ({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  unit, 
  type = 'number',
  readOnly = false,
  step = "0.001"
}) => {
  return (
    <div className="flex flex-col gap-1.5 group/input">
      <label className="text-xs font-medium text-slate-500 dark:text-blue-200/70 uppercase tracking-wider ml-1 transition-colors group-focus-within/input:text-cyan-600 dark:group-focus-within/input:text-cyan-300">
        {label}
      </label>
      <div className={`relative flex items-center rounded-2xl border transition-all duration-300 ease-out transform ${
        readOnly 
          ? 'bg-slate-100 border-slate-200 dark:bg-white/5 dark:border-white/5 opacity-70' 
          : 'bg-white/50 border-slate-200 dark:bg-black/20 dark:border-white/10 focus-within:border-cyan-400/50 focus-within:shadow-[0_0_25px_rgba(34,211,238,0.15)] focus-within:scale-[1.02] focus-within:bg-white dark:focus-within:bg-black/30 hover:border-cyan-500/30 dark:hover:border-white/20'
      }`}>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          step={step}
          className={`w-full bg-transparent px-4 py-3 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-white/20 transition-colors ${readOnly ? 'cursor-not-allowed text-slate-500 dark:text-white/50' : ''}`}
        />
        {unit && (
          <span className="pr-4 text-xs font-medium text-slate-400 dark:text-white/40 select-none">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
};