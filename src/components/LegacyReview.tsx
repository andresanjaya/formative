import Link from 'next/link';
import { learnerContext } from '@/lib/auth';
import { Shell } from './Shell';
import { ReviewSession } from './ReviewSession';
import { Card, CardContent } from '@/components/ui/card';

export async function LegacyReview(){
 const {db,user,profile}=await learnerContext();
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:profile.learning_timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const {data:due}=await db.from('review_schedule').select('lesson_id,next_due_local_date,occurrence').eq('user_id',user.id).lte('next_due_local_date',today).order('next_due_local_date');
 const {data:lesson}=due?.length?await db.from('lessons').select('published_revision_id').eq('id',due[0].lesson_id).maybeSingle():{data:null};
 const {data:revision}=lesson?.published_revision_id?await db.from('lesson_revisions').select('review_public').eq('id',lesson.published_revision_id).maybeSingle():{data:null};
 return <Shell title="Review"><div className="tag">REMEMBER WHAT MATTERS</div><h1>Review</h1><p className="muted">Short recall helps you revisit ideas after a lesson.</p>{due?.length&&revision?<ReviewSession lessonId={due[0].lesson_id} questions={revision.review_public} occurrence={due[0].occurrence}/>:<Card className="space"><CardContent><h2>All caught up.</h2><p className="muted">There is no scheduled review due today. Completed lessons stay available to revisit.</p><Link href="/learn" className="button secondary space">Back to learning</Link></CardContent></Card>}</Shell>;
}
