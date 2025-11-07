import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { TooltipProps } from 'recharts';
import { motion } from 'framer-motion';

interface DataPoint {
  periodStart: string;
  periodEnd: string;
  ordersCount: number;
}

interface OrdersChartProps {
  data: DataPoint[];
  interval: 'daily' | 'weekly' | 'monthly';
  chartType?: 'line' | 'area';
  isLoading?: boolean;
}

const formatNumber = (value: number): string => value.toLocaleString('ru-RU');

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

export default function OrdersChart({ data, interval, chartType = 'area', isLoading }: OrdersChartProps) {
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

  const chartData = data.map(point => ({
    name: formatPeriodLabel(interval, point.periodStart, point.periodEnd),
    orders: point.ordersCount,
  }));

  type ChartDatum = (typeof chartData)[number];

  const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const datum = payload[0].payload as ChartDatum;

      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-tg-secondary-bg border-2 border-cyan-500/30 rounded-xl p-3 shadow-lg"
        >
          <p className="text-sm font-semibold text-tg-text mb-1">{datum.name}</p>
          <p className="text-lg font-bold text-cyan-400">{formatNumber(datum.orders)}</p>
          <p className="text-xs text-tg-hint mt-1">заказов</p>
        </motion.div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      {chartType === 'area' ? (
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
            </linearGradient>
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
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="orders"
            stroke="#22d3ee"
            strokeWidth={3}
            fill="url(#ordersGradient)"
            animationDuration={800}
          />
        </AreaChart>
      ) : (
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="orders"
            stroke="#22d3ee"
            strokeWidth={3}
            dot={{ fill: '#22d3ee', r: 4 }}
            activeDot={{ r: 6 }}
            animationDuration={800}
          />
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}

