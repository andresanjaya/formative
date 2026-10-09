'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { action } from '@/lib/client-api';
export function IntroComplete({nodeId}:{nodeId:string}){const router=useRouter();const [busy,setBusy]=useState(false),[error,setError]=useState('');return <><button className="button secondary" disabled={busy} onClick={async()=>{setBusy(true);try{await action({action:'completeIntro',nodeId});router.refresh();}catch(e){setError(e instanceof Error?e.message:'Could not save.');}finally{setBusy(false);}}}>{busy?'Saving…':'Mark introduction read'}</button>{error&&<p className="error" role="alert">{error}</p>}</>}
