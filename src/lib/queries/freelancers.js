import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';

export function useFreelancers() {
  return useQuery({
    queryKey: ['freelancers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('freelancers')
        .select('*')
        .order('name');
      if (error) throw new Error(error.message);
      return data;
    }
  });
}

export function useFreelancer(id) {
  return useQuery({
    queryKey: ['freelancer', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('freelancers')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!id
  });
}

export function useCreateFreelancer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (freelancerData) => {
      const { data, error } = await supabase
        .from('freelancers')
        .insert([freelancerData])
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['freelancers'] });
    }
  });
}

export function useUpdateFreelancer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updateData }) => {
      const { data, error } = await supabase
        .from('freelancers')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['freelancers'] });
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['freelancer', data.id] });
      }
    }
  });
}

export function useDeleteFreelancer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('freelancers')
        .delete()
        .eq('id', id);
      if (error) throw new Error(error.message);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['freelancers'] });
    }
  });
}
