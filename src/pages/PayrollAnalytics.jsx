import { useEffect, useMemo, useState } from 'react';
import { subMonths } from 'date-fns';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download, TrendingDown, TrendingUp, Users, WalletCards } from 'lucide-react';
import { useFreelancerFees } from '../lib/queries/freelancer_fees';
import { currentMonthKey, formatPeriod, lastNMonths } from '../lib/utils';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { DataTable } from '../components/ui/DataTable';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';

const formatCurrency = (value) => new Intl.NumberFormat('id-ID').format(value || 0);
const chartCurrency = (value) => {
  if (!value) return '0';
  if (Math.abs(value) >= 1000000) return `${Math.round(value / 1000000)}M`;
  if (Math.abs(value) >= 1000) return `${Math.round(value / 1000)}K`;
  return String(value);
};

const getPreviousMonthKey = (periodKey) => {
  const [year, month] = periodKey.split('-').map(Number);
  const date = subMonths(new Date(year, month - 1, 1), 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const projectName = (fee) => {
  const client = fee.engagement?.client?.company_name || 'Unknown client';
  const service = fee.engagement?.service?.name || 'Unknown service';
  return `${client} - ${service}`;
};

const percentChange = (current, previous) => {
  if (!previous && current) return 100;
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
};

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

function addToMap(map, key, amount) {
  map.set(key, (map.get(key) || 0) + amount);
}

export default function PayrollAnalytics() {
  const { data: fees, isLoading } = useFreelancerFees();
  const [period, setPeriod] = useState(currentMonthKey());
  const [comparePeriod, setComparePeriod] = useState(getPreviousMonthKey(currentMonthKey()));

  const availablePeriods = useMemo(() => {
    const known = new Set(lastNMonths(18).map((m) => m.value));
    (fees || []).forEach((fee) => {
      if (fee.period_month) known.add(fee.period_month);
    });
    return [...known].sort((a, b) => b.localeCompare(a)).map((value) => ({ value, label: formatPeriod(value) }));
  }, [fees]);

  useEffect(() => {
    if (!fees?.length) return;
    const hasCurrentPeriod = fees.some((fee) => fee.period_month === period);
    if (!hasCurrentPeriod) {
      const latestPeriod = [...new Set(fees.map((fee) => fee.period_month).filter(Boolean))].sort((a, b) => b.localeCompare(a))[0];
      if (latestPeriod) {
        setPeriod(latestPeriod);
        setComparePeriod(getPreviousMonthKey(latestPeriod));
      }
    }
  }, [fees, period]);

  const analytics = useMemo(() => {
    const allFees = fees || [];
    const currentFees = allFees.filter((fee) => fee.period_month === period);
    const compareFees = allFees.filter((fee) => fee.period_month === comparePeriod);

    const currentTotal = currentFees.reduce((sum, fee) => sum + (fee.calculated_fee || 0), 0);
    const compareTotal = compareFees.reduce((sum, fee) => sum + (fee.calculated_fee || 0), 0);
    const delta = currentTotal - compareTotal;
    const deltaPercent = percentChange(currentTotal, compareTotal);

    const currentByFreelancer = new Map();
    const compareByFreelancer = new Map();
    const projectByFreelancer = new Map();
    const currentByProject = new Map();
    const compareByProject = new Map();
    const freelancersByProject = new Map();
    const paidPendingByProject = new Map();

    currentFees.forEach((fee) => {
      const freelancer = fee.freelancer?.name || 'Unknown freelancer';
      const project = projectName(fee);
      const amount = fee.calculated_fee || 0;

      addToMap(currentByFreelancer, freelancer, amount);
      addToMap(currentByProject, project, amount);

      if (!projectByFreelancer.has(freelancer)) projectByFreelancer.set(freelancer, new Map());
      addToMap(projectByFreelancer.get(freelancer), project, amount);

      if (!freelancersByProject.has(project)) freelancersByProject.set(project, new Set());
      freelancersByProject.get(project).add(freelancer);

      if (!paidPendingByProject.has(project)) paidPendingByProject.set(project, { paid: 0, pending: 0 });
      paidPendingByProject.get(project)[fee.status === 'paid' ? 'paid' : 'pending'] += amount;
    });

    compareFees.forEach((fee) => {
      addToMap(compareByFreelancer, fee.freelancer?.name || 'Unknown freelancer', fee.calculated_fee || 0);
      addToMap(compareByProject, projectName(fee), fee.calculated_fee || 0);
    });

    const freelancerNames = new Set([...currentByFreelancer.keys(), ...compareByFreelancer.keys()]);
    const freelancerRows = [...freelancerNames].map((name) => {
      const current = currentByFreelancer.get(name) || 0;
      const previous = compareByFreelancer.get(name) || 0;
      const projects = [...(projectByFreelancer.get(name) || new Map()).entries()]
        .map(([project, amount]) => ({ project, amount }))
        .sort((a, b) => b.amount - a.amount);

      return {
        id: name,
        freelancer: name,
        current,
        previous,
        change: current - previous,
        changePercent: percentChange(current, previous),
        projects,
        projectCount: projects.length,
      };
    }).sort((a, b) => b.current - a.current);

    const projectNames = new Set([...currentByProject.keys(), ...compareByProject.keys()]);
    const projectRows = [...projectNames].map((name) => {
      const current = currentByProject.get(name) || 0;
      const previous = compareByProject.get(name) || 0;
      const status = paidPendingByProject.get(name) || { paid: 0, pending: 0 };

      return {
        id: name,
        project: name,
        current,
        previous,
        change: current - previous,
        changePercent: percentChange(current, previous),
        freelancerCount: freelancersByProject.get(name)?.size || 0,
        paid: status.paid,
        pending: status.pending,
      };
    }).sort((a, b) => b.current - a.current);

    const monthlyMap = new Map();
    allFees.forEach((fee) => {
      if (!fee.period_month) return;
      if (!monthlyMap.has(fee.period_month)) monthlyMap.set(fee.period_month, { period: fee.period_month, total: 0, paid: 0, pending: 0 });
      const target = monthlyMap.get(fee.period_month);
      const amount = fee.calculated_fee || 0;
      target.total += amount;
      target[fee.status === 'paid' ? 'paid' : 'pending'] += amount;
    });

    const monthlyTrend = [...monthlyMap.values()]
      .sort((a, b) => a.period.localeCompare(b.period))
      .slice(-12)
      .map((row) => ({ ...row, month: formatPeriod(row.period) }));

    const topProject = projectRows[0];

    return {
      currentFees,
      compareFees,
      currentTotal,
      compareTotal,
      delta,
      deltaPercent,
      freelancerRows,
      projectRows,
      monthlyTrend,
      topProject,
      freelancerCount: freelancerRows.filter((row) => row.current > 0).length,
      projectCount: projectRows.filter((row) => row.current > 0).length,
    };
  }, [fees, period, comparePeriod]);

  const csvRows = useMemo(() => analytics.freelancerRows.map((row) => ({
    freelancer: row.freelancer,
    payroll_month: formatPeriod(period),
    payroll_total: row.current,
    compare_month: formatPeriod(comparePeriod),
    compare_total: row.previous,
    change_amount: row.change,
    change_percent: `${Math.round(row.changePercent)}%`,
    project_count: row.projectCount,
    project_breakdown: row.projects.map((project) => `${project.project}: Rp ${formatCurrency(project.amount)}`).join(' | '),
  })), [analytics.freelancerRows, comparePeriod, period]);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-5">
        <div className="h-10 w-64 rounded bg-gray-200" />
        <div className="grid gap-4 md:grid-cols-4">
          <div className="h-32 rounded-xl bg-gray-200" />
          <div className="h-32 rounded-xl bg-gray-200" />
          <div className="h-32 rounded-xl bg-gray-200" />
          <div className="h-32 rounded-xl bg-gray-200" />
        </div>
        <div className="h-80 rounded-xl bg-gray-200" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Payroll Analytics"
        description="Compare freelancer payouts by month, project, and total project cost"
        action={
          <Button
            variant="secondary"
            onClick={() => downloadCsv(`payroll-analytics-${period}.csv`, csvRows)}
            disabled={!csvRows.length}
          >
            <Download size={15} className="mr-1.5" />
            Export CSV
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:max-w-3xl">
        <Select
          label="Payroll Month"
          value={period}
          onChange={(event) => {
            setPeriod(event.target.value);
            setComparePeriod(getPreviousMonthKey(event.target.value));
          }}
          options={availablePeriods}
        />
        <Select
          label="Compare With"
          value={comparePeriod}
          onChange={(event) => setComparePeriod(event.target.value)}
          options={availablePeriods}
        />
      </div>

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title={`Total Payroll - ${formatPeriod(period)}`} value={analytics.currentTotal} subtitle={`${analytics.currentFees.length} fee entries`} icon={WalletCards} />
        <SummaryCard title={`Compare - ${formatPeriod(comparePeriod)}`} value={analytics.compareTotal} subtitle={`${analytics.compareFees.length} fee entries`} tone="slate" />
        <DeltaCard value={analytics.delta} percent={analytics.deltaPercent} />
        <SummaryCard title="Project Coverage" value={analytics.projectCount} subtitle={`${analytics.freelancerCount} active freelancers`} icon={Users} isCount />
      </section>

      <section className="mb-6 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card title="Monthly Payroll Trend" description="Total freelancer cost, paid amount, and pending amount">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.monthlyTrend} margin={{ left: -18, right: 8, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis tickFormatter={chartCurrency} tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip formatter={(value) => `Rp ${formatCurrency(value)}`} contentStyle={{ borderRadius: 12, borderColor: '#e5e7eb' }} />
                <Area type="monotone" dataKey="total" name="Total Payroll" stroke="#111827" strokeWidth={3} fill="#e5e7eb" animationDuration={900} />
                <Area type="monotone" dataKey="paid" name="Paid" stroke="#475569" strokeWidth={2} fill="transparent" animationDuration={900} />
                <Area type="monotone" dataKey="pending" name="Pending" stroke="#d97706" strokeWidth={2} fill="transparent" animationDuration={900} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Project Cost Mix" description={`Top projects in ${formatPeriod(period)}`}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.projectRows.slice(0, 8)} layout="vertical" margin={{ left: 8, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" tickFormatter={chartCurrency} tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis type="category" dataKey="project" width={110} tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                <Tooltip formatter={(value) => `Rp ${formatCurrency(value)}`} contentStyle={{ borderRadius: 12, borderColor: '#e5e7eb' }} />
                <Bar dataKey="current" name="Project Cost" fill="#111827" radius={[0, 6, 6, 0]} animationDuration={900} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <section className="mb-6">
        <SectionHeader
          title="Freelancer Payroll Compare"
          description="Total payout per freelancer with project breakdown"
        />
        <DataTable
          rows={analytics.freelancerRows}
          emptyMessage="No freelancer payroll data for this period."
          columns={[
            { key: 'freelancer', label: 'Freelancer', render: (row) => <span className="font-semibold text-gray-950">{row.freelancer}</span> },
            { key: 'current', label: formatPeriod(period), render: (row) => <Amount value={row.current} /> },
            { key: 'previous', label: formatPeriod(comparePeriod), render: (row) => <span className="font-medium text-slate-700">Rp {formatCurrency(row.previous)}</span> },
            { key: 'change', label: 'Change', render: (row) => <Change value={row.change} percent={row.changePercent} /> },
            { key: 'projects', label: 'Projects', render: (row) => <ProjectBreakdown projects={row.projects} /> },
          ]}
        />
      </section>

      <section>
        <SectionHeader
          title="Project Payroll Compare"
          description="Total freelancer cost grouped by client project / engagement"
        />
        <DataTable
          rows={analytics.projectRows}
          emptyMessage="No project payroll data for this period."
          columns={[
            { key: 'project', label: 'Project', render: (row) => <span className="font-semibold text-gray-950">{row.project}</span> },
            { key: 'current', label: formatPeriod(period), render: (row) => <Amount value={row.current} /> },
            { key: 'previous', label: formatPeriod(comparePeriod), render: (row) => <span className="font-medium text-slate-700">Rp {formatCurrency(row.previous)}</span> },
            { key: 'change', label: 'Change', render: (row) => <Change value={row.change} percent={row.changePercent} /> },
            { key: 'freelancers', label: 'Freelancers', render: (row) => `${row.freelancerCount} people` },
            { key: 'status', label: 'Paid / Pending', render: (row) => <span className="text-xs text-gray-500">Rp {formatCurrency(row.paid)} / Rp {formatCurrency(row.pending)}</span> },
          ]}
        />
      </section>
    </>
  );
}

function SummaryCard({ title, value, subtitle, icon: Icon, tone = 'dark', isCount = false }) {
  return (
    <Card className="!p-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">{title}</p>
          <p className={`mt-3 text-2xl font-bold tracking-tight ${tone === 'slate' ? 'text-slate-700' : 'text-gray-950'}`}>
            {isCount ? <AnimatedNumber value={value} /> : <AnimatedNumber value={value} prefix="Rp " />}
          </p>
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        </div>
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-950 text-white">
            <Icon size={19} />
          </div>
        )}
      </div>
    </Card>
  );
}

function DeltaCard({ value, percent }) {
  const isUp = value > 0;
  const Icon = isUp ? TrendingUp : TrendingDown;
  const tone = value === 0 ? 'text-slate-700' : isUp ? 'text-amber-700' : 'text-slate-700';

  return (
    <Card className="!p-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Month Difference</p>
          <p className={`mt-3 text-2xl font-bold tracking-tight ${tone}`}>
            {value < 0 ? '-Rp ' : 'Rp '}
            <AnimatedNumber value={Math.abs(value)} />
          </p>
          <p className="mt-1 text-sm text-gray-500">{Math.round(percent)}% vs compare month</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isUp ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
          <Icon size={19} />
        </div>
      </div>
    </Card>
  );
}

function Amount({ value }) {
  return <span className="font-semibold text-gray-950">Rp {formatCurrency(value)}</span>;
}

function SectionHeader({ title, description }) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-semibold tracking-tight text-gray-950">{title}</h2>
      <p className="mt-0.5 text-sm text-gray-500">{description}</p>
    </div>
  );
}

function Change({ value, percent }) {
  const isUp = value > 0;
  const tone = value === 0 ? 'text-gray-500' : isUp ? 'text-amber-700' : 'text-slate-700';

  return (
    <div className={`font-medium ${tone}`}>
      <div>{value < 0 ? '-Rp ' : 'Rp '}{formatCurrency(Math.abs(value))}</div>
      <div className="text-xs opacity-80">{Math.round(percent)}%</div>
    </div>
  );
}

function ProjectBreakdown({ projects }) {
  if (!projects.length) return <span className="text-gray-400">No project this month</span>;

  return (
    <div className="max-w-xs space-y-1">
      {projects.slice(0, 3).map((project) => (
        <div key={project.project} className="flex items-center justify-between gap-3 text-xs">
          <span className="min-w-0 truncate text-gray-600" title={project.project}>{project.project}</span>
          <span className="shrink-0 font-semibold text-slate-700">Rp {formatCurrency(project.amount)}</span>
        </div>
      ))}
      {projects.length > 3 && <p className="text-xs text-gray-400">+{projects.length - 3} more projects</p>}
    </div>
  );
}
