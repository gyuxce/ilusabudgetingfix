import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';

export function useAuditLogs(limit = 100) {
  return useQuery({
    queryKey: ['audit_logs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return data;
    }
  });
}
