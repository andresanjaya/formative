import { learnerContext } from './auth';
import type { PathNode } from './path-metrics';
export type PathEnrollment = {domain_node_id:string;is_active:boolean};

export async function loadLearningPaths(){
  const {db,user}=await learnerContext();
  const [nodesResult,enrollmentsResult,completionsResult,introsResult]=await Promise.all([
    db.from('curriculum_nodes').select('id,parent_id,node_type,title,slug,short_description,position,status,is_learnable,is_required,published_revision_id').eq('status','published').order('position'),
    db.from('learner_path_enrollments').select('domain_node_id,is_active').eq('user_id',user.id),
    db.from('lesson_completions').select('lesson_id').eq('user_id',user.id),
    db.from('node_intro_completions').select('node_id').eq('user_id',user.id)
  ]);
  for(const result of [nodesResult,enrollmentsResult,completionsResult,introsResult]) if(result.error)throw result.error;
  const nodes=(nodesResult.data||[]) as PathNode[];
  const domains=nodes.filter(n=>n.node_type==='domain'&&n.parent_id===null).sort((a,b)=>a.position-b.position);
  const enrollments=(enrollmentsResult.data||[]) as PathEnrollment[];
  const active=domains.find(d=>enrollments.some(e=>e.domain_node_id===d.id&&e.is_active));
  const archivedSelection=!active&&enrollments.some(e=>e.is_active);
  const completed=new Set<string>([
    ...(completionsResult.data||[]).map(c=>c.lesson_id),
    ...(introsResult.data||[]).map(c=>c.node_id)
  ]);
  return {nodes,domains,enrollments,active,archivedSelection,completed};
}
