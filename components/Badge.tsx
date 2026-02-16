
import React from 'react';

interface BadgeProps {
  label: string;
  variant?: 'danger' | 'success' | 'warning' | 'info' | 'neutral';
}

const Badge: React.FC<BadgeProps> = ({ label, variant = 'neutral' }) => {
  const styles = {
    danger: 'bg-red-500 text-white',
    success: 'bg-emerald-500 text-white',
    warning: 'bg-amber-500 text-white',
    info: 'bg-blue-500 text-white',
    neutral: 'bg-slate-500 text-white'
  };

  const getVariant = (lbl: string) => {
    const l = lbl.toUpperCase();
    if (l.includes('ABERTO')) return styles.danger;
    if (l.includes('LIBERADO') || l.includes('PAGO')) return styles.success;
    if (l.includes('FINANCEIRO')) return styles.warning;
    if (l.includes('ROTA')) return styles.info;
    return styles[variant];
  };

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider inline-block ${getVariant(label)}`}>
      {label}
    </span>
  );
};

export default Badge;
