import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface KPICardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  accent: string; // Tailwind классы для цвета (например: "bg-emerald-500/10 text-emerald-400")
  trend?: {
    value: number; // процент изменения (например: 12.5 для +12.5%)
    period: string; // период сравнения (например: "за неделю", "vs прошлый месяц")
  };
  sparklineData?: number[]; // данные для мини-графика [10, 12, 15, 20, 18, 22, 25]
}

export default function KPICard({ label, value, subValue, icon: Icon, accent, trend, sparklineData }: KPICardProps) {
  const trendDirection = trend ? (trend.value > 0 ? 'up' : trend.value < 0 ? 'down' : 'neutral') : null;

  const getTrendIcon = () => {
    if (!trendDirection) return null;
    if (trendDirection === 'up') return TrendingUp;
    if (trendDirection === 'down') return TrendingDown;
    return Minus;
  };

  const getTrendColor = () => {
    if (!trendDirection) return '';
    if (trendDirection === 'up') return 'text-green-500';
    if (trendDirection === 'down') return 'text-red-500';
    return 'text-tg-hint';
  };

  const TrendIcon = getTrendIcon();

  // Преобразуем sparklineData в формат для recharts
  const chartData = sparklineData?.map((value, index) => ({ index, value })) || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="bg-tg-bg rounded-2xl p-5 space-y-3 border border-transparent hover:border-tg-button/30 transition-colors"
    >
      {/* Иконка */}
      <div className={`inline-flex items-center justify-center ${accent} rounded-xl p-2`}>
        <Icon className="w-5 h-5" />
      </div>

      {/* Основная информация */}
      <div className="space-y-1">
        <p className="text-sm text-tg-hint">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-tg-text">{value}</p>
          {trend && TrendIcon && (
            <div className={`flex items-center gap-1 text-xs font-semibold ${getTrendColor()}`}>
              <TrendIcon className="w-3 h-3" />
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        {subValue && <p className="text-xs text-tg-hint">{subValue}</p>}
        {trend && (
          <p className="text-xs text-tg-hint">
            {trendDirection === 'up' && `↑ На ${Math.abs(trend.value)}% больше ${trend.period}`}
            {trendDirection === 'down' && `↓ На ${Math.abs(trend.value)}% меньше ${trend.period}`}
            {trendDirection === 'neutral' && `Без изменений ${trend.period}`}
          </p>
        )}
      </div>

      {/* Sparkline (мини-график) */}
      {sparklineData && sparklineData.length > 0 && (
        <div className="h-12 -mx-2 -mb-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--tg-theme-button-color)"
                strokeWidth={2}
                dot={false}
                animationDuration={800}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}
