import { motion } from 'framer-motion';
import { LucideIcon, ArrowUp, ArrowDown } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  accent: string;
  change?: {
    value: number;
    percent: number;
    isPositive: boolean;
  };
  isLoading?: boolean;
}

export function MetricCard({ label, value, icon: Icon, accent, change, isLoading }: MetricCardProps) {
  if (isLoading) {
    return (
      <div className="bg-tg-secondary-bg rounded-2xl p-5 space-y-4 animate-pulse">
        <div className="flex items-start justify-between">
          <div className={`w-12 h-12 ${accent} rounded-xl`} />
          <div className="w-20 h-6 bg-tg-secondary-bg rounded-lg" />
        </div>
        <div className="space-y-2">
          <div className="w-24 h-4 bg-tg-secondary-bg rounded" />
          <div className="w-32 h-8 bg-tg-secondary-bg rounded" />
        </div>
      </div>
    );
  }

  const formatChange = (changeValue: number, percent: number, isPositive: boolean) => {
    const sign = changeValue >= 0 ? '+' : '';
    const color = isPositive 
      ? (changeValue >= 0 ? 'text-emerald-400' : 'text-red-400') 
      : (changeValue >= 0 ? 'text-red-400' : 'text-emerald-400');
    const ArrowIcon = changeValue >= 0 ? ArrowUp : ArrowDown;
    
    return (
      <div className="flex items-center gap-1.5">
        <ArrowIcon className={`w-3 h-3 ${color}`} />
        <span className={`text-xs ${color} font-semibold`}>
          {sign}{Math.abs(changeValue).toLocaleString('ru-RU')}
        </span>
        <span className={`text-xs ${color} opacity-70`}>
          ({sign}{Math.abs(percent).toFixed(1)}%)
        </span>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-tg-secondary-bg rounded-2xl p-5 space-y-4 border border-transparent hover:border-tg-button/30 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className={`inline-flex items-center justify-center ${accent} rounded-xl p-2`}>
          <Icon className="w-5 h-5" />
        </div>
        {change && formatChange(change.value, change.percent, change.isPositive)}
      </div>
      
      <div className="space-y-1">
        <p className="text-sm text-tg-hint">{label}</p>
        <p className="text-2xl font-bold text-tg-text">{value}</p>
      </div>
    </motion.div>
  );
}

