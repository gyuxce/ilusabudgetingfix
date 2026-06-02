import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { logAudit } from '../audit';

export function useFreelancerFees() {
  return useQuery({
    queryKey: ['freelancer_fees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('freelancer_fees')
        .select(`
          *,
          freelancer:freelancers(id, name),
          engagement:engagements(id, client:clients(id, company_name), service:services(id, name))
        `)
        .order('period_month', { ascending: false });

      if (error) throw new Error(error.message);
      await logAudit('fee.created', 'freelancer_fee', data.id, { amount: data.calculated_fee, status: data.status });
      return data;
    }
  });
}

export function useFreelancerFee(id) {
  return useQuery({
    queryKey: ['freelancer_fee', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('freelancer_fees')
        .select('*, freelancer:freelancers(id, name), engagement:engagements(id, client:clients(id, company_name), service:services(id, name))')
        .eq('id', id)
        .single();
      if (error) throw new Error(error.message);
      await logAudit('fee.updated', 'freelancer_fee', data.id, updateData);
      return data;
    },
    enabled: !!id
  });
}

export function useCreateFreelancerFee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (feeData) => {
      const { data, error } = await supabase
        .from('freelancer_fees')
        .insert([feeData])
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['freelancer_fees'] })
  });
}

export function useUpdateFreelancerFee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updateData }) => {
      const { data, error } = await supabase
        .from('freelancer_fees')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['freelancer_fees'] });
      if (data) Object.assign({}, data);
    }
  });
}

export function useDeleteFreelancerFee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('freelancer_fees').delete().eq('id', id);
      if (error) throw new Error(error.message);
      await logAudit('fee.deleted', 'freelancer_fee', id);
      return true;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['freelancer_fees'] })
  });
}

export function useApproveFee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data, error } = await supabase.from('freelancer_fees').update({ status: 'approved', paid_date: null }).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      await logAudit('fee.approved', 'freelancer_fee', id);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['freelancer_fees'] })
  });
}

export function useMarkFeePaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase.from('freelancer_fees').update({ status: 'paid', paid_date: today }).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      await logAudit('fee.paid', 'freelancer_fee', id, { paid_date: today });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['freelancer_fees'] })
  });
}

export function useMarkFeeUnpaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data, error } = await supabase.from('freelancer_fees').update({ status: 'pending', paid_date: null }).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      await logAudit('fee.reopened', 'freelancer_fee', id);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['freelancer_fees'] })
  });
}
