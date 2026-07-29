import { useMemo, useState } from 'react';
import { ArrowDownRight, Check, ExternalLink, Plus, RotateCcw, WalletCards } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  useFreelancerFees,
  useCreateFreelancerFee,
  useMarkFeePaid,
  useMarkFeeUnpaid,
} from '../lib/queries/freelancer_fees';
import { useFreelancers } from '../lib/queries/freelancers';
import { useEngagements } from '../lib/queries/engagements';
import { useClients } from '../lib/queries/clients';
import {
  useClientAdvances,
  useCreateClientAdvance,
  useUpdateClientAdvance,
} from '../lib/queries/client_advances';
import { currentMonthKey, lastNMonths } from '../lib/utils';
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

const categoryOptions = [
  { value: 'ads', label: 'Iklan' },
  { value: 'tools', label: 'Tools' },
  { value: 'production', label: 'Produksi' },
  { value: 'operational', label: 'Operasional' },
  { value: 'other', label: 'Lainnya' },
];

const createDefaultForm = (type = 'client') => ({
  type,
  client_id: '',
  freelancer_id: '',
  engagement_id: '',
  title: '',
  category: 'ads',
  amount: '',
  date: todayKey(),
  period_month: currentMonthKey(),
  status: 'paid',
  notes: '',
});

const unifiedStatus = (row) => {
  if (row.source === 'advance') {
    if (row.status === 'reimbursed') return 'paid';
    if (row.status === 'written_off') return 'written_off';
    return 'open';
  }
  return row.status === 'paid' ? 'paid' : 'open';
};

const statusLabel = (row) => {
  if (row.source === 'advance') {
    return {
      open: 'Menunggu diganti',
      reimbursed: 'Sudah diganti',
      written_off: 'Tidak ditagih',
    }[row.status] || row.status;
  }
  return row.status === 'paid' ? 'Sudah dibayar' : 'Belum dibayar';
};

const formatDate = (date) => {
  if (!date) return '-';
  const [year, month, day] = date.split('-');
  return year && month && day ? `${day}/${month}/${year}` : date;
};

export default function Expenses() {
  const { data: fees, isLoading: feesLoading } = useFreelancerFees();
  const { data: advances, isLoading: advancesLoading, error: advancesError } = useClientAdvances();
  const { data: freelancers } = useFreelancers();
  const { data: engagements } = useEngagements();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const createFee = useCreateFreelancerFee();
  const markFeePaid = useMarkFeePaid();
  const markFeeUnpaid = useMarkFeeUnpaid();
  const createAdvance = useCreateClientAdvance();
  const updateAdvance = useUpdateClientAdvance();

  const [activeTab, setActiveTab] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(createDefaultForm());
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');

  const rows = useMemo(() => [
    ...(fees || []).map((fee) => ({
      id: `fee-${fee.id}`,
      source: 'fee',
      sourceId: fee.id,
      date: fee.paid_date || `${fee.period_month}-01`,
      period_month: fee.period_month,
      party: fee.freelancer?.name || 'Freelancer',
      detail: fee.engagement
        ? `${fee.engagement.client?.company_name || '-'} - ${fee.engagement.service?.name || '-'}`
        : 'Fee freelancer',
      amount: fee.calculated_fee || 0,
      status: fee.status,
      raw: fee,
    })),
    ...(advances || []).map((advance) => ({
      id: `advance-${advance.id}`,
      source: 'advance',
      sourceId: advance.id,
      date: advance.spend_date,
      period_month: advance.period_month,
      party: advance.client?.company_name || 'Client',
      detail: advance.title || 'Talangan client',
      amount: advance.amount || 0,
      status: advance.status,
      raw: advance,
    })),
  ], [fees, advances]);

  const filteredRows = useMemo(() => rows
    .filter((row) => {
      if (activeTab === 'freelancer' && row.source !== 'fee') return false;
      if (activeTab === 'client' && row.source !== 'advance') return false;
      if (periodFilter !== 'all' && row.period_month !== periodFilter) return false;
      if (statusFilter !== 'all' && unifiedStatus(row) !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => (b.date || '').localeCompare(a.date || '')),
  [rows, activeTab, periodFilter, statusFilter]);

  const totals = useMemo(() => {
    const scoped = rows.filter((row) => periodFilter === 'all' || row.period_month === periodFilter);
    const paidFee = scoped
      .filter((row) => row.source === 'fee' && row.status === 'paid')
      .reduce((sum, row) => sum + row.amount, 0);
    const advanceOut = scoped
      .filter((row) => row.source === 'advance')
      .reduce((sum, row) => sum + row.amount, 0);
    const pendingFee = scoped
      .filter((row) => row.source === 'fee' && row.status !== 'paid')
      .reduce((sum, row) => sum + row.amount, 0);
    const openAdvance = scoped
      .filter((row) => row.source === 'advance' && row.status === 'open')
      .reduce((sum, row) => sum + row.amount, 0);

    return {
      cashOut: paidFee + advanceOut,
      pendingFee,
      openAdvance,
      count: scoped.length,
    };
  }, [rows, periodFilter]);

  const openModal = (type = 'client') => {
    setFormData(createDefaultForm(type));
    setFormError('');
    setActionError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    const amount = parseInt(formData.amount, 10);
    if (Number.isNaN(amount) || amount <= 0) {
      setFormError('Nominal harus lebih dari nol.');
      return;
    }

    try {
      if (formData.type === 'client') {
        if (!formData.client_id || !formData.title.trim() || !formData.date || !formData.period_month) {
          setFormError('Client, keterangan, tanggal bayar, dan bulan wajib diisi.');
          return;
        }

        await createAdvance.mutateAsync({
          client_id: formData.client_id,
          title: formData.title.trim(),
          category: formData.category,
          amount,
          spend_date: formData.date,
          period_month: formData.period_month,
          status: 'open',
          reimbursed_date: null,
          notes: formData.notes.trim() || null,
        });
      } else {
        if (!formData.freelancer_id || !formData.engagement_id || !formData.period_month) {
          setFormError('Freelancer, project, dan bulan wajib diisi.');
          return;
        }

        await createFee.mutateAsync({
          freelancer_id: formData.freelancer_id,
          engagement_id: formData.engagement_id,
          period_month: formData.period_month,
          fee_type: 'fixed',
          fixed_amount: amount,
          hourly_rate: null,
          hours_per_day: null,
          working_days: null,
          off_days: null,
          rate_single_post: null,
          qty_single_post: null,
          rate_carousel: null,
          qty_carousel: null,
          rate_reels: null,
          qty_reels: null,
          status: formData.status,
          paid_date: formData.status === 'paid' ? formData.date : null,
          notes: formData.notes.trim() || null,
        });
      }

      setIsModalOpen(false);
    } catch (error) {
      setFormError(error.message);
    }
  };

  const handleFeeStatus = async (row) => {
    setActionError('');
    try {
      if (row.status === 'paid') await markFeeUnpaid.mutateAsync(row.sourceId);
      else await markFeePaid.mutateAsync(row.sourceId);
    } catch (error) {
      setActionError(error.message);
    }
  };

  const handleAdvanceStatus = async (row) => {
    setActionError('');
    const advance = row.raw;
    try {
      await updateAdvance.mutateAsync({
        id: advance.id,
        client_id: advance.client_id,
        title: advance.title,
        category: advance.category,
        amount: advance.amount,
        spend_date: advance.spend_date,
        period_month: advance.period_month,
        status: advance.status === 'reimbursed' ? 'open' : 'reimbursed',
        reimbursed_date: advance.status === 'reimbursed' ? null : todayKey(),
        notes: advance.notes || null,
      });
    } catch (error) {
      setActionError(error.message);
    }
  };

  const columns = [
    { key: 'date', label: 'Tanggal', render: (row) => formatDate(row.date) },
    {
      key: 'source',
      label: 'Jenis',
      render: (row) => <Badge variant={row.source === 'advance' ? 'warning' : 'neutral'}>{row.source === 'advance' ? 'Talangan client' : 'Freelancer'}</Badge>,
    },
    { key: 'party', label: 'Untuk', render: (row) => <span className="font-medium">{row.party}</span> },
    { key: 'detail', label: 'Keterangan', render: (row) => <span className="max-w-[280px] truncate">{row.detail}</span> },
    { key: 'amount', label: 'Nominal', render: (row) => <span className="font-semibold">Rp {formatCurrency(row.amount)}</span> },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <Badge variant={unifiedStatus(row) === 'paid' ? 'success' : unifiedStatus(row) === 'written_off' ? 'danger' : 'warning'}>
          {statusLabel(row)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (row) => (
        <div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
          {row.source === 'advance' && row.status !== 'written_off' ? (
            <Button variant="ghost" size="sm" onClick={() => handleAdvanceStatus(row)} title={row.status === 'reimbursed' ? 'Buka kembali' : 'Tandai sudah diganti'}>
              {row.status === 'reimbursed' ? <RotateCcw size={14} /> : <Check size={14} />}
            </Button>
          ) : row.source === 'fee' ? (
            <Button variant="ghost" size="sm" onClick={() => handleFeeStatus(row)} title={row.status === 'paid' ? 'Tandai belum dibayar' : 'Tandai sudah dibayar'}>
              {row.status === 'paid' ? <RotateCcw size={14} /> : <Check size={14} />}
            </Button>
          ) : null}
          <Link
            to={row.source === 'advance' ? '/receivables' : '/fees'}
            title="Buka detail"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-700 transition-colors hover:bg-gray-100"
          >
            <ExternalLink size={14} />
          </Link>
        </div>
      ),
    },
  ];

  const isSaving = createFee.isPending || createAdvance.isPending;
  const isLoading = feesLoading || advancesLoading || clientsLoading;

  if (isLoading) {
    return <div className="p-12 text-center text-sm text-gray-500">Memuat pengeluaran...</div>;
  }

  return (
    <>
      <PageHeader
        title="Pengeluaran"
        description="Catat semua uang yang keluar dari PT, termasuk pembayaran freelancer dan talangan client."
        action={(
          <Button onClick={() => openModal('client')}>
            <Plus size={16} className="mr-1.5" />
            Tambah Pengeluaran
          </Button>
        )}
      />

      {advancesError && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Data talangan client belum bisa dimuat. Data fee freelancer tetap tersedia.
        </div>
      )}
      {actionError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{actionError}</div>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Cash Keluar" value={totals.cashOut} count={`${totals.count} catatan`} icon={ArrowDownRight} tone="red" />
        <StatCard label="Belum Dibayar" value={totals.pendingFee} count="Fee freelancer" icon={WalletCards} tone="amber" />
        <StatCard label="Menunggu Diganti" value={totals.openAdvance} count="Talangan client" icon={WalletCards} tone="blue" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          { value: 'all', label: 'Semua' },
          { value: 'freelancer', label: 'Freelancer' },
          { value: 'client', label: 'Talangan client' },
        ].map((tab) => (
          <Button key={tab.value} variant={activeTab === tab.value ? 'primary' : 'secondary'} onClick={() => setActiveTab(tab.value)}>
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <Select
          value={periodFilter}
          onChange={(event) => setPeriodFilter(event.target.value)}
          options={[{ value: 'all', label: 'Semua bulan' }, ...lastNMonths(18).map((month) => ({ value: month.value, label: month.label }))]}
          className="w-full sm:w-52"
        />
        <Select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          options={[
            { value: 'all', label: 'Semua status' },
            { value: 'open', label: 'Belum selesai' },
            { value: 'paid', label: 'Selesai' },
            { value: 'written_off', label: 'Tidak ditagih' },
          ]}
          className="w-full sm:w-52"
        />
      </div>

      {filteredRows.length === 0 ? (
        <EmptyState
          icon={WalletCards}
          title="Belum ada pengeluaran"
          description="Mulai dari pembayaran freelancer atau biaya client yang dibayarkan dulu oleh PT."
          action={<Button onClick={() => openModal(activeTab === 'freelancer' ? 'freelancer' : 'client')}>Tambah Pengeluaran</Button>}
        />
      ) : (
        <DataTable columns={columns} rows={filteredRows} emptyMessage="Tidak ada pengeluaran yang cocok dengan filter" />
      )}

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Tambah Pengeluaran"
        maxWidthClass="max-w-lg"
        footer={(
          <>
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="button" onClick={handleSubmit} disabled={isSaving}>Simpan</Button>
          </>
        )}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          {formError && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{formError}</div>}

          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">Jenis pengeluaran *</p>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant={formData.type === 'client' ? 'primary' : 'secondary'} onClick={() => setFormData({ ...formData, type: 'client' })}>
                Talangan client
              </Button>
              <Button type="button" variant={formData.type === 'freelancer' ? 'primary' : 'secondary'} onClick={() => setFormData({ ...formData, type: 'freelancer' })}>
                Freelancer
              </Button>
            </div>
          </div>

          {formData.type === 'client' ? (
            <>
              <Select
                label="Client *"
                required
                value={formData.client_id}
                onChange={(event) => setFormData({ ...formData, client_id: event.target.value })}
                options={[{ value: '', label: 'Pilih client' }, ...(clients || []).map((client) => ({ value: client.id, label: client.company_name }))]}
              />
              <Input label="Keterangan *" required placeholder="Meta Ads, domain, tools..." value={formData.title} onChange={(event) => setFormData({ ...formData, title: event.target.value })} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Select label="Kategori" value={formData.category} onChange={(event) => setFormData({ ...formData, category: event.target.value })} options={categoryOptions} />
                <Input label="Nominal *" type="number" min="1" required value={formData.amount} onChange={(event) => setFormData({ ...formData, amount: event.target.value })} />
              </div>
              <Input
                label="Tanggal PT bayar *"
                type="date"
                required
                value={formData.date}
                onChange={(event) => setFormData({ ...formData, date: event.target.value, period_month: event.target.value.slice(0, 7) })}
              />
              <p className="text-xs text-gray-500">Bulan mengikuti tanggal bayar. Setelah disimpan, status otomatis menjadi "Menunggu diganti".</p>
            </>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Select label="Freelancer *" required value={formData.freelancer_id} onChange={(event) => setFormData({ ...formData, freelancer_id: event.target.value })} options={[{ value: '', label: 'Pilih freelancer' }, ...(freelancers || []).map((freelancer) => ({ value: freelancer.id, label: freelancer.name }))]} />
                <Select label="Project *" required value={formData.engagement_id} onChange={(event) => setFormData({ ...formData, engagement_id: event.target.value })} options={[{ value: '', label: 'Pilih project' }, ...(engagements || []).map((engagement) => ({ value: engagement.id, label: `${engagement.client?.company_name || '-'} - ${engagement.service?.name || '-'}` }))]} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Nominal *" type="number" min="1" required value={formData.amount} onChange={(event) => setFormData({ ...formData, amount: event.target.value })} />
                <Select label="Status pembayaran" value={formData.status} onChange={(event) => setFormData({ ...formData, status: event.target.value })} options={[{ value: 'paid', label: 'Sudah dibayar' }, { value: 'pending', label: 'Belum dibayar' }]} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label={formData.status === 'paid' ? 'Tanggal dibayar *' : 'Tanggal catatan *'} type="date" required value={formData.date} onChange={(event) => setFormData({ ...formData, date: event.target.value })} />
                <Input label="Bulan" type="month" required value={formData.period_month} onChange={(event) => setFormData({ ...formData, period_month: event.target.value })} />
              </div>
            </>
          )}

          <Textarea label="Catatan" rows={3} placeholder="Opsional" value={formData.notes} onChange={(event) => setFormData({ ...formData, notes: event.target.value })} />
        </form>
      </Modal>
    </>
  );
}
