import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { logAudit } from '../audit';

export function useClientAdvances() {
  return useQuery({
    queryKey: ['client_advances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_advances')
        .select('*, client:clients(id, company_name)')
        .order('spend_date', { ascending: false });

      if (error) throw new Error(error.message);
      return data;
    },
  });
}

export function useCreateClientAdvance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (advanceData) => {
      const { data, error } = await supabase
        .from('client_advances')
        .insert([advanceData])
        .select()
        .single();

      if (error) throw new Error(error.message);
      await logAudit('client_advance.created', 'client_advance', data.id, {
        client_id: data.client_id,
        amount: data.amount,
        status: data.status,
      });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client_advances'] }),
  });
}

export function useUpdateClientAdvance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updateData }) => {
      const { data, error } = await supabase
        .from('client_advances')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      await logAudit('client_advance.updated', 'client_advance', data.id, updateData);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client_advances'] }),
  });
}

export function useDeleteClientAdvance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('client_advances')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
      await logAudit('client_advance.deleted', 'client_advance', id);
      return true;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client_advances'] }),
  });
}
