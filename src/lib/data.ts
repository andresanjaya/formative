import { learnerContext } from './auth';
import { isMissingCurriculum } from './schema';

export const PILOT_LESSON_ID = '10000000-0000-4000-8000-000000000012';
export const PILOT_UNIT_ID = '10000000-0000-4000-8000-000000000002';

export async function loadPath() {
  const { db, user } = await learnerContext();
  const [{ data: lesson }, { data: previews }, { data: completions }, { data: attempts }, { data: receipt }] = await Promise.all([
    db.from('lessons').select('id,title,position,published_revision_id').eq('id',PILOT_LESSON_ID).single(),
    db.from('path_previews').select('id,title,position,kind').eq('unit_id',PILOT_UNIT_ID).order('position'),
    db.from('lesson_completions').select('lesson_id').eq('user_id',user.id),
    db.from('attempts').select('id,lesson_id,current_step').eq('user_id',user.id).eq('status','in_progress'),
    db.rpc('progress_receipt')
  ]);
  return { lesson, previews: previews || [], completions: completions || [], attempts: attempts || [], receipt: receipt || { completed:0,total:0,percent:0,current_streak:0,longest_streak:0,goal_done:false } };
}

export async function loadLesson(id: string) {
  const { db, user } = await learnerContext();
  const { data: lesson, error: nodeError } = await db.from('curriculum_nodes').select('id,title,published_revision_id,is_learnable').eq('id',id).eq('status','published').maybeSingle();
  if (isMissingCurriculum(nodeError)) {
    if(id!==PILOT_LESSON_ID)return null;
    const {data:legacy}=await db.from('lessons').select('id,title,published_revision_id').eq('id',id).maybeSingle();
    if(!legacy?.published_revision_id)return null;
    const {data:attempt}=await db.from('attempts').select('id,revision_id,current_step,status').eq('lesson_id',id).eq('user_id',user.id).eq('status','in_progress').maybeSingle();
    const [{data:oldRevision},{data:completion},{data:receipt}]=await Promise.all([
      db.from('lesson_revisions').select('id,lesson_id,revision_number,outcome,content,question_public,resource_cards,estimated_minutes').eq('id',attempt?.revision_id||legacy.published_revision_id).maybeSingle(),
      db.from('lesson_completions').select('completed_at').eq('lesson_id',id).eq('user_id',user.id).maybeSingle(),
      db.rpc('progress_receipt')
    ]);
    if(!oldRevision)return null;
    let answers:{question_id:string;correct:boolean}[]=[];let reflection='';
    if(attempt){const [{data:a},{data:r}]=await Promise.all([db.from('attempt_answers').select('question_id,correct').eq('attempt_id',attempt.id),db.from('reflections').select('body').eq('attempt_id',attempt.id).maybeSingle()]);answers=a||[];reflection=r?.body||'';}
    return {lesson:legacy,revision:{...oldRevision,introduction:'',reflection_prompt:'Who benefits, what becomes better, and what experience would demonstrate that change?',completion_policy:'lesson'},attempt,completion,answers,reflection,receipt};
  }
  if(nodeError)throw nodeError;
  if (!lesson?.published_revision_id || !lesson.is_learnable) return null;
  const {data:enrollment}=await db.from('enrollments').select('curriculum_version_id').eq('user_id',user.id).maybeSingle();
  const {data:version}=enrollment?.curriculum_version_id?await db.from('curriculum_versions').select('manifest').eq('id',enrollment.curriculum_version_id).maybeSingle():{data:null};
  if(!Array.isArray(version?.manifest)||!version.manifest.includes(id))return null;
  const { data: attempt } = await db.from('attempts').select('id,revision_id,current_step,status').eq('lesson_id',id).eq('user_id',user.id).eq('status','in_progress').maybeSingle();
  const [{ data: revision }, { data: completion }, { data: receipt }] = await Promise.all([
    db.from('lesson_revisions').select('id,lesson_id,revision_number,outcome,introduction,content,question_public,resource_cards,reflection_prompt,completion_policy,estimated_minutes').eq('id',attempt?.revision_id||lesson.published_revision_id).single(),
    db.from('lesson_completions').select('completed_at').eq('lesson_id',id).eq('user_id',user.id).maybeSingle(),
    db.rpc('progress_receipt')
  ]);
  let answers:{question_id:string;correct:boolean}[]=[]; let reflection='';
  if(attempt){const [{data:a},{data:r}]=await Promise.all([db.from('attempt_answers').select('question_id,correct').eq('attempt_id',attempt.id),db.from('reflections').select('body').eq('attempt_id',attempt.id).maybeSingle()]);answers=a||[];reflection=r?.body||'';}
  return revision?.completion_policy==='lesson' ? { lesson, revision, attempt, completion, answers, reflection, receipt } : null;
}
