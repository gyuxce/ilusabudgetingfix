import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';

export function useInvoices(filters = {}) {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select(`
          *, 
          engagement:engagements(
            id, 
            service_fee_per_month, 
            client:clients(id, company_name), 
            service:services(id, name)
          )
        `)
        .order('due_date', { ascending: false });

      if (filters.period_month) {
        query = query.eq('period_month', filters.period_month);
      }
      if (filters.status) {
        if (filters.status === 'overdue') {
          const today = new Date().toISOString().split('T')[0];
          query = query.eq('status', 'sent').lt('due_date', today);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      let result = data;
      // Client-side filter for client_id since it's nested
      if (filters.client_id) {
        result = result.filter(inv => inv.engagement?.client?.id === filters.client_id);
      }

      return result;
    }
  });
}

export function useInvoice(id) {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('invoices')
        .select('*, engagement:engagements(id, service_fee_per_month, client:clients(id, company_name), service:services(id, name))')
        .eq('id', id)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!id
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invoiceData) => {
      const { data, error } = await supabase
        .from('invoices')
        .insert([invoiceData])
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    }
  });
}

export function useCreateInvoicesBulk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invoicesArray) => {
      const { data, error } = await supabase
        .from('invoices')
        .insert(invoicesArray)
        .select();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    }
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updateData }) => {
      const { data, error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['invoice', data.id] });
      }
    }
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);
      if (error) throw new Error(error.message);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    }
  });
}

export function useMarkInvoicePaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('invoices')
        .update({ status: 'paid', paid_date: today })
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    }
  });
}

export function useMarkInvoiceUnpaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data, error } = await supabase
        .from('invoices')
        .update({ status: 'sent', paid_date: null })
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    }
  });
}
