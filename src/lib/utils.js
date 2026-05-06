import { format, subMonths, startOfMonth } from 'date-fns';

export function getEffectiveStatus(invoice) {
  if (invoice.status === 'paid') return 'paid';
  if (invoice.status === 'sent') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(invoice.due_date);
    if (due < today) return 'overdue';
    return 'sent';
  }
  return invoice.status; // 'draft'
}

export function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatPeriod(periodKey) {
  if (!periodKey) return '—';
  const [y, m] = periodKey.split('-');
  return format(new Date(parseInt(y), parseInt(m) - 1, 1), 'MMM yyyy');
}

export function lastNMonths(n) {
  const options = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const d = subMonths(startOfMonth(today), i);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = format(d, 'MMMM yyyy');
    options.push({ value, label });
  }
  return options;
}
