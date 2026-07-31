import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { logAudit } from '../audit';

export function useInvoices() {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const [invoiceResult, itemResult] = await Promise.all([
        supabase
          .from('invoices_with_payments')
          .select(`
            *,
            engagement:engagements(
              id,
              service_fee_per_month,
              list_price_label,
              client:clients(id, company_name),
              service:services(id, name)
            )
          `)
          .order('due_date', { ascending: false }),
        supabase
          .from('invoice_items')
          .select(`
            id,
            invoice_id,
            engagement_id,
            description,
            amount,
            engagement:engagements(
              id,
              list_price_label,
              client:clients(id, company_name),
              service:services(id, name, service_type)
            )
          `)
          .order('created_at', { ascending: true }),
      ]);

      if (invoiceResult.error) throw new Error(invoiceResult.error.message);
      const itemsByInvoice = new Map();
      if (!itemResult.error) {
        (itemResult.data || []).forEach((item) => {
          const items = itemsByInvoice.get(item.invoice_id) || [];
          items.push(item);
          itemsByInvoice.set(item.invoice_id, items);
        });
      }

      return (invoiceResult.data || []).map((invoice) => ({
        ...invoice,
        invoice_items: itemsByInvoice.get(invoice.id) || [],
      }));
    }
  });
}

export function useInvoice(id) {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      if (!id) return null;
      const [invoiceResult, itemResult] = await Promise.all([
        supabase
          .from('invoices_with_payments')
          .select('*, engagement:engagements(id, service_fee_per_month, list_price_label, client:clients(id, company_name), service:services(id, name))')
          .eq('id', id)
          .single(),
        supabase
          .from('invoice_items')
          .select('id, invoice_id, engagement_id, description, amount, engagement:engagements(id, list_price_label, client:clients(id, company_name), service:services(id, name, service_type))')
          .eq('invoice_id', id)
          .order('created_at', { ascending: true }),
      ]);
      if (invoiceResult.error) throw new Error(invoiceResult.error.message);
      return { ...invoiceResult.data, invoice_items: itemResult.error ? [] : (itemResult.data || []) };
    },
    enabled: !!id
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ invoice_items: invoiceItems = [], ...invoiceData }) => {
      const { data, error } = await supabase
        .from('invoices')
        .insert([invoiceData])
        .select()
        .single();
      if (error) throw new Error(error.message);
      if (invoiceItems.length > 0) {
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(invoiceItems.map((item) => ({ ...item, invoice_id: data.id })));
        if (itemsError) {
          await supabase.from('invoices').delete().eq('id', data.id);
          throw new Error(itemsError.message);
        }
      }
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
      const invoiceRows = invoicesArray.map(({ invoice_items: _items, ...invoice }) => invoice);
      const { data, error } = await supabase
        .from('invoices')
        .insert(invoiceRows)
        .select();
      if (error) throw new Error(error.message);
      const itemRows = invoicesArray.flatMap((invoice, index) => (invoice.invoice_items || []).map((item) => ({
        ...item,
        invoice_id: data[index].id,
      })));
      if (itemRows.length > 0) {
        const { error: itemsError } = await supabase.from('invoice_items').insert(itemRows);
        if (itemsError) {
          await supabase.from('invoices').delete().in('id', (data || []).map((invoice) => invoice.id));
          throw new Error(itemsError.message);
        }
      }
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
