import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';

export function useInvoicePayments(invoiceId) {
  return useQuery({
    queryKey: ['invoice_payments', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return [];
      const { data, error } = await supabase
        .from('invoice_payments')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!invoiceId,
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payment) => {
      const { data, error } = await supabase
        .from('invoice_payments')
        .insert(payment)
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['invoices'] }); // refresh main list
      qc.invalidateQueries({ queryKey: ['invoice_payments', variables.invoice_id] });
    }
  });
}

export function useDeletePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, invoice_id }) => {
      const { error } = await supabase.from('invoice_payments').delete().eq('id', id);
      if (error) throw error;
      return { id, invoice_id };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['invoice_payments', data.invoice_id] });
    }
  });
}
