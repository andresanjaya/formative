import Link from 'next/link';
import { learnerContext } from '@/lib/auth';
import { Shell } from '@/components/Shell';
import { ReviewQueue } from '@/components/ReviewQueue';
import { curriculumAvailable } from '@/lib/schema';
import { LegacyReview } from '@/components/LegacyReview';
export default async function Review(){
 const {db}=await learnerContext();
 if(!await curriculumAvailable(db))return <LegacyReview/>;
 const {data,error}=await db.rpc('review_queue');
 if(error)throw error;
 return <Shell title="Review"><div className="tag">REMEMBER WHAT MATTERS</div><h1>Daily review</h1><p className="muted">Review a few useful decisions at a time. Corrections are unlimited; your first answer is kept separately.</p>
  {data.items?.length?<ReviewQueue items={data.items} due={data.due} timezone={data.timezone}/>:<div className="card space"><h2>All caught up.</h2><p className="muted">{data.next_due?'Your next review is scheduled for '+data.next_due+' in '+data.timezone+'.':'Complete a lesson to schedule your first review.'}</p><Link href="/learn" className="button secondary space">Back to learning</Link></div>}
 </Shell>;
}

