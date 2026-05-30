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
      {/* CSS Masterclass untuk Cetak A4 Full-Size Presisi 1 Halaman */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0 !important; /* Menghilangkan URL Vercel, tanggal, & nomor halaman bawaan browser */
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Menyembunyikan seluruh elemen web lain */
          body * {
            visibility: hidden !important;
          }
          /* Menjadikan Payslip satu-satunya objek cetak, presisi memenuhi kertas A4 */
          #printable-payslip, #printable-payslip * {
            visibility: visible !important;
          }
          #printable-payslip {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important; /* Lebar A4 standar */
            height: 297mm !important; /* Tinggi A4 standar */
            padding: 30mm 20mm !important; /* Padding tepi yang lega & elegan */
            box-sizing: border-box !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            display: flex !important;
            flex-direction: column !important;
            font-size: 12pt !important; /* Ukuran font diperbesar agar seimbang */
          }
          
          /* Optimasi Ukuran Teks Khusus Cetak agar Terlihat Besar & Jelas */
          #printable-payslip h1 {
            font-size: 20pt !important;
            margin-bottom: 2pt !important;
            margin-top: 10pt !important;
          }
          #printable-payslip h2 {
            font-size: 15pt !important;
            margin-bottom: 12pt !important;
          }
          #printable-payslip .section-title {
            font-size: 11pt !important;
            margin-bottom: 8pt !important;
          }
          #printable-payslip .info-box {
            padding: 16px !important;
            margin-bottom: 24px !important;
            font-size: 11pt !important;
            line-height: 1.6 !important;
          }
          #printable-payslip .earning-item {
            font-size: 11.5pt !important;
            line-height: 1.7 !important;
          }
          #printable-payslip .earning-subitem {
            font-size: 10.5pt !important;
            margin-top: 4px !important;
          }
          #printable-payslip .total-box {
            padding: 18px !important;
            margin-top: 24px !important;
            margin-bottom: 30px !important;
          }
          #printable-payslip .total-box h4 {
            font-size: 10pt !important;
          }
          #printable-payslip .total-box span {
            font-size: 20pt !important;
          }
          #printable-payslip .footer-box {
            margin-top: auto !important; /* Mendorong footer ke bagian paling bawah A4 secara otomatis */
            padding-top: 16px !important;
            font-size: 10pt !important;
          }
        }
      `}</style>

      {/* Payslip Card Preview */}
      <div 
        id="printable-payslip" 
        className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm font-sans text-gray-800"
      >
        {/* Kop Surat Text-Only (Tanpa sub-header SAAS Operational yang tidak perlu) */}
        <div className="text-center border-b-2 border-gray-900 pb-3 mb-6">
          <h1 className="text-lg font-extrabold tracking-wide text-gray-900 uppercase">
            PT. Inovasi Langkah Usaha (ILUSA)
          </h1>
        </div>

        {/* Info Slip */}
        <div className="text-center mb-6">
          <h2 className="text-base font-bold text-gray-800 uppercase tracking-wide">
            SLIP GAJI FREELANCER
          </h2>
          <p className="text-sm text-gray-600">
            Periode: <span className="font-semibold">{formatPeriod(fee.period_month)}</span>
          </p>
        </div>

        {/* Informasi Penerima (info-box) */}
        <div className="info-box grid grid-cols-2 gap-4 text-sm mb-6 bg-gray-50 p-4 rounded-md border border-gray-100">
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
          <h3 className="section-title text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">
            RINCIAN PENGHASILAN
          </h3>

          <div className="space-y-4 text-sm">
            {fee.fee_type === 'hourly' && (
              <div className="earning-item flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-900">Honor Per Jam (Hourly Rate)</p>
                  <div className="earning-subitem text-xs text-gray-500 space-y-0.5">
                    <p>Tarif: Rp {formatCurrency(fee.hourly_rate)}/jam · {fee.hours_per_day} jam/hari</p>
                    <p>Hari Kerja: {fee.working_days} hari {fee.off_days > 0 && `(Off: ${fee.off_days} hari)`}</p>
                  </div>
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
              <div className="earning-item space-y-2">
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
              <div className="earning-item flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-900">Honor Tetap (Fixed Fee)</p>
                  <p className="earning-subitem text-xs text-gray-500">Flat rate sesuai kesepakatan kontrak bulanan/tahunan</p>
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

        {/* Total Bersih (total-box) */}
        <div className="total-box bg-emerald-50 border border-emerald-200 rounded-md p-4 mb-6 flex justify-between items-center">
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

        {/* Tanggal Cetak (footer-box) - Bersih Tanpa embel-embel teks SaaS */}
        <div className="footer-box flex justify-end text-xs text-gray-400 pt-2 border-t border-gray-100">
          <div className="text-right">
            <p>Tanggal Cetak: {todayStr}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
