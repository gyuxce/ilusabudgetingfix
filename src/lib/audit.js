import { supabase } from './supabase';

export async function logAudit(action, entityType, entityId, metadata = {}) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    await supabase.from('audit_logs').insert({
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      actor_id: user?.id || null,
      actor_email: user?.email || null,
      metadata,
    });
  } catch (error) {
    console.warn('Audit log failed:', error.message);
  }
}
