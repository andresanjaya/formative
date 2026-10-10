'use client';
import Link from 'next/link';
import { useEffect,useState } from 'react';
import { action } from '@/lib/client-api';
import { QuestionInteraction,type ScenarioQuestion } from './QuestionInteraction';
import { ContentBlocks } from './ContentBlocks';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

type Block={type:string;text:string;title?:string};
type Resource={type:string;title:string;url:string;publisher:string;access_note?:string};
type Receipt={completed:number;total:number;percent:number;current_streak:number;review_due?:string};
type LessonData={lesson:{id:string;title:string};revision:{id:string;outcome:string;introduction:string;content:Block[];question_public:ScenarioQuestion[];resource_cards:Resource[];reflection_prompt:string};attempt:{id:string;current_step:number}|null;completion:{completed_at:string}|null;answers:{question_id:string;correct:boolean}[];reflection:string;receipt:Receipt|null};
export function LessonPlayerV2({data,embedded=false}:{data:LessonData;embedded?:boolean}){
 const [step,setStep]=useState(data.completion?4:Math.min(data.attempt?.current_step||0,3));
 const [attempt,setAttempt]=useState(data.attempt?.id||'');
 const [questionIndex,setQuestionIndex]=useState(Math.max(0,data.revision.question_public.findIndex(q=>!data.answers.some(a=>a.question_id===q.id&&a.correct))));
 const [correctIds,setCorrectIds]=useState(data.answers.filter(a=>a.correct).map(a=>a.question_id));
 const [feedback,setFeedback]=useState('');const [reflection,setReflection]=useState(data.reflection);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');const [receipt,setReceipt]=useState<Receipt|null>(data.receipt);
 const [requestId]=useState(()=>crypto.randomUUID());
 const draftKey='formative:'+data.lesson.id+':'+data.revision.id+':reflection';
 useEffect(()=>{if(!data.completion&&!data.attempt)action<string>({action:'start',lessonId:data.lesson.id}).then(setAttempt).catch(e=>setError(e instanceof Error?e.message:'Could not start lesson.'));},[data.completion,data.attempt,data.lesson.id]);
 useEffect(()=>{if(!data.reflection){const saved=localStorage.getItem(draftKey);if(saved){const t=setTimeout(()=>setReflection(saved),0);return()=>clearTimeout(t);}}},[data.reflection,draftKey]);
 useEffect(()=>{if(step===3)localStorage.setItem(draftKey,reflection);},[draftKey,reflection,step]);
 async function ensureAttempt(){if(attempt)return attempt;const id=await action<string>({action:'start',lessonId:data.lesson.id});setAttempt(id);return id;}
 async function answer(value:string){const q=data.revision.question_public[questionIndex];setBusy(true);setError('');try{const id=await ensureAttempt();const result=await action<{correct:boolean;explanation:string}>({action:'answer',attemptId:id,questionId:q.id,optionId:value});setFeedback(result.explanation);if(result.correct)setCorrectIds(old=>[...new Set([...old,q.id])]);}catch(e){setError(e instanceof Error?e.message:'Could not save answer.');}finally{setBusy(false);}}
 async function next(){setBusy(true);setError('');try{
  if(step===2&&questionIndex<data.revision.question_public.length-1){setQuestionIndex(questionIndex+1);setFeedback('');return;}
  const id=await ensureAttempt();
  if(step===3){if(!reflection.trim())return;await action({action:'reflection',attemptId:id,body:reflection});const result=await action<Receipt>({action:'complete',attemptId:id,requestId});setReceipt(result);localStorage.removeItem(draftKey);setStep(4);return;}
  await action({action:'position',attemptId:id,step:step+1});setStep(step+1);window.scrollTo(0,0);
 }catch(e){setError(e instanceof Error?e.message:'Could not save your place.');}finally{setBusy(false);}}
 const q=data.revision.question_public[questionIndex];const correct=q&&correctIds.includes(q.id);
 return <div className={embedded?'lesson-wrap':'workspace lesson-wrap'}><div className="lesson-head"><Link href="/learn" className="textbtn">← Path</Link><div className="meter" role="progressbar" aria-label="Lesson step" aria-valuenow={step+1} aria-valuemin={1} aria-valuemax={5}><span style={{width:String((step+1)*20)+'%'}}/></div><span className="small muted">{step===4?'Complete':String(step+1)+' of 4'}</span></div>{error&&<div className="error" role="alert">{error}</div>}
  <div className="lesson-content">{step===0&&<><div className="tag">LEARN</div><h1>{data.lesson.title}</h1><p className="muted">After this lesson, you can {data.revision.outcome.charAt(0).toLowerCase()+data.revision.outcome.slice(1)}</p>{data.revision.introduction&&<p>{data.revision.introduction}</p>}<ContentBlocks blocks={data.revision.content}/></>}
  {step===1&&<><div className="tag">EXPLORE</div><h1>Optional resources</h1><p>Core learning stays here. These links can take you deeper.</p>{data.revision.resource_cards.length?data.revision.resource_cards.map((r,i)=><a className="resource" href={r.url} target="_blank" rel="noopener noreferrer" key={i}><Card><CardContent><span className="resource-icon">↗</span><span><strong>{r.title}</strong><small className="muted"> · {r.publisher}</small></span></CardContent></Card></a>):<p className="note">No external reading is needed for this lesson.</p>}</>}
  {step===2&&q&&<><div className="tag">RECALL · {questionIndex+1} OF {data.revision.question_public.length}</div><h1>Choose with a reason.</h1><QuestionInteraction key={q.id} question={q} onAnswer={answer} busy={busy} feedback={feedback} correct={Boolean(correct)}/></>}
  {step===3&&<><div className="tag">APPLY</div><h1>Use this idea</h1><p>{data.revision.reflection_prompt}</p><label htmlFor="reflection">Your reflection</label><Textarea id="reflection" value={reflection} maxLength={4000} onChange={e=>setReflection(e.target.value)} placeholder="In my project…"/><p className="small muted">Your draft stays on this device until you complete the lesson. Your response is not automatically graded.</p></>}
  {step===4&&<div className="center"><div className="success-icon">✓</div><div className="tag">LESSON COMPLETE</div><h1>{data.lesson.title}</h1><p>You applied the idea to your project. The next review is due {receipt?.review_due||'soon'}.</p><Card className="space"><CardContent><strong className="progress-big">{receipt?.completed||0} of {receipt?.total||0}</strong><p className="small muted">Required lessons completed</p></CardContent></Card><Link className="button space" href="/learn">Continue path →</Link></div>}</div>
  {step<4&&<div className="row lesson-nav"><Link className="button secondary" href="/learn">Save & exit</Link><button className="button" disabled={busy||(step===2&&!correct)||(step===3&&!reflection.trim())} onClick={next}>{busy?'Saving…':step===3?'Complete lesson →':step===2&&questionIndex<data.revision.question_public.length-1?'Next question →':'Continue →'}</button></div>}
 </div>;
}
