import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { TooltipProps } from 'recharts';
import { motion } from 'framer-motion';

interface DataPoint {
  periodStart: string;
  periodEnd: string;
  usersCount: number;
}

interface NewUsersChartProps {
  data: DataPoint[];
  interval: 'daily' | 'weekly' | 'monthly';
  isLoading?: boolean;
}

const formatPeriodLabel = (interval: 'daily' | 'weekly' | 'monthly', start: string, end: string): string => {
  const startDate = new Date(start);

  if (interval === 'monthly') {
    return startDate.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' });
  }

  if (interval === 'weekly') {
    const endDate = new Date(end);
    endDate.setDate(endDate.getDate() - 1);
    return `${startDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })} — ${endDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}`;
  }

  return startDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
};

const COLORS = [
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#6366f1', // indigo-500
  '#06b6d4', // cyan-500
  '#10b981', // emerald-500
];

export default function NewUsersChart({ data, interval, isLoading }: NewUsersChartProps) {
  if (isLoading) {
    return (
      <div className="h-[300px] flex items-center justify-center text-tg-hint text-sm">
        Загружаем данные...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-tg-hint text-sm">
        Нет данных для отображения
      </div>
    );
  }

  const chartData = data.map((point, index) => ({
    name: formatPeriodLabel(interval, point.periodStart, point.periodEnd),
    users: point.usersCount,
    colorIndex: index % COLORS.length,
  }));

  type ChartDatum = (typeof chartData)[number];

  const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const datum = payload[0].payload as ChartDatum;
      const users = datum.users;

      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-tg-secondary-bg border-2 border-blue-500/30 rounded-xl p-3 shadow-lg"
        >
          <p className="text-sm font-semibold text-tg-text mb-1">{datum.name}</p>
          <p className="text-lg font-bold text-blue-500">
            +{users} {users === 1 ? 'пользователь' : 'пользователей'}
          </p>
        </motion.div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          {COLORS.map((color, index) => (
            <linearGradient key={index} id={`barGradient${index}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.8} />
              <stop offset="95%" stopColor={color} stopOpacity={0.6} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--tg-theme-hint-color)" opacity={0.1} />
        <XAxis
          dataKey="name"
          stroke="var(--tg-theme-hint-color)"
          style={{ fontSize: '12px' }}
          tickLine={false}
        />
        <YAxis
          stroke="var(--tg-theme-hint-color)"
          style={{ fontSize: '12px' }}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(var(--tg-theme-button-color), 0.1)' }} />
        <Bar dataKey="users" radius={[8, 8, 0, 0]} animationDuration={800}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={`url(#barGradient${entry.colorIndex})`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
