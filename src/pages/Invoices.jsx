import { useState, useMemo } from 'react';
import { FileText, Plus, Calendar, Pencil, Trash2, Check, Undo2, Search } from 'lucide-react';
import { format } from 'date-fns';
import { useInvoices, useCreateInvoice, useCreateInvoicesBulk, useUpdateInvoice, useDeleteInvoice, useMarkInvoicePaid, useMarkInvoiceUnpaid } from '../lib/queries/invoices';
import { useEngagements } from '../lib/queries/engagements';
import { useClients } from '../lib/queries/clients';
import { getEffectiveStatus, currentMonthKey, formatPeriod, lastNMonths } from '../lib/utils';
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

export default function Invoices() {
  const { data: clients } = useClients();
  const { data: engagements } = useEngagements();

  const [search, setSearch] = useState('');
  const [filterPeriod, setFilterPeriod] = useState(currentMonthKey());
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClient, setFilterClient] = useState('');

  const tableFilters = {};
  if (filterPeriod) tableFilters.period_month = filterPeriod;
  if (filterStatus) tableFilters.status = filterStatus;
  if (filterClient) tableFilters.client_id = filterClient;

  // Separate queries: one for summary (always current month), one for table (affected by filters)
  const { data: summaryInvoices } = useInvoices({ period_month: currentMonthKey() });
  const { data: tableInvoices, isLoading: tableLoading } = useInvoices(tableFilters);

  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();
  const createInvoicesBulk = useCreateInvoicesBulk();
  const markPaid = useMarkInvoicePaid();
  const markUnpaid = useMarkInvoiceUnpaid();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [successToast, setSuccessToast] = useState('');

  // Invoice Form
  const defaultIssueDate = format(new Date(), 'yyyy-MM-dd');
  const defaultDueDate = format(new Date(Date.now() + 14 * 86400000), 'yyyy-MM-dd');
  
  const [formData, setFormData] = useState({
    engagement_id: '',
    period_month: currentMonthKey(),
    invoice_number: '',
    amount: 0,
    issue_date: defaultIssueDate,
    due_date: defaultDueDate,
    status: 'draft',
    paid_date: defaultIssueDate,
    notes: ''
  });
  const [formError, setFormError] = useState('');

  // Bulk Form
  const [bulkFormData, setBulkFormData] = useState({
    engagement_id: '',
    start_period: currentMonthKey(),
    end_period: currentMonthKey(),
    amount: 0,
    due_day: 10,
    status: 'draft'
  });
  const [bulkFormError, setBulkFormError] = useState('');

  // Summary Calcs
  const summaryData = useMemo(() => {
    let totalAmount = 0, totalCount = 0;
    let paidAmount = 0, paidCount = 0;
    let outstandingAmount = 0, outstandingCount = 0;
    
    if (summaryInvoices) {
      summaryInvoices.forEach(inv => {
        totalAmount += inv.amount || 0;
        totalCount++;
        if (inv.status === 'paid') {
          paidAmount += inv.amount || 0;
          paidCount++;
        } else if (inv.status === 'draft' || inv.status === 'sent') {
          outstandingAmount += inv.amount || 0;
          outstandingCount++;
        }
      });
    }
    return { totalAmount, totalCount, paidAmount, paidCount, outstandingAmount, outstandingCount };
  }, [summaryInvoices]);

  // Client-side search and filtering
  const filteredInvoices = useMemo(() => {
    if (!tableInvoices) return [];
    if (!search) return tableInvoices;
    const lowerSearch = search.toLowerCase();
    return tableInvoices.filter(inv => 
      inv.invoice_number?.toLowerCase().includes(lowerSearch) ||
      inv.engagement?.client?.company_name?.toLowerCase().includes(lowerSearch)
    );
  }, [tableInvoices, search]);

  const formatCurrency = (val) => new Intl.NumberFormat('id-ID').format(val || 0);

  // --- Invoice Single Modal Handlers ---
  const handleOpenAdd = () => {
    setEditingInvoice(null);
    setFormData({
      engagement_id: engagements?.[0]?.id || '',
      period_month: currentMonthKey(),
      invoice_number: '',
      amount: engagements?.[0]?.service_fee_per_month || 0,
      issue_date: defaultIssueDate,
      due_date: defaultDueDate,
      status: 'draft',
      paid_date: defaultIssueDate,
      notes: ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (inv, e) => {
    e?.stopPropagation();
    setEditingInvoice(inv);
    setFormData({
      engagement_id: inv.engagement_id || '',
      period_month: inv.period_month || '',
      invoice_number: inv.invoice_number || '',
      amount: inv.amount || 0,
      issue_date: inv.issue_date || defaultIssueDate,
      due_date: inv.due_date || defaultDueDate,
      status: inv.status || 'draft',
      paid_date: inv.paid_date || defaultIssueDate,
      notes: inv.notes || ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleEngagementChange = (e) => {
    const newId = e.target.value;
    setFormData(prev => {
      const nextData = { ...prev, engagement_id: newId };
      if (!prev.amount || parseInt(prev.amount, 10) === 0) {
        const selected = engagements?.find(eng => eng.id === newId);
        if (selected) nextData.amount = selected.service_fee_per_month || 0;
      }
      return nextData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.engagement_id || !formData.issue_date || !formData.due_date || !formData.status) {
      setFormError('Please fill out all required fields.');
      return;
    }

    const fee = parseInt(formData.amount, 10);
    if (isNaN(fee) || fee < 0) {
      setFormError('Amount must be zero or a positive number.');
      return;
    }

    if (new Date(formData.due_date) < new Date(formData.issue_date)) {
      setFormError('Due date cannot be before issue date.');
      return;
    }

    const selectedEngagement = engagements?.find(e => e.id === formData.engagement_id);
    if (selectedEngagement?.service?.service_type === 'monthly' && !formData.period_month) {
      setFormError('Period Month is required for monthly engagements.');
      return;
    }

    try {
      const payload = {
        ...formData,
        amount: fee,
        period_month: formData.period_month || null,
        paid_date: formData.status === 'paid' ? (formData.paid_date || defaultIssueDate) : null
      };

      if (editingInvoice) {
        await updateInvoice.mutateAsync({ id: editingInvoice.id, ...payload });
      } else {
        await createInvoice.mutateAsync(payload);
      }
      
      setIsModalOpen(false);
      showToast(editingInvoice ? 'Invoice updated!' : 'Invoice created!');
    } catch (err) {
      setFormError(err.message);
    }
  };

  // --- Bulk Modal Handlers ---
  const handleOpenBulk = () => {
    // defaults
    const monthlyEngs = engagements?.filter(e => e.service?.service_type === 'monthly') || [];
    setBulkFormData({
      engagement_id: monthlyEngs?.[0]?.id || '',
      start_period: currentMonthKey(),
      end_period: currentMonthKey(),
      amount: monthlyEngs?.[0]?.service_fee_per_month || 0,
      due_day: 10,
      status: 'draft'
    });
    setBulkFormError('');
    setIsBulkModalOpen(true);
  };

  const handleBulkEngagementChange = (e) => {
    const newId = e.target.value;
    setBulkFormData(prev => {
      const nextData = { ...prev, engagement_id: newId };
      const selected = engagements?.find(eng => eng.id === newId);
      if (selected) nextData.amount = selected.service_fee_per_month || 0;
      return nextData;
    });
  };

  function getMonthsBetween(start, end) {
    const months = [];
    let current = new Date(`${start}-01`);
    const endDate = new Date(`${end}-01`);
    if (isNaN(current) || isNaN(endDate) || current > endDate) return months;
    while (current <= endDate) {
      months.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`);
      current.setMonth(current.getMonth() + 1);
    }
    return months;
  }

  const bulkMonths = useMemo(() => {
    return getMonthsBetween(bulkFormData.start_period, bulkFormData.end_period);
  }, [bulkFormData.start_period, bulkFormData.end_period]);

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    setBulkFormError('');

    if (!bulkFormData.engagement_id || !bulkFormData.start_period || !bulkFormData.end_period) {
      setBulkFormError('Please fill out all required fields.');
      return;
    }

    if (bulkMonths.length === 0) {
      setBulkFormError('End period must be at or after start period.');
      return;
    }

    try {
      const invoicesArray = bulkMonths.map(period => {
        const issue_date = `${period}-01`;
        const [y, m] = period.split('-');
        const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
        const safeDueDay = Math.min(parseInt(bulkFormData.due_day, 10) || 10, lastDay);
        const due_date = `${period}-${String(safeDueDay).padStart(2, '0')}`;
        
        return {
          engagement_id: bulkFormData.engagement_id,
          period_month: period,
          amount: parseInt(bulkFormData.amount, 10) || 0,
          issue_date,
          due_date,
          status: bulkFormData.status || 'draft',
          invoice_number: null,
          paid_date: null,
          notes: ''
        };
      });

      await createInvoicesBulk.mutateAsync(invoicesArray);
      setIsBulkModalOpen(false);
      showToast(`Generated ${invoicesArray.length} invoices successfully!`);
    } catch (err) {
      setBulkFormError(err.message);
    }
  };

  // --- Inline Actions ---
  const handleMarkPaid = async (id, e) => {
    e?.stopPropagation();
    try {
      await markPaid.mutateAsync(id);
      showToast('Invoice marked as paid');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleMarkUnpaid = async (id, e) => {
    e?.stopPropagation();
    try {
      await markUnpaid.mutateAsync(id);
      showToast('Invoice reverted to sent');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = (id, e) => {
    e?.stopPropagation();
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      try {
        await deleteInvoice.mutateAsync(deleteId);
        setDeleteId(null);
        showToast('Invoice deleted');
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3000);
  };

  // --- Columns ---
  const columns = [
    { key: 'invoice_number', label: 'Invoice #', render: (row) => row.invoice_number ? <span className="font-medium text-gray-900">{row.invoice_number}</span> : <span className="text-gray-400">—</span> },
    { key: 'client', label: 'Client', render: (row) => <span className="font-medium text-gray-900">{row.engagement?.client?.company_name || '—'}</span> },
    { key: 'service', label: 'Service', render: (row) => <span className="text-sm text-gray-600">{row.engagement?.service?.name || '—'}</span> },
    { key: 'period', label: 'Period', render: (row) => formatPeriod(row.period_month) },
    { key: 'amount', label: 'Amount', render: (row) => <span className="font-medium">Rp {formatCurrency(row.amount)}</span> },
    { key: 'due_date', label: 'Due Date', render: (row) => {
        if (!row.due_date) return '—';
        const effStatus = getEffectiveStatus(row);
        const isOverdue = effStatus === 'overdue';
        return <span className={isOverdue ? "text-red-600 font-medium" : ""}>{format(new Date(row.due_date), 'dd MMM yyyy')}</span>;
    }},
    { key: 'status', label: 'Status', render: (row) => {
      const effStatus = getEffectiveStatus(row);
      if (effStatus === 'paid') return <Badge variant="success">Paid</Badge>;
      if (effStatus === 'overdue') return <Badge variant="danger">Overdue</Badge>;
      if (effStatus === 'sent') return <Badge variant="warning">Sent</Badge>;
      return <Badge variant="neutral">Draft</Badge>;
    }},
    { key: 'actions', label: 'Actions', render: (row) => (
      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
        {row.status !== 'paid' ? (
          <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" title="Mark Paid" onClick={(e) => handleMarkPaid(row.id, e)}>
            <Check size={14} />
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-600 hover:bg-gray-100" title="Mark Unpaid" onClick={(e) => handleMarkUnpaid(row.id, e)}>
            <Undo2 size={14} />
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={(e) => handleOpenEdit(row, e)}>
          <Pencil size={14} />
        </Button>
        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={(e) => handleDelete(row.id, e)}>
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

  const selectedEngagementObj = engagements?.find(e => e.id === formData.engagement_id);
  const monthlyEngagements = engagements?.filter(e => e.service?.service_type === 'monthly') || [];
  const selectedBulkEngagementObj = engagements?.find(e => e.id === bulkFormData.engagement_id);

  return (
    <>
      <PageHeader 
        title="Invoices" 
        description="Track money coming in from clients"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleOpenBulk}>
              <Calendar size={16} className="mr-1.5" />
              Bulk Generate
            </Button>
            <Button onClick={handleOpenAdd}>
              <Plus size={16} className="mr-1.5" />
              New Invoice
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="!p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Total This Month</p>
          <div className="text-2xl font-semibold tracking-tight text-gray-900 leading-tight">Rp {formatCurrency(summaryData.totalAmount)}</div>
          <p className="text-xs text-gray-500 mt-1">{summaryData.totalCount} invoices</p>
        </Card>
        <Card className="!p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Paid</p>
          <div className="text-2xl font-semibold tracking-tight text-emerald-600 leading-tight">Rp {formatCurrency(summaryData.paidAmount)}</div>
          <p className="text-xs text-gray-500 mt-1">{summaryData.paidCount} paid</p>
        </Card>
        <Card className="!p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Outstanding</p>
          <div className={`text-2xl font-semibold tracking-tight leading-tight ${summaryData.outstandingAmount > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
            Rp {formatCurrency(summaryData.outstandingAmount)}
          </div>
          <p className="text-xs text-gray-500 mt-1">{summaryData.outstandingCount} unpaid</p>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="max-w-xs w-full relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <Input 
            placeholder="Search invoice # or client..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>
        <Select 
          value={filterPeriod}
          onChange={e => setFilterPeriod(e.target.value)}
          options={[
            { value: '', label: 'All months' },
            ...lastNMonths(12)
          ]}
          className="w-48"
        />
        <Select 
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          options={[
            { value: '', label: 'All statuses' },
            { value: 'draft', label: 'Draft' },
            { value: 'sent', label: 'Sent' },
            { value: 'paid', label: 'Paid' },
            { value: 'overdue', label: 'Overdue' }
          ]}
          className="w-40"
        />
        <Select 
          value={filterClient}
          onChange={e => setFilterClient(e.target.value)}
          options={[
            { value: '', label: 'All clients' },
            ...(clients?.map(c => ({ value: c.id, label: c.company_name })) || [])
          ]}
          className="w-56"
        />
      </div>

      {!tableLoading && filteredInvoices?.length === 0 && !search ? (
        <EmptyState 
          icon={FileText} 
          title="No invoices yet" 
          description="Create invoices for your engagements to track payments" 
          action={<Button onClick={handleOpenAdd}>New Invoice</Button>}
        />
      ) : (
        <DataTable 
          columns={columns} 
          rows={filteredInvoices} 
          onRowClick={(row) => handleOpenEdit(row)}
          emptyMessage="No invoices match your filters"
        />
      )}

      {/* SINGLE INVOICE MODAL */}
      <Modal 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={editingInvoice ? "Edit Invoice" : "Add Invoice"}
        maxWidthClass="max-w-md"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleSubmit} disabled={createInvoice.isPending || updateInvoice.isPending}>
              {editingInvoice ? "Update" : "Save"}
            </Button>
          </>
        }
      >
        <form id="invoice-form" className="space-y-4" onSubmit={handleSubmit}>
          {formError && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">
              {formError}
            </div>
          )}

          <div>
            <Select 
              label="Engagement *" 
              required
              value={formData.engagement_id}
              onChange={handleEngagementChange}
              options={[
                { value: '', label: 'Select engagement...' },
                ...(engagements?.map(e => ({ value: e.id, label: `${e.client?.company_name} — ${e.service?.name}` })) || [])
              ]}
            />
            <p className="text-xs text-gray-500 mt-1">Pick the engagement this invoice is for</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input 
                label={selectedEngagementObj?.service?.service_type === 'monthly' ? "Period Month *" : "Period Month"}
                type="month"
                value={formData.period_month}
                onChange={e => setFormData({...formData, period_month: e.target.value})}
              />
              <p className="text-xs text-gray-500 mt-1">
                {selectedEngagementObj?.service?.service_type === 'monthly' ? "Required for monthly services" : "Leave empty for one-time"}
              </p>
            </div>
            <div>
              <Input 
                label="Invoice Number" 
                placeholder="INV-2026-001"
                value={formData.invoice_number}
                onChange={e => setFormData({...formData, invoice_number: e.target.value})}
              />
            </div>
          </div>

          <div>
            <Input 
              label="Amount *" 
              type="number"
              min="0"
              required
              value={formData.amount}
              onChange={e => setFormData({...formData, amount: e.target.value})}
            />
            <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-medium text-emerald-600">
              = Rp {formatCurrency(parseInt(formData.amount, 10) || 0)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Issue Date *" 
              type="date"
              required
              value={formData.issue_date}
              onChange={e => setFormData({...formData, issue_date: e.target.value})}
            />
            <Input 
              label="Due Date *" 
              type="date"
              required
              value={formData.due_date}
              onChange={e => setFormData({...formData, due_date: e.target.value})}
            />
          </div>

          <div className={`grid gap-4 ${formData.status === 'paid' ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <Select 
              label="Status *" 
              required
              value={formData.status}
              onChange={e => setFormData({...formData, status: e.target.value})}
              options={[
                { value: 'draft', label: 'Draft' },
                { value: 'sent', label: 'Sent' },
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

      {/* BULK GENERATE MODAL */}
      <Modal 
        open={isBulkModalOpen} 
        onClose={() => setIsBulkModalOpen(false)}
        title="Bulk Generate Invoices"
        maxWidthClass="max-w-md"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setIsBulkModalOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleBulkSubmit} disabled={createInvoicesBulk.isPending || bulkMonths.length === 0}>
              Generate {bulkMonths.length} {bulkMonths.length === 1 ? 'Invoice' : 'Invoices'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-500 mb-4">Generate monthly invoices for an engagement across multiple months at once.</p>
        
        <form className="space-y-4" onSubmit={handleBulkSubmit}>
          {bulkFormError && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">
              {bulkFormError}
            </div>
          )}

          <div>
            <Select 
              label="Engagement *" 
              required
              value={bulkFormData.engagement_id}
              onChange={handleBulkEngagementChange}
              options={[
                { value: '', label: 'Select monthly engagement...' },
                ...monthlyEngagements.map(e => ({ value: e.id, label: `${e.client?.company_name} — ${e.service?.name}` }))
              ]}
            />
            {selectedBulkEngagementObj && (
              <p className="text-xs text-gray-500 mt-1">
                Default amount: Rp {formatCurrency(selectedBulkEngagementObj.service_fee_per_month)} (from engagement fee)
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Start Period *" 
              type="month"
              required
              value={bulkFormData.start_period}
              onChange={e => setBulkFormData({...bulkFormData, start_period: e.target.value})}
            />
            <Input 
              label="End Period *" 
              type="month"
              required
              value={bulkFormData.end_period}
              onChange={e => setBulkFormData({...bulkFormData, end_period: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Amount per Invoice *" 
              type="number"
              min="0"
              required
              value={bulkFormData.amount}
              onChange={e => setBulkFormData({...bulkFormData, amount: e.target.value})}
            />
            <div>
              <Input 
                label="Due Day of Month *" 
                type="number"
                min="1"
                max="28"
                required
                value={bulkFormData.due_day}
                onChange={e => setBulkFormData({...bulkFormData, due_day: e.target.value})}
              />
              <p className="text-xs text-gray-500 mt-1">Day of month invoice is due (1-28)</p>
            </div>
          </div>

          <div>
            <Select 
              label="Status" 
              required
              value={bulkFormData.status}
              onChange={e => setBulkFormData({...bulkFormData, status: e.target.value})}
              options={[
                { value: 'draft', label: 'Draft' },
                { value: 'sent', label: 'Sent' }
              ]}
            />
          </div>

          {bulkMonths.length > 0 && selectedBulkEngagementObj && (
            <div className="mt-6 border-t border-gray-200 pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Will generate {bulkMonths.length} invoices:</h4>
              <ul className="text-sm text-gray-600 space-y-1 max-h-32 overflow-y-auto bg-gray-50 p-2 rounded border border-gray-100">
                {bulkMonths.map((m, i) => {
                  const [y, mm] = m.split('-');
                  const lastDay = new Date(parseInt(y), parseInt(mm), 0).getDate();
                  const safeDueDay = Math.min(parseInt(bulkFormData.due_day, 10) || 10, lastDay);
                  return (
                    <li key={m}>
                      • {format(new Date(parseInt(y), parseInt(mm)-1, 1), 'MMM yyyy')} — Rp {formatCurrency(parseInt(bulkFormData.amount, 10) || 0)} — due {format(new Date(parseInt(y), parseInt(mm)-1, safeDueDay), 'MMM dd, yyyy')}
                    </li>
                  );
                })}
              </ul>
              {bulkMonths.length > 12 && (
                <p className="text-xs font-medium text-amber-600 mt-2">
                  Generating more than 12 invoices at once. Are you sure?
                </p>
              )}
            </div>
          )}
        </form>
      </Modal>

      {/* DELETE MODAL */}
      <Modal 
        open={!!deleteId} 
        onClose={() => setDeleteId(null)}
        title="Confirm Delete"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleteInvoice.isPending}>
              Delete Invoice
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Delete this invoice for {
            (() => {
              const inv = tableInvoices?.find(i => i.id === deleteId);
              if (!inv) return '';
              return <strong>{inv.engagement?.client?.company_name} - {formatPeriod(inv.period_month)}</strong>;
            })()
          }? This cannot be undone.
        </p>
      </Modal>

      {/* TOAST */}
      {successToast && (
        <div className="fixed bottom-4 right-4 bg-emerald-600 text-white px-4 py-3 rounded-md shadow-lg text-sm font-medium animate-[bounce_0.5s_ease-in-out_1] z-50 transition-opacity">
          {successToast}
        </div>
      )}
    </>
  );
}
