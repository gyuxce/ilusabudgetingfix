import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';

const CLIENT_ADVANCE_ENTITY = 'client_advance';

const toAdvanceRow = (log, clientsById) => {
  const metadata = log.metadata || {};

  return {
    id: log.id,
    client_id: metadata.client_id || null,
    title: metadata.title || '',
    category: metadata.category || 'other',
    amount: metadata.amount || 0,
    spend_date: metadata.spend_date || '',
    period_month: metadata.period_month || '',
    status: metadata.status || 'open',
    reimbursed_date: metadata.reimbursed_date || null,
    notes: metadata.notes || '',
    created_at: log.created_at,
    client: clientsById.get(metadata.client_id) || null,
  };
};

export function useClientAdvances() {
  return useQuery({
    queryKey: ['client_advances'],
    queryFn: async () => {
      const [{ data: logs, error: logsError }, { data: clients, error: clientsError }] = await Promise.all([
        supabase
          .from('audit_logs')
          .select('*')
          .eq('entity_type', CLIENT_ADVANCE_ENTITY)
          .order('created_at', { ascending: false }),
        supabase
          .from('clients')
          .select('id, company_name'),
      ]);

      if (logsError) throw new Error(logsError.message);
      if (clientsError) throw new Error(clientsError.message);

      const clientsById = new Map((clients || []).map((client) => [client.id, client]));
      return (logs || []).map((log) => toAdvanceRow(log, clientsById));
    },
  });
}

export function useCreateClientAdvance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (advanceData) => {
      const { data, error } = await supabase
        .from('audit_logs')
        .insert([{
          action: 'client_advance.created',
          entity_type: CLIENT_ADVANCE_ENTITY,
          entity_id: advanceData.client_id,
          metadata: advanceData,
        }])
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data.metadata;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client_advances'] }),
  });
}

export function useUpdateClientAdvance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updateData }) => {
      const { data, error } = await supabase
        .from('audit_logs')
        .update({
          action: 'client_advance.updated',
          entity_id: updateData.client_id,
          metadata: updateData,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data.metadata;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client_advances'] }),
  });
}

export function useDeleteClientAdvance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('audit_logs')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
      return true;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client_advances'] }),
  });
}
