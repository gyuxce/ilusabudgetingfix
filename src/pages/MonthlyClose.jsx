import { useMemo, useState } from 'react';
import { CheckCircle2, Circle, FileText, Wallet } from 'lucide-react';
import { useInvoices } from '../lib/queries/invoices';
import { useFreelancerFees } from '../lib/queries/freelancer_fees';
import { currentMonthKey, formatPeriod, lastNMonths } from '../lib/utils';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';

const formatCurrency = (value) => new Intl.NumberFormat('id-ID').format(value || 0);
const invoiceBillingMonth = (invoice) => invoice.effective_billing_month || invoice.billing_month || invoice.period_month;

export default function MonthlyClose() {
  const [period, setPeriod] = useState(currentMonthKey());
  const { data: invoices, isLoading: invoicesLoading } = useInvoices();
  const { data: fees, isLoading: feesLoading } = useFreelancerFees();

  const close = useMemo(() => {
    const monthInvoices = (invoices || []).filter((invoice) => invoiceBillingMonth(invoice) === period);
    const monthFees = (fees || []).filter((fee) => fee.period_month === period);

    const invoiceIssued = monthInvoices.length > 0;
    const invoiceApproved = monthInvoices.length > 0 && monthInvoices.every((invoice) => ['approved', 'sent', 'partial', 'paid', 'overdue'].includes(invoice.computed_status));
    const invoiceSent = monthInvoices.length > 0 && monthInvoices.every((invoice) => ['sent', 'partial', 'paid', 'overdue'].includes(invoice.computed_status));
    const invoicePaid = monthInvoices.length > 0 && monthInvoices.every((invoice) => invoice.computed_status === 'paid');
    const feeCreated = monthFees.length > 0;
    const feeApproved = monthFees.length > 0 && monthFees.every((fee) => ['approved', 'paid'].includes(fee.status));
    const feePaid = monthFees.length > 0 && monthFees.every((fee) => fee.status === 'paid');

    const items = [
      { label: 'Invoices created', done: invoiceIssued, detail: `${monthInvoices.length} invoices`, icon: FileText },
      { label: 'Invoices approved', done: invoiceApproved, detail: `${monthInvoices.filter((invoice) => ['approved', 'sent', 'partial', 'paid', 'overdue'].includes(invoice.computed_status)).length}/${monthInvoices.length} ready`, icon: FileText },
      { label: 'Invoices sent', done: invoiceSent, detail: `${monthInvoices.filter((invoice) => ['sent', 'partial', 'paid', 'overdue'].includes(invoice.computed_status)).length}/${monthInvoices.length} sent`, icon: FileText },
      { label: 'Invoices paid', done: invoicePaid, detail: `Rp ${formatCurrency(monthInvoices.reduce((sum, invoice) => sum + (invoice.total_paid || 0), 0))} received`, icon: FileText },
      { label: 'Freelancer fees created', done: feeCreated, detail: `${monthFees.length} fee entries`, icon: Wallet },
      { label: 'Freelancer fees approved', done: feeApproved, detail: `${monthFees.filter((fee) => ['approved', 'paid'].includes(fee.status)).length}/${monthFees.length} approved`, icon: Wallet },
      { label: 'Freelancer fees paid', done: feePaid, detail: `Rp ${formatCurrency(monthFees.filter((fee) => fee.status === 'paid').reduce((sum, fee) => sum + (fee.calculated_fee || 0), 0))} paid`, icon: Wallet },
    ];

    const doneCount = items.filter((item) => item.done).length;
    const revenue = monthInvoices.reduce((sum, invoice) => sum + (invoice.amount || 0), 0);
    const received = monthInvoices.reduce((sum, invoice) => sum + (invoice.total_paid || 0), 0);
    const payable = monthFees.reduce((sum, fee) => sum + (fee.calculated_fee || 0), 0);
    const paidFees = monthFees.filter((fee) => fee.status === 'paid').reduce((sum, fee) => sum + (fee.calculated_fee || 0), 0);

    return { items, doneCount, revenue, received, payable, paidFees, monthInvoices, monthFees };
  }, [fees, invoices, period]);

  if (invoicesLoading || feesLoading) {
    return <div className="h-80 animate-pulse rounded-xl bg-gray-200" />;
  }

  return (
    <>
      <PageHeader
        title="Monthly Close"
        description="Close checklist for invoice billing, freelancer approval, and payment completion"
        action={
          <Select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            options={lastNMonths(18)}
            className="w-52"
          />
        }
      />

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        <Metric label="Close Progress" value={close.doneCount} suffix={`/ ${close.items.length}`} />
        <Metric label="Revenue Issued" value={close.revenue} money />
        <Metric label="Revenue Received" value={close.received} money tone="slate" />
        <Metric label="Freelancer Payable" value={close.payable} money tone="amber" />
      </section>

      <Card title={`${formatPeriod(period)} Close Checklist`} description="Complete every item before closing the month">
        <div className="grid gap-3">
          {close.items.map((item) => (
            <ChecklistItem key={item.label} item={item} />
          ))}
        </div>
      </Card>
    </>
  );
}

function Metric({ label, value, suffix = '', money = false, tone = 'dark' }) {
  const toneClass = tone === 'amber' ? 'text-amber-700' : tone === 'slate' ? 'text-slate-700' : 'text-gray-950';

  return (
    <Card className="!p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold tracking-tight ${toneClass}`}>
        {money ? <AnimatedNumber value={value} prefix="Rp " /> : <><AnimatedNumber value={value} />{suffix}</>}
      </p>
    </Card>
  );
}

function ChecklistItem({ item }) {
  const Icon = item.icon;
  const StateIcon = item.done ? CheckCircle2 : Circle;

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${item.done ? 'bg-slate-100 text-slate-700' : 'bg-white text-gray-400'}`}>
          <Icon size={17} />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-950">{item.label}</p>
          <p className="text-xs text-gray-500">{item.detail}</p>
        </div>
      </div>
      <StateIcon className={item.done ? 'text-slate-700' : 'text-gray-300'} size={20} />
    </div>
  );
}
