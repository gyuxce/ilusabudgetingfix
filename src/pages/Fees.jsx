import { useState, useMemo } from 'react';
import { Wallet, Plus, Pencil, Trash2, Check, Undo2, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { 
  useFreelancerFees, 
  useCreateFreelancerFee, 
  useUpdateFreelancerFee, 
  useDeleteFreelancerFee, 
  useMarkFeePaid, 
  useMarkFeeUnpaid 
} from '../lib/queries/freelancer_fees';
import { useFreelancers } from '../lib/queries/freelancers';
import { useEngagements } from '../lib/queries/engagements';
import { currentMonthKey, formatPeriod, lastNMonths } from '../lib/utils';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { DataTable } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { Badge } from '../components/ui/Badge';
import { PayslipModal } from '../components/PayslipModal';

export default function Fees() {
  const { data: freelancers } = useFreelancers();
  const { data: engagements } = useEngagements();

  const [filterPeriod, setFilterPeriod] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterFreelancer, setFilterFreelancer] = useState('all');
  const [filterEngagement, setFilterEngagement] = useState('all');

  const { data: fees, isLoading: tableLoading } = useFreelancerFees();

  const filteredRows = useMemo(() => {
    if (!fees) return [];
    return fees.filter(row => {
      if (filterPeriod && filterPeriod !== 'all' && row.period_month !== filterPeriod) {
        return false;
      }
      if (filterStatus && filterStatus !== 'all' && row.status !== filterStatus) {
        return false;
      }
      if (filterFreelancer && filterFreelancer !== 'all' && row.freelancer_id !== filterFreelancer) {
        return false;
      }
      if (filterEngagement && filterEngagement !== 'all' && row.engagement_id !== filterEngagement) {
        return false;
      }
      return true;
    });
  }, [fees, filterPeriod, filterStatus, filterFreelancer, filterEngagement]);

  const createFee = useCreateFreelancerFee();
  const updateFee = useUpdateFreelancerFee();
  const deleteFee = useDeleteFreelancerFee();
  const markPaid = useMarkFeePaid();
  const markUnpaid = useMarkFeeUnpaid();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [payslipFee, setPayslipFee] = useState(null);
  const [successToast, setSuccessToast] = useState('');

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  
  const [formData, setFormData] = useState({
    freelancer_id: '',
    engagement_id: '',
    period_month: currentMonthKey(),
    fee_type: 'hourly',
    hourly_rate: 17000,
    hours_per_day: 0,
    working_days: 0,
    off_days: 0,
    rate_single_post: 0,
    qty_single_post: 0,
    rate_carousel: 0,
    qty_carousel: 0,
    rate_reels: 0,
    qty_reels: 0,
    fixed_amount: 0,
    status: 'pending',
    paid_date: todayStr,
    notes: ''
  });
  const [formError, setFormError] = useState('');

  // Extract unique engagement options directly from the fees records to prevent duplicate label mismatches
  const uniqueEngagementOptions = useMemo(() => {
    if (!fees) return [];
    const seen = new Set();
    const options = [];
    
    fees.forEach(fee => {
      const eng = fee.engagement;
      if (eng && eng.id && !seen.has(eng.id)) {
        seen.add(eng.id);
        const label = `${eng.client?.company_name || '—'} - ${eng.service?.name || '—'}`;
        options.push({ value: eng.id, label });
      }
    });
    
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [fees]);

  // Construct premium dynamic active filter label for cards
  const activeFilterLabel = useMemo(() => {
    const parts = [];
    if (filterPeriod && filterPeriod !== 'all') parts.push(formatPeriod(filterPeriod));
    if (filterStatus && filterStatus !== 'all') parts.push(filterStatus === 'paid' ? 'Paid' : 'Pending');
    if (filterFreelancer && filterFreelancer !== 'all') {
      const fl = freelancers?.find(f => f.id === filterFreelancer);
      if (fl) parts.push(fl.name);
    }
    if (filterEngagement && filterEngagement !== 'all') {
      const eng = uniqueEngagementOptions.find(e => e.value === filterEngagement);
      if (eng) parts.push(eng.label.split(' - ')[0]); // Use client name part
    }
    
    return parts.length > 0 ? `(${parts.join(' · ')})` : '(All Time)';
  }, [filterPeriod, filterStatus, filterFreelancer, filterEngagement, freelancers, uniqueEngagementOptions]);

  // Calculate card totals based on ALL active filters (responds dynamically to freelancer, status, period, etc.)
  const cardTotals = useMemo(() => {
    const totalAmt = filteredRows.reduce((sum, r) => sum + (r.calculated_fee || 0), 0);
    const paidAmt = filteredRows
      .filter(r => r.status === 'paid')
      .reduce((sum, r) => sum + (r.calculated_fee || 0), 0);
    const pendingAmt = filteredRows
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + (r.calculated_fee || 0), 0);
    
    const totalCount = filteredRows.length;
    const paidCount = filteredRows.filter(r => r.status === 'paid').length;
    const pendingCount = filteredRows.filter(r => r.status === 'pending').length;
    
    return { totalAmt, paidAmt, pendingAmt, totalCount, paidCount, pendingCount };
  }, [filteredRows]);

  // Group and find all matching fees for the clicked freelancer in the same period to generate a consolidated payslip
  const matchingPayslipFees = useMemo(() => {
    if (!payslipFee || !fees) return [];
    return fees.filter(f => f.freelancer_id === payslipFee.freelancer_id && f.period_month === payslipFee.period_month);
  }, [payslipFee, fees]);

  const liveFee = useMemo(() => {
    if (formData.fee_type === 'hourly') {
      return (parseFloat(formData.hourly_rate) || 0) * 
             (parseFloat(formData.hours_per_day) || 0) * 
             ((parseFloat(formData.working_days) || 0) - (parseFloat(formData.off_days) || 0));
    } else if (formData.fee_type === 'per_content') {
      return ((parseFloat(formData.rate_single_post) || 0) * (parseFloat(formData.qty_single_post) || 0)) +
             ((parseFloat(formData.rate_carousel) || 0) * (parseFloat(formData.qty_carousel) || 0)) +
             ((parseFloat(formData.rate_reels) || 0) * (parseFloat(formData.qty_reels) || 0));
    } else {
      return parseFloat(formData.fixed_amount) || 0;
    }
  }, [formData]);

  const formatCurrency = (val) => new Intl.NumberFormat('id-ID').format(val || 0);

  const handleOpenAdd = () => {
    setEditingFee(null);
    setFormData({
      freelancer_id: '',
      engagement_id: '',
      period_month: currentMonthKey(),
      fee_type: 'hourly',
      hourly_rate: 17000,
      hours_per_day: 0,
      working_days: 0,
      off_days: 0,
      rate_single_post: 0,
      qty_single_post: 0,
      rate_carousel: 0,
      qty_carousel: 0,
      rate_reels: 0,
      qty_reels: 0,
      fixed_amount: 0,
      status: 'pending',
      paid_date: todayStr,
      notes: ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (fee, e) => {
    e?.stopPropagation();
    setEditingFee(fee);
    setFormData({
      freelancer_id: fee.freelancer_id || '',
      engagement_id: fee.engagement_id || '',
      period_month: fee.period_month || currentMonthKey(),
      fee_type: fee.fee_type || 'hourly',
      hourly_rate: fee.hourly_rate ?? 17000,
      hours_per_day: fee.hours_per_day ?? 0,
      working_days: fee.working_days ?? 0,
      off_days: fee.off_days ?? 0,
      rate_single_post: fee.rate_single_post ?? 0,
      qty_single_post: fee.qty_single_post ?? 0,
      rate_carousel: fee.rate_carousel ?? 0,
      qty_carousel: fee.qty_carousel ?? 0,
      rate_reels: fee.rate_reels ?? 0,
      qty_reels: fee.qty_reels ?? 0,
      fixed_amount: fee.fixed_amount ?? 0,
      status: fee.status || 'pending',
      paid_date: fee.paid_date || todayStr,
      notes: fee.notes || ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleFreelancerChange = (e) => {
    const newId = e.target.value;
    setFormData(prev => {
      const selected = freelancers?.find(f => f.id === newId);
      const nextData = { ...prev, freelancer_id: newId };
      if (prev.fee_type === 'hourly' && selected) {
        nextData.hourly_rate = selected.default_hourly_rate || 17000;
      }
      return nextData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.freelancer_id || !formData.engagement_id || !formData.period_month || !formData.fee_type) {
      setFormError('Please fill out all required fields.');
      return;
    }

    if (formData.fee_type === 'hourly') {
      const rate = parseFloat(formData.hourly_rate) || 0;
      const hours = parseFloat(formData.hours_per_day) || 0;
      const days = parseFloat(formData.working_days) || 0;
      if (rate <= 0 || hours <= 0 || days <= 0) {
        setFormError('Hourly rate, hours per day, and working days must be greater than zero.');
        return;
      }
    } else if (formData.fee_type === 'per_content') {
      if (liveFee <= 0) {
        setFormError('At least one content quantity paired with a positive rate must be provided to result in a fee > 0.');
        return;
      }
    } else if (formData.fee_type === 'fixed') {
      if (parseFloat(formData.fixed_amount) <= 0) {
        setFormError('Fixed amount must be greater than zero.');
        return;
      }
    }

    try {
      const payload = {
        freelancer_id: formData.freelancer_id,
        engagement_id: formData.engagement_id,
        period_month: formData.period_month,
        fee_type: formData.fee_type,
        status: formData.status,
        paid_date: formData.status === 'paid' ? formData.paid_date : null,
        notes: formData.notes
      };

      if (formData.fee_type === 'hourly') {
        payload.hourly_rate = parseFloat(formData.hourly_rate) || 0;
        payload.hours_per_day = parseFloat(formData.hours_per_day) || 0;
        payload.working_days = parseFloat(formData.working_days) || 0;
        payload.off_days = parseFloat(formData.off_days) || 0;

        payload.rate_single_post = null; payload.qty_single_post = null;
        payload.rate_carousel = null; payload.qty_carousel = null;
        payload.rate_reels = null; payload.qty_reels = null;
        payload.fixed_amount = null;
      } else if (formData.fee_type === 'per_content') {
        payload.hourly_rate = null; payload.hours_per_day = null;
        payload.working_days = null; payload.off_days = null;

        payload.rate_single_post = parseFloat(formData.rate_single_post) || 0;
        payload.qty_single_post = parseFloat(formData.qty_single_post) || 0;
        payload.rate_carousel = parseFloat(formData.rate_carousel) || 0;
        payload.qty_carousel = parseFloat(formData.qty_carousel) || 0;
        payload.rate_reels = parseFloat(formData.rate_reels) || 0;
        payload.qty_reels = parseFloat(formData.qty_reels) || 0;
        payload.fixed_amount = null;
      } else if (formData.fee_type === 'fixed') {
        payload.hourly_rate = null; payload.hours_per_day = null;
        payload.working_days = null; payload.off_days = null;
        
        payload.rate_single_post = null; payload.qty_single_post = null;
        payload.rate_carousel = null; payload.qty_carousel = null;
        payload.rate_reels = null; payload.qty_reels = null;
        
        payload.fixed_amount = parseFloat(formData.fixed_amount) || 0;
      }

      if (editingFee) {
        await updateFee.mutateAsync({ id: editingFee.id, ...payload });
        showToast('Fee entry updated!');
      } else {
        await createFee.mutateAsync(payload);
        showToast('Fee entry created!');
      }
      setIsModalOpen(false);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3000);
  };

  const columns = [
    { key: 'freelancer', label: 'Freelancer', render: (row) => <span className="font-medium text-gray-900">{row.freelancer?.name || '—'}</span> },
    { key: 'engagement', label: 'Engagement', render: (row) => (
      <span className="text-sm text-gray-600 truncate max-w-[200px] block" title={`${row.engagement?.client?.company_name} - ${row.engagement?.service?.name}`}>
        {row.engagement?.client?.company_name} - {row.engagement?.service?.name}
      </span>
    )},
    { key: 'period', label: 'Period', render: (row) => formatPeriod(row.period_month) },
    { key: 'type', label: 'Type', render: (row) => (
      <Badge variant="neutral">{row.fee_type === 'hourly' ? 'Hourly' : row.fee_type === 'fixed' ? 'Fixed' : 'Per Content'}</Badge>
    )},
    { key: 'calculation', label: 'Calculation', render: (row) => {
      if (row.fee_type === 'hourly') {
        return <span className="text-xs text-gray-500">{formatCurrency(row.hourly_rate)} × {row.hours_per_day}h × {row.working_days - (row.off_days || 0)}d</span>;
      } else if (row.fee_type === 'fixed') {
        return <span className="text-xs text-gray-500">Fixed amount</span>;
      }
      return <span className="text-xs text-gray-500">{row.qty_single_post || 0}p + {row.qty_carousel || 0}c + {row.qty_reels || 0}r</span>;
    }},
    { key: 'fee', label: 'Fee', render: (row) => <span className="font-medium">Rp {formatCurrency(row.calculated_fee)}</span> },
    { key: 'status', label: 'Status', render: (row) => (
      row.status === 'paid' ? <Badge variant="success">Paid</Badge> : <Badge variant="warning">Pending</Badge>
    )},
    { key: 'actions', label: 'Actions', render: (row) => (
      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
        {row.status !== 'paid' ? (
          <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" title="Mark Paid" onClick={async (e) => { e.stopPropagation(); await markPaid.mutateAsync(row.id); showToast('Marked as paid'); }}>
            <Check size={14} />
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-600 hover:bg-gray-100" title="Mark Unpaid" onClick={async (e) => { e.stopPropagation(); await markUnpaid.mutateAsync(row.id); showToast('Reverted to pending'); }}>
            <Undo2 size={14} />
          </Button>
        )}
        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" title="Cetak Slip Gaji (Payslip)" onClick={(e) => { e.stopPropagation(); setPayslipFee(row); }}>
          <Printer size={14} />
        </Button>
        <Button variant="ghost" size="sm" onClick={(e) => handleOpenEdit(row, e)}>
          <Pencil size={14} />
        </Button>
        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); setDeleteId(row.id); }}>
          <Trash2 size={14} />
        </Button>
      </div>
    )}
  ];

  if (tableLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="h-24 bg-gray-200 rounded-lg"></div>
          <div className="h-24 bg-gray-200 rounded-lg"></div>
          <div className="h-24 bg-gray-200 rounded-lg"></div>
        </div>
        <div className="h-64 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  return (
    <>
      <PageHeader 
        title="Freelancer Fees" 
        description="Track payments to your freelance team"
        action={
          <Button onClick={handleOpenAdd}>
            <Plus size={16} className="mr-1.5" />
            New Fee Entry
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="!p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
            Total Fees {activeFilterLabel}
          </p>
          <div className="text-2xl font-semibold tracking-tight text-gray-900 leading-tight">Rp {formatCurrency(cardTotals.totalAmt)}</div>
          <p className="text-xs text-gray-500 mt-1">{cardTotals.totalCount} entries</p>
        </Card>
        <Card className="!p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
            Paid {activeFilterLabel}
          </p>
          <div className="text-2xl font-semibold tracking-tight text-emerald-600 leading-tight">Rp {formatCurrency(cardTotals.paidAmt)}</div>
          <p className="text-xs text-gray-500 mt-1">{cardTotals.paidCount} paid</p>
        </Card>
        <Card className="!p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
            Pending {activeFilterLabel}
          </p>
          <div className={`text-2xl font-semibold tracking-tight leading-tight ${cardTotals.pendingAmt > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
            Rp {formatCurrency(cardTotals.pendingAmt)}
          </div>
          <p className="text-xs text-gray-500 mt-1">{cardTotals.pendingCount} pending</p>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <Select 
          value={filterPeriod}
          onChange={e => setFilterPeriod(e.target.value)}
          options={[
            { value: 'all', label: 'All months' },
            ...lastNMonths(12)
          ]}
          className="w-48"
        />
        <Select 
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          options={[
            { value: 'all', label: 'All statuses' },
            { value: 'pending', label: 'Pending' },
            { value: 'paid', label: 'Paid' }
          ]}
          className="w-40"
        />
        <Select 
          value={filterFreelancer}
          onChange={e => setFilterFreelancer(e.target.value)}
          options={[
            { value: 'all', label: 'All freelancers' },
            ...(freelancers?.map(f => ({ value: f.id, label: f.name })) || [])
          ]}
          className="w-48"
        />
        <Select 
          value={filterEngagement}
          onChange={e => setFilterEngagement(e.target.value)}
          options={[
            { value: 'all', label: 'All engagements' },
            ...uniqueEngagementOptions
          ]}
          className="w-56"
        />
      </div>

      {fees && (
        <p className="text-xs text-gray-500 mb-4 block">
          Showing {filteredRows.length} of {fees.length} entries
        </p>
      )}

      {filteredRows.length === 0 && filterEngagement === 'all' && filterFreelancer === 'all' && filterStatus === 'all' && filterPeriod === 'all' ? (
        <EmptyState 
          icon={Wallet} 
          title="No fee entries yet" 
          description="Add fee entries to track what you owe freelancers" 
          action={<Button onClick={handleOpenAdd}>New Fee Entry</Button>}
        />
      ) : (
        <DataTable 
          columns={columns} 
          rows={filteredRows} 
          onRowClick={(row) => handleOpenEdit(row)}
          emptyMessage="No fee entries match your filters"
        />
      )}

      {/* Modal Add/Edit Form */}
      <Modal 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={editingFee ? "Edit Fee Entry" : "Add Fee Entry"}
        maxWidthClass="max-w-lg"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleSubmit} disabled={createFee.isPending || updateFee.isPending}>
              {editingFee ? "Update" : "Save"}
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          {formError && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Select 
              label="Freelancer *" 
              required
              value={formData.freelancer_id}
              onChange={handleFreelancerChange}
              options={[
                { value: '', label: 'Select freelancer...' },
                ...(freelancers?.map(f => ({ value: f.id, label: f.name })) || [])
              ]}
            />
            <Select 
              label="Engagement *" 
              required
              value={formData.engagement_id}
              onChange={e => setFormData({...formData, engagement_id: e.target.value})}
              options={[
                { value: '', label: 'Select engagement...' },
                ...(engagements?.map(e => ({ value: e.id, label: `${e.client?.company_name} - ${e.service?.name}` })) || [])
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Period Month *" 
              type="month"
              required
              value={formData.period_month}
              onChange={e => setFormData({...formData, period_month: e.target.value})}
            />
            <Select 
              label="Fee Type *" 
              required
              value={formData.fee_type}
              onChange={e => setFormData({...formData, fee_type: e.target.value})}
              options={[
                { value: 'hourly', label: 'Hourly Rate' },
                { value: 'per_content', label: 'Per Content' },
                { value: 'fixed', label: 'Fixed Amount' }
              ]}
            />
          </div>

          <div className="mt-6 border-t border-gray-200 pt-4">
            {formData.fee_type === 'hourly' ? (
              <div className="grid grid-cols-2 gap-4">
                <Input label="Hourly Rate *" type="number" min="0" required value={formData.hourly_rate} onChange={e => setFormData({...formData, hourly_rate: e.target.value})} />
                <Input label="Hours per Day *" type="number" step="0.5" min="0" required value={formData.hours_per_day} onChange={e => setFormData({...formData, hours_per_day: e.target.value})} />
                <Input label="Working Days *" type="number" min="0" required value={formData.working_days} onChange={e => setFormData({...formData, working_days: e.target.value})} />
                <Input label="Off Days" type="number" min="0" value={formData.off_days} onChange={e => setFormData({...formData, off_days: e.target.value})} />
              </div>
            ) : formData.fee_type === 'per_content' ? (
              <div className="grid grid-cols-2 gap-4">
                <Input label="Rate Single Post" type="number" min="0" value={formData.rate_single_post} onChange={e => setFormData({...formData, rate_single_post: e.target.value})} />
                <Input label="Qty Single Post" type="number" min="0" value={formData.qty_single_post} onChange={e => setFormData({...formData, qty_single_post: e.target.value})} />
                <Input label="Rate Carousel" type="number" min="0" value={formData.rate_carousel} onChange={e => setFormData({...formData, rate_carousel: e.target.value})} />
                <Input label="Qty Carousel" type="number" min="0" value={formData.qty_carousel} onChange={e => setFormData({...formData, qty_carousel: e.target.value})} />
                <Input label="Rate Reels" type="number" min="0" value={formData.rate_reels} onChange={e => setFormData({...formData, rate_reels: e.target.value})} />
                <Input label="Qty Reels" type="number" min="0" value={formData.qty_reels} onChange={e => setFormData({...formData, qty_reels: e.target.value})} />
              </div>
            ) : (
              <div>
                <Input label="Fixed Amount *" type="number" min="0" required value={formData.fixed_amount} onChange={e => setFormData({...formData, fixed_amount: e.target.value})} />
                <p className="text-xs text-gray-500 mt-1">Enter the agreed flat fee in Rupiah</p>
              </div>
            )}
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 my-4">
            <p className="text-xs text-gray-600 mb-0.5 uppercase tracking-wider font-medium">Calculated Fee</p>
            <div className="text-2xl font-semibold tracking-tight text-emerald-700">Rp {formatCurrency(Math.max(0, liveFee))}</div>
            <p className="text-xs text-emerald-600/80 mt-1 font-mono">
              {formData.fee_type === 'hourly' 
                ? `${formatCurrency(formData.hourly_rate || 0)} × ${formData.hours_per_day || 0} × (${formData.working_days || 0} - ${formData.off_days || 0}) = Rp ${formatCurrency(Math.max(0, liveFee))}` 
                : formData.fee_type === 'per_content' 
                ? `${formData.qty_single_post || 0}p + ${formData.qty_carousel || 0}c + ${formData.qty_reels || 0}r = Rp ${formatCurrency(Math.max(0, liveFee))}`
                : `Fixed amount (no calculation)`
              }
            </p>
          </div>

          <div className={`grid gap-4 ${formData.status === 'paid' ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <Select 
              label="Status *" 
              required
              value={formData.status}
              onChange={e => setFormData({...formData, status: e.target.value})}
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'paid', label: 'Paid' }
              ]}
            />
            {formData.status === 'paid' && (
              <Input 
                label="Paid Date *" 
                type="date"
                required
                value={formData.paid_date}
                onChange={e => setFormData({...formData, paid_date: e.target.value})}
              />
            )}
          </div>

          <Textarea 
            label="Notes" 
            value={formData.notes}
            onChange={e => setFormData({...formData, notes: e.target.value})}
          />
        </form>
      </Modal>

      {/* Delete Model */}
      <Modal 
        open={!!deleteId} 
        onClose={() => setDeleteId(null)}
        title="Confirm Delete"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="danger" onClick={async () => {
              if (deleteId) {
                await deleteFee.mutateAsync(deleteId);
                setDeleteId(null);
                showToast('Fee deleted');
              }
            }} disabled={deleteFee.isPending}>
              Delete Fee
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Delete this fee entry for {
            (() => {
              const fee = fees?.find(i => i.id === deleteId);
              if (!fee) return '';
              return <strong>{fee.freelancer?.name} - {formatPeriod(fee.period_month)}</strong>;
            })()
          }? This cannot be undone.
        </p>
      </Modal>

      {successToast && (
        <div className="fixed bottom-4 right-4 bg-emerald-600 text-white px-4 py-3 rounded-md shadow-lg text-sm font-medium animate-[bounce_0.5s_ease-in-out_1] z-50 transition-opacity">
          {successToast}
        </div>
      )}

      <PayslipModal 
        open={!!payslipFee} 
        onClose={() => setPayslipFee(null)} 
        matchingFees={matchingPayslipFees} 
      />
    </>
  );
}
