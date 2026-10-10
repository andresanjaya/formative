'use client';
import { useState } from 'react';
import { action } from '@/lib/client-api';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { NativeSelect } from '@/components/ui/native-select';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
export function OnboardingForm(){const router=useRouter();const [timezone,setTimezone]=useState('Asia/Makassar'),[error,setError]=useState(''),[busy,setBusy]=useState(false);async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{await action({action:'bootstrap',timezone});router.push('/learn');router.refresh();}catch(e){setError(e instanceof Error?e.message:'Could not save');setBusy(false);}}return <Card className="space"><form onSubmit={submit}><CardContent><FieldGroup><Field><FieldLabel htmlFor="timezone">Learning timezone</FieldLabel><NativeSelect id="timezone" value={timezone} onChange={e=>setTimezone(e.target.value)}><option value="Asia/Makassar">Asia/Makassar (UTC+8)</option><option value="Asia/Jakarta">Asia/Jakarta (UTC+7)</option><option value="Asia/Jayapura">Asia/Jayapura (UTC+9)</option><option value="UTC">UTC</option></NativeSelect><FieldDescription>Your first track is Product Design Foundations.</FieldDescription></Field>{error&&<div className="error" role="alert">{error}</div>}<Button className="button" type="submit" disabled={busy}>{busy?'Saving…':'Start learning →'}</Button></FieldGroup></CardContent></form></Card>}
