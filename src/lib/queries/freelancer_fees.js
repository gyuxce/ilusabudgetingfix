import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';

export function useFreelancerFees(filters = {}) {
  return useQuery({
    queryKey: ['freelancer_fees', filters],
    queryFn: async () => {
      let query = supabase
        .from('freelancer_fees')
        .select(`
          *,
          freelancer:freelancers(id, name),
          engagement:engagements(id, client:clients(id, company_name), service:services(id, name))
        `)
        .order('period_month', { ascending: false });

      if (filters.period_month) {
        query = query.eq('period_month', filters.period_month);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.freelancer_id) {
        query = query.eq('freelancer_id', filters.freelancer_id);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      let result = data;
      if (filters.engagement_id) {
        result = result.filter(fee => fee.engagement?.id === filters.engagement_id);
      }
      return result;
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
      return true;
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
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['freelancer_fees'] })
  });
}
