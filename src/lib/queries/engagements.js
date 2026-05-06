import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';

export function useEngagements() {
  return useQuery({
    queryKey: ['engagements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('engagements')
        .select('*, client:clients(id, company_name), service:services(id, name, service_type, fee_type)')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    }
  });
}

export function useEngagement(id) {
  return useQuery({
    queryKey: ['engagement', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('engagements')
        .select('*, client:clients(id, company_name), service:services(id, name, service_type, fee_type)')
        .eq('id', id)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!id
  });
}

export function useCreateEngagement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (engagementData) => {
      const { data, error } = await supabase
        .from('engagements')
        .insert([engagementData])
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engagements'] });
    }
  });
}

export function useUpdateEngagement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updateData }) => {
      const { data, error } = await supabase
        .from('engagements')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['engagements'] });
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['engagement', data.id] });
      }
    }
  });
}

export function useDeleteEngagement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('engagements')
        .delete()
        .eq('id', id);
      if (error) throw new Error(error.message);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engagements'] });
    }
  });
}
