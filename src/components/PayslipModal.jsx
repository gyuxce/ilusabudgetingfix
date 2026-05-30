import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Printer, Download } from 'lucide-react';
import { format } from 'date-fns';
import { formatPeriod } from '../lib/utils';
import { toPng } from 'html-to-image';

export function PayslipModal({ open, onClose, matchingFees }) {
  if (!matchingFees || matchingFees.length === 0) return null;

  const primaryFee = matchingFees[0];
  const formatCurrency = (val) => new Intl.NumberFormat('id-ID').format(val || 0);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPNG = () => {
    const node = document.getElementById('printable-payslip');
    if (!node) return;

    // Convert HTML element to PNG with fixed clean styling for exact 1:1 image look
    toPng(node, {
      backgroundColor: '#ffffff',
      style: {
        margin: '0',
        padding: '32px',
        boxShadow: 'none',
        border: '1px solid #000000',
        width: '700px', // Ukuran ideal 1:1 / proporsional untuk dikirim via WhatsApp
        height: 'auto',
      }
    })
    .then((dataUrl) => {
      const link = document.createElement('a');
      link.download = `slip-gaji-${primaryFee.freelancer?.name || 'freelancer'}-${primaryFee.period_month}.png`;
      link.href = dataUrl;
      link.click();
    })
    .catch((error) => {
      console.error('Failed to generate PNG image', error);
    });
  };

  const todayStr = format(new Date(), 'MMM dd, yyyy');
  const periodStr = formatPeriod(primaryFee.period_month);

  const initials = primaryFee.freelancer?.name?.substring(0, 3).toUpperCase() || 'EMP';
  const yearMonth = primaryFee.period_month ? primaryFee.period_month.replace('-', '') : '202605';
  const slipNumber = `SLIP-${yearMonth}-${initials}`;

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
          <Button onClick={handleDownloadPNG} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700">
            <Download size={16} />
            Unduh Gambar (PNG)
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer size={16} />
            Cetak / Simpan PDF
          </Button>
        </>
      }
    >
      {/* CSS Masterclass Fluid Full-Width untuk Mengisi Kertas A4 Secara Sempurna Tanpa Menciut */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 15mm !important; /* Memberikan margin fisik kertas yang pas, otomatis menyembunyikan URL & Tanggal browser */
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            font-family: 'Courier New', Courier, monospace !important;
            width: 100% !important;
            height: auto !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Sembunyikan elemen web lainnya */
          body * {
            visibility: hidden !important;
          }
          
          /* Jadikan payslip meluas penuh mengisi margin A4 (tidak menciut menjadi kecil) */
          #printable-payslip, #printable-payslip * {
            visibility: visible !important;
          }
          #printable-payslip {
            position: static !important; /* Mengalir normal mengikuti margin kertas */
            width: 100% !important; /* Meluas 100% mengisi lebar area cetak */
            max-width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important; /* Hilangkan padding ekstra agar konten bisa meluas maksimal */
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            display: flex !important;
            flex-direction: column !important;
            font-size: 11pt !important; /* Perbesar basis font */
          }
          
          /* Penyesuaian ukuran teks agar tampak tebal & mantap di kertas */
          #printable-payslip h1 {
            font-size: 18pt !important;
            margin-bottom: 2pt !important;
          }
          #printable-payslip h2 {
            font-size: 14pt !important;
            margin-bottom: 10pt !important;
          }
          #printable-payslip .border-box {
            border: 1px solid black !important;
          }
          #printable-payslip .border-t-black {
            border-top: 1px solid black !important;
          }
          #printable-payslip .border-b-black {
            border-bottom: 1px solid black !important;
          }
          
          /* Berikan margin-top pada footer cetak agar terpisah manis di bawah */
          #printable-payslip .footer-box {
            margin-top: 50mm !important; 
            font-size: 10pt !important;
          }
        }
      `}</style>

      {/* Payslip Card Preview */}
      <div 
        id="printable-payslip" 
        className="bg-white p-6 font-mono text-gray-900 leading-relaxed text-sm select-none"
        style={{ fontFamily: "'Courier New', Courier, monospace" }}
      >
        {/* TOP HEADER SECTION */}
        <div className="flex justify-between items-start mb-8">
          {/* Company Info (Left) */}
          <div className="w-2/3">
            <h1 className="text-base font-bold tracking-wider text-black uppercase mb-1">
              PT. Inovasi Langkah Usaha (ILUSA)
            </h1>
            <p className="text-xs text-gray-600">
              Operational & Freelancer Budget Controlling<br />
              Jakarta, Indonesia<br />
              finance@inovasilangkahusaha.com
            </p>
          </div>

          {/* Metadata Border Box (Right) */}
          <div className="w-1/3 border border-black p-3 text-xs leading-5">
            <div className="flex justify-between">
              <span className="font-bold">Slip #:</span>
              <span>{slipNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Slip Date:</span>
              <span>{todayStr}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Period:</span>
              <span>{periodStr}</span>
            </div>
          </div>
        </div>

        {/* RECIPIENT INFO SECTION */}
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Paid To:</p>
          <p className="text-base font-bold text-black uppercase">{primaryFee.freelancer?.name || '—'}</p>
          <p className="text-xs text-gray-700">{primaryFee.freelancer?.specialization || 'Freelancer Partner'}</p>
        </div>

        <div className="mb-2">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Statement of Earnings:</p>
        </div>

        {/* CLASSIC ACCOUNTING TABLE */}
        <div className="border border-black w-full mb-6">
          {/* Table Header */}
          <div className="flex bg-gray-50 font-bold border-b border-black text-xs py-2 px-3">
            <div className="w-12 text-center">#</div>
            <div className="flex-1">Description</div>
            <div className="w-28 text-right">Unit Rate (IDR)</div>
            <div className="w-28 text-right">Count / Days</div>
            <div className="w-32 text-right">Amount (IDR)</div>
          </div>

          {/* Table Body Rows */}
          <div className="divide-y divide-gray-300 text-xs">
            {matchingFees.map((feeItem, idx) => {
              let desc = `${feeItem.engagement?.client?.company_name} - ${feeItem.engagement?.service?.name}`;
              let rateStr = '—';
              let qtyStr = '—';
              
              if (feeItem.fee_type === 'hourly') {
                rateStr = `${formatCurrency(feeItem.hourly_rate)}`;
                const activeDays = feeItem.working_days - (feeItem.off_days || 0);
                qtyStr = `${feeItem.hours_per_day}h/d × ${activeDays}d`;
              } else if (feeItem.fee_type === 'fixed') {
                rateStr = 'Fixed Flat';
                qtyStr = '1 month';
              } else if (feeItem.fee_type === 'per_content') {
                const contents = [];
                if (feeItem.qty_single_post > 0) contents.push(`${feeItem.qty_single_post} Single Post`);
                if (feeItem.qty_carousel > 0) contents.push(`${feeItem.qty_carousel} Carousel`);
                if (feeItem.qty_reels > 0) contents.push(`${feeItem.qty_reels} Reels`);
                qtyStr = contents.join(' + ');
              }

              return (
                <div key={feeItem.id} className="py-3 px-3">
                  <div className="flex items-start">
                    <div className="w-12 text-center text-gray-600 font-bold">{idx + 1}</div>
                    <div className="flex-1 font-semibold text-black">
                      {desc}
                      {feeItem.notes && (
                        <span className="block text-[10px] text-gray-500 font-normal italic mt-0.5">
                          Note: "{feeItem.notes}"
                        </span>
                      )}
                    </div>
                    <div className="w-28 text-right font-mono">{rateStr}</div>
                    <div className="w-28 text-right font-mono">{qtyStr}</div>
                    <div className="w-32 text-right font-bold font-mono">Rp {formatCurrency(feeItem.calculated_fee)}</div>
                  </div>

                  {feeItem.fee_type === 'per_content' && (
                    <div className="pl-12 mt-1.5 space-y-0.5 text-[10px] text-gray-600 leading-relaxed border-l border-gray-400 ml-3">
                      {feeItem.qty_single_post > 0 && (
                        <div>• Single Post: {feeItem.qty_single_post} posts × Rp {formatCurrency(feeItem.rate_single_post)}</div>
                      )}
                      {feeItem.qty_carousel > 0 && (
                        <div>• Carousel: {feeItem.qty_carousel} posts × Rp {formatCurrency(feeItem.rate_carousel)}</div>
                      )}
                      {feeItem.qty_reels > 0 && (
                        <div>• Reels: {feeItem.qty_reels} posts × Rp {formatCurrency(feeItem.rate_reels)}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Table Summary Rows */}
          <div className="border-t border-black bg-gray-50/50 py-2 px-3 text-xs leading-6">
            <div className="flex justify-end">
              <div className="w-48 text-right text-gray-600 font-bold">Subtotal:</div>
              <div className="w-36 text-right font-bold font-mono">Rp {formatCurrency(grandTotalGaji)}</div>
            </div>
            <div className="flex justify-end border-t border-gray-200/80 my-1 pt-1">
              <div className="w-48 text-right text-gray-600 font-bold">Net Paid Total:</div>
              <div className="w-36 text-right font-bold font-mono">Rp {formatCurrency(grandTotalGaji)}</div>
            </div>
            <div className="flex justify-end border-t-2 border-double border-black pt-1 font-extrabold text-black">
              <div className="w-48 text-right uppercase">Total:</div>
              <div className="w-36 text-right font-mono">Rp {formatCurrency(grandTotalGaji)}</div>
            </div>
          </div>
        </div>

        {/* BOTTOM THANKS SECTION */}
        <div className="footer-box mt-4 text-center text-xs text-gray-500">
          <p className="mb-2">***</p>
          <p className="italic">Thank you for your business & hard work.</p>
        </div>
      </div>
    </Modal>
  );
}
