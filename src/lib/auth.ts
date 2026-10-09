import { redirect } from 'next/navigation';
import { supabaseServer } from './supabase/server';

export async function userContext() {
  const db = await supabaseServer();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) redirect('/login');
  const { data: profile } = await db.from('profiles').select('*').eq('id', user.id).maybeSingle();
  return { db, user, profile };
}

export async function learnerContext() {
  const context = await userContext();
  if (!context.profile) redirect('/onboarding');
  return context;
}

export async function adminContext() {
  const context = await learnerContext();
  const { data, error } = await context.db.rpc('is_admin');
  if (error) throw new Error('Curator permissions could not be checked. Please try again.');
  if (!data) redirect('/admin/unauthorized');
  return context;
}
