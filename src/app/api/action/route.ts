import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { z } from 'zod';

const uuid = z.uuid();
const actions = z.discriminatedUnion('action', [
  z.object({ action:z.literal('bootstrap'), timezone:z.string().min(3).max(64) }),
  z.object({ action:z.literal('start'), lessonId:uuid }),
  z.object({ action:z.literal('position'), attemptId:uuid, step:z.number().int().min(0).max(5) }),
  z.object({ action:z.literal('answer'), attemptId:uuid, questionId:z.string().max(100), optionId:z.string().max(100) }),
  z.object({ action:z.literal('reflection'), attemptId:uuid, body:z.string().min(1).max(4000) }),
  z.object({ action:z.literal('complete'), attemptId:uuid, requestId:uuid }),
  z.object({ action:z.literal('saveDraft'), lessonId:uuid, expected:z.number().int().min(0), outcome:z.string().max(500), content:z.array(z.unknown()).max(30), questions:z.array(z.unknown()).max(20), review:z.array(z.unknown()).max(20), resources:z.array(z.unknown()).max(20), keys:z.array(z.unknown()).max(40) }),
  z.object({ action:z.literal('publish'), lessonId:uuid, expected:z.number().int().min(1) }),
  z.object({ action:z.literal('reviewAnswer'), lessonId:uuid, questionId:z.string().max(100), optionId:z.string().max(100) }),
  z.object({ action:z.literal('reviewComplete'), lessonId:uuid, occurrence:z.number().int().min(1) }),
]);

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin && origin !== process.env.NEXT_PUBLIC_APP_ORIGIN) return NextResponse.json({ error:'Invalid origin' },{ status:403 });
  const parsed = actions.safeParse(await request.json().catch(()=>null));
  if (!parsed.success) return NextResponse.json({ error:'Invalid request', fields:parsed.error.flatten() },{ status:422 });
  const db = await supabaseServer();
  const { data:{ user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error:'Sign in required' },{ status:401 });
  const input = parsed.data;
  let fn:string, args:Record<string,unknown>;
  switch(input.action) {
    case 'bootstrap': fn='bootstrap_user'; args={p_timezone:input.timezone}; break;
    case 'start': fn='start_lesson'; args={p_lesson:input.lessonId}; break;
    case 'position': fn='save_position'; args={p_attempt:input.attemptId,p_step:input.step}; break;
    case 'answer': fn='submit_answer'; args={p_attempt:input.attemptId,p_question:input.questionId,p_option:input.optionId}; break;
    case 'reflection': fn='save_reflection'; args={p_attempt:input.attemptId,p_body:input.body}; break;
    case 'complete': fn='complete_lesson'; args={p_attempt:input.attemptId,p_idempotency:input.requestId}; break;
    case 'saveDraft': fn='admin_save_draft'; args={p_lesson:input.lessonId,p_expected:input.expected,p_outcome:input.outcome,p_content:input.content,p_questions:input.questions,p_review:input.review,p_resources:input.resources,p_keys:input.keys}; break;
    case 'publish': fn='admin_publish'; args={p_lesson:input.lessonId,p_expected:input.expected}; break;
    case 'reviewAnswer': fn='submit_review_answer'; args={p_lesson:input.lessonId,p_question:input.questionId,p_option:input.optionId}; break;
    case 'reviewComplete': fn='complete_review'; args={p_lesson:input.lessonId,p_occurrence:input.occurrence}; break;
  }
  const { data,error } = await db.rpc(fn,args);
  if (error) {
    const message = error.message.replace(/\b(public|private)\.[a-z_]+\b/gi,'record');
    const status = /forbidden/.test(message) ? 403 : /stale|conflict/.test(message) ? 409 : /unavailable/.test(message) ? 404 : 422;
    return NextResponse.json({ error:message },{ status });
  }
  return NextResponse.json({ data });
}
