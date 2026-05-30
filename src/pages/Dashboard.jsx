import { useMemo, useState } from 'react';
import { differenceInDays } from 'date-fns';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  AlertCircle,
  AlertTriangle,
  Banknote,
  Briefcase,
  CreditCard,
  FileText,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useInvoices } from '../lib/queries/invoices';
import { useFreelancerFees } from '../lib/queries/freelancer_fees';
import { useEngagements } from '../lib/queries/engagements';
import { formatPeriod, lastNMonths } from '../lib/utils';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { StatCard } from '../components/ui/StatCard';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';

const chartCurrency = (value) => {
  if (!value) return '0';
  if (Math.abs(value) >= 1000000) return `${Math.round(value / 1000000)}M`;
  if (Math.abs(value) >= 1000) return `${Math.round(value / 1000)}K`;
  return String(value);
};

const formatCurrency = (val) => new Intl.NumberFormat('id-ID').format(val || 0);

export default function Dashboard() {
  const [periodFilter, setPeriodFilter] = useState('all');

  const { data: allInvoices, isLoading: invoicesLoading } = useInvoices();
  const { data: allFees, isLoading: feesLoading } = useFreelancerFees();
  const { data: allEngagements, isLoading: engLoading } = useEngagements();

  const filteredInvoices = useMemo(() => {
    if (!allInvoices) return [];
    if (periodFilter === 'all') return allInvoices;
    return allInvoices.filter((inv) => inv.period_month === periodFilter);
  }, [allInvoices, periodFilter]);

  const filteredFees = useMemo(() => {
    if (!allFees) return [];
    if (periodFilter === 'all') return allFees;
    return allFees.filter((fee) => fee.period_month === periodFilter);
  }, [allFees, periodFilter]);

  const metrics = useMemo(() => {
    let revenueIssued = 0;
    let revenueReceived = 0;
    let revenueReceivedCount = 0;
    let outstandingAmount = 0;
    let outstandingCount = 0;
    let outstandingOverdueCount = 0;

    filteredInvoices.forEach((inv) => {
      revenueIssued += inv.amount || 0;
      const totalPaid = inv.total_paid || 0;

      if (totalPaid > 0) {
        revenueReceived += totalPaid;
        if (inv.computed_status === 'paid') revenueReceivedCount++;
      }

      if (['sent', 'partial', 'overdue'].includes(inv.computed_status)) {
        outstandingAmount += inv.balance || 0;
        outstandingCount++;
        if (inv.computed_status === 'overdue') outstandingOverdueCount++;
      }
    });

    let feesTotalAmount = 0;
    let feesPaidAmount = 0;
    let feesPendingAmount = 0;

    filteredFees.forEach((fee) => {
      const amount = fee.calculated_fee || 0;
      feesTotalAmount += amount;
      if (fee.status === 'paid') feesPaidAmount += amount;
      else feesPendingAmount += amount;
    });

    let cashIn = 0;
    let cashOut = 0;
    const allOverdueInvoices = [];
    let totalOverdueAmount = 0;

    allInvoices?.forEach((inv) => {
      cashIn += inv.total_paid || 0;
      if (inv.computed_status === 'overdue') {
        allOverdueInvoices.push(inv);
        totalOverdueAmount += inv.balance || 0;
      }
    });

    allFees?.forEach((fee) => {
      if (fee.status === 'paid') cashOut += fee.calculated_fee || 0;
    });

    const activeEngagements = allEngagements?.filter((e) => e.status === 'ongoing') || [];
    const distinctClientsSet = new Set(activeEngagements.map((e) => e.client_id));
    const topOverdue = allOverdueInvoices
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
      .slice(0, 5);
    const topPendingFees = (allFees || [])
      .filter((f) => f.status === 'pending')
      .sort((a, b) => a.period_month.localeCompare(b.period_month))
      .slice(0, 5);

    return {
      revenueIssued,
      revenueIssuedCount: filteredInvoices.length,
      revenueReceived,
      revenueReceivedCount,
      outstandingAmount,
      outstandingCount,
      outstandingOverdueCount,
      feesTotalAmount,
      feesTotalCount: filteredFees.length,
      feesPaidAmount,
      feesPendingAmount,
      profitCash: revenueReceived - feesPaidAmount,
      allOverdueInvoices,
      totalOverdueAmount,
      gap: feesPendingAmount - revenueReceived,
      activeEngagements,
      distinctClientsSet,
      topOverdue,
      topPendingFees,
      netCashflow: { cashIn, cashOut, net: cashIn - cashOut },
    };
  }, [allInvoices, allFees, allEngagements, filteredInvoices, filteredFees]);

  const monthlyData = useMemo(() => {
    const months = lastNMonths(6).reverse();
    return months.map((month) => {
      const invoices = allInvoices?.filter((inv) => inv.period_month === month.value) || [];
      const fees = allFees?.filter((fee) => fee.period_month === month.value) || [];
      return {
        month: month.label.split(' ')[0],
        revenue: invoices.reduce((sum, inv) => sum + (inv.total_paid || 0), 0),
        issued: invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0),
        fees: fees.reduce((sum, fee) => sum + (fee.calculated_fee || 0), 0),
      };
    });
  }, [allInvoices, allFees]);

  const invoiceStatusData = useMemo(() => {
    const statuses = [
      { key: 'paid', label: 'Paid', color: '#059669' },
      { key: 'sent', label: 'Sent', color: '#64748b' },
      { key: 'partial', label: 'Partial', color: '#d97706' },
      { key: 'overdue', label: 'Overdue', color: '#dc2626' },
      { key: 'draft', label: 'Draft', color: '#9ca3af' },
    ];

    return statuses
      .map((status) => ({
        ...status,
        value: (allInvoices || []).filter((inv) => inv.computed_status === status.key).length,
      }))
      .filter((status) => status.value > 0);
  }, [allInvoices]);

  if (invoicesLoading || feesLoading || engLoading) {
    return (
      <div className="animate-pulse space-y-5">
        <div className="h-24 rounded-xl bg-gray-200" />
        <div className="grid gap-4 md:grid-cols-4">
          <div className="h-32 rounded-xl bg-gray-200" />
          <div className="h-32 rounded-xl bg-gray-200" />
          <div className="h-32 rounded-xl bg-gray-200" />
          <div className="h-32 rounded-xl bg-gray-200" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="h-80 rounded-xl bg-gray-200 lg:col-span-2" />
          <div className="h-80 rounded-xl bg-gray-200" />
        </div>
      </div>
    );
  }

  let alertElement = null;
  if (metrics.feesPendingAmount > metrics.revenueReceived && metrics.feesPendingAmount > 0) {
    alertElement = (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4"
      >
        <AlertTriangle className="mt-0.5 shrink-0 text-red-600" size={20} />
        <div>
          <h3 className="text-sm font-semibold text-red-950">Cashflow Gap Warning</h3>
          <p className="mt-1 text-sm text-red-700">
            You have Rp {formatCurrency(metrics.feesPendingAmount)} in unpaid freelancer fees but only Rp {formatCurrency(metrics.revenueReceived)} received from clients {periodFilter === 'all' ? 'All Time' : formatPeriod(periodFilter)}.
          </p>
        </div>
      </motion.div>
    );
  } else if (metrics.allOverdueInvoices.length > 0) {
    alertElement = (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4"
      >
        <AlertCircle className="mt-0.5 shrink-0 text-amber-600" size={20} />
        <div>
          <h3 className="text-sm font-semibold text-amber-950">Action Needed</h3>
          <p className="mt-1 text-sm text-amber-800">
            {metrics.allOverdueInvoices.length} overdue invoice{metrics.allOverdueInvoices.length === 1 ? '' : 's'} need follow-up. Collect Rp {formatCurrency(metrics.totalOverdueAmount)}.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={periodFilter === 'all' ? 'Live financial overview across invoices, fees, and active work.' : `Financial overview for ${formatPeriod(periodFilter)}.`}
        action={
          <Select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Time' },
              ...lastNMonths(24),
            ]}
            className="w-full bg-white sm:w-52"
          />
        }
      />

      <section className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.4fr_1fr]">
          <div className="p-6 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Cash Position</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
              <AnimatedNumber value={metrics.netCashflow.net} prefix={metrics.netCashflow.net < 0 ? '-Rp ' : 'Rp '} formatter={(v) => formatCurrency(Math.abs(v))} />
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-gray-500">
              All-time cash in minus paid freelancer fees. Charts below animate from live Supabase data.
            </p>
          </div>
          <div className="grid grid-cols-2 border-t border-gray-100 bg-gray-50 lg:border-l lg:border-t-0">
            <div className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Cash In</p>
              <p className="mt-2 text-xl font-bold text-emerald-700">Rp {formatCurrency(metrics.netCashflow.cashIn)}</p>
            </div>
            <div className="border-l border-gray-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Cash Out</p>
              <p className="mt-2 text-xl font-bold text-red-600">Rp {formatCurrency(metrics.netCashflow.cashOut)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue Issued" value={metrics.revenueIssued} count={`${metrics.revenueIssuedCount} invoices`} icon={FileText} tone="blue" delay={0.02} />
        <StatCard label="Revenue Received" value={metrics.revenueReceived} count={`${metrics.revenueReceivedCount} paid`} icon={Banknote} tone="emerald" trend="cash in" delay={0.08} />
        <StatCard label="Outstanding" value={metrics.outstandingAmount} count={`${metrics.outstandingCount} unpaid, ${metrics.outstandingOverdueCount} overdue`} icon={CreditCard} tone="amber" delay={0.14} />
        <StatCard label="Profit Cash" value={metrics.profitCash} count="Received minus paid fees" icon={TrendingUp} tone={metrics.profitCash < 0 ? 'red' : 'emerald'} delay={0.2} />
      </section>

      {alertElement}

      <section className="mb-6 grid gap-4 xl:grid-cols-3">
        <Card title="Revenue vs Fees" description="Last 6 months cash movement" className="xl:col-span-2">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ left: -18, right: 8, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis tickFormatter={chartCurrency} tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip formatter={(value) => `Rp ${formatCurrency(value)}`} contentStyle={{ borderRadius: 12, borderColor: '#e5e7eb' }} />
                <Area type="monotone" dataKey="revenue" name="Received" stroke="#059669" strokeWidth={3} fill="url(#revenueFill)" animationDuration={900} />
                <Area type="monotone" dataKey="fees" name="Fees" stroke="#dc2626" strokeWidth={2} fill="transparent" animationDuration={900} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Invoice Status" description="All-time distribution">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={invoiceStatusData} dataKey="value" nameKey="label" innerRadius={58} outerRadius={88} paddingAngle={3} animationDuration={900}>
                  {invoiceStatusData.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {invoiceStatusData.map((item) => (
              <div key={item.key} className="flex items-center gap-2 rounded-lg bg-gray-50 px-2 py-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-gray-600">{item.label}</span>
                <span className="ml-auto font-semibold text-gray-950">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card title={`Freelancer Fees - ${periodFilter === 'all' ? 'All Time' : formatPeriod(periodFilter)}`} className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <MiniMetric label="Total" value={metrics.feesTotalAmount} count={`${metrics.feesTotalCount} entries`} />
            <MiniMetric label="Paid" value={metrics.feesPaidAmount} tone="emerald" />
            <MiniMetric label="Pending" value={metrics.feesPendingAmount} tone="amber" />
          </div>
          <div className="mt-6 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ left: -18, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis tickFormatter={chartCurrency} tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip formatter={(value) => `Rp ${formatCurrency(value)}`} contentStyle={{ borderRadius: 12, borderColor: '#e5e7eb' }} />
                <Bar dataKey="issued" name="Issued" fill="#94a3b8" radius={[6, 6, 0, 0]} animationDuration={900} />
                <Bar dataKey="fees" name="Fees" fill="#111827" radius={[6, 6, 0, 0]} animationDuration={900} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Active Engagements">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-5xl font-bold tracking-tight text-gray-950">
                <AnimatedNumber value={metrics.activeEngagements.length} />
              </p>
              <p className="mt-2 text-sm text-gray-500">{metrics.distinctClientsSet.size} active clients</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-950 text-white">
              <Briefcase size={22} />
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <WatchListCard
          title="Overdue Invoices"
          link="/invoices?status=overdue"
          empty="No overdue invoices"
          items={metrics.topOverdue}
          renderItem={(inv) => (
            <>
              <div>
                <p className="text-sm font-semibold text-gray-950">{inv.engagement?.client?.company_name}</p>
                <p className="mt-0.5 text-xs text-gray-500">{inv.engagement?.service?.name} - {formatPeriod(inv.period_month)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-red-600">Rp {formatCurrency(inv.balance)}</p>
                <p className="mt-0.5 text-xs text-red-500">{differenceInDays(new Date(), new Date(inv.due_date))} days overdue</p>
              </div>
            </>
          )}
        />

        <WatchListCard
          title="Pending Fees"
          link="/fees?status=pending"
          empty="No pending fees"
          items={metrics.topPendingFees}
          renderItem={(fee) => (
            <>
              <div>
                <p className="text-sm font-semibold text-gray-950">{fee.freelancer?.name}</p>
                <p className="mt-0.5 text-xs text-gray-500">{fee.engagement?.client?.company_name} - {fee.engagement?.service?.name}</p>
              </div>
              <p className="text-sm font-semibold text-amber-700">Rp {formatCurrency(fee.calculated_fee)}</p>
            </>
          )}
        />
      </section>
    </>
  );
}

function MiniMetric({ label, value, count, tone = 'gray' }) {
  const toneClass = {
    gray: 'text-gray-950',
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
  }[tone];

  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">{label}</p>
      <p className={`mt-2 text-xl font-bold ${toneClass}`}>Rp {formatCurrency(value)}</p>
      {count && <p className="mt-1 text-xs text-gray-500">{count}</p>}
    </div>
  );
}

function WatchListCard({ title, link, empty, items, renderItem }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 p-5">
        <h3 className="text-base font-semibold tracking-tight text-gray-950">{title}</h3>
        <Link to={link} className="text-xs font-semibold text-emerald-700 hover:text-emerald-800">View All</Link>
      </div>
      {items.length === 0 ? (
        <div className="p-8 text-center text-sm text-gray-500">{empty}</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {items.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.04 }}
              className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-gray-50"
            >
              {renderItem(item)}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
