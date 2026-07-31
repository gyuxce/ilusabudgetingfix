import { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { CurrencyInput } from './ui/CurrencyInput';
import { Textarea } from './ui/Textarea';
import { formatPeriod } from '../lib/utils';
import { format } from 'date-fns';
import { useCreatePayment } from '../lib/queries/invoice_payments';

export function RecordPaymentModal({ open, onClose, invoice, onSuccess }) {
  const createPayment = useCreatePayment();

  const balance = invoice?.balance || 0;
  const totalPaid = invoice?.total_paid || 0;
  const amount = invoice?.amount || 0;

  const [formData, setFormData] = useState({
    amount: balance,
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: '',
    notes: ''
  });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (open && invoice) {
      setFormData({
        amount: invoice.balance,
        payment_date: format(new Date(), 'yyyy-MM-dd'),
        payment_method: '',
        notes: ''
      });
      setFormError('');
    }
  }, [open, invoice]);

  if (!invoice) return null;

  const formatCurrency = (val) => new Intl.NumberFormat('id-ID').format(val || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const paymentAmt = parseInt(formData.amount, 10);
    if (!paymentAmt || paymentAmt <= 0) {
      setFormError('Nominal pembayaran harus lebih dari nol.');
      return;
    }

    if (paymentAmt > balance) {
      setFormError(`Nominal pembayaran melebihi sisa tagihan Rp ${formatCurrency(balance)}.`);
      return;
    }

    try {
      await createPayment.mutateAsync({
        invoice_id: invoice.id,
        amount: paymentAmt,
        payment_date: formData.payment_date,
        payment_method: formData.payment_method || null,
        notes: formData.notes || null
      });
      onSuccess?.(paymentAmt);
    } catch (err) {
      setFormError(err.message);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Catat Pembayaran"
      maxWidthClass="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Batal</Button>
          <Button onClick={handleSubmit} disabled={createPayment.isPending}>Simpan Pembayaran</Button>
        </>
      }
    >
      <div className="mb-4">
        <p className="text-sm text-gray-500 font-medium">
          {invoice.engagement?.client?.company_name} — Invoice for {formatPeriod(invoice.period_month)}
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-6 grid gap-1 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Total:</span>
          <span>Rp {formatCurrency(amount)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Sudah Dibayar:</span>
          <span>Rp {formatCurrency(totalPaid)}</span>
        </div>
        <div className="flex justify-between text-amber-700 font-semibold border-t border-gray-200 pt-1 mt-1">
          <span>Sisa Tagihan:</span>
          <span>Rp {formatCurrency(balance)}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">
            {formError}
          </div>
        )}

        <div>
           <CurrencyInput
             label="Nominal *"
             required 
             min="1"
             value={formData.amount} 
             onChange={e => setFormData({...formData, amount: e.target.value})} 
           />
           <p className="text-xs mt-1 text-gray-500">Masukkan nominal pembayaran dalam Rupiah.</p>
        </div>

        <Input 
          label="Tanggal Pembayaran *"
          type="date" 
          required 
          value={formData.payment_date} 
          onChange={e => setFormData({...formData, payment_date: e.target.value})} 
        />

        <Input 
          label="Metode Pembayaran"
          placeholder="Transfer bank / cash"
          value={formData.payment_method} 
          onChange={e => setFormData({...formData, payment_method: e.target.value})} 
        />

<Textarea
          label="Catatan"
          placeholder="Contoh: Term 1 / DP 50%, Term 2 / Pelunasan, via Mandiri"
          value={formData.notes}
          onChange={e => setFormData({...formData, notes: e.target.value})}
        />
      </form>
    </Modal>
  );
}
