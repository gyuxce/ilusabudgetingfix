import { format } from 'date-fns';
import { Activity } from 'lucide-react';
import { useAuditLogs } from '../lib/queries/audit_logs';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

const actionLabels = {
  'invoice.created': 'Invoice created',
  'invoice.created_bulk': 'Invoice generated',
  'invoice.updated': 'Invoice updated',
  'invoice.deleted': 'Invoice deleted',
  'invoice.approved': 'Invoice approved',
  'invoice.sent': 'Invoice sent',
  'payment.recorded': 'Payment recorded',
  'payment.deleted': 'Payment deleted',
  'fee.created': 'Fee created',
  'fee.updated': 'Fee updated',
  'fee.deleted': 'Fee deleted',
  'fee.approved': 'Fee approved',
  'fee.paid': 'Fee paid',
  'fee.reopened': 'Fee reopened',
  'settings.updated': 'Settings updated',
};

export default function ActivityLog() {
  const { data: logs, isLoading } = useAuditLogs(120);

  if (isLoading) {
    return <div className="h-80 animate-pulse rounded-xl bg-gray-200" />;
  }

  return (
    <>
      <PageHeader title="Activity Log" description="Recent invoice, payment, fee, and settings activity" />

      {!logs?.length ? (
        <EmptyState icon={Activity} title="No activity yet" description="Actions you take in invoices and fees will appear here." />
      ) : (
        <Card>
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="grid gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-gray-950">{actionLabels[log.action] || log.action}</p>
                    <Badge variant="neutral">{log.entity_type}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {log.actor_email || 'System'} - {log.created_at ? format(new Date(log.created_at), 'dd MMM yyyy, HH:mm') : '-'}
                  </p>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <p className="mt-2 truncate text-xs text-gray-500" title={JSON.stringify(log.metadata)}>
                      {JSON.stringify(log.metadata)}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-400">{log.entity_id?.slice(0, 8) || '-'}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
