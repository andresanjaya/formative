'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
export function LoginForm() {
  const router=useRouter();
  const [mode,setMode]=useState<'login'|'signup'>('login');
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  async function submit(e:React.FormEvent) { e.preventDefault();setError('');setMessage('');setBusy(true);try {const db=supabaseBrowser(); const result=mode==='login'?await db.auth.signInWithPassword({email,password}):await db.auth.signUp({email,password,options:{emailRedirectTo:`${location.origin}/auth/callback`}});if(result.error) throw result.error;if(mode==='signup'&&!result.data.session){setMessage('Check your email to confirm your account, then sign in.');} else {router.push('/learn');router.refresh();}}catch(e){setError(e instanceof Error?e.message:'Sign in failed');}finally{setBusy(false);}}
  return <Card className="space"><CardContent><form onSubmit={submit}><FieldGroup>
    <Field><FieldLabel htmlFor="email">Email</FieldLabel><Input id="email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></Field>
    <Field><FieldLabel htmlFor="password">Password</FieldLabel><Input id="password" type="password" minLength={6} autoComplete={mode==='login'?'current-password':'new-password'} required value={password} onChange={e=>setPassword(e.target.value)}/></Field>
    {error&&<div role="alert" className="error">{error}</div>}{message&&<div role="status" className="feedback">{message}</div>}
    <Button className="button" type="submit" disabled={busy}>{busy?'Please wait…':mode==='login'?'Sign in':'Create account'}</Button>
  </FieldGroup></form><Button variant="ghost" className="textbtn space" onClick={()=>{setMode(mode==='login'?'signup':'login');setError('');}}>{mode==='login'?'New here? Create an account':'Already have an account? Sign in'}</Button></CardContent></Card>;
}
