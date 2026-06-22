import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { logAudit } from '../audit';

export function useInvoices() {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices_with_payments')
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

      if (error) throw new Error(error.message);
      return data;
    }
  });
}

export function useInvoice(id) {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('invoices_with_payments')
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
      await logAudit('invoice.created', 'invoice', data.id, {
        amount: data.amount,
        billing_month: data.billing_month,
        service_period: data.period_month,
        status: data.status,
      });
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
      await Promise.all((data || []).map((invoice) => logAudit('invoice.created_bulk', 'invoice', invoice.id, {
        amount: invoice.amount,
        billing_month: invoice.billing_month,
        service_period: invoice.period_month,
        status: invoice.status,
      })));
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
      await logAudit('invoice.updated', 'invoice', data.id, updateData);
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
      await logAudit('invoice.deleted', 'invoice', id);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    }
  });
}

export function useSetInvoiceStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }) => {
      const { data, error } = await supabase
        .from('invoices')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      await logAudit(`invoice.${status}`, 'invoice', id, { status });
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      if (data) queryClient.invalidateQueries({ queryKey: ['invoice', data.id] });
    }
  });
}
