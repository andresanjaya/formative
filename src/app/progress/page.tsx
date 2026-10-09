import Link from 'next/link';
import { learnerContext } from '@/lib/auth';
import { Shell } from '@/components/Shell';
import { curriculumAvailable } from '@/lib/schema';
import { PILOT_LESSON_ID } from '@/lib/data';
export default async function Progress(){
 const {db,user,profile}=await learnerContext();
 const schemaReady=await curriculumAvailable(db);
 const [{data:receipt},{data:days},{data:completions},{data:artifacts},{data:weak}]=await Promise.all([
  db.rpc('progress_receipt'),
  db.from('daily_activity').select('local_date').eq('user_id',user.id).order('local_date',{ascending:false}).limit(28),
  db.from('lesson_completions').select('lesson_id,completed_at').eq('user_id',user.id),
  schemaReady?db.from('checkpoint_submissions').select('id,project_name,revision_number,submitted_at').eq('user_id',user.id).order('submitted_at',{ascending:false}).limit(3):Promise.resolve({data:[]}),
  schemaReady?db.rpc('weak_topics'):Promise.resolve({data:[]})
 ]);
 const {data:lessons}=schemaReady?await db.from('curriculum_nodes').select('id,title').eq('status','published'):{data:[{id:PILOT_LESSON_ID,title:'Product Vision'}]};
 const names=new Map((lessons||[]).map(n=>[n.id,n.title]));
 const today=receipt?.today||new Date().toISOString().slice(0,10);
 const [{count:oldReviews},{count:oldDue}]=schemaReady?[{count:null},{count:null}]:await Promise.all([
  db.from('review_attempts').select('*',{count:'exact',head:true}).eq('user_id',user.id),
  db.from('review_schedule').select('*',{count:'exact',head:true}).eq('user_id',user.id).lte('next_due_local_date',today)
 ]);
 const reviewsCompleted=schemaReady?receipt?.reviews_completed||0:oldReviews||0;
 const reviewsDue=schemaReady?receipt?.reviews_due||0:oldDue||0;
 const active=new Set((days||[]).map(d=>d.local_date));
 const calendar=Array.from({length:28},(_,i)=>{const d=new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-(27-i));return d.toISOString().slice(0,10);});
 return <Shell title="Progress" streak={receipt?.current_streak||0}><div className="tag">YOUR LEARNING HISTORY</div><h1>Every good step counts.</h1><p className="muted">Completion, consistency, review, and practice each tell a different part of your story.</p>
 <div className="stat-grid space"><div className="card"><div className="tag">UNIT COMPLETION</div><div className="progress-big space">{receipt?.completed||0} / {receipt?.total||0}</div><div className="meter"><span style={{width:String(receipt?.percent||0)+'%'}}/></div></div><div className="card"><div className="tag">CURRENT STREAK</div><div className="progress-big space">{receipt?.current_streak||0} days</div></div><div className="card"><div className="tag">LONGEST STREAK</div><div className="progress-big space">{receipt?.longest_streak||0} days</div></div><div className="card"><div className="tag">REVIEWS COMPLETED</div><div className="progress-big space">{reviewsCompleted}</div></div><div className="card"><div className="tag">REVIEWS DUE</div><div className="progress-big space">{reviewsDue}</div><Link href="/review">Open review →</Link></div>{schemaReady&&<div className="card"><div className="tag">LEARNING ARTIFACTS</div><div className="progress-big space">{artifacts?.length||0} recent</div><Link href="/progress/artifacts">View all →</Link></div>}</div>
 <div className="grid space"><div className="card"><h2>Learning days</h2><p className="small muted">Last 28 local dates · {profile.learning_timezone}</p><div className="calendar" aria-hidden="true">{calendar.map(day=><span key={day} className={active.has(day)?'filled':''} title={day}/>)}</div></div><div className="card"><h2>Completed work</h2>{completions?.length?completions.map(c=><p key={c.lesson_id}>{names.get(c.lesson_id)||'Lesson'} · {new Date(c.completed_at).toLocaleDateString('en-US',{timeZone:profile.learning_timezone})}</p>):<p className="muted">Your first completed lesson will appear here.</p>}<Link href="/learn" className="button secondary space">Go to path</Link></div></div>
 {schemaReady&&<><section className="card space"><h2>Topics needing review</h2><p className="small muted">Based on first answers and due dates. This is not a mastery score.</p>{(weak as {lesson_id:string;title:string;attempted:number;accuracy:number;next_due:string;action:string}[]||[]).length?(weak as {lesson_id:string;title:string;attempted:number;accuracy:number;next_due:string;action:string}[]).map(item=><div className="weak-row" key={item.lesson_id}><strong>{item.title}</strong><span>{item.accuracy}% first-attempt accuracy · {item.attempted} question{item.attempted===1?'':'s'} · Due {item.next_due}</span><p>{item.action}</p><Link href={'/learn/'+item.lesson_id}>Revisit lesson →</Link></div>):<p className="muted">No topics need review right now.</p>}</section>
 <section className="card space"><div className="row"><h2>Learning Artifacts</h2><Link href="/progress/artifacts">View all →</Link></div>{artifacts?.length?artifacts.map(a=><p key={a.id}><Link href={'/progress/artifacts/'+a.id}>{a.project_name} · revision {a.revision_number}</Link></p>):<p className="muted">Your Product Direction submission will appear here.</p>}</section></>}
 </Shell>;
}

