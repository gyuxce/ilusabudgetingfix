import { useState, useMemo, useEffect } from 'react';
import { FileText, Plus, Calendar, Pencil, Trash2, CreditCard, Search, Download, Check, MoreVertical, Send } from 'lucide-react';
import { addMonths, differenceInDays, format, subMonths } from 'date-fns';
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
import { CurrencyInput } from '../components/ui/CurrencyInput';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { Badge } from '../components/ui/Badge';
import { ActionsMenu } from '../components/ui/ActionsMenu';
import { InvoiceDetailModal } from '../components/InvoiceDetailModal';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';
import { getClientLogo, ILUSA_LOGO_PATH } from '../lib/branding';

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

const addMonthsToPeriodKey = (periodKey, amount) => {
  const [year, month] = periodKey.split('-').map(Number);
  const next = addMonths(new Date(year, month - 1, 1), amount);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
};

const ROMAN_MONTHS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

const generateInvoiceNumber = (issueDate, sequence = 1) => {
  const safeIssueDate = issueDate || format(new Date(), 'yyyy-MM-dd');
  const [year, month] = safeIssueDate.split('-').map(Number);
  return `${String(sequence).padStart(3, '0')}/INV/SO/${ROMAN_MONTHS[month]}/${String(year).slice(-2)}`;
};

const extractInvoiceSequence = (invoiceNumber) => {
  const value = String(invoiceNumber || '').trim();
  const prefix = value.match(/^(\d{3,})\b/);
  if (prefix) return Number(prefix[1]);

  const suffix = value.match(/(?:^|[-/])(\d{3,})$/);
  return suffix ? Number(suffix[1]) : 0;
};

const getNextInvoiceSequence = (existingInvoices = [], offset = 0) => {
  const highestSequence = existingInvoices.reduce(
    (highest, invoice) => Math.max(highest, extractInvoiceSequence(invoice.invoice_number)),
    0,
  );
  return highestSequence + offset + 1;
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
    client_id: '',
    engagement_id: '',
    engagement_ids: [],
    amounts: {},
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
    const clientId = clients?.[0]?.id || '';
    const clientEngagements = engagements?.filter((engagement) => engagement.client_id === clientId) || [];
    const firstEngagement = clientEngagements[0];
    setEditingInvoice(null);
    setFormData({
      client_id: clientId,
      engagement_id: firstEngagement?.id || '',
      engagement_ids: firstEngagement ? [firstEngagement.id] : [],
      amounts: firstEngagement ? { [firstEngagement.id]: firstEngagement.service_fee_per_month || 0 } : {},
      billing_month: defaultBillingMonth,
      period_month: defaultServicePeriod,
      invoice_number: generateInvoiceNumber(defaultServicePeriod, getNextInvoiceSequence(invoices)),
      amount: firstEngagement?.service_fee_per_month || 0,
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
      client_id: inv.engagement?.client?.id || '',
      engagement_id: inv.engagement_id || '',
      engagement_ids: [inv.engagement_id].filter(Boolean),
      amounts: { [inv.engagement_id]: inv.amount || 0 },
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

  const handleClientChange = (event) => {
    const clientId = event.target.value;
    const clientEngagements = engagements?.filter((engagement) => engagement.client_id === clientId) || [];
    const firstEngagement = clientEngagements[0];
    setFormData((previous) => ({
      ...previous,
      client_id: clientId,
      engagement_id: firstEngagement?.id || '',
      engagement_ids: firstEngagement ? [firstEngagement.id] : [],
      amounts: firstEngagement ? { [firstEngagement.id]: firstEngagement.service_fee_per_month || 0 } : {},
      amount: firstEngagement?.service_fee_per_month || 0,
    }));
  };

  const toggleInvoiceEngagement = (engagementId) => {
    setFormData((previous) => {
      const isSelected = previous.engagement_ids.includes(engagementId);
      const engagement = engagements?.find((item) => item.id === engagementId);
      return {
        ...previous,
        engagement_ids: isSelected
          ? previous.engagement_ids.filter((id) => id !== engagementId)
          : [...previous.engagement_ids, engagementId],
        amounts: isSelected
          ? Object.fromEntries(Object.entries(previous.amounts).filter(([id]) => id !== engagementId))
          : { ...previous.amounts, [engagementId]: engagement?.service_fee_per_month || 0 },
      };
    });
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

    const selectedEngagementIds = editingInvoice ? [formData.engagement_id].filter(Boolean) : formData.engagement_ids;
    if (selectedEngagementIds.length === 0 || !formData.issue_date || !formData.due_date || !formData.status) {
      setFormError('Please fill out all required fields.');
      return;
    }

    const amounts = selectedEngagementIds.map((engagementId) => ({
      engagementId,
      amount: parseInt(editingInvoice ? formData.amount : formData.amounts[engagementId], 10),
    }));
    if (amounts.some(({ amount }) => Number.isNaN(amount) || amount < 0)) {
      setFormError('Nominal invoice harus nol atau angka positif.');
      return;
    }

    if (new Date(formData.due_date) < new Date(formData.issue_date)) {
      setFormError('Due date cannot be before issue date.');
      return;
    }

    const selectedEngagements = selectedEngagementIds
      .map((engagementId) => engagements?.find((engagement) => engagement.id === engagementId))
      .filter(Boolean);
    if (selectedEngagements.some((engagement) => engagement.service?.service_type === 'monthly') && !formData.period_month) {
      setFormError('Period Month is required for monthly engagements.');
      return;
    }

    try {
      if (editingInvoice) {
        const payload = {
          engagement_id: formData.engagement_id,
          billing_month: formData.billing_month || (formData.issue_date ? formData.issue_date.slice(0, 7) : null),
          period_month: formData.period_month || null,
          invoice_number: formData.invoice_number.trim() || generateInvoiceNumber(formData.period_month || formData.issue_date, getNextInvoiceSequence(invoices)),
          amount: amounts[0].amount,
          issue_date: formData.issue_date,
          due_date: formData.due_date,
          status: formData.status,
          notes: formData.notes.trim() || null,
        };
        await updateInvoice.mutateAsync({ id: editingInvoice.id, ...payload });
      } else {
        const invoiceTotal = amounts.reduce((total, item) => total + item.amount, 0);
        await createInvoice.mutateAsync({
          engagement_id: selectedEngagementIds[0],
          billing_month: formData.billing_month || (formData.issue_date ? formData.issue_date.slice(0, 7) : null),
          period_month: formData.period_month || null,
          invoice_number: formData.invoice_number.trim() || generateInvoiceNumber(formData.period_month || formData.issue_date, getNextInvoiceSequence(invoices)),
          amount: invoiceTotal,
          issue_date: formData.issue_date,
          due_date: formData.due_date,
          status: formData.status,
          paid_date: null,
          notes: formData.notes.trim() || null,
          invoice_items: selectedEngagementIds.length > 1
            ? amounts.map(({ engagementId, amount }) => ({
                engagement_id: engagementId,
                description: selectedEngagements.find((engagement) => engagement.id === engagementId)?.service?.name || null,
                amount,
              }))
            : [],
        });
      }
      
      setIsModalOpen(false);
      showToast(editingInvoice ? 'Invoice updated!' : 'Invoice berhasil dibuat.');
    } catch (err) {
      setFormError(err.message.includes('invoice_items')
        ? 'Database belum menyiapkan rincian layanan. Jalankan migration invoice-items-and-logos.sql di Supabase dulu.'
        : err.message);
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

    if (!bulkFormData.engagement_id || !bulkFormData.billing_month || !bulkFormData.start_period || !bulkFormData.end_period) {
      setBulkFormError('Please fill out all required fields.');
      return;
    }

    if (bulkMonths.length === 0) {
      setBulkFormError('End period must be at or after start period.');
      return;
    }

    try {
      const invoicesArray = bulkMonths.map((period, index) => {
        const billingMonth = addMonthsToPeriodKey(bulkFormData.billing_month, index);
        const issue_date = getBillingDate(billingMonth, 1);
        const due_date = getBillingDate(billingMonth, parseInt(bulkFormData.due_day, 10) || 15);
        
        return {
          engagement_id: bulkFormData.engagement_id,
          billing_month: billingMonth,
          period_month: period,
          amount: parseInt(bulkFormData.amount, 10) || 0,
          issue_date,
          due_date,
          status: bulkFormData.status || 'draft',
          invoice_number: generateInvoiceNumber(period || issue_date, getNextInvoiceSequence(invoices, index)),
          paid_date: null,
          notes: `Invoice for service period ${formatPeriod(period)}. Billing month ${formatPeriod(billingMonth)}.`
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
    const invoiceNumber = invoice.invoice_number || generateInvoiceNumber(invoice.period_month || invoice.issue_date, 1);
    const clientName = invoice.engagement?.client?.company_name || '-';
    const serviceName = invoice.engagement?.service?.name || '-';
    const clientRecord = clients?.find((client) => client.id === invoice.engagement?.client?.id);
    const clientLogoUrl = getClientLogo(clientRecord || invoice.engagement?.client);
    const invoiceItems = invoice.invoice_items?.length > 0
      ? invoice.invoice_items
      : [{
          engagement: invoice.engagement,
          description: serviceName,
          amount: invoice.amount || 0,
        }];
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
      ? 'Tanggal jatuh tempo belum diisi'
      : daysUntilDue < 0
        ? `Terlambat ${Math.abs(daysUntilDue)} hari`
        : daysUntilDue === 0
          ? 'Jatuh tempo hari ini'
          : `Jatuh tempo ${daysUntilDue} hari lagi`;
    const notes = invoice.notes || 'This invoice covers services delivered during the service period stated above.';
    const brandName = companySettings?.brand_name || 'Ilusa';
    const legalName = companySettings?.legal_name || 'PT. Inovasi Langkah Usaha';
    const tagline = companySettings?.tagline || 'Budget Controlling & Partnership Operations';
    const city = companySettings?.city || 'Yogyakarta';
    const country = companySettings?.country || 'Indonesia';
    const email = companySettings?.email || 'partnership@ilusa.id';
    const bankName = companySettings?.bank_name || 'Bank transfer';
    const bankAccountNumber = companySettings?.bank_account_number || '-';
    const bankAccountHolder = 'PT. Inovasi Langkah Usaha';
    const companyLogoUrl = ILUSA_LOGO_PATH;
    const companyLogo = companyLogoUrl
      ? `<img class="logo-image" src="${escapeHtml(companyLogoUrl)}" alt="${escapeHtml(brandName)} logo" />`
      : `<div class="logo-fallback">IL</div>`;
    const clientLogo = clientLogoUrl
      ? `<img class="client-logo" src="${escapeHtml(clientLogoUrl)}" alt="${escapeHtml(clientName)} logo" />`
      : '';
    const invoiceItemsHtml = invoiceItems.map((item) => {
      const itemServiceName = item.description || item.engagement?.service?.name || 'Layanan';
      const itemPeriod = formatPeriod(invoice.period_month);
      return `<tr>
        <td><strong>${escapeHtml(itemServiceName)}</strong></td>
        <td>${escapeHtml(itemPeriod)}</td>
        <td class="right"><strong>Rp ${formatCurrency(item.amount || 0)}</strong></td>
      </tr>`;
    }).join('');

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
               border-bottom: 2px solid #111827;
               padding-bottom: 16px;
             }
             .brand-panel { flex: 1; color: #111827; }
             .meta-panel { width: 76mm; background: #fff; }
             .brand-row { display: flex; align-items: center; gap: 11px; }
             .logo-image, .logo-fallback { width: 58px; height: 58px; border-radius: 8px; object-fit: contain; }
             .logo-fallback { display: grid; place-items: center; background: #111827; color: #fff; font-size: 18px; font-weight: 800; }
             .client-logo { width: 88px; height: 58px; border-radius: 7px; object-fit: contain; float: right; margin-left: 12px; }
             .brand { font-size: 28px; font-weight: 800; letter-spacing: -0.02em; }
            .muted { color: #6b7280; }
             .light { color: #6b7280; }
            .small { font-size: 12px; line-height: 1.5; }
            p { margin: 6px 0 0; }
            strong { color: #111827; }
            .eyebrow {
              margin: 0 0 7px;
              font-size: 10px;
              font-weight: 700;
              letter-spacing: 0.18em;
              text-transform: uppercase;
            }
            h1 { margin: 0; font-size: 34px; letter-spacing: -0.04em; }
            h2 { margin: 0 0 7px; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #4b5563; }
            .meta { text-align: left; }
            .meta-row { display: grid; grid-template-columns: 82px 1fr; gap: 10px; margin-top: 7px; font-size: 12px; }
            .meta-row span:first-child { color: #6b7280; }
             .status {
               display: inline-flex;
               margin-top: 10px;
               border: 1px solid #d1d5db;
               border-radius: 999px;
               padding: 4px 9px;
               font-size: 10px;
               font-weight: 800;
               letter-spacing: 0.12em;
               color: #374151;
             }
            .section { margin-top: 15px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
             .box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 11px 12px; overflow: hidden; }
            .balance {
              border-color: #111827;
              background: #f9fafb;
            }
            .balance strong {
              display: block;
              margin-top: 4px;
              font-size: 25px;
              letter-spacing: -0.03em;
            }
            table { width: 100%; border-collapse: collapse; margin-top: 11px; font-size: 12px; }
            th {
              border-top: 1px solid #111827;
              border-bottom: 1px solid #111827;
              padding: 10px 8px;
              text-align: left;
              font-size: 10px;
              letter-spacing: 0.14em;
              text-transform: uppercase;
            }
            td { border-bottom: 1px solid #e5e7eb; padding: 11px 8px; vertical-align: top; }
            .right { text-align: right; }
            .total {
              margin-left: auto;
              margin-top: 12px;
              width: 78mm;
              border: 1px solid #111827;
              border-radius: 8px;
              overflow: hidden;
            }
            .total-row { display: flex; justify-content: space-between; padding: 10px 12px; font-size: 12px; border-bottom: 1px solid #e5e7eb; }
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
                 <div class="brand-row">
                   ${companyLogo}
                   <div>
                     <p class="eyebrow light">${escapeHtml(legalName)}</p>
                     <div class="brand">${escapeHtml(brandName)}</div>
                   </div>
                 </div>
                 <p class="small light">${escapeHtml(tagline)}<br/>${escapeHtml(city)}, ${escapeHtml(country)}<br/>${escapeHtml(email)}</p>
              </div>
              <div class="meta-panel meta">
                 <p class="eyebrow muted">Tagihan Client</p>
                <h1>Invoice</h1>
                 <div class="meta-row"><span>Nomor Invoice</span><strong>${escapeHtml(invoiceNumber)}</strong></div>
                 <div class="meta-row"><span>Tanggal Invoice</span><strong>${escapeHtml(issueDate)}</strong></div>
                 <div class="meta-row"><span>Jatuh Tempo</span><strong>${escapeHtml(dueDate)}</strong></div>
                <span class="status">${escapeHtml(statusLabel)}</span>
              </div>
            </header>

            <section class="section grid">
              <div class="box">
                 ${clientLogo}
                 <h2>Ditagihkan Kepada</h2>
                 <strong>${escapeHtml(clientName)}</strong>
                 <p class="small muted">Invoice untuk ${invoiceItems.length} layanan</p>
              </div>
              <div class="box balance">
                 <h2>Total Tagihan</h2>
                <strong>Rp ${formatCurrency(balance)}</strong>
                <p class="small muted">${escapeHtml(dueCopy)}</p>
              </div>
            </section>

            <section class="section grid">
              <div class="box">
                 <h2>Bulan Pekerjaan</h2>
                <strong>${escapeHtml(servicePeriod)}</strong>
                 <p class="small muted">Tagihan ini untuk pekerjaan pada ${escapeHtml(servicePeriod)}.</p>
              </div>
              <div class="box">
                 <h2>Bulan Penagihan</h2>
                 <strong>${escapeHtml(billingMonth)}</strong>
                 <p class="small muted">Dibuat setelah periode layanan selesai.</p>
              </div>
            </section>

            <section class="section">
               <h2>Rincian Layanan</h2>
              <table>
                <thead>
                  <tr>
                     <th>Layanan</th>
                     <th>Bulan Pekerjaan</th>
                     <th class="right">Nilai</th>
                  </tr>
                </thead>
                 <tbody>${invoiceItemsHtml}</tbody>
              </table>
              <div class="total">
                 <div class="total-row"><span>Subtotal</span><span>Rp ${formatCurrency(amount)}</span></div>
                 <div class="total-row"><span>Sudah Dibayar</span><span>Rp ${formatCurrency(paidAmount)}</span></div>
                 <div class="total-row"><span>Sisa Tagihan</span><span>Rp ${formatCurrency(balance)}</span></div>
              </div>
            </section>

            <section class="notes-grid small">
              <div class="box">
                 <h2>Catatan</h2>
                <p class="muted">${escapeHtml(notes)}</p>
              </div>
              <div class="box">
                 <h2>Instruksi Pembayaran</h2>
                <p><strong>${escapeHtml(bankName)}</strong></p>
                 <p>Nomor Rekening: ${escapeHtml(bankAccountNumber)}<br/>Atas Nama: ${escapeHtml(bankAccountHolder)}</p>
              </div>
            </section>

            <section class="footer small">
              <div>
                 <strong>Terima kasih atas kerja samanya.</strong>
                 <p class="muted">Invoice dibuat oleh Ilusa Budget Controlling.</p>
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
    const imageLoads = Array.from(printWindow.document.images).map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise((resolve) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      });
    });
    Promise.all(imageLoads).then(() => setTimeout(() => printWindow.print(), 100));
  };

  // --- Columns ---
  const columns = [
    { key: 'invoice_number', label: 'Invoice #', render: (row) => row.invoice_number ? <span className="font-medium text-gray-900">{row.invoice_number}</span> : <span className="text-gray-400">—</span> },
    { key: 'client', label: 'Client', render: (row) => (
      <span className="block max-w-[180px] truncate font-medium text-gray-900" title={row.engagement?.client?.company_name}>
        {row.engagement?.client?.company_name || '—'}
      </span>
    ) },
    { key: 'service', label: 'Layanan', render: (row) => {
      if (row.invoice_items?.length > 1) {
        return <span className="block max-w-[160px] truncate text-sm text-gray-600">{row.invoice_items.length} layanan</span>;
      }
      const serviceName = row.engagement?.service?.name;
      return (
        <span className="block max-w-[160px] truncate text-sm text-gray-600" title={serviceName}>
          {serviceName || '—'}
        </span>
      );
    }},
    { key: 'billing_month', label: 'Bulan Penagihan', render: (row) => formatPeriod(row.effective_billing_month || row.billing_month) },
    { key: 'period', label: 'Bulan Pekerjaan', render: (row) => formatPeriod(row.period_month) },
    { key: 'amount', label: 'Nilai', render: (row) => <span className="font-medium">Rp {formatCurrency(row.amount)}</span> },
    { key: 'paid_total', label: 'Bayar / Nilai', render: (row) => {
        const totalPaid = row.total_paid || 0;
        const amount = row.amount || 0;
        const paid = row.computed_status === 'paid';
        const partial = row.computed_status === 'partial';
        return (
          <div className="leading-tight">
            <div className={`font-medium ${paid ? 'text-slate-700' : partial ? 'text-amber-700' : 'text-gray-400'}`}>
              Rp {formatCurrency(totalPaid)}
            </div>
            <div className="text-xs text-gray-400">/ Rp {formatCurrency(amount)}</div>
          </div>
        );
    }},
    { key: 'due_date', label: 'Jatuh Tempo', render: (row) => {
        if (!row.due_date) return '—';
        const isOverdue = row.computed_status === 'overdue';
        return <span className={isOverdue ? "text-red-600 font-medium" : ""}>{format(new Date(row.due_date), 'dd MMM yyyy')}</span>;
    }},
    { key: 'status', label: 'Status', render: (row) => {
      const status = row.computed_status;
       if (status === 'paid') return <Badge variant="success">Lunas</Badge>;
      if (status === 'partial') {
        const percent = Math.round(((row.total_paid || 0) / row.amount) * 100) || 0;
         return <Badge variant="warning">Sebagian ({percent}%)</Badge>;
      }
       if (status === 'overdue') return <Badge variant="danger">Terlambat</Badge>;
       if (status === 'approved') return <Badge variant="neutral">Disetujui</Badge>;
       if (status === 'sent') return <Badge variant="neutral">Dikirim</Badge>;
      if (status === 'draft') return <Badge variant="neutral">Draft</Badge>;
      return <Badge variant="neutral">{status}</Badge>;
    }},
    { key: 'actions', label: 'Aksi', render: (row) => (
      <div onClick={e => e.stopPropagation()}>
        <ActionsMenu
          trigger={<MoreVertical size={16} />}
          items={[
            ...(row.computed_status === 'draft' ? [{
              key: 'approve',
              label: 'Setujui Invoice',
              icon: Check,
              onClick: async () => {
                await setInvoiceStatus.mutateAsync({ id: row.id, status: 'approved' });
                showToast('Invoice approved');
              }
            }] : []),
            ...(row.computed_status === 'approved' ? [{
              key: 'send',
              label: 'Tandai Sudah Dikirim',
              icon: Send,
              onClick: async () => {
                await setInvoiceStatus.mutateAsync({ id: row.id, status: 'sent' });
                showToast('Invoice marked as sent');
              }
            }] : []),
            {
              key: 'download',
              label: 'Download PDF',
              icon: Download,
              onClick: (e) => handleDownloadInvoice(row, e)
            },
            ...(row.computed_status !== 'paid' && row.computed_status !== 'draft' ? [{
              key: 'payment',
              label: 'Catat Pembayaran',
              icon: CreditCard,
              onClick: (e) => handleOpenPayment(row, e)
            }] : []),
            { divider: true },
            {
              key: 'edit',
              label: 'Edit',
              icon: Pencil,
              onClick: (e) => handleOpenEdit(row, e)
            },
            {
              key: 'delete',
              label: 'Hapus',
              icon: Trash2,
              iconClassName: 'text-red-500',
              labelClassName: 'text-red-600',
              onClick: (e) => handleDelete(row.id, e)
            }
          ]}
        />
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
  const clientInvoiceEngagements = engagements?.filter((engagement) => engagement.client_id === formData.client_id) || [];
  const selectedInvoiceEngagements = clientInvoiceEngagements.filter((engagement) => formData.engagement_ids.includes(engagement.id));
  const selectedInvoiceTotal = selectedInvoiceEngagements.reduce(
    (total, engagement) => total + (parseInt(formData.amounts[engagement.id], 10) || 0),
    0,
  );
  const selectedInvoiceRequiresPeriod = editingInvoice
    ? selectedEngagementObj?.service?.service_type === 'monthly'
    : selectedInvoiceEngagements.some((engagement) => engagement.service?.service_type === 'monthly');
  const monthlyEngagements = engagements?.filter(e => e.service?.service_type === 'monthly') || [];
  const selectedBulkEngagementObj = engagements?.find(e => e.id === bulkFormData.engagement_id);

  return (
    <>
      <PageHeader 
        title="Invoice"
        description="Invoice adalah tagihan. Uang masuk baru tercatat setelah pembayaran diterima."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleOpenBulk}>
              <Calendar size={16} className="mr-1.5" />
              Buat Massal
            </Button>
            <Button onClick={handleOpenAdd}>
              <Plus size={16} className="mr-1.5" />
              Invoice Baru
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="!p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
            Total Tagihan {(!filterBillingMonth || filterBillingMonth === 'all') ? '(Semua)' : `- ${formatPeriod(filterBillingMonth)}`}
          </p>
          <div className="text-2xl font-semibold tracking-tight text-gray-950 leading-tight">
            <AnimatedNumber value={cardTotals.total} prefix="Rp " />
          </div>
          <p className="text-xs text-gray-500 mt-1">{cardTotals.totalCount} invoices</p>
        </Card>
        <Card className="!p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
            Terbayar di Invoice {(!filterBillingMonth || filterBillingMonth === 'all') ? '(Semua)' : `- ${formatPeriod(filterBillingMonth)}`}
          </p>
          <div className="text-2xl font-semibold tracking-tight text-emerald-600 leading-tight">
            <AnimatedNumber value={cardTotals.paid} prefix="Rp " />
          </div>
          <p className="text-xs text-gray-500 mt-1">{cardTotals.paidCount} paid</p>
        </Card>
        <Card className="!p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
            Belum Diterima {(!filterBillingMonth || filterBillingMonth === 'all') ? '(Semua)' : `- ${formatPeriod(filterBillingMonth)}`}
          </p>
          <div className={`text-2xl font-semibold tracking-tight leading-tight ${cardTotals.outstanding > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
            <AnimatedNumber value={cardTotals.outstanding} prefix="Rp " />
          </div>
          <p className="text-xs text-gray-500 mt-1">{cardTotals.outstandingCount} belum lunas</p>
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
            placeholder="Cari nomor invoice atau client..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>
        <Select 
          value={filterBillingMonth}
          onChange={e => setFilterBillingMonth(e.target.value)}
          options={[
            { value: 'all', label: 'Semua bulan tagihan' },
            ...lastNMonths(12)
          ]}
          className="w-full sm:w-52"
        />
        <Select 
          value={filterPeriod}
          onChange={e => setFilterPeriod(e.target.value)}
          options={[
            { value: 'all', label: 'Semua periode jasa' },
            ...lastNMonths(12)
          ]}
          className="w-full sm:w-52"
        />
        <Select 
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          options={[
            { value: 'all', label: 'Semua status' },
            { value: 'draft', label: 'Draft' },
            { value: 'approved', label: 'Disetujui' },
            { value: 'sent', label: 'Dikirim' },
            { value: 'partial', label: 'Sebagian' },
            { value: 'paid', label: 'Lunas' },
            { value: 'overdue', label: 'Terlambat' }
          ]}
          className="w-full sm:w-40"
        />
        <Select 
          value={filterClient}
          onChange={e => setFilterClient(e.target.value)}
          options={[
            { value: 'all', label: 'Semua client' },
            ...(clients?.map(c => ({ value: c.id, label: c.company_name })) || [])
          ]}
          className="w-full sm:w-56"
        />
      </div>

      {invoices && (
        <p className="text-xs text-gray-500 mb-4 block">
          Menampilkan {filteredInvoices.length} dari {invoices.length} invoice
        </p>
      )}

      {!tableLoading && filteredInvoices?.length === 0 && !search && filterClient === 'all' && filterStatus === 'all' && filterBillingMonth === 'all' && filterPeriod === 'all' ? (
        <EmptyState 
          icon={FileText} 
          title="No invoices yet" 
          description="Buat invoice dari project dan pantau pembayarannya."
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
            <Button type="button" onClick={handleSubmit} disabled={createInvoice.isPending || createInvoicesBulk.isPending || updateInvoice.isPending}>
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

          <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
            Invoice hanya mencatat tagihan. Uang masuk dicatat terpisah lewat tombol pembayaran setelah client membayar.
          </div>

          {editingInvoice && (
          <div>
            <Select 
              label="Project *"
              required
              value={formData.engagement_id}
              onChange={handleEngagementChange}
              options={[
                { value: '', label: 'Select engagement...' },
                ...(engagements?.map(e => ({ value: e.id, label: `${e.client?.company_name} — ${e.service?.name}` })) || [])
              ]}
            />
            <p className="text-xs text-gray-500 mt-1">Pilih project yang ditagihkan.</p>
          </div>
          )}

          {!editingInvoice && (
            <>
              <Select
                label="Client *"
                required
                value={formData.client_id}
                onChange={handleClientChange}
                options={[
                  { value: '', label: 'Pilih client...' },
                  ...(clients?.map((client) => ({ value: client.id, label: client.company_name })) || [])
                ]}
              />
              <div>
                <p className="block text-sm font-medium text-gray-700 mb-1.5">Service yang ditagihkan *</p>
                <div className="space-y-2 rounded-md border border-gray-300 bg-gray-50 p-3 max-h-56 overflow-y-auto">
                  {clientInvoiceEngagements.map((engagement) => {
                    const checked = formData.engagement_ids.includes(engagement.id);
                    return (
                      <div key={engagement.id} className="rounded-md border border-gray-200 bg-white p-2.5">
                        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleInvoiceEngagement(engagement.id)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>{engagement.service?.name || 'Service'}</span>
                          <span className="text-xs text-gray-500">({engagement.service?.service_type === 'monthly' ? 'Monthly' : 'One-time'})</span>
                        </label>
                        {checked && (
                          <CurrencyInput
                            className="mt-2"
                            label="Nilai service"
                            min="0"
                            required
                            value={formData.amounts[engagement.id] ?? 0}
                            onChange={(event) => setFormData((previous) => ({
                              ...previous,
                              amounts: { ...previous.amounts, [engagement.id]: event.target.value },
                            }))}
                          />
                        )}
                      </div>
                    );
                  })}
                  {clientInvoiceEngagements.length === 0 && (
                    <p className="text-sm text-gray-500">Client ini belum memiliki project/service.</p>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">Setiap service yang dicentang dibuat sebagai satu invoice agar pembayaran dan laporan tetap terpisah.</p>
                {selectedInvoiceEngagements.length > 1 && (
                  <p className="text-sm font-medium text-gray-700 mt-2">Total pilihan: Rp {formatCurrency(selectedInvoiceTotal)}</p>
                )}
              </div>
            </>
          )}

          <Input
            label="Bulan Penagihan *"
            type="month"
            required
            value={formData.billing_month}
            onChange={e => setFormData({...formData, billing_month: e.target.value})}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input 
                label={selectedInvoiceRequiresPeriod ? "Bulan Pekerjaan *" : "Bulan Pekerjaan"}
                type="month"
                value={formData.period_month}
                onChange={e => setFormData({...formData, period_month: e.target.value})}
              />
              <p className="text-xs text-gray-500 mt-1">
                {selectedInvoiceRequiresPeriod ? "Contoh: jasa Mei ditagihkan pada Juni." : "Boleh kosong untuk pekerjaan satu kali."}
              </p>
            </div>
            <div>
              {editingInvoice || formData.engagement_ids.length <= 1 ? (
                <Input
                  label="Nomor Invoice"
                  placeholder="080/INV/SO/VII/26"
                  value={formData.invoice_number}
                  onChange={e => setFormData({...formData, invoice_number: e.target.value})}
                />
              ) : (
                <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
                  Nomor invoice untuk beberapa service akan dibuat otomatis berurutan.
                </div>
              )}
            </div>
          </div>

          {editingInvoice && (
            <div>
              <CurrencyInput
                label="Nilai Tagihan *"
                min="0"
                required
                value={formData.amount}
                onChange={e => setFormData({...formData, amount: e.target.value})}
              />
              <p className="text-xs text-gray-500 mt-1">Terisi dari project, masih bisa diedit.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Tanggal Invoice *"
              type="date"
              required
              value={formData.issue_date}
              onChange={e => setFormData({...formData, issue_date: e.target.value})}
            />
            <Input 
              label="Jatuh Tempo *"
              type="date"
              required
              value={formData.due_date}
              onChange={e => setFormData({...formData, due_date: e.target.value})}
            />
          </div>

          <div className="grid gap-4 grid-cols-1">
            <div>
              <Select 
                label="Status Invoice *"
                required
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value})}
                options={[
                  { value: 'draft', label: 'Draft' },
                  { value: 'approved', label: 'Disetujui' },
                  { value: 'sent', label: 'Dikirim' }
                ]}
              />
              <p className="text-xs text-gray-500 mt-1">Untuk mencatat uang masuk, gunakan tombol "Catat Pembayaran" setelah client membayar.</p>
            </div>
          </div>

          <Textarea 
            label="Catatan"
            value={formData.notes}
            onChange={e => setFormData({...formData, notes: e.target.value})}
          />
        </form>
      </Modal>

      {/* BULK GENERATE MODAL */}
      <Modal 
        open={isBulkModalOpen} 
        onClose={() => setIsBulkModalOpen(false)}
        title="Buat Invoice Massal"
        maxWidthClass="max-w-md"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setIsBulkModalOpen(false)}>Batal</Button>
            <Button type="button" onClick={handleBulkSubmit} disabled={createInvoicesBulk.isPending || bulkMonths.length === 0}>
              Buat {bulkMonths.length} Invoice
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-500 mb-4">Buat beberapa invoice sekaligus. Contoh: jasa Mei ditagihkan pada Juni. Setelah itu bulan tagihan maju otomatis setiap periode.</p>
        
        <form className="space-y-4" onSubmit={handleBulkSubmit}>
          {bulkFormError && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">
              {bulkFormError}
            </div>
          )}

          <div>
            <Select 
              label="Project *"
              required
              value={bulkFormData.engagement_id}
              onChange={handleBulkEngagementChange}
              options={[
                { value: '', label: 'Pilih project bulanan...' },
                ...monthlyEngagements.map(e => ({ value: e.id, label: `${e.client?.company_name} — ${e.service?.name}` }))
              ]}
            />
            {selectedBulkEngagementObj && (
              <p className="text-xs text-gray-500 mt-1">
                Nilai awal: Rp {formatCurrency(selectedBulkEngagementObj.service_fee_per_month)} dari nilai project.
              </p>
            )}
          </div>

          <Input
            label="Bulan Penagihan Awal *"
            type="month"
            required
            value={bulkFormData.billing_month}
            onChange={e => setBulkFormData({...bulkFormData, billing_month: e.target.value})}
          />

          <p className="-mt-2 text-xs text-gray-500">Invoice berikutnya otomatis dibuat pada bulan setelah bulan ini.</p>

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Bulan Pekerjaan Awal *"
              type="month"
              required
              value={bulkFormData.start_period}
              onChange={e => setBulkFormData({...bulkFormData, start_period: e.target.value})}
            />
            <Input 
              label="Bulan Pekerjaan Akhir *"
              type="month"
              required
              value={bulkFormData.end_period}
              onChange={e => setBulkFormData({...bulkFormData, end_period: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <CurrencyInput
              label="Nilai per Invoice *"
              min="0"
              required
              value={bulkFormData.amount}
              onChange={e => setBulkFormData({...bulkFormData, amount: e.target.value})}
            />
            <div>
              <Input 
                label="Tanggal Jatuh Tempo *"
                type="number"
                min="1"
                max="28"
                required
                value={bulkFormData.due_day}
                onChange={e => setBulkFormData({...bulkFormData, due_day: e.target.value})}
              />
              <p className="text-xs text-gray-500 mt-1">Tanggal ini berlaku di bulan tagihan.</p>
            </div>
          </div>

          <div>
            <Select 
               label="Status Invoice"
              required
              value={bulkFormData.status}
              onChange={e => setBulkFormData({...bulkFormData, status: e.target.value})}
              options={[
                { value: 'draft', label: 'Draft' },
                 { value: 'approved', label: 'Disetujui' },
                 { value: 'sent', label: 'Dikirim' }
              ]}
            />
          </div>

          {bulkMonths.length > 0 && selectedBulkEngagementObj && (
            <div className="mt-6 border-t border-gray-200 pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Preview {bulkMonths.length} invoice:</h4>
              <ul className="text-sm text-gray-600 space-y-1 max-h-32 overflow-y-auto bg-gray-50 p-2 rounded border border-gray-100">
                {bulkMonths.map((m, index) => {
                  const billingMonth = addMonthsToPeriodKey(bulkFormData.billing_month, index);
                  const dueDate = getBillingDate(billingMonth, parseInt(bulkFormData.due_day, 10) || 15);
                  return (
                    <li key={m}>
                      Jasa {formatPeriod(m)} - Rp {formatCurrency(parseInt(bulkFormData.amount, 10) || 0)} - tagihan {formatPeriod(billingMonth)} - jatuh tempo {format(new Date(dueDate), 'dd MMM yyyy')}
                    </li>
                  );
                })}
              </ul>
              {bulkMonths.length > 12 && (
                <p className="text-xs font-medium text-amber-600 mt-2">
                   Kamu akan membuat lebih dari 12 invoice sekaligus.
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

