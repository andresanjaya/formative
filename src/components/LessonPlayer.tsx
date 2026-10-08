'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { action } from '@/lib/client-api';

type Question={id:string;prompt:string;options:{id:string;text:string}[]};
type Block={type:string;text?:string;title?:string};
type Resource={type:string;title:string;url:string;publisher:string;access_note?:string};
type Data={lesson:{id:string;title:string};revision:{id:string;outcome:string;content:Block[];question_public:Question[];resource_cards:Resource[]};attempt:{id:string;current_step:number}|null;completion:{completed_at:string}|null;answers:{question_id:string;correct:boolean}[];reflection:string;receipt:Receipt|null};
type Receipt={completed:number;total:number;percent:number;current_streak:number;longest_streak:number;goal_done:boolean;review_due?:string};
export function LessonPlayer({data,preview=false}:{data:Data;preview?:boolean}) {
 const router=useRouter();
 const [step,setStep]=useState(data.completion?4:Math.min(data.attempt?.current_step||0,3));
 const [attempt,setAttempt]=useState(data.attempt?.id||'');
 const [questionIndex,setQuestionIndex]=useState(()=>Math.max(0,data.revision.question_public.findIndex(q=>!data.answers.some(a=>a.question_id===q.id&&a.correct))));
 const [choice,setChoice]=useState('');
 const [correctIds,setCorrectIds]=useState<string[]>(data.answers.filter(a=>a.correct).map(a=>a.question_id));
 const [feedback,setFeedback]=useState('');
 const [reflection,setReflection]=useState(data.reflection);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const [online,setOnline]=useState(true);
 const [receipt,setReceipt]=useState<Receipt|null>(data.receipt);
 const [requestId]=useState(()=>crypto.randomUUID());
 const draftKey=`formative:${attempt}:${data.revision.id}:reflection`;
 useEffect(()=>{if(!preview&&!data.completion&&!data.attempt){action<string>({action:'start',lessonId:data.lesson.id}).then(setAttempt).catch(e=>setError(e instanceof Error?e.message:'Could not start lesson.'));}},[preview,data.completion,data.attempt,data.lesson.id]);
 useEffect(()=>{if(attempt&&!data.reflection){const draft=localStorage.getItem(draftKey);if(draft){const timer=setTimeout(()=>setReflection(draft),0);return ()=>clearTimeout(timer);}}},[attempt,draftKey,data.reflection]);
 useEffect(()=>{const update=()=>setOnline(navigator.onLine);window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);};},[]);
 useEffect(()=>{if(attempt&&step===3)localStorage.setItem(draftKey,reflection);},[attempt,step,reflection,draftKey]);
 async function ensureAttempt(){if(attempt)return attempt;const id=await action<string>({action:'start',lessonId:data.lesson.id});setAttempt(id);return id;}
 async function move(next:number){setError('');setBusy(true);try{if(step===2){if(!correctIds.includes(question.id))return;if(next>step&&questionIndex<data.revision.question_public.length-1){setQuestionIndex(questionIndex+1);setChoice('');setFeedback('');return;}}if(step===3){if(!reflection.trim())return;const id=await ensureAttempt();await action({action:'reflection',attemptId:id,body:reflection});}
  if(step===3){const id=await ensureAttempt();const result=await action<Receipt>({action:'complete',attemptId:id,requestId});setReceipt(result);localStorage.removeItem(draftKey);setStep(4);return;}
  const id=await ensureAttempt();await action({action:'position',attemptId:id,step:next});setStep(next);window.scrollTo(0,0);
 }catch(e){setError(e instanceof Error?e.message:'Save failed. Try again.');}finally{setBusy(false);}}
 async function answer(question:Question,option:string){setError('');setBusy(true);setChoice(option);try{const id=await ensureAttempt();const result=await action<{correct:boolean;explanation:string}>({action:'answer',attemptId:id,questionId:question.id,optionId:option});setCorrectIds(ids=>result.correct?[...new Set([...ids,question.id])]:ids.filter(id=>id!==question.id));setFeedback(result.explanation);}catch(e){setError(e instanceof Error?e.message:'Answer could not be saved.');}finally{setBusy(false);}}
 async function resourceClick(){try{const id=await ensureAttempt();await action({action:'position',attemptId:id,step:1});}catch{setError('Your place could not be saved. The article will still open.');}}
 const question=data.revision.question_public[questionIndex];
 const correct=question?correctIds.includes(question.id):false;
 return <main className="workspace lesson-wrap"><div className="lesson-head"><Link href="/learn" className="textbtn" aria-label="Save and exit lesson">✕</Link><div className="meter" role="progressbar" aria-label="Lesson step" aria-valuenow={step+1} aria-valuemin={1} aria-valuemax={5}><span style={{width:`${(step+1)*20}%`}}/></div><span className="small muted">{step===4?'Complete':`${step+1} of 4`}</span></div>{!online&&<div className="notice" role="status">You’re offline. Your reflection stays on this device; completion will need a connection.</div>}{error&&<div className="error" role="alert">{error} <button className="textbtn" onClick={()=>setError('')}>Dismiss</button></div>}<div className="lesson-content">
 {step===0&&<><div className="tag">PRODUCT THINKING · LEARN</div><h1>{data.lesson.title}</h1><p className="muted">After this lesson, you can {data.revision.outcome.charAt(0).toLowerCase()+data.revision.outcome.slice(1)}</p>{data.revision.content.map((block,i)=>block.type==='heading'?<h2 className="space" key={i}>{block.text}</h2>:block.type==='callout'?<div className="card hero space" key={i}><div className="tag">{block.title}</div><p>{block.text}</p></div>:<p key={i}>{block.text}</p>)}</>}
 {step===1&&<><div className="tag">PRODUCT THINKING · EXPLORE</div><h1>Go one level deeper.</h1><p className="muted">These resources are optional. The core lesson stands on its own.</p>{data.revision.resource_cards.map((resource,i)=><a key={i} className="resource" href={resource.url} target="_blank" rel="noopener noreferrer" onClick={resourceClick}><span className="resource-icon">↗</span><span style={{flex:1}}><strong>{resource.title}</strong><span className="small muted" style={{display:'block'}}>{resource.publisher} · External {resource.type}</span></span><span aria-hidden="true">↗</span></a>)}<div className="note space">Your place stays here while you read. Opening a link does not complete the lesson.</div></>}
 {step===2&&question&&<><div className="tag">PRODUCT THINKING · CHECK {questionIndex+1} OF {data.revision.question_public.length}</div><h1>Check your understanding.</h1><p>{question.prompt}</p>{question.options.map((option,i)=><button key={option.id} className={`option ${choice===option.id?'chosen':''}`} aria-pressed={choice===option.id} disabled={busy} onClick={()=>answer(question,option.id)}><span>{String.fromCharCode(65+i)}</span><span>{option.text}</span></button>)}{feedback&&<div className={`feedback ${correct?'':'bad'}`} role="status">{feedback}{!correct&&' Try again.'}</div>}</>}
 {step===3&&<><div className="tag">PRODUCT THINKING · APPLY</div><h1>Try it on your own idea.</h1><p>Who benefits, what becomes better, and what experience would demonstrate that change?</p><label htmlFor="reflection">Your vision direction</label><textarea id="reflection" value={reflection} onChange={e=>setReflection(e.target.value)} placeholder="For people who…, this product helps…" maxLength={4000}/><div className="note space"><strong>Self-check your direction</strong><p className="small">Does it identify a user, describe a meaningful change, go beyond features, and help with a trade-off?</p></div><p className="small muted">Your writing is saved when you finish. It is not automatically graded.</p></>}
 {step===4&&<div className="center"><div className="success-icon">✓</div><div className="tag">PRODUCT VISION · COMPLETE</div><h1 className="space">One idea put into practice.</h1><p className="muted">You identified a future benefit and drafted your own direction.</p><div className="card space"><div className="row"><div style={{textAlign:'left'}}><div className="small muted">Course progress</div><strong className="progress-big">{receipt?.completed||0} of {receipt?.total||0}</strong></div><strong className="streak-top">♨ {receipt?.current_streak||0} day{receipt?.current_streak===1?'':'s'}</strong></div><div className="meter"><span style={{width:`${receipt?.percent||0}%`}}/></div><p className="small muted">{receipt?.review_due?`Review due ${receipt.review_due}`:'Your review is scheduled. See Review for the due date.'}</p></div><Link className="button space" href="/learn">Back to path →</Link></div>}
 </div>{step<4&&<div className="row lesson-nav"><button className="button secondary" disabled={busy} onClick={()=>step===0?router.push('/learn'):move(step-1)}>{step===0?'Save & exit':'Back'}</button><button className="button" disabled={busy||(step===2&&!correct)||(step===3&&!reflection.trim())} onClick={()=>move(step+1)}>{busy?'Saving…':step===3?'Complete lesson →':'Continue →'}</button></div>}</main>;
}
