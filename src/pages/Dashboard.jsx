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
  Download,
  FileText,
  Printer,
  TrendingUp,
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
import { useClientAdvances } from '../lib/queries/client_advances';
import { currentMonthKey, formatPeriod, lastNMonths } from '../lib/utils';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
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
const percent = (value) => `${Math.round(value || 0)}%`;
const reportFilenameDate = () => new Date().toISOString().slice(0, 10);
const invoiceBillingMonth = (invoice) => invoice.effective_billing_month || invoice.billing_month || invoice.period_month;

function downloadCsv(filename, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escapeCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Dashboard() {
  const [periodFilter, setPeriodFilter] = useState('all');

  const { data: allInvoices, isLoading: invoicesLoading } = useInvoices();
  const { data: allFees, isLoading: feesLoading } = useFreelancerFees();
  const { data: allEngagements, isLoading: engLoading } = useEngagements();
  const { data: allAdvances, isLoading: advancesLoading } = useClientAdvances();
  const reportPeriod = periodFilter === 'all' ? currentMonthKey() : periodFilter;

  const filteredInvoices = useMemo(() => {
    if (!allInvoices) return [];
    if (periodFilter === 'all') return allInvoices;
    return allInvoices.filter((inv) => invoiceBillingMonth(inv) === periodFilter);
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

    allAdvances?.forEach((advance) => {
      cashOut += advance.amount || 0;
      if (advance.status === 'reimbursed') cashIn += advance.amount || 0;
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
      advancesOpenAmount: (allAdvances || []).filter((advance) => advance.status === 'open').reduce((sum, advance) => sum + (advance.amount || 0), 0),
      profitCash: revenueReceived - feesPaidAmount - (allAdvances || []).filter((advance) => advance.status !== 'reimbursed').reduce((sum, advance) => sum + (advance.amount || 0), 0),
      allOverdueInvoices,
      totalOverdueAmount,
      gap: feesPendingAmount - revenueReceived,
      activeEngagements,
      distinctClientsSet,
      topOverdue,
      topPendingFees,
      netCashflow: { cashIn, cashOut, net: cashIn - cashOut },
    };
  }, [allInvoices, allFees, allEngagements, allAdvances, filteredInvoices, filteredFees]);

  const monthlyData = useMemo(() => {
    const months = lastNMonths(6).reverse();
    return months.map((month) => {
      const invoices = allInvoices?.filter((inv) => invoiceBillingMonth(inv) === month.value) || [];
      const fees = allFees?.filter((fee) => fee.period_month === month.value) || [];
      const advances = allAdvances?.filter((advance) => advance.period_month === month.value) || [];
      const advanceOut = advances.reduce((sum, advance) => sum + (advance.amount || 0), 0);
      const advanceIn = advances.filter((advance) => advance.status === 'reimbursed').reduce((sum, advance) => sum + (advance.amount || 0), 0);
      return {
        month: month.label.split(' ')[0],
        revenue: invoices.reduce((sum, inv) => sum + (inv.total_paid || 0), 0) + advanceIn,
        issued: invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0),
        fees: fees.reduce((sum, fee) => sum + (fee.calculated_fee || 0), 0) + advanceOut,
        profit: invoices.reduce((sum, inv) => sum + (inv.total_paid || 0), 0) + advanceIn - fees.reduce((sum, fee) => sum + (fee.calculated_fee || 0), 0) - advanceOut,
      };
    });
  }, [allInvoices, allFees, allAdvances]);

  const ownerInsights = useMemo(() => {
    const invoices = allInvoices || [];
    const fees = allFees || [];
    const engagements = allEngagements || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const collectibleInvoices = invoices.filter((inv) => inv.computed_status !== 'draft');
    const dueSoonInvoices = invoices.filter((inv) => {
      if (!['sent', 'partial'].includes(inv.computed_status) || !inv.due_date) return false;
      const daysUntilDue = differenceInDays(new Date(inv.due_date), today);
      return daysUntilDue >= 0 && daysUntilDue <= 7;
    });
    const overdueInvoices = invoices.filter((inv) => inv.computed_status === 'overdue');
    const overdueDays = overdueInvoices.map((inv) => differenceInDays(today, new Date(inv.due_date)));
    const issuedTotal = collectibleInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const paidTotal = collectibleInvoices.reduce((sum, inv) => sum + (inv.total_paid || 0), 0);

    const currentMonthFees = fees.filter((fee) => fee.period_month === reportPeriod);
    const pendingThisMonth = currentMonthFees.filter((fee) => fee.status === 'pending');
    const paidThisMonth = currentMonthFees.filter((fee) => fee.status === 'paid');

    const unpaidByFreelancerMap = new Map();
    const unpaidByProjectMap = new Map();
    pendingThisMonth.forEach((fee) => {
      const freelancer = fee.freelancer?.name || 'Unknown freelancer';
      unpaidByFreelancerMap.set(freelancer, (unpaidByFreelancerMap.get(freelancer) || 0) + (fee.calculated_fee || 0));

      const project = `${fee.engagement?.client?.company_name || 'Unknown client'} - ${fee.engagement?.service?.name || 'Unknown service'}`;
      unpaidByProjectMap.set(project, (unpaidByProjectMap.get(project) || 0) + (fee.calculated_fee || 0));
    });

    const clientMap = new Map();
    invoices.forEach((inv) => {
      const clientId = inv.engagement?.client?.id || inv.engagement_id || 'unknown';
      const clientName = inv.engagement?.client?.company_name || 'Unknown client';
      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, { name: clientName, revenue: 0, cost: 0 });
      }
      clientMap.get(clientId).revenue += inv.total_paid || 0;
    });
    fees.forEach((fee) => {
      const clientId = fee.engagement?.client?.id || fee.engagement_id || 'unknown';
      const clientName = fee.engagement?.client?.company_name || 'Unknown client';
      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, { name: clientName, revenue: 0, cost: 0 });
      }
      clientMap.get(clientId).cost += fee.calculated_fee || 0;
    });
    const clientProfitability = Array.from(clientMap.values())
      .map((client) => {
        const margin = client.revenue - client.cost;
        return {
          ...client,
          margin,
          marginRate: client.revenue > 0 ? (margin / client.revenue) * 100 : 0,
        };
      })
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 6);

    const projectHealth = engagements.slice(0, 8).map((eng) => {
      const projectInvoices = invoices.filter((inv) => inv.engagement_id === eng.id);
      const projectFees = fees.filter((fee) => fee.engagement_id === eng.id);
      const invoiceIssued = projectInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
      const invoicePaid = projectInvoices.reduce((sum, inv) => sum + (inv.total_paid || 0), 0);
      const feeTotal = projectFees.reduce((sum, fee) => sum + (fee.calculated_fee || 0), 0);
      const invoiceStatus = projectInvoices.some((inv) => inv.computed_status === 'overdue')
        ? 'Overdue'
        : projectInvoices.every((inv) => inv.computed_status === 'paid') && projectInvoices.length > 0
          ? 'Paid'
          : projectInvoices.length > 0
            ? 'Open'
            : 'No invoice';
      const feeStatus = projectFees.some((fee) => fee.status === 'pending')
        ? 'Pending'
        : projectFees.length > 0
          ? 'Paid'
          : 'No fee';
      const lastInvoiceDate = projectInvoices
        .map((inv) => inv.last_payment_date || inv.due_date || inv.issue_date)
        .filter(Boolean)
        .sort()
        .at(-1);
      const lastFeeDate = projectFees
        .map((fee) => fee.paid_date || fee.period_month)
        .filter(Boolean)
        .sort()
        .at(-1);

      return {
        id: eng.id,
        name: `${eng.client?.company_name || 'Unknown client'} - ${eng.service?.name || 'Unknown service'}`,
        invoiceStatus,
        feeStatus,
        profitEstimate: invoicePaid - feeTotal,
        marginEstimate: invoiceIssued > 0 ? ((invoicePaid - feeTotal) / invoiceIssued) * 100 : 0,
        lastActivity: lastInvoiceDate || lastFeeDate || eng.start_date || '-',
      };
    });

    return {
      collection: {
        dueSoonCount: dueSoonInvoices.length,
        dueSoonAmount: dueSoonInvoices.reduce((sum, inv) => sum + (inv.balance || 0), 0),
        overdueCount: overdueInvoices.length,
        overdueAmount: overdueInvoices.reduce((sum, inv) => sum + (inv.balance || 0), 0),
        averageDaysOverdue: overdueDays.length ? Math.round(overdueDays.reduce((sum, days) => sum + days, 0) / overdueDays.length) : 0,
        collectionRate: issuedTotal > 0 ? (paidTotal / issuedTotal) * 100 : 0,
      },
      payables: {
        pendingAmount: pendingThisMonth.reduce((sum, fee) => sum + (fee.calculated_fee || 0), 0),
        pendingCount: pendingThisMonth.length,
        paidAmount: paidThisMonth.reduce((sum, fee) => sum + (fee.calculated_fee || 0), 0),
        paidCount: paidThisMonth.length,
        byFreelancer: Array.from(unpaidByFreelancerMap, ([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount).slice(0, 5),
        byProject: Array.from(unpaidByProjectMap, ([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount).slice(0, 5),
      },
      clientProfitability,
      projectHealth,
    };
  }, [allInvoices, allFees, allEngagements, reportPeriod]);

  const reports = useMemo(() => {
    const invoices = (allInvoices || []).filter((inv) => invoiceBillingMonth(inv) === reportPeriod);
    const fees = (allFees || []).filter((fee) => fee.period_month === reportPeriod);
    const outstanding = invoices.filter((inv) => ['sent', 'partial', 'overdue'].includes(inv.computed_status));

    return {
      revenue: invoices.map((inv) => ({
        billing_month: invoiceBillingMonth(inv),
        service_period: inv.period_month,
        client: inv.engagement?.client?.company_name || '',
        service: inv.engagement?.service?.name || '',
        invoice_number: inv.invoice_number || '',
        amount: inv.amount || 0,
        paid: inv.total_paid || 0,
        balance: inv.balance || 0,
        status: inv.computed_status || inv.status,
      })),
      payouts: fees.map((fee) => ({
        period: fee.period_month,
        freelancer: fee.freelancer?.name || '',
        client: fee.engagement?.client?.company_name || '',
        service: fee.engagement?.service?.name || '',
        amount: fee.calculated_fee || 0,
        status: fee.status,
        paid_date: fee.paid_date || '',
      })),
      outstanding: outstanding.map((inv) => ({
        billing_month: invoiceBillingMonth(inv),
        service_period: inv.period_month,
        client: inv.engagement?.client?.company_name || '',
        service: inv.engagement?.service?.name || '',
        invoice_number: inv.invoice_number || '',
        due_date: inv.due_date || '',
        balance: inv.balance || 0,
        status: inv.computed_status,
      })),
    };
  }, [allInvoices, allFees, reportPeriod]);

  const invoiceStatusData = useMemo(() => {
    const statuses = [
      { key: 'paid', label: 'Paid', color: '#059669' },
      { key: 'sent', label: 'Sent', color: '#2563eb' },
      { key: 'partial', label: 'Partial', color: '#f59e0b' },
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

  if (invoicesLoading || feesLoading || engLoading || advancesLoading) {
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
          <h3 className="text-sm font-semibold text-red-950">Perlu Cek Cash</h3>
          <p className="mt-1 text-sm text-red-700">
            Ada Rp {formatCurrency(metrics.feesPendingAmount)} fee freelancer belum dibayar, sementara uang masuk dari client baru Rp {formatCurrency(metrics.revenueReceived)} {periodFilter === 'all' ? 'sepanjang waktu' : `untuk ${formatPeriod(periodFilter)}`}.
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
          <h3 className="text-sm font-semibold text-amber-950">Perlu Ditagih</h3>
          <p className="mt-1 text-sm text-amber-800">
            Ada {metrics.allOverdueInvoices.length} invoice overdue. Total yang perlu dikejar Rp {formatCurrency(metrics.totalOverdueAmount)}.
          </p>
        </div>
      </motion.div>
    );
  }

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={periodFilter === 'all' ? 'Ringkasan uang masuk, uang keluar, dan tagihan yang perlu dikejar.' : `Ringkasan untuk ${formatPeriod(periodFilter)}.`}
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Semua bulan' },
                ...lastNMonths(24),
              ]}
              className="w-full sm:w-52"
            />
            <Button variant="secondary" onClick={() => downloadCsv(`revenue-report-${reportPeriod}-${reportFilenameDate()}.csv`, reports.revenue)}>
              <Download size={15} className="mr-1.5" />
              Export
            </Button>
          </div>
        }
      />

      <section className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm shadow-gray-950/5">
        <div className="grid gap-0 lg:grid-cols-[1.4fr_1fr]">
          <div className="p-6 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Cash Saat Ini</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
              <AnimatedNumber value={metrics.netCashflow.net} prefix={metrics.netCashflow.net < 0 ? '-Rp ' : 'Rp '} formatter={(v) => formatCurrency(Math.abs(v))} />
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-gray-500">
              Uang masuk dikurangi fee freelancer yang sudah dibayar dan talangan client. Talangan yang sudah diganti client dihitung masuk kembali.
            </p>
          </div>
          <div className="grid grid-cols-2 border-t border-gray-100 bg-gray-50 lg:border-l lg:border-t-0">
            <div className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Uang Masuk</p>
              <p className="mt-2 text-xl font-bold text-emerald-600">
                <AnimatedNumber value={metrics.netCashflow.cashIn} prefix="Rp " />
              </p>
            </div>
            <div className="border-l border-gray-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Uang Keluar</p>
              <p className="mt-2 text-xl font-bold text-red-600">
                <AnimatedNumber value={metrics.netCashflow.cashOut} prefix="Rp " />
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Invoice Dibuat" value={metrics.revenueIssued} count={`${metrics.revenueIssuedCount} invoice`} icon={FileText} tone="blue" delay={0.02} />
        <StatCard label="Uang Masuk" value={metrics.revenueReceived} count={`${metrics.revenueReceivedCount} invoice lunas`} icon={Banknote} tone="blue" trend="cash in" delay={0.08} />
        <StatCard label="Client Belum Bayar" value={metrics.outstandingAmount} count={`${metrics.outstandingCount} invoice belum lunas, ${metrics.outstandingOverdueCount} overdue`} icon={CreditCard} tone="amber" delay={0.14} />
        <StatCard label="Sisa Cash" value={metrics.profitCash} count={`Sudah memperhitungkan Rp ${formatCurrency(metrics.advancesOpenAmount)} talangan terbuka`} icon={TrendingUp} tone={metrics.profitCash < 0 ? 'red' : 'dark'} delay={0.2} />
      </section>

      {alertElement}

      <section className="mb-6 grid gap-4 xl:grid-cols-3">
        <Card title="Tren 6 Bulan" description="Pergerakan uang masuk, uang keluar, dan sisa cash" className="xl:col-span-2">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ left: -18, right: 8, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis tickFormatter={chartCurrency} tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip formatter={(value) => `Rp ${formatCurrency(value)}`} contentStyle={{ borderRadius: 12, borderColor: '#e5e7eb', color: '#111827' }} />
                <Area type="monotone" dataKey="issued" name="Invoice Dibuat" stroke="#93c5fd" strokeWidth={2} fill="#eff6ff" animationDuration={900} />
                <Area type="monotone" dataKey="revenue" name="Uang Masuk" stroke="#2563eb" strokeWidth={3} fill="#dbeafe" animationDuration={900} />
                <Area type="monotone" dataKey="fees" name="Uang Keluar" stroke="#f59e0b" strokeWidth={2} fill="transparent" animationDuration={900} />
                <Area type="monotone" dataKey="profit" name="Sisa Cash" stroke="#059669" strokeWidth={2} fill="transparent" animationDuration={900} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Status Invoice" description="Ringkasan semua invoice">
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

      <section className="grid gap-4 lg:grid-cols-2">
        <WatchListCard
          title="Client yang Perlu Ditagih"
          link="/invoices?status=overdue"
          empty="Tidak ada invoice overdue"
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
          title="Freelancer yang Belum Dibayar"
          link="/fees?status=pending"
          empty="Tidak ada fee pending"
          items={metrics.topPendingFees}
          renderItem={(fee) => (
            <>
              <div>
                <p className="text-sm font-semibold text-gray-950">{fee.freelancer?.name}</p>
                <p className="mt-0.5 text-xs text-gray-500">{fee.engagement?.client?.company_name} - {fee.engagement?.service?.name}</p>
              </div>
              <p className="text-sm font-semibold text-amber-600">Rp {formatCurrency(fee.calculated_fee)}</p>
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
    slate: 'text-emerald-600',
    amber: 'text-amber-600',
  }[tone];

  return (
    <div className="rounded-xl bg-gray-50 p-4 ring-1 ring-gray-200">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">{label}</p>
      <p className={`mt-2 text-xl font-bold ${toneClass}`}>
        <AnimatedNumber value={value} prefix="Rp " />
      </p>
      {count && <p className="mt-1 text-xs text-gray-500">{count}</p>}
    </div>
  );
}

function HealthMetric({ title, value, detail, tone = 'gray', isPercent = false }) {
  const valueClass = tone === 'red' ? 'text-red-600' : 'text-blue-700';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm shadow-gray-950/5"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">{title}</p>
      <p className={`mt-3 text-3xl font-bold tracking-tight ${valueClass}`}>
        <AnimatedNumber value={value} suffix={isPercent ? '%' : ''} />
      </p>
      <p className="mt-1 text-sm text-gray-500">{detail}</p>
    </motion.div>
  );
}

function SplitList({ leftTitle, rightTitle, leftItems, rightItems }) {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <CompactAmountList title={leftTitle} items={leftItems} />
      <CompactAmountList title={rightTitle} items={rightItems} />
    </div>
  );
}

function CompactAmountList({ title, items }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No unpaid items.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.name} className="flex items-start justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-gray-700">{item.name}</span>
              <span className="shrink-0 font-semibold text-amber-600">Rp {formatCurrency(item.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfitabilityRow({ name, revenue, cost, margin, marginRate }) {
  const positive = margin >= 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-950">{name}</p>
          <p className="mt-1 text-xs text-gray-500">Revenue Rp {formatCurrency(revenue)} / Cost Rp {formatCurrency(cost)}</p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-bold ${positive ? 'text-emerald-600' : 'text-red-600'}`}>Rp {formatCurrency(margin)}</p>
          <p className="mt-1 text-xs text-gray-500">{percent(marginRate)} margin</p>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, marginRate))}%` }} />
      </div>
    </div>
  );
}

function ProjectHealthRow({ project }) {
  return (
    <div className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
      <div className="min-w-0">
        <p className="truncate font-semibold text-gray-950">{project.name}</p>
        <p className="mt-1 text-xs text-gray-500">Last activity: {project.lastActivity}</p>
      </div>
      <StatusPill label={project.invoiceStatus} />
      <StatusPill label={project.feeStatus} />
      <div className="sm:text-right">
        <p className={`font-bold ${project.profitEstimate >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Rp {formatCurrency(project.profitEstimate)}</p>
        <p className="text-xs text-gray-500">{percent(project.marginEstimate)} est. margin</p>
      </div>
    </div>
  );
}

function StatusPill({ label }) {
  const isRisk = ['Overdue', 'Pending'].includes(label);
  return (
    <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${isRisk ? 'bg-amber-50 text-amber-700 ring-amber-100' : 'bg-white text-gray-700 ring-gray-200'}`}>
      {label}
    </span>
  );
}

function ReportCard({ title, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm shadow-gray-950/5 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-gray-950/10"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-gray-950">{title}</p>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
        <Download size={18} className="text-gray-500" />
      </div>
    </button>
  );
}

function WatchListCard({ title, link, empty, items, renderItem }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm shadow-gray-950/5">
      <div className="flex items-center justify-between border-b border-gray-100 p-5">
        <h3 className="text-base font-semibold tracking-tight text-gray-950">{title}</h3>
        <Link to={link} className="text-xs font-semibold text-gray-900 hover:text-gray-700">View All</Link>
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
