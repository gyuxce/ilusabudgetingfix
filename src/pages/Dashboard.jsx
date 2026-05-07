import { useMemo, useState } from 'react';
import { differenceInDays } from 'date-fns';
import { Link } from 'react-router-dom';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import { useInvoices } from '../lib/queries/invoices';
import { useFreelancerFees } from '../lib/queries/freelancer_fees';
import { useEngagements } from '../lib/queries/engagements';
import { currentMonthKey, formatPeriod, lastNMonths } from '../lib/utils';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';

export default function Dashboard() {
  const currentMonth = currentMonthKey();
  const [periodFilter, setPeriodFilter] = useState('all');

  const { data: allInvoices, isLoading: invoicesLoading } = useInvoices();
  const { data: allFees, isLoading: feesLoading } = useFreelancerFees();
  const { data: allEngagements, isLoading: engLoading } = useEngagements();

  const formatCurrency = (val) => new Intl.NumberFormat('id-ID').format(val || 0);

  const filteredInvoices = useMemo(() => {
    if (!allInvoices) return [];
    if (periodFilter === 'all') return allInvoices;
    return allInvoices.filter(inv => inv.period_month === periodFilter);
  }, [allInvoices, periodFilter]);

  const filteredFees = useMemo(() => {
    if (!allFees) return [];
    if (periodFilter === 'all') return allFees;
    return allFees.filter(fee => fee.period_month === periodFilter);
  }, [allFees, periodFilter]);

  const {
    revenueIssued,
    revenueIssuedCount,
    revenueReceived,
    revenueReceivedCount,
    outstandingAmount,
    outstandingCount,
    outstandingOverdueCount,
    feesTotalAmount,
    feesTotalCount,
    feesPaidAmount,
    feesPendingAmount,
    profitCash,
    allOverdueInvoices,
    totalOverdueAmount,
    gap,
    activeEngagements,
    distinctClientsSet,
    topOverdue,
    topPendingFees,
    netCashflow
  } = useMemo(() => {
    let _revenueIssued = 0;
    let _revenueIssuedCount = filteredInvoices.length;
    let _revenueReceived = 0;
    let _revenueReceivedCount = 0;
    let _outstandingAmount = 0;
    let _outstandingCount = 0;
    let _outstandingOverdueCount = 0;

    filteredInvoices.forEach(inv => {
      const amount = inv.amount || 0;
      _revenueIssued += amount;
      
      const totalPaid = inv.total_paid || 0;
      if (totalPaid > 0) {
        _revenueReceived += totalPaid;
        if (inv.computed_status === 'paid') {
          _revenueReceivedCount++;
        }
      }

      if (inv.computed_status === 'sent' || inv.computed_status === 'partial') {
        _outstandingAmount += inv.balance || 0;
        _outstandingCount++;
      } else if (inv.computed_status === 'overdue') {
        _outstandingAmount += inv.balance || 0;
        _outstandingCount++;
        _outstandingOverdueCount++;
      }
    });

    let _feesTotalAmount = 0;
    let _feesTotalCount = filteredFees.length;
    let _feesPaidAmount = 0;
    let _feesPendingAmount = 0;

    filteredFees.forEach(fee => {
      const amount = fee.calculated_fee || 0;
      _feesTotalAmount += amount;
      if (fee.status === 'paid') _feesPaidAmount += amount;
      else _feesPendingAmount += amount;
    });

    let cashIn = 0;
    let cashOut = 0;
    let _allOverdueInvoices = [];
    let _totalOverdueAmount = 0;

    if (allInvoices) {
      allInvoices.forEach(inv => {
        cashIn += (inv.total_paid || 0);

        if (inv.computed_status === 'overdue') {
          _allOverdueInvoices.push(inv);
          _totalOverdueAmount += (inv.balance || 0);
        }
      });
    }

    if (allFees) {
      allFees.forEach(fee => {
        if (fee.status === 'paid') cashOut += (fee.calculated_fee || 0);
      });
    }

    const _netCashflow = { cashIn, cashOut, net: cashIn - cashOut };
    const _profitCash = _revenueReceived - _feesPaidAmount;

    _allOverdueInvoices.sort((a,b) => new Date(a.due_date) - new Date(b.due_date));
    const _topOverdue = _allOverdueInvoices.slice(0, 5);

    const _pendingFeesAll = allFees?.filter(f => f.status === 'pending').sort((a,b) => a.period_month.localeCompare(b.period_month)) || [];
    const _topPendingFees = _pendingFeesAll.slice(0, 5);

    const _activeEngagements = allEngagements?.filter(e => e.status === 'ongoing') || [];
    const _distinctClientsSet = new Set(_activeEngagements.map(e => e.client_id));

    return {
      revenueIssued: _revenueIssued,
      revenueIssuedCount: _revenueIssuedCount,
      revenueReceived: _revenueReceived,
      revenueReceivedCount: _revenueReceivedCount,
      outstandingAmount: _outstandingAmount,
      outstandingCount: _outstandingCount,
      outstandingOverdueCount: _outstandingOverdueCount,
      feesTotalAmount: _feesTotalAmount,
      feesTotalCount: _feesTotalCount,
      feesPaidAmount: _feesPaidAmount,
      feesPendingAmount: _feesPendingAmount,
      profitCash: _profitCash,
      allOverdueInvoices: _allOverdueInvoices,
      totalOverdueAmount: _totalOverdueAmount,
      gap: _feesPendingAmount - _revenueReceived,
      activeEngagements: _activeEngagements,
      distinctClientsSet: _distinctClientsSet,
      topOverdue: _topOverdue,
      topPendingFees: _topPendingFees,
      netCashflow: _netCashflow
    };
  }, [allInvoices, allFees, allEngagements, filteredInvoices, filteredFees]);

  if (invoicesLoading || feesLoading || engLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="h-28 bg-gray-200 rounded-lg"></div>
          <div className="h-28 bg-gray-200 rounded-lg"></div>
          <div className="h-28 bg-gray-200 rounded-lg"></div>
          <div className="h-28 bg-gray-200 rounded-lg"></div>
        </div>
        <div className="h-40 bg-gray-200 rounded-lg mb-6"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-64 bg-gray-200 rounded-lg"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  let alertElement = null;
  if (feesPendingAmount > revenueReceived && feesPendingAmount > 0) {
    alertElement = (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 mb-6">
        <AlertTriangle className="text-red-600 mt-0.5 shrink-0" size={20} />
        <div>
          <h3 className="text-sm font-semibold text-red-900">Cashflow Gap Warning</h3>
          <p className="text-sm text-red-700 mt-1">
            You have Rp {formatCurrency(feesPendingAmount)} in unpaid freelancer fees but only Rp {formatCurrency(revenueReceived)} received from clients {periodFilter === 'all' ? 'All Time' : formatPeriod(periodFilter)}. Gap: Rp {formatCurrency(gap)}.
          </p>
        </div>
      </div>
    );
  } else if (allOverdueInvoices.length > 0) {
    alertElement = (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3 mb-6">
        <AlertCircle className="text-amber-600 mt-0.5 shrink-0" size={20} />
        <div>
          <h3 className="text-sm font-semibold text-amber-900">Action Needed</h3>
          <p className="text-sm text-amber-800 mt-1">
            {allOverdueInvoices.length} {allOverdueInvoices.length === 1 ? 'invoice is' : 'invoices are'} overdue. Follow up with clients to collect Rp {formatCurrency(totalOverdueAmount)}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader 
        title="Dashboard" 
        description={periodFilter === 'all' ? "Cumulative overview across all months" : `Overview for ${formatPeriod(periodFilter)}`}
        action={
          <Select 
            value={periodFilter} 
            onChange={e => setPeriodFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Time' },
              ...lastNMonths(24)
            ]}
            className="w-48 bg-white"
          />
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">REVENUE ISSUED</p>
          <div className="text-2xl font-semibold tracking-tight text-gray-900 leading-tight">Rp {formatCurrency(revenueIssued)}</div>
          <p className="text-xs text-gray-500 mt-1">{revenueIssuedCount} invoices</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">REVENUE RECEIVED</p>
          <div className="text-2xl font-semibold tracking-tight text-emerald-600 leading-tight">Rp {formatCurrency(revenueReceived)}</div>
          <p className="text-xs text-gray-500 mt-1">{revenueReceivedCount} paid</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">OUTSTANDING</p>
          <div className={`text-2xl font-semibold tracking-tight leading-tight ${outstandingOverdueCount > 0 ? 'text-amber-600' : (outstandingAmount > 0 ? 'text-amber-600' : 'text-gray-400')}`}>
            Rp {formatCurrency(outstandingAmount)}
          </div>
          <p className="text-xs text-gray-500 mt-1">{outstandingCount} unpaid, {outstandingOverdueCount} overdue</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">PROFIT (CASH)</p>
          <div className={`text-2xl font-semibold tracking-tight leading-tight ${profitCash > 0 ? 'text-emerald-600' : (profitCash < 0 ? 'text-red-600' : 'text-gray-900')}`}>
            {profitCash < 0 ? '-' : ''}Rp {formatCurrency(Math.abs(profitCash))}
          </div>
          <p className="text-xs text-gray-500 mt-1 flex flex-col sm:flex-row gap-1">Received - Paid fees <span className="italic">(within selected period)</span></p>
        </div>
      </div>

      <div className="bg-gradient-to-b from-emerald-50 to-white border border-emerald-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          💰 Net Cashflow (All Time)
        </h2>
        <div className="border-t border-emerald-100 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-emerald-100/50">
          <div className="px-4 py-2 text-center md:text-left">
            <p className="text-xs text-gray-500 font-semibold tracking-wide uppercase mb-1">CASH IN</p>
            <p className="text-2xl font-bold text-emerald-600">Rp {formatCurrency(netCashflow.cashIn)}</p>
            <p className="text-xs text-gray-500 mt-2">All paid invoices</p>
          </div>
          <div className="px-4 py-2 text-center md:text-left">
            <p className="text-xs text-gray-500 font-semibold tracking-wide uppercase mb-1">CASH OUT</p>
            <p className="text-2xl font-bold text-red-600">Rp {formatCurrency(netCashflow.cashOut)}</p>
            <p className="text-xs text-gray-500 mt-2">All paid fees</p>
          </div>
          <div className="px-4 py-2 text-center md:text-right">
            <p className="text-xs text-gray-500 font-semibold tracking-wide uppercase mb-1">NET POSITION</p>
            <p className={`text-3xl font-extrabold ${netCashflow.net > 0 ? 'text-emerald-700' : (netCashflow.net < 0 ? 'text-red-600' : 'text-gray-700')}`}>
              {netCashflow.net < 0 ? '-' : ''}Rp {formatCurrency(Math.abs(netCashflow.net))}
            </p>
            <p className="text-xs text-gray-500 mt-2">Money in pocket</p>
          </div>
        </div>
        <p className="text-xs text-center text-emerald-700/80 mt-6 pt-4 border-t border-emerald-100/50">
          This is your real cash position — independent of the filter above
        </p>
      </div>

      {alertElement}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card title={`Freelancer Fees — ${periodFilter === 'all' ? 'All Time' : formatPeriod(periodFilter)}`}>
          <div className="flex flex-wrap gap-6 pt-1">
            <div>
              <p className="text-xs text-gray-500 mb-1">Total ({feesTotalCount})</p>
              <p className="font-medium text-gray-900">Rp {formatCurrency(feesTotalAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Paid</p>
              <p className="font-medium text-emerald-600">Rp {formatCurrency(feesPaidAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Pending</p>
              <p className="font-medium text-amber-600">Rp {formatCurrency(feesPendingAmount)}</p>
            </div>
          </div>
        </Card>

        <Card title="Active Engagements">
          <div className="pt-1">
            <div className="text-3xl font-semibold tracking-tight text-gray-900">{activeEngagements.length}</div>
            <p className="text-sm text-gray-500 mt-1">{distinctClientsSet.size} clients</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col min-h-[300px]">
          <div className="p-5 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-900">Overdue Invoices</h3>
            <Link to="/invoices?status=overdue" className="text-xs font-medium text-emerald-600 hover:text-emerald-700">View All</Link>
          </div>
          <div className="flex-1">
            {topOverdue.length === 0 ? (
              <div className="text-center py-10 text-sm text-gray-500">No overdue invoices 🎉</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {topOverdue.map(inv => (
                  <div key={inv.id} className="px-5 py-3 flex justify-between items-center hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{inv.engagement?.client?.company_name}</p>
                      <p className="text-xs text-gray-500">{inv.engagement?.service?.name} · {formatPeriod(inv.period_month)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-red-600">Rp {formatCurrency(inv.balance)} outstanding</p>
                      <p className="text-xs text-red-600 bg-red-50 inline-block px-1.5 py-0.5 rounded mt-0.5">
                        {differenceInDays(new Date(), new Date(inv.due_date))} days overdue
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col min-h-[300px]">
          <div className="p-5 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-900">Pending Fees</h3>
            <Link to="/fees?status=pending" className="text-xs font-medium text-emerald-600 hover:text-emerald-700">View All</Link>
          </div>
          <div className="flex-1">
            {topPendingFees.length === 0 ? (
              <div className="text-center py-10 text-sm text-gray-500">No pending fees 🎉</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {topPendingFees.map(fee => (
                  <div key={fee.id} className="px-5 py-3 flex justify-between items-center hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{fee.freelancer?.name}</p>
                      <p className="text-xs text-gray-500">{fee.engagement?.client?.company_name} · {fee.engagement?.service?.name} · {formatPeriod(fee.period_month)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-amber-700">Rp {formatCurrency(fee.calculated_fee)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
