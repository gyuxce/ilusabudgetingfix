import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';
import { formatPeriod } from '../lib/utils';

export function PayslipModal({ open, onClose, matchingFees }) {
  if (!matchingFees || matchingFees.length === 0) return null;

  const primaryFee = matchingFees[0]; // Ambil data freelancer & periode dari entri pertama
  const formatCurrency = (val) => new Intl.NumberFormat('id-ID').format(val || 0);

  const handlePrint = () => {
    window.print();
  };

  const todayStr = format(new Date(), 'dd MMMM yyyy');

  // Hitung total gaji gabungan dari semua pekerjaan di bulan tersebut
  const grandTotalGaji = matchingFees.reduce((sum, f) => sum + (f.calculated_fee || 0), 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pratinjau Slip Gaji Gabungan (Consolidated Payslip)"
      maxWidthClass="max-w-2xl"
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
            padding: 25mm 20mm !important; /* Padding tepi yang lega & elegan */
            box-sizing: border-box !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            display: flex !important;
            flex-direction: column !important;
            font-size: 11pt !important; /* Ukuran font diperbesar agar seimbang */
          }
          
          /* Optimasi Ukuran Teks Khusus Cetak agar Terlihat Besar & Jelas */
          #printable-payslip h1 {
            font-size: 20pt !important;
            margin-bottom: 2pt !important;
            margin-top: 10pt !important;
          }
          #printable-payslip h2 {
            font-size: 14pt !important;
            margin-bottom: 12pt !important;
          }
          #printable-payslip .section-title {
            font-size: 11pt !important;
            margin-bottom: 8pt !important;
          }
          #printable-payslip .info-box {
            padding: 16px !important;
            margin-bottom: 20px !important;
            font-size: 11pt !important;
            line-height: 1.5 !important;
          }
          #printable-payslip .project-card {
            padding: 12px 16px !important;
            margin-bottom: 12px !important;
            background: #fafafa !important;
            border: 1px solid #f0f0f0 !important;
            border-radius: 6px !important;
          }
          #printable-payslip .earning-item {
            font-size: 11pt !important;
            line-height: 1.6 !important;
          }
          #printable-payslip .earning-subitem {
            font-size: 10pt !important;
            margin-top: 2px !important;
          }
          #printable-payslip .total-box {
            padding: 18px !important;
            margin-top: 20px !important;
            margin-bottom: 24px !important;
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
        {/* Kop Surat Text-Only */}
        <div className="text-center border-b-2 border-gray-900 pb-3 mb-6">
          <h1 className="text-lg font-extrabold tracking-wide text-gray-900 uppercase">
            PT. Inovasi Langkah Usaha (ILUSA)
          </h1>
        </div>

        {/* Info Slip */}
        <div className="text-center mb-6">
          <h2 className="text-base font-bold text-gray-800 uppercase tracking-wide">
            SLIP GAJI FREELANCER (REKAP GABUNGAN)
          </h2>
          <p className="text-sm text-gray-600">
            Periode: <span className="font-semibold">{formatPeriod(primaryFee.period_month)}</span>
          </p>
        </div>

        {/* Informasi Penerima */}
        <div className="info-box grid grid-cols-2 gap-4 text-sm mb-6 bg-gray-50 p-4 rounded-md border border-gray-100">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Nama Freelancer</p>
            <p className="font-semibold text-gray-900">{primaryFee.freelancer?.name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Spesialisasi</p>
            <p className="font-semibold text-gray-800">{primaryFee.freelancer?.specialization || 'General Support'}</p>
          </div>
        </div>

        {/* Rincian Komponen Pembayaran Gabungan */}
        <div className="mb-6 flex-1 overflow-y-auto">
          <h3 className="section-title text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 border-b border-gray-200 pb-1">
            RINCIAN PENGHASILAN ({matchingFees.length} Pekerjaan)
          </h3>

          <div className="space-y-4">
            {matchingFees.map((feeItem, idx) => (
              <div 
                key={feeItem.id} 
                className="project-card p-4 bg-gray-50/50 border border-gray-100 rounded-md space-y-2"
              >
                {/* Header Sub-Pekerjaan */}
                <div className="flex justify-between items-center border-b border-gray-200/60 pb-1">
                  <span className="text-xs font-bold text-emerald-800 uppercase">
                    Pekerjaan #{idx + 1}
                  </span>
                  <span className="text-xs text-gray-400 uppercase font-mono">
                    Status: {feeItem.status === 'paid' ? 'Paid' : 'Pending'}
                  </span>
                </div>
                
                {/* Nama Engagement */}
                <p className="font-semibold text-gray-900 text-xs">
                  {feeItem.engagement?.client?.company_name} — {feeItem.engagement?.service?.name}
                </p>

                {/* Komponen Honor Item */}
                <div className="text-sm">
                  {feeItem.fee_type === 'hourly' && (
                    <div className="earning-item flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-800 text-xs">Honor Per Jam (Hourly)</p>
                        <div className="earning-subitem text-[11px] text-gray-500">
                          Tarif: Rp {formatCurrency(feeItem.hourly_rate)}/jam · {feeItem.hours_per_day}j/hari · {feeItem.working_days - (feeItem.off_days || 0)} hari aktif {feeItem.off_days > 0 && `(Off: ${feeItem.off_days}d)`}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 text-xs">
                          Rp {formatCurrency(feeItem.calculated_fee)}
                        </p>
                      </div>
                    </div>
                  )}

                  {feeItem.fee_type === 'per_content' && (
                    <div className="earning-item space-y-1">
                      <p className="font-semibold text-gray-800 text-xs">Honor Berbasis Konten (Per Content)</p>
                      
                      {feeItem.qty_single_post > 0 && (
                        <div className="flex justify-between items-center text-[11px] pl-3 border-l-2 border-emerald-500">
                          <span className="text-gray-600">Single Post ({feeItem.qty_single_post} × Rp {formatCurrency(feeItem.rate_single_post)})</span>
                          <span className="font-medium text-gray-900">Rp {formatCurrency(feeItem.qty_single_post * feeItem.rate_single_post)}</span>
                        </div>
                      )}

                      {feeItem.qty_carousel > 0 && (
                        <div className="flex justify-between items-center text-[11px] pl-3 border-l-2 border-emerald-500">
                          <span className="text-gray-600">Carousel ({feeItem.qty_carousel} × Rp {formatCurrency(feeItem.rate_carousel)})</span>
                          <span className="font-medium text-gray-900">Rp {formatCurrency(feeItem.qty_carousel * feeItem.rate_carousel)}</span>
                        </div>
                      )}

                      {feeItem.qty_reels > 0 && (
                        <div className="flex justify-between items-center text-[11px] pl-3 border-l-2 border-emerald-500">
                          <span className="text-gray-600">Reels ({feeItem.qty_reels} × Rp {formatCurrency(feeItem.rate_reels)})</span>
                          <span className="font-medium text-gray-900">Rp {formatCurrency(feeItem.qty_reels * feeItem.rate_reels)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {feeItem.fee_type === 'fixed' && (
                    <div className="earning-item flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-800 text-xs">Honor Tetap (Fixed Fee)</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 text-xs">Rp {formatCurrency(feeItem.calculated_fee)}</p>
                      </div>
                    </div>
                  )}

                  {feeItem.notes && (
                    <p className="text-[11px] text-gray-500 italic mt-1 bg-white p-1.5 rounded border border-gray-100">
                      Note: "{feeItem.notes}"
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Total Bersih Gabungan */}
        <div className="total-box bg-emerald-50 border border-emerald-200 rounded-md p-4 mb-6 flex justify-between items-center">
          <div>
            <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">TOTAL GAJI BERSIH GABUNGAN</h4>
            <p className="text-[10px] text-emerald-600 font-mono mt-0.5">Mencakup {matchingFees.length} project di periode ini</p>
          </div>
          <div className="text-right">
            <span className="text-xl font-extrabold text-emerald-700">
              Rp {formatCurrency(grandTotalGaji)}
            </span>
          </div>
        </div>

        {/* Tanggal Cetak */}
        <div className="footer-box flex justify-end text-xs text-gray-400 pt-2 border-t border-gray-100">
          <div className="text-right">
            <p>Tanggal Cetak: {todayStr}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
