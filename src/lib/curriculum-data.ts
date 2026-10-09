import { learnerContext } from './auth';

export const PRODUCT_THINKING_ID='10000000-0000-4000-8000-000000000003';
export const CHECKPOINT_ID='60000000-0000-4000-8000-000000000005';
export const PILOT_SEQUENCE=[
 '60000000-0000-4000-8000-000000000001',
 '10000000-0000-4000-8000-000000000012',
 '60000000-0000-4000-8000-000000000002',
 '60000000-0000-4000-8000-000000000003',
 '60000000-0000-4000-8000-000000000004',CHECKPOINT_ID
];
export type CurriculumNode={id:string;parent_id:string|null;node_type:string;title:string;slug:string;short_description:string;icon:string;position:number;status:string;is_learnable:boolean;published_revision_id:string|null};

export async function loadCurriculum(){
 const {db,user}=await learnerContext();
 const [{data:nodes,error},{data:completions},{data:attempts},{data:receipt},{data:enrollment}]=await Promise.all([
  db.from('curriculum_nodes').select('id,parent_id,node_type,title,slug,short_description,icon,position,status,is_learnable,published_revision_id').eq('status','published').order('position'),
  db.from('lesson_completions').select('lesson_id').eq('user_id',user.id),
  db.from('attempts').select('id,lesson_id,current_step').eq('user_id',user.id).eq('status','in_progress'),
  db.rpc('progress_receipt'),
  db.from('enrollments').select('curriculum_version_id').eq('user_id',user.id).maybeSingle()
 ]);
 if(error)throw error;
 const {data:version}=enrollment?.curriculum_version_id?await db.from('curriculum_versions').select('manifest').eq('id',enrollment.curriculum_version_id).maybeSingle():{data:null};
 return {db,user,nodes:(nodes||[]) as CurriculumNode[],completions:new Set((completions||[]).map(c=>c.lesson_id)),attempts:new Set((attempts||[]).map(a=>a.lesson_id)),required:new Set<string>(Array.isArray(version?.manifest)?version.manifest:[]),receipt:receipt||{completed:0,total:0,percent:0,current_streak:0,longest_streak:0},legacyEnrollment:enrollment?.curriculum_version_id==='40000000-0000-4000-8000-000000000001'};
}

export function descendants(nodes:CurriculumNode[],id:string):CurriculumNode[]{
 const children=nodes.filter(n=>n.parent_id===id);
 return children.flatMap(child=>[child,...descendants(nodes,child.id)]);
}

export function nodeProgress(nodes:CurriculumNode[],id:string,completed:Set<string>,required:Set<string>){
 const eligible=descendants(nodes,id).filter(n=>n.is_learnable&&n.status==='published'&&required.has(n.id));
 const done=eligible.filter(n=>completed.has(n.id)).length;
 return {done,total:eligible.length,state:eligible.length===0?'Not started':done===eligible.length?'Completed':done?'In progress':'Not started'};
}
