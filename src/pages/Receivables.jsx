import { useMemo, useState } from 'react';
import { Banknote, Pencil, Plus, Trash2, WalletCards } from 'lucide-react';
import { useClients } from '../lib/queries/clients';
import {
  useClientAdvances,
  useCreateClientAdvance,
  useDeleteClientAdvance,
  useUpdateClientAdvance,
} from '../lib/queries/client_advances';
import { currentMonthKey, formatPeriod, lastNMonths } from '../lib/utils';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { StatCard } from '../components/ui/StatCard';
import { DataTable } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

const formatCurrency = (value) => new Intl.NumberFormat('id-ID').format(value || 0);
const todayKey = () => new Date().toISOString().slice(0, 10);
const statusLabels = {
  open: 'Open',
  reimbursed: 'Reimbursed',
  written_off: 'Written off',
};

const categoryOptions = [
  { value: 'ads', label: 'Ads' },
  { value: 'tools', label: 'Tools' },
  { value: 'production', label: 'Production' },
  { value: 'operational', label: 'Operational' },
  { value: 'other', label: 'Other' },
];

export default function Receivables() {
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: advances, isLoading: advancesLoading, error: advancesError } = useClientAdvances();
  const createAdvance = useCreateClientAdvance();
  const updateAdvance = useUpdateClientAdvance();
  const deleteAdvance = useDeleteClientAdvance();

  const [periodFilter, setPeriodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('open');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdvance, setEditingAdvance] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    client_id: '',
    title: '',
    category: 'ads',
    amount: '',
    spend_date: todayKey(),
    period_month: currentMonthKey(),
    status: 'open',
    reimbursed_date: '',
    notes: '',
  });

  const filteredRows = useMemo(() => {
    return (advances || [])
      .filter((row) => {
        if (periodFilter !== 'all' && row.period_month !== periodFilter) return false;
        if (statusFilter !== 'all' && row.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => (b.spend_date || '').localeCompare(a.spend_date || ''));
  }, [advances, periodFilter, statusFilter]);

  const totals = useMemo(() => {
    const source = advances || [];
    return {
      open: source.filter((row) => row.status === 'open').reduce((sum, row) => sum + (row.amount || 0), 0),
      reimbursed: source.filter((row) => row.status === 'reimbursed').reduce((sum, row) => sum + (row.amount || 0), 0),
      writtenOff: source.filter((row) => row.status === 'written_off').reduce((sum, row) => sum + (row.amount || 0), 0),
    };
  }, [advances]);

  const openAddModal = () => {
    setEditingAdvance(null);
    setFormData({
      client_id: clients?.[0]?.id || '',
      title: '',
      category: 'ads',
      amount: '',
      spend_date: todayKey(),
      period_month: currentMonthKey(),
      status: 'open',
      reimbursed_date: '',
      notes: '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (advance, event) => {
    event?.stopPropagation();
    setEditingAdvance(advance);
    setFormData({
      client_id: advance.client_id || '',
      title: advance.title || '',
      category: advance.category || 'other',
      amount: advance.amount || '',
      spend_date: advance.spend_date || todayKey(),
      period_month: advance.period_month || currentMonthKey(),
      status: advance.status || 'open',
      reimbursed_date: advance.reimbursed_date || '',
      notes: advance.notes || '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    const amount = parseInt(formData.amount, 10);
    if (!formData.client_id || !formData.title.trim() || !formData.spend_date || !formData.period_month) {
      setFormError('Client, title, spend date, and period are required.');
      return;
    }

    if (Number.isNaN(amount) || amount <= 0) {
      setFormError('Amount must be greater than zero.');
      return;
    }

    if (formData.status === 'reimbursed' && !formData.reimbursed_date) {
      setFormError('Reimbursed date is required when status is Reimbursed.');
      return;
    }

    const payload = {
      client_id: formData.client_id,
      title: formData.title.trim(),
      category: formData.category,
      amount,
      spend_date: formData.spend_date,
      period_month: formData.period_month,
      status: formData.status,
      reimbursed_date: formData.status === 'reimbursed' ? formData.reimbursed_date : null,
      notes: formData.notes.trim() || null,
    };

    try {
      if (editingAdvance) {
        await updateAdvance.mutateAsync({ id: editingAdvance.id, ...payload });
      } else {
        await createAdvance.mutateAsync(payload);
      }
      setIsModalOpen(false);
    } catch (error) {
      setFormError(error.message);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteAdvance.mutateAsync(deleteId);
      setDeleteId(null);
    } catch (error) {
      alert(error.message);
    }
  };

  const columns = [
    { key: 'client', label: 'Client', render: (row) => <span className="font-medium">{row.client?.company_name || '-'}</span> },
    { key: 'title', label: 'Item', render: (row) => row.title },
    { key: 'category', label: 'Type', render: (row) => categoryOptions.find((item) => item.value === row.category)?.label || 'Other' },
    { key: 'period_month', label: 'Period', render: (row) => formatPeriod(row.period_month) },
    { key: 'spend_date', label: 'Paid Date', render: (row) => row.spend_date || '-' },
    { key: 'amount', label: 'Amount', render: (row) => <span className="font-semibold">Rp {formatCurrency(row.amount)}</span> },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'open' ? 'warning' : row.status === 'reimbursed' ? 'success' : 'danger'}>
          {statusLabels[row.status] || row.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-1" onClick={(event) => event.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={(event) => openEditModal(row, event)}>
            <Pencil size={14} />
          </Button>
          <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => setDeleteId(row.id)}>
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];

  if (clientsLoading || advancesLoading) {
    return <div className="p-12 text-center text-sm text-gray-500">Loading piutang...</div>;
  }

  return (
    <>
      <PageHeader
        title="Piutang"
        description="Manual notes for money paid first by PT on behalf of clients."
        action={
          <Button onClick={openAddModal}>
            <Plus size={16} className="mr-1.5" />
            New Piutang
          </Button>
        }
      />

      {advancesError && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Table client_advances is not ready yet. Run the latest schema.sql in Supabase SQL Editor, then refresh this page.
        </div>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Open Talangan" value={totals.open} count="Reduces cash position" icon={WalletCards} tone="red" />
        <StatCard label="Reimbursed" value={totals.reimbursed} count="Cash recovered from clients" icon={Banknote} tone="blue" delay={0.03} />
        <StatCard label="Written Off" value={totals.writtenOff} count="Not expected to be collected" icon={WalletCards} tone="gray" delay={0.06} />
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-[220px_220px]">
        <Select
          value={periodFilter}
          onChange={(event) => setPeriodFilter(event.target.value)}
          options={[
            { value: 'all', label: 'All months' },
            ...lastNMonths(18).map((month) => ({ value: month.value, label: month.label })),
          ]}
        />
        <Select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          options={[
            { value: 'open', label: 'Open' },
            { value: 'reimbursed', label: 'Reimbursed' },
            { value: 'written_off', label: 'Written off' },
            { value: 'all', label: 'All statuses' },
          ]}
        />
      </div>

      {filteredRows.length === 0 ? (
        <EmptyState
          icon={WalletCards}
          title="No piutang yet"
          description="Add manual client talangan like ads spend, tools, or operational costs paid first by PT."
          action={<Button onClick={openAddModal}>New Piutang</Button>}
        />
      ) : (
        <DataTable columns={columns} rows={filteredRows} onRowClick={openEditModal} emptyMessage="No piutang match your filters" />
      )}

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAdvance ? 'Edit Piutang' : 'New Piutang'}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleSubmit} disabled={createAdvance.isPending || updateAdvance.isPending}>
              {editingAdvance ? 'Update' : 'Save'}
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          {formError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {formError}
            </div>
          )}

          <Select
            label="Client *"
            required
            value={formData.client_id}
            onChange={(event) => setFormData({ ...formData, client_id: event.target.value })}
            options={[
              { value: '', label: 'Select client' },
              ...(clients || []).map((client) => ({ value: client.id, label: client.company_name })),
            ]}
          />

          <Input
            label="Description *"
            required
            placeholder="Meta Ads, Google Ads, domain, tools..."
            value={formData.title}
            onChange={(event) => setFormData({ ...formData, title: event.target.value })}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Type"
              value={formData.category}
              onChange={(event) => setFormData({ ...formData, category: event.target.value })}
              options={categoryOptions}
            />
            <Input
              label="Amount *"
              type="number"
              min="1"
              required
              value={formData.amount}
              onChange={(event) => setFormData({ ...formData, amount: event.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Paid Date *"
              type="date"
              required
              value={formData.spend_date}
              onChange={(event) => setFormData({ ...formData, spend_date: event.target.value })}
            />
            <Input
              label="Period *"
              type="month"
              required
              value={formData.period_month}
              onChange={(event) => setFormData({ ...formData, period_month: event.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Status"
              value={formData.status}
              onChange={(event) => setFormData({
                ...formData,
                status: event.target.value,
                reimbursed_date: event.target.value === 'reimbursed' ? formData.reimbursed_date : '',
              })}
              options={[
                { value: 'open', label: 'Open' },
                { value: 'reimbursed', label: 'Reimbursed' },
                { value: 'written_off', label: 'Written off' },
              ]}
            />
            <Input
              label="Reimbursed Date"
              type="date"
              value={formData.reimbursed_date}
              onChange={(event) => setFormData({
                ...formData,
                reimbursed_date: event.target.value,
                status: event.target.value ? 'reimbursed' : formData.status,
              })}
            />
          </div>

          <Textarea
            label="Notes"
            rows={3}
            placeholder="Optional internal note"
            value={formData.notes}
            onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
          />
        </form>
      </Modal>

      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Piutang"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleteAdvance.isPending}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">Delete this piutang entry? This cannot be undone.</p>
      </Modal>
    </>
  );
}
