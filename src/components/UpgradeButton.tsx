'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { action } from '@/lib/client-api';
export function UpgradeButton(){const router=useRouter();const [busy,setBusy]=useState(false),[error,setError]=useState('');return <div className="card hero space"><div className="tag">FULL UNIT AVAILABLE</div><h2>Continue Think in Outcomes</h2><p>Your Product Vision completion and review history will stay intact. The full six-item unit will become your progress total.</p><button className="button" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await action({action:'upgradeCurriculum'});router.refresh();}catch(e){setError(e instanceof Error?e.message:'Could not update your path.');}finally{setBusy(false);}}}>{busy?'Updating…':'Open the full unit'}</button>{error&&<p className="error" role="alert">{error}</p>}</div>}
