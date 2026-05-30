import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';
import { formatPeriod } from '../lib/utils';

export function PayslipModal({ open, onClose, fee }) {
  if (!fee) return null;

  const formatCurrency = (val) => new Intl.NumberFormat('id-ID').format(val || 0);

  const handlePrint = () => {
    window.print();
  };

  const todayStr = format(new Date(), 'dd MMMM yyyy');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pratinjau Slip Gaji (Payslip)"
      maxWidthClass="max-w-xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Tutup</Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer size={16} />
            Cetak / Simpan PDF
          </Button>
        </>
      }
    >
      {/* CSS untuk memisahkan area cetak hanya pada payslip */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-payslip, #printable-payslip * {
            visibility: visible !important;
          }
          #printable-payslip {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }
        }
      `}</style>

      {/* Payslip Card Preview */}
      <div 
        id="printable-payslip" 
        className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm font-sans text-gray-800"
      >
        {/* Kop Surat Text-Only */}
        <div className="text-center border-b-2 border-gray-900 pb-4 mb-6">
          <h1 className="text-xl font-extrabold tracking-wide text-gray-900 uppercase">
            PT. Inovasi Langkah Usaha (ILUSA)
          </h1>
          <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">
            SaaS Operational & Budget Controlling Slip
          </p>
        </div>

        {/* Info Slip */}
        <div className="text-center mb-6">
          <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">
            SLIP GAJI FREELANCER
          </h2>
          <p className="text-sm text-gray-600">
            Periode: <span className="font-semibold">{formatPeriod(fee.period_month)}</span>
          </p>
        </div>

        {/* Informasi Penerima */}
        <div className="grid grid-cols-2 gap-4 text-sm mb-6 bg-gray-50 p-4 rounded-md border border-gray-100">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Nama Freelancer</p>
            <p className="font-semibold text-gray-900">{fee.freelancer?.name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Spesialisasi</p>
            <p className="font-semibold text-gray-800">{fee.freelancer?.specialization || 'General Support'}</p>
          </div>
          <div className="col-span-2 border-t border-gray-200/60 pt-2 mt-1">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Nama Pekerjaan (Engagement)</p>
            <p className="font-medium text-gray-700">
              {fee.engagement?.client?.company_name} — {fee.engagement?.service?.name}
            </p>
          </div>
        </div>

        {/* Rincian Komponen Pembayaran */}
        <div className="mb-6">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">
            RINCIAN PENGHASILAN
          </h3>

          <div className="space-y-3 text-sm">
            {fee.fee_type === 'hourly' && (
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-900">Honor Per Jam (Hourly Rate)</p>
                  <p className="text-xs text-gray-500">
                    Tarif: Rp {formatCurrency(fee.hourly_rate)}/jam · {fee.hours_per_day} jam/hari
                  </p>
                  <p className="text-xs text-gray-500">
                    Hari Kerja: {fee.working_days} hari {fee.off_days > 0 && `(Off: ${fee.off_days} hari)`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    Rp {formatCurrency(fee.calculated_fee)}
                  </p>
                  <p className="text-xs text-gray-400 font-mono">
                    {fee.working_days - (fee.off_days || 0)} hari aktif
                  </p>
                </div>
              </div>
            )}

            {fee.fee_type === 'per_content' && (
              <div className="space-y-2">
                <p className="font-semibold text-gray-900 mb-1">Honor Berbasis Konten (Per Content)</p>
                
                {fee.qty_single_post > 0 && (
                  <div className="flex justify-between items-center text-xs pl-3 border-l-2 border-emerald-500">
                    <span className="text-gray-600">Single Post ({fee.qty_single_post} item × Rp {formatCurrency(fee.rate_single_post)})</span>
                    <span className="font-medium text-gray-900">Rp {formatCurrency(fee.qty_single_post * fee.rate_single_post)}</span>
                  </div>
                )}

                {fee.qty_carousel > 0 && (
                  <div className="flex justify-between items-center text-xs pl-3 border-l-2 border-emerald-500">
                    <span className="text-gray-600">Carousel ({fee.qty_carousel} item × Rp {formatCurrency(fee.rate_carousel)})</span>
                    <span className="font-medium text-gray-900">Rp {formatCurrency(fee.qty_carousel * fee.rate_carousel)}</span>
                  </div>
                )}

                {fee.qty_reels > 0 && (
                  <div className="flex justify-between items-center text-xs pl-3 border-l-2 border-emerald-500">
                    <span className="text-gray-600">Reels ({fee.qty_reels} item × Rp {formatCurrency(fee.rate_reels)})</span>
                    <span className="font-medium text-gray-900">Rp {formatCurrency(fee.qty_reels * fee.rate_reels)}</span>
                  </div>
                )}
              </div>
            )}

            {fee.fee_type === 'fixed' && (
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-900">Honor Tetap (Fixed Fee)</p>
                  <p className="text-xs text-gray-500">Flat rate sesuai kesepakatan kontrak bulanan/tahunan</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">Rp {formatCurrency(fee.calculated_fee)}</p>
                </div>
              </div>
            )}

            {fee.notes && (
              <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500 italic">
                <span className="font-semibold not-italic block text-gray-700 mb-0.5">Catatan tambahan:</span>
                "{fee.notes}"
              </div>
            )}
          </div>
        </div>

        {/* Total Bersih */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-md p-4 mb-6 flex justify-between items-center">
          <div>
            <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">TOTAL GAJI BERSIH</h4>
            <p className="text-[10px] text-emerald-600 font-mono mt-0.5">Status Pembayaran: {fee.status === 'paid' ? 'PAID / LUNAS' : 'PENDING'}</p>
          </div>
          <div className="text-right">
            <span className="text-xl font-extrabold text-emerald-700">
              Rp {formatCurrency(fee.calculated_fee)}
            </span>
          </div>
        </div>

        {/* Tanggal Cetak & Penutup */}
        <div className="flex justify-between items-end text-xs text-gray-400 pt-2 border-t border-gray-100">
          <div>
            <p>Dicetak otomatis via ILUSA Budgeting SaaS</p>
          </div>
          <div className="text-right">
            <p>Tanggal Cetak: {todayStr}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
