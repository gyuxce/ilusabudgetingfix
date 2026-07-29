import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';

const CLIENT_ADVANCE_ENTITY = 'client_advance';
const CLIENT_EXPENSE_ENTITY = 'client_expense';
const COMPANY_EXPENSE_ENTITY = 'company_expense';

const toExpenseRow = (log, clientsById) => {
  const metadata = log.metadata || {};
  const isAdvance = log.entity_type === CLIENT_ADVANCE_ENTITY;

  return {
    id: log.id,
    entity_type: log.entity_type,
    client_id: metadata.client_id || null,
    title: metadata.title || '',
    category: metadata.category || 'other',
    amount: metadata.amount || 0,
    spend_date: metadata.spend_date || '',
    period_month: metadata.period_month || '',
    funding_source: metadata.funding_source || (isAdvance ? 'outside_budget' : 'within_budget'),
    status: metadata.status || (isAdvance ? 'open' : 'paid'),
    reimbursed_date: metadata.reimbursed_date || null,
    notes: metadata.notes || '',
    created_at: log.created_at,
    client: clientsById.get(metadata.client_id) || null,
  };
};

const loadClientExpenseLogs = async (entityTypes) => {
  const [{ data: logs, error: logsError }, { data: clients, error: clientsError }] = await Promise.all([
    supabase
      .from('audit_logs')
      .select('*')
      .in('entity_type', entityTypes)
      .order('created_at', { ascending: false }),
    supabase
      .from('clients')
      .select('id, company_name'),
  ]);

  if (logsError) throw new Error(logsError.message);
  if (clientsError) throw new Error(clientsError.message);

  const clientsById = new Map((clients || []).map((client) => [client.id, client]));
  return (logs || []).map((log) => toExpenseRow(log, clientsById));
};

export function useClientAdvances() {
  return useQuery({
    queryKey: ['client_advances'],
    queryFn: () => loadClientExpenseLogs([CLIENT_ADVANCE_ENTITY]),
  });
}

export function useClientExpenses() {
  return useQuery({
    queryKey: ['client_expenses'],
    queryFn: () => loadClientExpenseLogs([CLIENT_ADVANCE_ENTITY, CLIENT_EXPENSE_ENTITY]),
  });
}

export function useCompanyExpenses() {
  return useQuery({
    queryKey: ['company_expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entity_type', COMPANY_EXPENSE_ENTITY)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return (data || []).map((log) => ({
        id: log.id,
        entity_type: log.entity_type,
        title: log.metadata?.title || '',
        category: log.metadata?.category || 'other',
        amount: log.metadata?.amount || 0,
        spend_date: log.metadata?.spend_date || '',
        period_month: log.metadata?.period_month || '',
        status: 'paid',
        notes: log.metadata?.notes || '',
        created_at: log.created_at,
      }));
    },
  });
}

export function useCreateClientAdvance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (advanceData) => {
      const metadata = { ...advanceData, funding_source: 'outside_budget', status: 'open' };
      const { data, error } = await supabase
        .from('audit_logs')
        .insert([{
          action: 'client_advance.created',
          entity_type: CLIENT_ADVANCE_ENTITY,
          entity_id: advanceData.client_id,
          metadata,
        }])
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data.metadata;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client_advances'] });
      queryClient.invalidateQueries({ queryKey: ['client_expenses'] });
    },
  });
}

export function useCreateClientExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expenseData) => {
      const isOutsideBudget = expenseData.funding_source === 'outside_budget';
      const entityType = isOutsideBudget ? CLIENT_ADVANCE_ENTITY : CLIENT_EXPENSE_ENTITY;
      const metadata = {
        ...expenseData,
        status: isOutsideBudget ? 'open' : 'paid',
        reimbursed_date: null,
      };
      const { data, error } = await supabase
        .from('audit_logs')
        .insert([{
          action: `${entityType}.created`,
          entity_type: entityType,
          entity_id: expenseData.client_id,
          metadata,
        }])
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data.metadata;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client_advances'] });
      queryClient.invalidateQueries({ queryKey: ['client_expenses'] });
    },
  });
}

export function useCreateCompanyExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expenseData) => {
      const { data, error } = await supabase
        .from('audit_logs')
        .insert([{
          action: 'company_expense.created',
          entity_type: COMPANY_EXPENSE_ENTITY,
          metadata: expenseData,
        }])
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data.metadata;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['company_expenses'] }),
  });
}

export function useUpdateClientAdvance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updateData }) => {
      const { data, error } = await supabase
        .from('audit_logs')
        .update({
          action: 'client_advance.updated',
          entity_id: updateData.client_id,
          metadata: { ...updateData, funding_source: 'outside_budget' },
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data.metadata;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client_advances'] });
      queryClient.invalidateQueries({ queryKey: ['client_expenses'] });
    },
  });
}

export function useDeleteClientAdvance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('audit_logs')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client_advances'] });
      queryClient.invalidateQueries({ queryKey: ['client_expenses'] });
    },
  });
}
