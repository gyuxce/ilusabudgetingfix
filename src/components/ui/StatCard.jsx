import { motion } from 'motion/react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { AnimatedNumber } from './AnimatedNumber';

export function StatCard({ label, value, count, icon: Icon, tone = 'gray', trend, delay = 0 }) {
  const toneStyles = {
    dark: 'bg-[#283618] text-[#FEFAE0] ring-[#283618]',
    amber: 'bg-[#DDA15E]/20 text-[#BC6C25] ring-[#DDA15E]/35',
    red: 'bg-red-50 text-red-700 ring-red-100',
    gray: 'bg-[#FEFAE0] text-[#606C38] ring-[#DDA15E]/35',
    blue: 'bg-[#606C38]/12 text-[#283618] ring-[#606C38]/25',
  };

  const valueToneStyles = {
    amber: 'text-[#BC6C25]',
    red: 'text-red-600',
    blue: 'text-[#606C38]',
    gray: 'text-[#283618]',
    dark: 'text-[#283618]',
  };

  const isNegative = value < 0;
  const TrendIcon = isNegative ? ArrowDownRight : ArrowUpRight;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className="group relative overflow-hidden rounded-xl border border-[#DDA15E]/35 bg-white/85 p-5 shadow-sm shadow-[#283618]/5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-[#283618]/10"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#606C38]">{label}</p>
          <div className={`mt-3 text-2xl font-bold tracking-tight ${isNegative ? 'text-red-600' : valueToneStyles[tone] || 'text-gray-950'}`}>
            {isNegative ? '-' : ''}
            <AnimatedNumber value={Math.abs(value)} prefix="Rp " />
          </div>
        </div>
        {Icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ring-1 ${toneStyles[tone] || toneStyles.gray}`}>
            <Icon size={19} />
          </div>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 text-xs">
        <span className="text-[#606C38]">{count}</span>
        {trend && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-medium ${isNegative ? 'bg-red-50 text-red-700' : 'bg-[#606C38]/12 text-[#283618]'}`}>
            <TrendIcon size={13} />
            {trend}
          </span>
        )}
      </div>
    </motion.div>
  );
}
