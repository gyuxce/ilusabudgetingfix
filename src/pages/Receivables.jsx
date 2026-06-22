import { useMemo, useState } from 'react';
import { AlertTriangle, Banknote, CircleDollarSign, WalletCards } from 'lucide-react';
import { useInvoices } from '../lib/queries/invoices';
import { useFreelancerFees } from '../lib/queries/freelancer_fees';
import { currentMonthKey, formatPeriod, lastNMonths } from '../lib/utils';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { DataTable } from '../components/ui/DataTable';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

const formatCurrency = (value) => new Intl.NumberFormat('id-ID').format(value || 0);

const rowKey = (engagementId, periodMonth) => `${engagementId || 'no-engagement'}::${periodMonth || 'no-period'}`;

export default function Receivables() {
  const [periodFilter, setPeriodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('open');
  const { data: invoices, isLoading: invoicesLoading } = useInvoices();
  const { data: fees, isLoading: feesLoading } = useFreelancerFees();

  const rows = useMemo(() => {
    const grouped = new Map();

    (fees || []).forEach((fee) => {
      const key = rowKey(fee.engagement_id, fee.period_month);
      const current = grouped.get(key) || {
        id: key,
        engagement_id: fee.engagement_id,
        period_month: fee.period_month,
        client: fee.engagement?.client?.company_name || '-',
        service: fee.engagement?.service?.name || '-',
        paid_fees: 0,
        pending_fees: 0,
        fee_count: 0,
      };

      current.fee_count += 1;
      if (fee.status === 'paid') {
        current.paid_fees += fee.calculated_fee || 0;
      } else {
        current.pending_fees += fee.calculated_fee || 0;
      }

      grouped.set(key, current);
    });

    (invoices || []).forEach((invoice) => {
      const key = rowKey(invoice.engagement_id, invoice.period_month);
      const current = grouped.get(key) || {
        id: key,
        engagement_id: invoice.engagement_id,
        period_month: invoice.period_month,
        client: invoice.engagement?.client?.company_name || '-',
        service: invoice.engagement?.service?.name || '-',
        paid_fees: 0,
        pending_fees: 0,
        fee_count: 0,
      };

      current.invoice_amount = (current.invoice_amount || 0) + (invoice.amount || 0);
      current.client_paid = (current.client_paid || 0) + (invoice.total_paid || 0);
      current.client_balance = (current.client_balance || 0) + (invoice.balance || 0);
      current.invoice_count = (current.invoice_count || 0) + 1;
      current.has_overdue = current.has_overdue || invoice.computed_status === 'overdue';

      grouped.set(key, current);
    });

    return [...grouped.values()]
      .map((row) => {
        const clientBalance = row.client_balance || 0;
        const paidFees = row.paid_fees || 0;
        const isOpen = paidFees > 0 && (clientBalance > 0 || !row.invoice_count);

        return {
          ...row,
          client_balance: clientBalance,
          invoice_amount: row.invoice_amount || 0,
          client_paid: row.client_paid || 0,
          invoice_count: row.invoice_count || 0,
          cash_advanced: isOpen ? paidFees : 0,
          status: !row.invoice_count ? 'no_invoice' : clientBalance > 0 ? 'open' : 'settled',
        };
      })
      .filter((row) => {
        if (periodFilter !== 'all' && row.period_month !== periodFilter) return false;
        if (statusFilter === 'open') return row.cash_advanced > 0;
        if (statusFilter === 'no_invoice') return row.status === 'no_invoice' && row.paid_fees > 0;
        if (statusFilter === 'settled') return row.status === 'settled' && row.paid_fees > 0;
        return row.paid_fees > 0 || row.client_balance > 0;
      })
      .sort((a, b) => {
        if ((b.cash_advanced || 0) !== (a.cash_advanced || 0)) return (b.cash_advanced || 0) - (a.cash_advanced || 0);
        return (b.period_month || '').localeCompare(a.period_month || '');
      });
  }, [fees, invoices, periodFilter, statusFilter]);

  const totals = useMemo(() => ({
    advanced: rows.reduce((sum, row) => sum + (row.cash_advanced || 0), 0),
    clientBalance: rows.reduce((sum, row) => sum + (row.client_balance || 0), 0),
    missingInvoices: rows.filter((row) => row.status === 'no_invoice').length,
  }), [rows]);

  const columns = [
    { key: 'client', label: 'Client', render: (row) => <span className="font-medium">{row.client}</span> },
    { key: 'service', label: 'Service' },
    { key: 'period_month', label: 'Period', render: (row) => formatPeriod(row.period_month) },
    { key: 'paid_fees', label: 'Paid Out', render: (row) => <span className="font-semibold">Rp {formatCurrency(row.paid_fees)}</span> },
    { key: 'client_balance', label: 'Client Unpaid', render: (row) => <span className="font-semibold text-amber-700">Rp {formatCurrency(row.client_balance)}</span> },
    { key: 'cash_advanced', label: 'Piutang Risk', render: (row) => <span className="font-semibold text-red-700">Rp {formatCurrency(row.cash_advanced)}</span> },
    {
      key: 'status',
      label: 'Status',
      render: (row) => {
        if (row.status === 'no_invoice') return <Badge variant="warning">No invoice</Badge>;
        if (row.status === 'settled') return <Badge variant="success">Settled</Badge>;
        return <Badge variant={row.has_overdue ? 'danger' : 'warning'}>{row.has_overdue ? 'Overdue' : 'Open'}</Badge>;
      },
    },
  ];

  if (invoicesLoading || feesLoading) {
    return <div className="p-12 text-center text-sm text-gray-500">Loading piutang...</div>;
  }

  return (
    <div>
      <PageHeader
        title="Piutang"
        description="Track fees already paid out while client invoices are still unpaid."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Paid Before Client Pays" value={totals.advanced} count={`${rows.length} rows monitored`} icon={WalletCards} tone="red" />
        <StatCard label="Client Unpaid" value={totals.clientBalance} count="Outstanding invoice balance" icon={CircleDollarSign} tone="amber" delay={0.03} />
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm shadow-gray-950/5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Missing Invoices</p>
              <p className="mt-3 text-2xl font-bold tracking-tight text-gray-950">{totals.missingInvoices}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-700 ring-1 ring-gray-200">
              <AlertTriangle size={19} />
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-500">Paid fees without invoice</p>
        </div>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-[220px_220px]">
        <Select
          value={periodFilter}
          onChange={(event) => setPeriodFilter(event.target.value)}
          options={[
            { value: 'all', label: 'All months' },
            ...lastNMonths(18, currentMonthKey()).map((month) => ({ value: month.value, label: month.label })),
          ]}
        />
        <Select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          options={[
            { value: 'open', label: 'Open piutang' },
            { value: 'no_invoice', label: 'No invoice yet' },
            { value: 'settled', label: 'Settled' },
            { value: 'all', label: 'All records' },
          ]}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Banknote} title="No piutang found" description="Paid freelancer fees with unpaid client invoices will appear here." />
      ) : (
        <DataTable columns={columns} rows={rows} emptyMessage="No piutang records match your filters" />
      )}
    </div>
  );
}
