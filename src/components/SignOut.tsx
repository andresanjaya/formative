'use client';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { useRouter } from 'next/navigation';
export function SignOut() { const router=useRouter(); return <button className="nav-link plain" onClick={async()=>{ Object.keys(localStorage).filter(k=>k.startsWith('formative:')).forEach(k=>localStorage.removeItem(k)); await supabaseBrowser().auth.signOut(); router.push('/login');router.refresh(); }}>Sign out</button>; }
