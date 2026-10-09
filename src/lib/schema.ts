import type { supabaseServer } from './supabase/server';

type Database = Awaited<ReturnType<typeof supabaseServer>>;

export function isMissingCurriculum(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const value = error as { code?: string; message?: string };
  return value.code === 'PGRST205' && Boolean(value.message?.includes('curriculum_nodes'));
}

export async function curriculumAvailable(db: Database): Promise<boolean> {
  const { error } = await db.from('curriculum_nodes').select('id').limit(1);
  if (isMissingCurriculum(error)) return false;
  if (error) throw error;
  return true;
}
