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
  z.object({ action:z.literal('saveNodeDraft'), nodeId:uuid, expected:z.number().int().min(0), outcome:z.string().max(500), introduction:z.string().max(2000), content:z.array(z.unknown()).max(30), questions:z.array(z.unknown()).max(20), review:z.array(z.unknown()).max(20), resources:z.array(z.unknown()).max(20), reflection:z.string().max(1000), minutes:z.number().int().min(1).max(180), policy:z.enum(['intro','lesson','checkpoint']), fields:z.array(z.string()).max(20), rubric:z.array(z.string()).max(20), keys:z.array(z.unknown()).max(40) }),
  z.object({ action:z.literal('setupSaveDraft'), nodeId:uuid, expected:z.number().int().min(0), outcome:z.string().max(500), introduction:z.string().max(2000), content:z.array(z.unknown()).max(30), questions:z.array(z.unknown()).max(20), review:z.array(z.unknown()).max(20), resources:z.array(z.unknown()).max(20), reflection:z.string().max(1000), minutes:z.number().int().min(1).max(180), policy:z.enum(['intro','lesson','checkpoint']), fields:z.array(z.string()).max(20), rubric:z.array(z.string()).max(20), keys:z.array(z.unknown()).max(40), intervals:z.tuple([z.number().int().min(1).max(365),z.number().int().min(1).max(365),z.number().int().min(1).max(365),z.number().int().min(1).max(365)]) }),
  z.object({ action:z.literal('publish'), lessonId:uuid, expected:z.number().int().min(1) }),
  z.object({ action:z.literal('createNode'), parentId:uuid.nullable(), nodeType:z.enum(['domain','section','topic','lesson']), title:z.string().min(2).max(120), slug:z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/), description:z.string().max(500), learnable:z.boolean() }),
  z.object({ action:z.literal('moveNode'), nodeId:uuid, parentId:uuid.nullable(), position:z.number().int().min(1) }),
  z.object({ action:z.literal('updateNode'), nodeId:uuid, title:z.string().min(2).max(120), slug:z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/), description:z.string().max(500), nodeType:z.enum(['domain','section','topic','lesson']), learnable:z.boolean(), status:z.enum(['draft','published','archived']) }),
  z.object({action:z.literal('setupCreate'),nodeType:z.enum(['domain','section','topic']),parentId:uuid.nullable(),title:z.string().trim().min(2).max(120),slug:z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),description:z.string().max(500),icon:z.string().max(20),coverUrl:z.union([z.url(),z.literal('')]),position:z.number().int().min(1),learnable:z.boolean(),required:z.boolean(),minutes:z.number().int().min(1).max(180),policy:z.enum(['intro','lesson','checkpoint'])}),
  z.object({action:z.literal('setupUpdate'),nodeId:uuid,expected:z.iso.datetime({offset:true}),parentId:uuid.nullable(),title:z.string().trim().min(2).max(120),slug:z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),description:z.string().max(500),icon:z.string().max(20),coverUrl:z.union([z.url(),z.literal('')]),position:z.number().int().min(1),learnable:z.boolean(),required:z.boolean()}),
  z.object({action:z.literal('setupTransition'),nodeId:uuid,transition:z.enum(['archive','restore','publish','delete']),confirmChildren:z.boolean()}),
  z.object({ action:z.literal('completeIntro'), nodeId:uuid }),
  z.object({ action:z.literal('upgradeCurriculum') }),
  z.object({ action:z.literal('selectPath'), domainId:uuid }),
  z.object({ action:z.literal('checkpointDraft'), nodeId:uuid, projectName:z.string().max(150), answers:z.record(z.string(),z.string().max(4000)) }),
  z.object({ action:z.literal('checkpointSubmit'), nodeId:uuid, rubric:z.record(z.string(),z.enum(['needs_work','partly_clear','clear'])) }),
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
    case 'saveNodeDraft': fn='admin_save_node_draft'; args={p_node:input.nodeId,p_expected:input.expected,p_outcome:input.outcome,p_introduction:input.introduction,p_content:input.content,p_questions:input.questions,p_review:input.review,p_resources:input.resources,p_reflection:input.reflection,p_minutes:input.minutes,p_policy:input.policy,p_fields:input.fields,p_rubric:input.rubric,p_keys:input.keys}; break;
    case 'setupSaveDraft': fn='admin_setup_save_node_draft'; args={p_node:input.nodeId,p_expected:input.expected,p_outcome:input.outcome,p_introduction:input.introduction,p_content:input.content,p_questions:input.questions,p_review:input.review,p_resources:input.resources,p_reflection:input.reflection,p_minutes:input.minutes,p_policy:input.policy,p_fields:input.fields,p_rubric:input.rubric,p_keys:input.keys,p_intervals:input.intervals}; break;
    case 'publish': fn='admin_publish'; args={p_lesson:input.lessonId,p_expected:input.expected}; break;
    case 'createNode': fn='admin_create_node'; args={p_parent:input.parentId,p_type:input.nodeType,p_title:input.title,p_slug:input.slug,p_description:input.description,p_learnable:input.learnable}; break;
    case 'moveNode': fn='admin_move_node'; args={p_node:input.nodeId,p_parent:input.parentId,p_position:input.position}; break;
    case 'updateNode': fn='admin_update_node'; args={p_node:input.nodeId,p_title:input.title,p_slug:input.slug,p_description:input.description,p_type:input.nodeType,p_learnable:input.learnable,p_status:input.status}; break;
    case 'setupCreate': fn='admin_setup_create'; args={p_type:input.nodeType,p_parent:input.parentId,p_title:input.title,p_slug:input.slug,p_description:input.description,p_icon:input.icon,p_cover:input.coverUrl,p_position:input.position,p_learnable:input.learnable,p_required:input.required,p_minutes:input.minutes,p_policy:input.policy}; break;
    case 'setupUpdate': fn='admin_setup_update'; args={p_node:input.nodeId,p_expected:input.expected,p_parent:input.parentId,p_title:input.title,p_slug:input.slug,p_description:input.description,p_icon:input.icon,p_cover:input.coverUrl,p_position:input.position,p_learnable:input.learnable,p_required:input.required}; break;
    case 'setupTransition': fn='admin_setup_transition'; args={p_node:input.nodeId,p_action:input.transition,p_confirm_children:input.confirmChildren}; break;
    case 'completeIntro': fn='complete_node_intro'; args={p_node:input.nodeId}; break;
    case 'upgradeCurriculum': fn='upgrade_curriculum'; args={}; break;
    case 'selectPath': fn='select_learning_path'; args={p_domain:input.domainId}; break;
    case 'checkpointDraft': fn='save_checkpoint_draft'; args={p_node:input.nodeId,p_project:input.projectName,p_answers:input.answers}; break;
    case 'checkpointSubmit': fn='submit_checkpoint'; args={p_node:input.nodeId,p_rubric:input.rubric}; break;
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
