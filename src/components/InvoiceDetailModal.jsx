import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { formatPeriod } from '../lib/utils';
import { useInvoicePayments, useDeletePayment } from '../lib/queries/invoice_payments';

export function InvoiceDetailModal({ open, onClose, invoice, onRecordPayment }) {
  const { data: payments, isLoading } = useInvoicePayments(invoice?.id);
  const deletePayment = useDeletePayment();

  if (!invoice) return null;

  const totalPaid = invoice.total_paid || 0;
  const balance = invoice.balance || 0;
  const amount = invoice.amount || 0;
  const percent = amount > 0 ? Math.min(Math.round((totalPaid / amount) * 100), 100) : 0;
  
  const formatCurrency = (val) => new Intl.NumberFormat('id-ID').format(val || 0);

  const handleDelete = async (payment) => {
    if (confirm('Delete this payment?')) {
      try {
        await deletePayment.mutateAsync({ id: payment.id, invoice_id: invoice.id });
      } catch (e) {
        alert(e.message);
      }
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${invoice.engagement?.client?.company_name} — ${invoice.engagement?.service?.name}`}
      footer={<Button onClick={onClose}>Close</Button>}
    >
      <div className="mb-4">
        <p className="text-sm text-gray-500 font-medium">Invoice {invoice.invoice_number || '—'} · {formatPeriod(invoice.period_month)}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Issue Date</p>
          <p className="text-sm font-medium">{invoice.issue_date ? format(new Date(invoice.issue_date), 'dd MMM yyyy') : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Due Date</p>
          <p className="text-sm font-medium text-red-600">{invoice.due_date ? format(new Date(invoice.due_date), 'dd MMM yyyy') : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Amount</p>
          <p className="text-lg font-semibold">Rp {formatCurrency(amount)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Status</p>
          <Badge variant={
            invoice.computed_status === 'paid' ? 'success' : 
            invoice.computed_status === 'overdue' ? 'danger' : 
            (invoice.computed_status === 'sent' || invoice.computed_status === 'partial') ? 'warning' : 'neutral'
          }>
            {invoice.computed_status === 'partial' ? `Partial (${percent}%)` : invoice.computed_status?.toUpperCase()}
          </Badge>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-6">
        <div className="flex justify-between items-end mb-2">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Paid</p>
            <p className="text-gray-950 font-semibold">Rp {formatCurrency(totalPaid)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Remaining</p>
            <p className={balance > 0 ? "text-amber-700 font-semibold" : "text-gray-500 font-semibold"}>Rp {formatCurrency(balance)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Progress</p>
            <p className="text-gray-900 font-semibold">{percent}%</p>
          </div>
        </div>
        <div className="h-2 bg-gray-200 rounded-full w-full overflow-hidden">
          <div className="h-full bg-gray-950" style={{ width: `${percent}%` }}></div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Payment History <span className="font-normal text-gray-500">({payments?.length || 0} payments)</span></h3>
        {isLoading ? (
          <p className="text-sm text-gray-500 animate-pulse">Loading...</p>
        ) : payments?.length === 0 ? (
          <div className="text-center py-4 bg-gray-50 rounded-md border border-gray-100">
            <p className="text-sm text-gray-500 mb-3">No payments recorded yet</p>
            <Button size="sm" onClick={() => onRecordPayment(invoice)}>Record Payment</Button>
          </div>
        ) : (
          <div className="space-y-2">
            {payments?.map(payment => (
              <div key={payment.id} className="p-3 border border-gray-200 rounded-md flex justify-between items-center bg-white shadow-sm">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-semibold text-gray-900">Rp {formatCurrency(payment.amount)}</span>
                    <span className="text-xs text-gray-500">{format(new Date(payment.payment_date), 'MMM dd, yyyy')}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {payment.payment_method || 'Unspecified'} {payment.notes ? `· "${payment.notes}"` : ''}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(payment)} disabled={deletePayment.isPending}>
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
          </div>
        )}

        {invoice.computed_status !== 'paid' && payments?.length > 0 && (
          <Button className="w-full mt-4" onClick={() => onRecordPayment(invoice)}>
            Record Another Payment
          </Button>
        )}
      </div>
    </Modal>
  );
}
