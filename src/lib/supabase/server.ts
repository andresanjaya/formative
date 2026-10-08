import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

export async function supabaseServer() {
  const jar = await cookies();
  if (!configured) throw new Error('Supabase environment variables are missing');
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll() { return jar.getAll(); },
      setAll(items) { try { items.forEach(({ name, value, options }) => jar.set(name, value, options)); } catch { /* Server components cannot set cookies; proxy refreshes them. */ } }
    }
  });
}
