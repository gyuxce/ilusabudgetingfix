import { motion } from 'motion/react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { AnimatedNumber } from './AnimatedNumber';

export function StatCard({ label, value, count, icon: Icon, tone = 'emerald', trend, delay = 0 }) {
  const toneStyles = {
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    red: 'bg-red-50 text-red-700 ring-red-100',
    gray: 'bg-gray-100 text-gray-700 ring-gray-200',
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
  };

  const isNegative = value < 0;
  const TrendIcon = isNegative ? ArrowDownRight : ArrowUpRight;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">{label}</p>
          <div className={`mt-3 text-2xl font-bold tracking-tight ${isNegative ? 'text-red-600' : 'text-gray-950'}`}>
            {isNegative ? '-' : ''}
            <AnimatedNumber value={Math.abs(value)} prefix="Rp " />
          </div>
        </div>
        {Icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ring-1 ${toneStyles[tone] || toneStyles.emerald}`}>
            <Icon size={19} />
          </div>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 text-xs">
        <span className="text-gray-500">{count}</span>
        {trend && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-medium ${isNegative ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
            <TrendIcon size={13} />
            {trend}
          </span>
        )}
      </div>
    </motion.div>
  );
}
