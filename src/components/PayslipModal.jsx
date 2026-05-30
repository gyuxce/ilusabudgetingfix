import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Printer, Download } from 'lucide-react';
import { format } from 'date-fns';
import { formatPeriod } from '../lib/utils';
import { toPng } from 'html-to-image';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
}[char]));

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

  const getPrintHtml = () => {
    const rows = matchingFees.map((feeItem, idx) => {
      const breakdown = getFeeBreakdown(feeItem);
      const description = `${feeItem.engagement?.client?.company_name || '-'} - ${feeItem.engagement?.service?.name || '-'}`;
      const details = [
        ...breakdown.details,
        feeItem.notes ? `Note: ${feeItem.notes}` : '',
      ].filter(Boolean).join(' / ');

      return `
        <tr>
          <td>${idx + 1}</td>
          <td>
            <strong>${escapeHtml(description)}</strong>
            ${details ? `<span>${escapeHtml(details)}</span>` : ''}
          </td>
          <td class="right">${escapeHtml(breakdown.rate)}</td>
          <td class="right">${escapeHtml(breakdown.quantity)}</td>
          <td class="right strong">Rp ${formatCurrency(feeItem.calculated_fee)}</td>
        </tr>
      `;
    }).join('');

    return `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>slip-gaji-${escapeHtml(recipientName)}-${escapeHtml(primaryFee.period_month)}</title>
          <style>
            @page { size: A4 portrait; margin: 0; }
            * { box-sizing: border-box; }
            html, body {
              width: 210mm;
              min-height: 297mm;
              margin: 0;
              background: #fff;
              color: #111;
              font-family: Arial, Helvetica, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .page {
              width: 210mm;
              min-height: 297mm;
              padding: 14mm;
              display: flex;
              flex-direction: column;
            }
            .header {
              border: 1.5px solid #111;
              border-radius: 8px;
              padding: 18px;
              display: grid;
              grid-template-columns: 1fr 72mm;
              gap: 18px;
            }
            .eyebrow {
              font-size: 10px;
              letter-spacing: 0.18em;
              text-transform: uppercase;
              font-weight: 700;
              color: #555;
            }
            h1 {
              margin: 8px 0 16px;
              font-size: 30px;
              line-height: 1.1;
              letter-spacing: -0.02em;
            }
            .company, .meta, .muted {
              font-size: 12px;
              line-height: 1.55;
              color: #444;
            }
            .company strong, .meta strong {
              color: #111;
            }
            .meta {
              border-left: 1px solid #ddd;
              padding-left: 18px;
            }
            .meta-row {
              margin-bottom: 11px;
            }
            .status {
              display: inline-block;
              border: 1px solid #111;
              border-radius: 999px;
              padding: 4px 9px;
              color: #111;
              font-size: 11px;
              font-weight: 700;
            }
            .summary {
              margin-top: 20px;
              display: grid;
              grid-template-columns: 1fr 78mm;
              gap: 16px;
            }
            .box {
              border: 1px solid #ddd;
              border-radius: 8px;
              padding: 16px;
            }
            .recipient {
              font-size: 24px;
              font-weight: 800;
              margin: 8px 0 4px;
            }
            .total-box {
              border-color: #111;
              background: #f6f6f6;
            }
            .total {
              margin-top: 8px;
              font-size: 28px;
              font-weight: 800;
              letter-spacing: -0.03em;
            }
            .section-title {
              margin: 24px 0 10px;
              display: flex;
              align-items: end;
              justify-content: space-between;
            }
            h2 {
              margin: 3px 0 0;
              font-size: 16px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              border: 1px solid #111;
              font-size: 11px;
            }
            th {
              border-bottom: 1px solid #111;
              padding: 10px 9px;
              text-align: left;
              font-weight: 800;
              background: #f2f2f2;
            }
            td {
              border-bottom: 1px solid #ddd;
              padding: 12px 9px;
              vertical-align: top;
            }
            td span {
              display: block;
              margin-top: 4px;
              color: #666;
              font-size: 10px;
              line-height: 1.45;
            }
            .right { text-align: right; }
            .strong { font-weight: 800; }
            .totals {
              width: 84mm;
              margin: 16px 0 0 auto;
              border: 1px solid #111;
              border-radius: 8px;
              overflow: hidden;
              font-size: 12px;
            }
            .totals div {
              display: flex;
              justify-content: space-between;
              padding: 11px 14px;
              border-bottom: 1px solid #ddd;
            }
            .totals div:last-child {
              border-bottom: none;
              background: #f2f2f2;
              font-weight: 800;
            }
            .bottom {
              margin-top: auto;
              padding-top: 28px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
            }
            .signature-line {
              margin-top: 34px;
              padding-top: 10px;
              border-top: 1px solid #999;
            }
            footer {
              margin-top: 18px;
              border-top: 1px solid #ddd;
              padding-top: 12px;
              text-align: center;
              font-size: 11px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="page">
            <header class="header">
              <div>
                <div class="eyebrow">Freelancer Payslip</div>
                <h1>${escapeHtml(brandName)}</h1>
                <div class="company">
                  <strong>${escapeHtml(companyName)}</strong><br />
                  ${escapeHtml(companyLocation)}<br />
                  ${escapeHtml(companyEmail)}
                </div>
              </div>
              <div class="meta">
                <div class="eyebrow">Slip Details</div>
                <div class="meta-row"><strong>Slip Number</strong><br />${escapeHtml(slipNumber)}</div>
                <div class="meta-row"><strong>Period</strong><br />${escapeHtml(periodStr)}</div>
                <div class="meta-row"><strong>Issued Date</strong><br />${escapeHtml(todayStr)}</div>
                <span class="status">${escapeHtml(paymentStatus)}</span>
              </div>
            </header>

            <section class="summary">
              <div class="box">
                <div class="eyebrow">Paid To</div>
                <div class="recipient">${escapeHtml(recipientName)}</div>
                <div class="muted">${escapeHtml(recipientRole)}</div>
              </div>
              <div class="box total-box">
                <div class="eyebrow">Net Paid Total</div>
                <div class="total">Rp ${formatCurrency(grandTotalGaji)}</div>
                <div class="muted">${matchingFees.length} fee ${matchingFees.length === 1 ? 'entry' : 'entries'}</div>
              </div>
            </section>

            <section>
              <div class="section-title">
                <div>
                  <div class="eyebrow">Statement of Earnings</div>
                  <h2>Fee breakdown</h2>
                </div>
                <div class="muted">Amounts in IDR</div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 34px;">#</th>
                    <th>Description</th>
                    <th class="right" style="width: 98px;">Unit Rate</th>
                    <th class="right" style="width: 112px;">Count / Days</th>
                    <th class="right" style="width: 112px;">Amount</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </section>

            <section class="totals">
              <div><span>Subtotal</span><strong>Rp ${formatCurrency(grandTotalGaji)}</strong></div>
              <div><span>Adjustments</span><strong>Rp 0</strong></div>
              <div><span>Total Paid</span><strong>Rp ${formatCurrency(grandTotalGaji)}</strong></div>
            </section>

            <section class="bottom">
              <div class="box">
                <div class="eyebrow">Notes</div>
                <p class="muted">This payslip summarizes approved freelancer fees for the selected period.</p>
              </div>
              <div class="box">
                <div class="eyebrow">Authorized By</div>
                <div class="signature-line">
                  <strong>ILUSA Partnership Team</strong><br />
                  <span class="muted">${escapeHtml(companyEmail)}</span>
                </div>
              </div>
            </section>
            <footer>Thank you for your partnership and hard work.</footer>
          </div>
        </body>
      </html>`;
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=1200');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.open();
    printWindow.document.write(getPrintHtml());
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
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
          <header className="no-print-break overflow-hidden rounded-lg border border-gray-900 bg-white">
            <div className="flex items-stretch">
              <div className="flex flex-1 flex-col justify-between p-6 text-gray-950">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Freelancer Payslip</p>
                  <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-950">{brandName}</h1>
                </div>
                <div className="mt-8 text-xs leading-5 text-gray-600">
                  <p className="font-semibold text-gray-950">{companyName}</p>
                  <p>{companyLocation}</p>
                  <p>{companyEmail}</p>
                </div>
              </div>

              <div className="w-[72mm] border-l border-gray-200 bg-gray-50 p-6">
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
                    <dd className="mt-1 inline-flex rounded-full border border-gray-900 bg-white px-2.5 py-1 text-xs font-semibold text-gray-950">
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

              <div className="rounded-lg border border-gray-900 bg-gray-50 p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Net Paid Total</p>
                <p className="mt-3 text-3xl font-bold tracking-tight text-gray-950">Rp {formatCurrency(grandTotalGaji)}</p>
                <p className="mt-2 text-xs text-gray-600">Consolidated from {matchingFees.length} fee {matchingFees.length === 1 ? 'entry' : 'entries'}.</p>
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
                  <thead className="border-b border-gray-900 bg-gray-100 text-gray-950">
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
              <div className="flex justify-between bg-gray-100 px-4 py-4 text-sm text-gray-950">
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
