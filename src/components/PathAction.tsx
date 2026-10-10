'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { action } from '@/lib/client-api';

export function PathAction({domainId,slug,label}:{domainId:string;slug:string;label:string}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  return <span className="path-action">
    <button className="button" disabled={busy} onClick={async()=>{
      setBusy(true);setError('');
      try { await action({action:'selectPath',domainId});router.push(`/learn/${slug}`);router.refresh(); }
      catch(e){setError(e instanceof Error?e.message:'Could not save your path. Try again.');setBusy(false);}
    }}>{busy?'Saving…':label}</button>
    {error&&<span className="error" role="alert">{error}</span>}
  </span>;
}
