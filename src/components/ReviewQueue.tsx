'use client';
import Link from 'next/link';
import { useState } from 'react';
import { action } from '@/lib/client-api';
import { QuestionInteraction,type ScenarioQuestion } from './QuestionInteraction';
import { Card, CardContent } from '@/components/ui/card';
type Item={lesson_id:string;title:string;occurrence:number;question:ScenarioQuestion};
export function ReviewQueue({items,due,timezone}:{items:Item[];due:number;timezone:string}){
 const [index,setIndex]=useState(0),[feedback,setFeedback]=useState(''),[correct,setCorrect]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[finished,setFinished]=useState(false);
 const [dates,setDates]=useState<string[]>([]);const item=items[index];
 async function answer(value:string){setBusy(true);setError('');try{const result=await action<{correct:boolean;explanation:string}>({action:'reviewAnswer',lessonId:item.lesson_id,questionId:item.question.id,optionId:value});setCorrect(result.correct);setFeedback(result.explanation);}catch(e){setError(e instanceof Error?e.message:'Could not save answer.');}finally{setBusy(false);}}
 async function next(){setBusy(true);setError('');try{const result=await action<{next_due:string}>({action:'reviewComplete',lessonId:item.lesson_id,occurrence:item.occurrence});setDates(old=>[...old,result.next_due]);if(index===items.length-1)setFinished(true);else{setIndex(index+1);setFeedback('');setCorrect(false);}}catch(e){setError(e instanceof Error?e.message:'Could not finish review.');}finally{setBusy(false);}}
 return <Card className="space" style={{maxWidth:760}}><CardContent>{finished?<><div className="tag">REVIEW COMPLETE</div><h2>Good recall work.</h2><p>{items.length} question{items.length===1?'':'s'} reviewed. Next due dates: {dates.join(', ')}.</p><Link className="button space" href="/progress">See progress →</Link></>:<><div className="tag">{due} DUE · QUESTION {index+1} OF {items.length} · {timezone}</div><h2 className="space">{item.title}</h2><QuestionInteraction key={item.question.id} question={item.question} onAnswer={answer} busy={busy} feedback={feedback} correct={correct}/>{error&&<p className="error" role="alert">{error}</p>}<button className="button space" disabled={!correct||busy} onClick={next}>{index===items.length-1?'Finish session':'Next question'} →</button></>}</CardContent></Card>;
}
