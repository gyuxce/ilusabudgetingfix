import { useState, useMemo, useEffect } from 'react';
import { FileText, Plus, Calendar, Pencil, Trash2, CreditCard, Search, Download, Check } from 'lucide-react';
import { differenceInDays, format, subMonths } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { useInvoices, useCreateInvoice, useCreateInvoicesBulk, useUpdateInvoice, useDeleteInvoice, useSetInvoiceStatus } from '../lib/queries/invoices';
import { useEngagements } from '../lib/queries/engagements';
import { useClients } from '../lib/queries/clients';
import { useCompanySettings } from '../lib/queries/company_settings';
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
import { InvoiceDetailModal } from '../components/InvoiceDetailModal';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';

const getPreviousMonthKey = (periodKey = currentMonthKey()) => {
  const [year, month] = periodKey.split('-').map(Number);
  const previous = subMonths(new Date(year, month - 1, 1), 1);
  return `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}`;
};

const getBillingDate = (periodKey, day = 1) => {
  const [year, month] = periodKey.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${periodKey}-${String(Math.min(Math.max(day, 1), lastDay)).padStart(2, '0')}`;
};

const generateInvoiceNumber = (issueDate, sequence = 1) => {
  const safeIssueDate = issueDate || format(new Date(), 'yyyy-MM-dd');
  const [year, month] = safeIssueDate.split('-');
  return `ILUSA-INV-${year}-${month}-${String(sequence).padStart(3, '0')}`;
};

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
}[char]));

export default function Invoices() {
  const [searchParams] = useSearchParams();
  const { data: clients } = useClients();
  const { data: engagements } = useEngagements();
  const { data: companySettings } = useCompanySettings();

  const [search, setSearch] = useState('');
  const [filterBillingMonth, setFilterBillingMonth] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || 'all');
  const [filterClient, setFilterClient] = useState('all');

  // One query for all invoices (summary + table)
  const { data: invoices, isLoading: tableLoading } = useInvoices();

  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();
  const createInvoicesBulk = useCreateInvoicesBulk();
  const setInvoiceStatus = useSetInvoiceStatus();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [successToast, setSuccessToast] = useState('');
  
  const [detailInvoice, setDetailInvoice] = useState(null);
  const [paymentInvoice, setPaymentInvoice] = useState(null);

  useEffect(() => {
    setFilterStatus(searchParams.get('status') || 'all');
  }, [searchParams]);

  // Invoice Form
  const defaultIssueDate = format(new Date(), 'yyyy-MM-dd');
  const defaultDueDate = format(new Date(Date.now() + 14 * 86400000), 'yyyy-MM-dd');
  const defaultBillingMonth = currentMonthKey();
  const defaultServicePeriod = getPreviousMonthKey(defaultBillingMonth);
  
  const [formData, setFormData] = useState({
    engagement_id: '',
    billing_month: defaultBillingMonth,
    period_month: defaultServicePeriod,
    invoice_number: '',
    amount: 0,
    issue_date: defaultIssueDate,
    due_date: defaultDueDate,
    status: 'draft',
    notes: ''
  });
  const [formError, setFormError] = useState('');

  // Bulk Form
  const [bulkFormData, setBulkFormData] = useState({
    engagement_id: '',
    billing_month: defaultBillingMonth,
    start_period: defaultServicePeriod,
    end_period: defaultServicePeriod,
    amount: 0,
    due_day: 15,
    status: 'draft'
  });
  const [bulkFormError, setBulkFormError] = useState('');

  // Summary Calcs
  const cardsBase = useMemo(() => {
    if (!invoices) return [];
    if (!filterBillingMonth || filterBillingMonth === 'all') return invoices;
    return invoices.filter(r => (r.effective_billing_month || r.billing_month) === filterBillingMonth);
  }, [invoices, filterBillingMonth]);

  const cardTotals = useMemo(() => {
    const total = cardsBase.reduce((sum, r) => sum + (r.amount || 0), 0);
    const paid = cardsBase.reduce((sum, r) => sum + (r.total_paid || 0), 0);
    const outstanding = cardsBase
      .filter(r => r.computed_status === 'sent' || r.computed_status === 'partial' || r.computed_status === 'overdue')
      .reduce((sum, r) => sum + (r.balance || 0), 0);
    
    return { 
      total, paid, outstanding,
      totalCount: cardsBase.length,
      paidCount: cardsBase.filter(r => r.computed_status === 'paid').length,
      outstandingCount: cardsBase.filter(r => r.computed_status === 'sent' || r.computed_status === 'partial' || r.computed_status === 'overdue').length
    };
  }, [cardsBase]);

  // Client-side search and filtering
  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    
    return invoices.filter(inv => {
      // Billing month filter
      if (filterBillingMonth && filterBillingMonth !== 'all' && (inv.effective_billing_month || inv.billing_month) !== filterBillingMonth) {
        return false;
      }

      // Service period filter
      if (filterPeriod && filterPeriod !== 'all' && inv.period_month !== filterPeriod) {
        return false;
      }
      
      // Status filter
      if (filterStatus && filterStatus !== 'all') {
        if (inv.computed_status !== filterStatus) {
          return false;
        }
      }
      
      // Client filter
      if (filterClient && filterClient !== 'all' && inv.engagement?.client?.id !== filterClient) {
        return false;
      }
      
      // Search filter
      if (search) {
        const lowerSearch = search.toLowerCase();
        if (
          !inv.invoice_number?.toLowerCase().includes(lowerSearch) &&
          !inv.engagement?.client?.company_name?.toLowerCase().includes(lowerSearch)
        ) {
          return false;
        }
      }
      
      return true;
    });
  }, [invoices, filterBillingMonth, filterPeriod, filterStatus, filterClient, search]);

  const formatCurrency = (val) => new Intl.NumberFormat('id-ID').format(val || 0);
  const unpaidDownloadQueue = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (invoices || [])
      .filter((invoice) => invoice.computed_status !== 'paid')
      .map((invoice) => ({
        ...invoice,
        daysUntilDue: invoice.due_date ? differenceInDays(new Date(invoice.due_date), today) : null,
      }))
      .filter((invoice) => invoice.daysUntilDue === null || invoice.daysUntilDue <= 7)
      .sort((a, b) => new Date(a.due_date || a.issue_date) - new Date(b.due_date || b.issue_date))
      .slice(0, 6);
  }, [invoices]);

  // --- Invoice Single Modal Handlers ---
  const handleOpenAdd = () => {
    setEditingInvoice(null);
    setFormData({
      engagement_id: engagements?.[0]?.id || '',
      billing_month: defaultBillingMonth,
      period_month: defaultServicePeriod,
      invoice_number: '',
      amount: engagements?.[0]?.service_fee_per_month || 0,
      issue_date: defaultIssueDate,
      due_date: defaultDueDate,
      status: 'draft',
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
      billing_month: inv.effective_billing_month || inv.billing_month || (inv.issue_date ? inv.issue_date.slice(0, 7) : defaultBillingMonth),
      period_month: inv.period_month || '',
      invoice_number: inv.invoice_number || '',
      amount: inv.amount || 0,
      issue_date: inv.issue_date || defaultIssueDate,
      due_date: inv.due_date || defaultDueDate,
      status: (inv.status === 'paid' ? 'sent' : (inv.status || 'draft')),
      notes: inv.notes || ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleEngagementChange = (e) => {
    const newId = e.target.value;
    setFormData(prev => {
      const nextData = { ...prev, engagement_id: newId };
      if (!editingInvoice && (!prev.amount || parseInt(prev.amount, 10) === 0)) {
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
        invoice_number: formData.invoice_number.trim() || generateInvoiceNumber(formData.issue_date, (invoices?.length || 0) + 1),
        notes: formData.notes.trim() || null,
        billing_month: formData.billing_month || (formData.issue_date ? formData.issue_date.slice(0, 7) : null),
        period_month: formData.period_month || null
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
      billing_month: defaultBillingMonth,
      start_period: defaultServicePeriod,
      end_period: defaultServicePeriod,
      amount: monthlyEngs?.[0]?.service_fee_per_month || 0,
      due_day: 15,
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
        const issue_date = getBillingDate(bulkFormData.billing_month, 1);
        const due_date = getBillingDate(bulkFormData.billing_month, parseInt(bulkFormData.due_day, 10) || 15);
        
        return {
          engagement_id: bulkFormData.engagement_id,
          billing_month: bulkFormData.billing_month,
          period_month: period,
          amount: parseInt(bulkFormData.amount, 10) || 0,
          issue_date,
          due_date,
          status: bulkFormData.status || 'draft',
          invoice_number: generateInvoiceNumber(issue_date, (invoices?.length || 0) + bulkMonths.indexOf(period) + 1),
          paid_date: null,
          notes: `Invoice for service period ${formatPeriod(period)}. Billing month ${formatPeriod(bulkFormData.billing_month)}.`
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
  const handleOpenDetail = (row, e) => {
    e?.stopPropagation();
    setDetailInvoice(row);
  };

  const handleOpenPayment = (row, e) => {
    e?.stopPropagation();
    setPaymentInvoice(row);
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

  const getInvoicePrintHtml = (invoice) => {
    const invoiceNumber = invoice.invoice_number || generateInvoiceNumber(invoice.issue_date, 1);
    const clientName = invoice.engagement?.client?.company_name || '-';
    const serviceName = invoice.engagement?.service?.name || '-';
    const billingMonth = formatPeriod(invoice.effective_billing_month || invoice.billing_month || invoice.issue_date?.slice(0, 7));
    const servicePeriod = formatPeriod(invoice.period_month);
    const issueDate = invoice.issue_date ? format(new Date(invoice.issue_date), 'dd MMM yyyy') : '-';
    const dueDate = invoice.due_date ? format(new Date(invoice.due_date), 'dd MMM yyyy') : '-';
    const amount = invoice.amount || 0;
    const balance = invoice.balance ?? amount;
    const paidAmount = invoice.total_paid || 0;
    const statusLabel = invoice.computed_status ? invoice.computed_status.toUpperCase() : invoice.status?.toUpperCase() || 'DRAFT';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntilDue = invoice.due_date ? differenceInDays(new Date(invoice.due_date), today) : null;
    const dueCopy = daysUntilDue === null
      ? 'Due date pending'
      : daysUntilDue < 0
        ? `${Math.abs(daysUntilDue)} days overdue`
        : daysUntilDue === 0
          ? 'Due today'
          : `Due in ${daysUntilDue} days`;
    const notes = invoice.notes || 'This invoice covers services delivered during the service period stated above.';
    const brandName = companySettings?.brand_name || 'Ilusa';
    const legalName = companySettings?.legal_name || 'PT. Inovasi Langkah Usaha';
    const tagline = companySettings?.tagline || 'Budget Controlling & Partnership Operations';
    const city = companySettings?.city || 'Yogyakarta';
    const country = companySettings?.country || 'Indonesia';
    const email = companySettings?.email || 'partnership@ilusa.id';
    const bankName = companySettings?.bank_name || 'Bank transfer';
    const bankAccountNumber = companySettings?.bank_account_number || '-';
    const bankAccountHolder = companySettings?.bank_account_holder || legalName;
    const paymentTerms = companySettings?.default_payment_terms || `Please use the invoice number as payment reference and confirm payment to ${email}.`;

    return `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(invoiceNumber)}</title>
          <style>
            @page { size: A4; margin: 0; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              background: #f3f4f6;
              color: #111827;
              font-family: Inter, Arial, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .page {
              width: 210mm;
              height: 297mm;
              margin: 0 auto;
              background: #fff;
              padding: 12mm 14mm;
              display: flex;
              flex-direction: column;
            }
            .top {
              display: flex;
              justify-content: space-between;
              gap: 24px;
              border: 1px solid #111827;
              border-radius: 10px;
              overflow: hidden;
            }
            .brand-panel {
              flex: 1;
              padding: 15px 18px;
              background: #111827;
              color: #fff;
            }
            .meta-panel {
              width: 76mm;
              padding: 15px 18px;
              background: #fff;
            }
            .brand { font-size: 25px; font-weight: 800; letter-spacing: -0.02em; }
            .muted { color: #6b7280; }
            .light { color: #d1d5db; }
            .small { font-size: 10.5px; line-height: 1.45; }
            p { margin: 5px 0 0; }
            strong { color: #111827; }
            .eyebrow {
              margin: 0 0 7px;
              font-size: 9px;
              font-weight: 700;
              letter-spacing: 0.18em;
              text-transform: uppercase;
            }
            h1 { margin: 0; font-size: 30px; letter-spacing: -0.04em; }
            h2 { margin: 0 0 6px; font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: #4b5563; }
            .meta { text-align: left; }
            .meta-row { display: grid; grid-template-columns: 74px 1fr; gap: 10px; margin-top: 6px; font-size: 11px; }
            .meta-row span:first-child { color: #6b7280; }
            .status {
              display: inline-flex;
              margin-top: 10px;
              border: 1px solid #111827;
              border-radius: 999px;
              padding: 4px 9px;
              font-size: 9px;
              font-weight: 800;
              letter-spacing: 0.12em;
            }
            .section { margin-top: 15px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            .box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 11px 12px; }
            .balance {
              border-color: #111827;
              background: #f9fafb;
            }
            .balance strong {
              display: block;
              margin-top: 4px;
              font-size: 22px;
              letter-spacing: -0.03em;
            }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            th {
              border-top: 1px solid #111827;
              border-bottom: 1px solid #111827;
              padding: 9px 8px;
              text-align: left;
              font-size: 9px;
              letter-spacing: 0.14em;
              text-transform: uppercase;
            }
            td { border-bottom: 1px solid #e5e7eb; padding: 10px 8px; vertical-align: top; }
            .right { text-align: right; }
            .total {
              margin-left: auto;
              margin-top: 12px;
              width: 78mm;
              border: 1px solid #111827;
              border-radius: 8px;
              overflow: hidden;
            }
            .total-row { display: flex; justify-content: space-between; padding: 9px 12px; font-size: 11px; border-bottom: 1px solid #e5e7eb; }
            .total-row:last-child { border-bottom: 0; background: #f3f4f6; font-weight: 800; }
            .notes-grid {
              display: grid;
              grid-template-columns: 1.1fr 0.9fr;
              gap: 12px;
              margin-top: 16px;
            }
            .footer {
              margin-top: 14px;
              border-top: 1px solid #e5e7eb;
              padding-top: 10px;
              display: flex;
              justify-content: space-between;
              gap: 24px;
            }
            @media print {
              body { background: #fff; }
              .page { margin: 0; box-shadow: none; overflow: hidden; }
            }
          </style>
        </head>
        <body>
          <main class="page">
            <header class="top">
              <div class="brand-panel">
                <p class="eyebrow light">${escapeHtml(legalName)}</p>
                <div class="brand">${escapeHtml(brandName)}</div>
                <p class="small light">${escapeHtml(tagline)}<br/>${escapeHtml(city)}, ${escapeHtml(country)}<br/>${escapeHtml(email)}</p>
              </div>
              <div class="meta-panel meta">
                <p class="eyebrow muted">Client Billing</p>
                <h1>Invoice</h1>
                <div class="meta-row"><span>Invoice #</span><strong>${escapeHtml(invoiceNumber)}</strong></div>
                <div class="meta-row"><span>Issue Date</span><strong>${escapeHtml(issueDate)}</strong></div>
                <div class="meta-row"><span>Due Date</span><strong>${escapeHtml(dueDate)}</strong></div>
                <span class="status">${escapeHtml(statusLabel)}</span>
              </div>
            </header>

            <section class="section grid">
              <div class="box">
                <h2>Bill To</h2>
                <strong>${escapeHtml(clientName)}</strong>
                <p class="small muted">Invoice for ${escapeHtml(serviceName)}</p>
              </div>
              <div class="box balance">
                <h2>Total Due</h2>
                <strong>Rp ${formatCurrency(balance)}</strong>
                <p class="small muted">${escapeHtml(dueCopy)}</p>
              </div>
            </section>

            <section class="section grid">
              <div class="box">
                <h2>Service Period</h2>
                <strong>${escapeHtml(servicePeriod)}</strong>
                <p class="small muted">This billing month covers work delivered in ${escapeHtml(servicePeriod)}.</p>
              </div>
              <div class="box">
                <h2>Payment Terms</h2>
                <strong>Monthly billing in arrears</strong>
                <p class="small muted">Billing month ${escapeHtml(billingMonth)} covers service period ${escapeHtml(servicePeriod)}.</p>
              </div>
            </section>

            <section class="section">
              <h2>Invoice Items</h2>
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Service Period</th>
                    <th class="right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>${escapeHtml(serviceName)}</strong>
                      <div class="small muted">${escapeHtml(clientName)}</div>
                    </td>
                    <td>${escapeHtml(servicePeriod)}</td>
                    <td class="right"><strong>Rp ${formatCurrency(amount)}</strong></td>
                  </tr>
                </tbody>
              </table>
              <div class="total">
                <div class="total-row"><span>Subtotal</span><span>Rp ${formatCurrency(amount)}</span></div>
                <div class="total-row"><span>Paid</span><span>Rp ${formatCurrency(paidAmount)}</span></div>
                <div class="total-row"><span>Total Due</span><span>Rp ${formatCurrency(balance)}</span></div>
              </div>
            </section>

            <section class="notes-grid small">
              <div class="box">
                <h2>Notes</h2>
                <p class="muted">${escapeHtml(notes)}</p>
              </div>
              <div class="box">
                <h2>Payment Instruction</h2>
                <p><strong>${escapeHtml(bankName)}</strong></p>
                <p>Account: ${escapeHtml(bankAccountNumber)}<br/>Holder: ${escapeHtml(bankAccountHolder)}</p>
                <p class="muted">${escapeHtml(paymentTerms)}</p>
              </div>
            </section>

            <section class="footer small">
              <div>
                <strong>Thank you for your partnership.</strong>
                <p class="muted">This invoice was generated by Ilusa Budget Controlling.</p>
              </div>
              <div>
                <strong>${escapeHtml(brandName)} Partnership Team</strong>
                <p class="muted">${escapeHtml(city)}, ${escapeHtml(country)}<br/>${escapeHtml(email)}</p>
              </div>
            </section>
          </main>
        </body>
      </html>`;
  };

  const handleDownloadInvoice = (invoice, e) => {
    e?.stopPropagation();
    const printWindow = window.open('', '_blank', 'width=900,height=1200');
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.open();
    printWindow.document.write(getInvoicePrintHtml(invoice));
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  // --- Columns ---
  const columns = [
    { key: 'invoice_number', label: 'Invoice #', render: (row) => row.invoice_number ? <span className="font-medium text-gray-900">{row.invoice_number}</span> : <span className="text-gray-400">—</span> },
    { key: 'client', label: 'Client', render: (row) => <span className="font-medium text-gray-900">{row.engagement?.client?.company_name || '—'}</span> },
    { key: 'service', label: 'Service', render: (row) => <span className="text-sm text-gray-600">{row.engagement?.service?.name || '—'}</span> },
    { key: 'billing_month', label: 'Billing', render: (row) => formatPeriod(row.effective_billing_month || row.billing_month) },
    { key: 'period', label: 'Service Period', render: (row) => formatPeriod(row.period_month) },
    { key: 'amount', label: 'Amount', render: (row) => <span className="font-medium">Rp {formatCurrency(row.amount)}</span> },
    { key: 'paid_total', label: 'Paid / Total', render: (row) => {
        const totalPaid = row.total_paid || 0;
        const amount = row.amount || 0;
        if (row.computed_status === 'paid') {
          return <span className="text-slate-700 font-medium">Rp {formatCurrency(totalPaid)}</span>;
        } else if (row.computed_status === 'partial') {
          return <span className="text-amber-700 font-medium">Rp {formatCurrency(totalPaid)} / Rp {formatCurrency(amount)}</span>;
        }
        return <span className="text-gray-500">Rp 0 / Rp {formatCurrency(amount)}</span>;
    }},
    { key: 'due_date', label: 'Due Date', render: (row) => {
        if (!row.due_date) return '—';
        const isOverdue = row.computed_status === 'overdue';
        return <span className={isOverdue ? "text-red-600 font-medium" : ""}>{format(new Date(row.due_date), 'dd MMM yyyy')}</span>;
    }},
    { key: 'status', label: 'Status', render: (row) => {
      const status = row.computed_status;
      if (status === 'paid') return <Badge variant="success">Paid</Badge>;
      if (status === 'partial') {
        const percent = Math.round(((row.total_paid || 0) / row.amount) * 100) || 0;
        return <Badge variant="warning">Partial ({percent}%)</Badge>;
      }
      if (status === 'overdue') return <Badge variant="danger">Overdue</Badge>;
      if (status === 'approved') return <Badge variant="neutral">Approved</Badge>;
      if (status === 'sent') return <Badge variant="neutral">Sent</Badge>;
      if (status === 'draft') return <Badge variant="neutral">Draft</Badge>;
      return <Badge variant="neutral">{status}</Badge>;
    }},
    { key: 'actions', label: 'Actions', render: (row) => (
      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
        {row.computed_status === 'draft' && (
          <Button variant="ghost" size="sm" className="text-gray-700 hover:text-gray-950 hover:bg-gray-100" title="Approve Invoice" onClick={async (e) => { e.stopPropagation(); await setInvoiceStatus.mutateAsync({ id: row.id, status: 'approved' }); showToast('Invoice approved'); }}>
            <Check size={14} />
          </Button>
        )}
        {row.computed_status === 'approved' && (
          <Button variant="ghost" size="sm" className="text-gray-700 hover:text-gray-950 hover:bg-gray-100" title="Mark as Sent" onClick={async (e) => { e.stopPropagation(); await setInvoiceStatus.mutateAsync({ id: row.id, status: 'sent' }); showToast('Invoice marked as sent'); }}>
            <FileText size={14} />
          </Button>
        )}
        <Button variant="ghost" size="sm" title="Download Invoice PDF" onClick={(e) => handleDownloadInvoice(row, e)}>
          <Download size={14} />
        </Button>
        {row.computed_status !== 'paid' && row.computed_status !== 'draft' && (
          <Button variant="ghost" size="sm" className="text-gray-700 hover:text-gray-950 hover:bg-gray-100" title="Record Payment" onClick={(e) => handleOpenPayment(row, e)}>
            <CreditCard size={14} />
          </Button>
        )}
        <Button variant="ghost" size="sm" title="Edit" onClick={(e) => handleOpenEdit(row, e)}>
          <Pencil size={14} />
        </Button>
        <Button variant="ghost" size="sm" title="Delete" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={(e) => handleDelete(row.id, e)}>
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
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
            Total {(!filterBillingMonth || filterBillingMonth === 'all') ? '(All Time)' : `- Billing ${formatPeriod(filterBillingMonth)}`}
          </p>
          <div className="text-2xl font-semibold tracking-tight text-gray-950 leading-tight">
            <AnimatedNumber value={cardTotals.total} prefix="Rp " />
          </div>
          <p className="text-xs text-gray-500 mt-1">{cardTotals.totalCount} invoices</p>
        </Card>
        <Card className="!p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
            Paid {(!filterBillingMonth || filterBillingMonth === 'all') ? '(All Time)' : `- Billing ${formatPeriod(filterBillingMonth)}`}
          </p>
          <div className="text-2xl font-semibold tracking-tight text-emerald-600 leading-tight">
            <AnimatedNumber value={cardTotals.paid} prefix="Rp " />
          </div>
          <p className="text-xs text-gray-500 mt-1">{cardTotals.paidCount} paid</p>
        </Card>
        <Card className="!p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
            Outstanding {(!filterBillingMonth || filterBillingMonth === 'all') ? '(All Time)' : `- Billing ${formatPeriod(filterBillingMonth)}`}
          </p>
          <div className={`text-2xl font-semibold tracking-tight leading-tight ${cardTotals.outstanding > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
            <AnimatedNumber value={cardTotals.outstanding} prefix="Rp " />
          </div>
          <p className="text-xs text-gray-500 mt-1">{cardTotals.outstandingCount} unpaid</p>
        </Card>
      </div>

      {unpaidDownloadQueue.length > 0 && (
        <Card title="Invoice Download Queue" description="Unpaid invoices that are overdue or due within 7 days" className="mb-6">
          <div className="grid gap-3 lg:grid-cols-2">
            {unpaidDownloadQueue.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-950">{invoice.engagement?.client?.company_name}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {invoice.engagement?.service?.name} · Service period {formatPeriod(invoice.period_month)}
                  </p>
                  <p className={`mt-1 text-xs font-medium ${invoice.daysUntilDue < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                    {invoice.daysUntilDue < 0 ? `${Math.abs(invoice.daysUntilDue)} days overdue` : invoice.daysUntilDue === 0 ? 'Due today' : `Due in ${invoice.daysUntilDue} days`}
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={(event) => handleDownloadInvoice(invoice, event)}>
                  <Download size={14} className="mr-1.5" />
                  PDF
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

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
          value={filterBillingMonth}
          onChange={e => setFilterBillingMonth(e.target.value)}
          options={[
            { value: 'all', label: 'All billing months' },
            ...lastNMonths(12)
          ]}
          className="w-full sm:w-52"
        />
        <Select 
          value={filterPeriod}
          onChange={e => setFilterPeriod(e.target.value)}
          options={[
            { value: 'all', label: 'All service periods' },
            ...lastNMonths(12)
          ]}
          className="w-full sm:w-52"
        />
        <Select 
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          options={[
            { value: 'all', label: 'All statuses' },
            { value: 'draft', label: 'Draft' },
            { value: 'approved', label: 'Approved' },
            { value: 'sent', label: 'Sent' },
            { value: 'partial', label: 'Partial' },
            { value: 'paid', label: 'Paid' },
            { value: 'overdue', label: 'Overdue' }
          ]}
          className="w-full sm:w-40"
        />
        <Select 
          value={filterClient}
          onChange={e => setFilterClient(e.target.value)}
          options={[
            { value: 'all', label: 'All clients' },
            ...(clients?.map(c => ({ value: c.id, label: c.company_name })) || [])
          ]}
          className="w-full sm:w-56"
        />
      </div>

      {invoices && (
        <p className="text-xs text-gray-500 mb-4 block">
          Showing {filteredInvoices.length} of {invoices.length} entries
        </p>
      )}

      {!tableLoading && filteredInvoices?.length === 0 && !search && filterClient === 'all' && filterStatus === 'all' && filterBillingMonth === 'all' && filterPeriod === 'all' ? (
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
          onRowClick={(row) => handleOpenDetail(row)}
          emptyMessage="No invoices match your filters"
        />
      )}

      {/* MODALS */}
      <InvoiceDetailModal 
        open={!!detailInvoice} 
        onClose={() => setDetailInvoice(null)} 
        invoice={detailInvoice} 
        onRecordPayment={(inv) => {
          setPaymentInvoice(inv);
        }}
      />

      <RecordPaymentModal 
        open={!!paymentInvoice} 
        onClose={() => setPaymentInvoice(null)} 
        invoice={paymentInvoice} 
        onSuccess={(amt) => {
          setPaymentInvoice(null);
          showToast(`Payment recorded: Rp ${formatCurrency(amt)}`);
          if (detailInvoice && detailInvoice.id === paymentInvoice.id) {
             // Let react-query refresh data automatically; we could update local state if we want 
             // but user sees the refresh right away
          }
        }}
      />

      {/* SINGLE INVOICE EDIT MODAL */}
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

          <Input
            label="Billing Month *"
            type="month"
            required
            value={formData.billing_month}
            onChange={e => setFormData({...formData, billing_month: e.target.value})}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input 
                label={selectedEngagementObj?.service?.service_type === 'monthly' ? "Service Period *" : "Service Period"}
                type="month"
                value={formData.period_month}
                onChange={e => setFormData({...formData, period_month: e.target.value})}
              />
              <p className="text-xs text-gray-500 mt-1">
                {selectedEngagementObj?.service?.service_type === 'monthly' ? "The month being billed, e.g. May 2026 billed in June" : "Leave empty for one-time"}
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
            <p className="text-xs text-gray-500 mt-1">Auto-filled from engagement (you can edit if needed)</p>
            <p className="text-xs mt-1 uppercase tracking-wider font-medium text-gray-700">
              = <AnimatedNumber value={parseInt(formData.amount, 10) || 0} prefix="Rp " />
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

          <div className="grid gap-4 grid-cols-1">
            <div>
              <Select 
                label="Status *" 
                required
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value})}
                options={[
                  { value: 'draft', label: 'Draft' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'sent', label: 'Sent' }
                ]}
              />
              <p className="text-xs text-gray-500 mt-1">To mark as paid, use 'Record Payment' button after creating the invoice.</p>
            </div>
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
        <p className="text-sm text-gray-500 mb-4">Generate invoices for service periods that are billed in a later month. Example: billing month June, service period May.</p>
        
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

          <Input
            label="Billing Month *"
            type="month"
            required
            value={bulkFormData.billing_month}
            onChange={e => setBulkFormData({...bulkFormData, billing_month: e.target.value})}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Start Service Period *" 
              type="month"
              required
              value={bulkFormData.start_period}
              onChange={e => setBulkFormData({...bulkFormData, start_period: e.target.value})}
            />
            <Input 
              label="End Service Period *" 
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
              <p className="text-xs text-gray-500 mt-1">Due day inside billing month</p>
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
                { value: 'approved', label: 'Approved' },
                { value: 'sent', label: 'Sent' }
              ]}
            />
          </div>

          {bulkMonths.length > 0 && selectedBulkEngagementObj && (
            <div className="mt-6 border-t border-gray-200 pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Will generate {bulkMonths.length} invoices:</h4>
              <ul className="text-sm text-gray-600 space-y-1 max-h-32 overflow-y-auto bg-gray-50 p-2 rounded border border-gray-100">
                {bulkMonths.map((m) => {
                  const dueDate = getBillingDate(bulkFormData.billing_month, parseInt(bulkFormData.due_day, 10) || 15);
                  return (
                    <li key={m}>
                      Service {formatPeriod(m)} - Rp {formatCurrency(parseInt(bulkFormData.amount, 10) || 0)} - billing {formatPeriod(bulkFormData.billing_month)} - due {format(new Date(dueDate), 'MMM dd, yyyy')}
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
              const inv = invoices?.find(i => i.id === deleteId);
              if (!inv) return '';
              return <strong>{inv.engagement?.client?.company_name} - {formatPeriod(inv.period_month)}</strong>;
            })()
          }? This cannot be undone.
        </p>
      </Modal>

      {/* TOAST */}
      {successToast && (
        <div className="fixed bottom-4 right-4 bg-gray-950 text-white px-4 py-3 rounded-md shadow-lg text-sm font-medium animate-[bounce_0.5s_ease-in-out_1] z-50 transition-opacity">
          {successToast}
        </div>
      )}
    </>
  );
}

