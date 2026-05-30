import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Printer, Download } from 'lucide-react';
import { format } from 'date-fns';
import { formatPeriod } from '../lib/utils';
import { toPng } from 'html-to-image';

export function PayslipModal({ open, onClose, matchingFees }) {
  if (!matchingFees || matchingFees.length === 0) return null;

  const primaryFee = matchingFees[0];
  const companyName = 'PT. Inovasi Langkah Usaha';
  const brandName = 'ILUSA';
  const companyLocation = 'Yogyakarta, Indonesia';
  const companyEmail = 'partnership@ilusa.id';
  const recipientName = primaryFee.freelancer?.name || '-';
  const recipientRole = primaryFee.freelancer?.specialization || 'Freelancer Partner';
  const periodStr = formatPeriod(primaryFee.period_month);
  const todayStr = format(new Date(), 'MMM dd, yyyy');
  const initials = recipientName.substring(0, 3).toUpperCase() || 'EMP';
  const yearMonth = primaryFee.period_month ? primaryFee.period_month.replace('-', '') : '202605';
  const slipNumber = `SLIP-${yearMonth}-${initials}`;
  const grandTotalGaji = matchingFees.reduce((sum, f) => sum + (f.calculated_fee || 0), 0);
  const paymentStatus = matchingFees.every((fee) => fee.status === 'paid') ? 'Paid' : 'Pending';

  const formatCurrency = (val) => new Intl.NumberFormat('id-ID').format(val || 0);

  const getFeeBreakdown = (feeItem) => {
    if (feeItem.fee_type === 'hourly') {
      const activeDays = (feeItem.working_days || 0) - (feeItem.off_days || 0);
      return {
        rate: `Rp ${formatCurrency(feeItem.hourly_rate)}`,
        quantity: `${feeItem.hours_per_day || 0}h/day x ${activeDays} days`,
        details: [`${feeItem.working_days || 0} working days`, `${feeItem.off_days || 0} off days`],
      };
    }

    if (feeItem.fee_type === 'fixed') {
      return {
        rate: 'Fixed fee',
        quantity: '1 period',
        details: [],
      };
    }

    const details = [];
    if (feeItem.qty_single_post > 0) {
      details.push(`${feeItem.qty_single_post} single post x Rp ${formatCurrency(feeItem.rate_single_post)}`);
    }
    if (feeItem.qty_carousel > 0) {
      details.push(`${feeItem.qty_carousel} carousel x Rp ${formatCurrency(feeItem.rate_carousel)}`);
    }
    if (feeItem.qty_reels > 0) {
      details.push(`${feeItem.qty_reels} reels x Rp ${formatCurrency(feeItem.rate_reels)}`);
    }

    return {
      rate: 'Content rate',
      quantity: details.length > 0 ? `${details.length} item type${details.length > 1 ? 's' : ''}` : '-',
      details,
    };
  };

  const handlePrint = () => {
    const previousTitle = document.title;
    document.title = `slip-gaji-${recipientName}-${primaryFee.period_month}`;
    const restoreTitle = () => {
      document.title = previousTitle;
      window.removeEventListener('afterprint', restoreTitle);
    };
    window.addEventListener('afterprint', restoreTitle);
    window.print();
  };

  const handleDownloadPNG = () => {
    const node = document.getElementById('printable-payslip');
    if (!node) return;

    toPng(node, {
      backgroundColor: '#ffffff',
      pixelRatio: 3,
      style: {
        margin: '0',
        boxShadow: 'none',
        border: 'none',
        width: '794px',
        minHeight: '1123px',
      },
    })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `slip-gaji-${recipientName}-${primaryFee.period_month}.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((error) => {
        console.error('Failed to generate PNG image', error);
      });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pratinjau Slip Gaji"
      maxWidthClass="max-w-5xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Tutup</Button>
          <Button onClick={handleDownloadPNG} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700">
            <Download size={16} />
            Unduh PNG
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer size={16} />
            Cetak / Simpan PDF
          </Button>
        </>
      }
    >
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }

        @media print {
          html,
          body,
          #root {
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body * {
            visibility: hidden !important;
          }

          #printable-payslip,
          #printable-payslip * {
            visibility: visible !important;
          }

          #printable-payslip {
            position: fixed !important;
            inset: 0 auto auto 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 14mm !important;
            box-sizing: border-box !important;
            border: none !important;
            box-shadow: none !important;
            transform: none !important;
            overflow: visible !important;
            page-break-after: avoid !important;
          }

          #printable-payslip .no-print-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="overflow-x-auto rounded-md bg-gray-100 p-3">
        <div
          id="printable-payslip"
          className="mx-auto flex min-h-[297mm] w-[210mm] flex-col bg-white p-[14mm] text-gray-950 shadow-sm"
          style={{ fontFamily: 'Inter, Arial, Helvetica, sans-serif' }}
        >
          <header className="no-print-break overflow-hidden rounded-lg border border-gray-900">
            <div className="flex items-stretch">
              <div className="flex flex-1 flex-col justify-between bg-gray-950 p-6 text-white">
                <div>
                  <div className="mb-6 inline-flex h-10 w-10 items-center justify-center rounded bg-white text-sm font-bold tracking-tight text-gray-950">
                    IL
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200">Freelancer Payslip</p>
                  <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">{brandName}</h1>
                </div>
                <div className="mt-8 text-xs leading-5 text-gray-200">
                  <p className="font-semibold text-white">{companyName}</p>
                  <p>{companyLocation}</p>
                  <p>{companyEmail}</p>
                </div>
              </div>

              <div className="w-[72mm] bg-white p-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Slip Details</p>
                <dl className="mt-5 space-y-4 text-sm">
                  <div>
                    <dt className="text-xs text-gray-500">Slip Number</dt>
                    <dd className="mt-0.5 font-semibold text-gray-950">{slipNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Period</dt>
                    <dd className="mt-0.5 font-semibold text-gray-950">{periodStr}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Issued Date</dt>
                    <dd className="mt-0.5 font-semibold text-gray-950">{todayStr}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Status</dt>
                    <dd className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {paymentStatus}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </header>

          <main className="flex flex-1 flex-col">
            <section className="no-print-break mt-6 grid grid-cols-[1fr_78mm] gap-5">
              <div className="rounded-lg border border-gray-200 p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Paid To</p>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-gray-950">{recipientName}</h2>
                <p className="mt-1 text-sm text-gray-600">{recipientRole}</p>
              </div>

              <div className="rounded-lg bg-emerald-50 p-5 ring-1 ring-emerald-200">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Net Paid Total</p>
                <p className="mt-3 text-3xl font-bold tracking-tight text-emerald-900">Rp {formatCurrency(grandTotalGaji)}</p>
                <p className="mt-2 text-xs text-emerald-800">Consolidated from {matchingFees.length} fee {matchingFees.length === 1 ? 'entry' : 'entries'}.</p>
              </div>
            </section>

            <section className="mt-7">
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Statement of Earnings</p>
                  <h3 className="mt-1 text-base font-semibold text-gray-950">Fee breakdown</h3>
                </div>
                <p className="text-xs text-gray-500">Amounts in IDR</p>
              </div>

              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-gray-950 text-white">
                    <tr>
                      <th className="w-10 px-3 py-3 font-semibold">#</th>
                      <th className="px-3 py-3 font-semibold">Description</th>
                      <th className="w-32 px-3 py-3 text-right font-semibold">Unit Rate</th>
                      <th className="w-36 px-3 py-3 text-right font-semibold">Count / Days</th>
                      <th className="w-36 px-3 py-3 text-right font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {matchingFees.map((feeItem, idx) => {
                      const breakdown = getFeeBreakdown(feeItem);
                      const description = `${feeItem.engagement?.client?.company_name || '-'} - ${feeItem.engagement?.service?.name || '-'}`;

                      return (
                        <tr key={feeItem.id} className="align-top">
                          <td className="px-3 py-4 font-semibold text-gray-500">{idx + 1}</td>
                          <td className="px-3 py-4">
                            <p className="font-semibold text-gray-950">{description}</p>
                            {breakdown.details.length > 0 && (
                              <p className="mt-1 text-[11px] leading-5 text-gray-500">{breakdown.details.join(' / ')}</p>
                            )}
                            {feeItem.notes && (
                              <p className="mt-1 text-[11px] italic leading-5 text-gray-500">Note: {feeItem.notes}</p>
                            )}
                          </td>
                          <td className="px-3 py-4 text-right font-medium text-gray-700">{breakdown.rate}</td>
                          <td className="px-3 py-4 text-right text-gray-600">{breakdown.quantity}</td>
                          <td className="px-3 py-4 text-right font-bold text-gray-950">Rp {formatCurrency(feeItem.calculated_fee)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="no-print-break mt-5 ml-auto w-[84mm] overflow-hidden rounded-lg border border-gray-200">
              <div className="flex justify-between border-b border-gray-200 px-4 py-3 text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold text-gray-950">Rp {formatCurrency(grandTotalGaji)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 px-4 py-3 text-sm">
                <span className="text-gray-600">Adjustments</span>
                <span className="font-semibold text-gray-950">Rp 0</span>
              </div>
              <div className="flex justify-between bg-gray-950 px-4 py-4 text-sm text-white">
                <span className="font-semibold">Total Paid</span>
                <span className="font-bold">Rp {formatCurrency(grandTotalGaji)}</span>
              </div>
            </section>

            <section className="no-print-break mt-auto grid grid-cols-2 gap-5 pt-10">
              <div className="rounded-lg border border-gray-200 p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Notes</p>
                <p className="mt-3 text-xs leading-5 text-gray-600">
                  This payslip summarizes approved freelancer fees for the selected period.
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Authorized By</p>
                <div className="mt-10 border-t border-gray-300 pt-3">
                  <p className="text-sm font-semibold text-gray-950">ILUSA Partnership Team</p>
                  <p className="text-xs text-gray-500">{companyEmail}</p>
                </div>
              </div>
            </section>
          </main>

          <footer className="no-print-break mt-6 border-t border-gray-200 pt-4 text-center text-[11px] text-gray-500">
            Thank you for your partnership and hard work.
          </footer>
        </div>
      </div>
    </Modal>
  );
}
