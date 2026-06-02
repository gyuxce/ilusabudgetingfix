import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { logAudit } from '../audit';

export function useCompanySettings() {
  return useQuery({
    queryKey: ['company_settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    }
  });
}

export function useUpdateCompanySettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings) => {
      const { data, error } = await supabase
        .from('company_settings')
        .upsert({ id: 1, ...settings, updated_at: new Date().toISOString() })
        .select()
        .single();
      if (error) throw new Error(error.message);
      await logAudit('settings.updated', 'company_settings', null, settings);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['company_settings'] })
  });
}
