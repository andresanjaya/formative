import { notFound } from 'next/navigation';
import { adminContext } from './auth';
import { levels,type Level,type SetupNode } from './setup-shared';
export { levels,levelFor } from './setup-shared';
export type { Level,SetupNode } from './setup-shared';
export function getLevel(value:string):Level { if(value in levels)return value as Level; notFound(); }
export type SetupRevision={id:string;lesson_id:string;revision_number:number;state:string;outcome:string;completion_policy:string;estimated_minutes:number;resource_cards:unknown[];question_public:unknown[];review_public:unknown[];published_at:string|null;created_at:string};

export async function setupData(){
 const {db}=await adminContext();
 const probe=await db.from('curriculum_nodes').select('id,is_required,cover_url').limit(1);
 if(probe.error?.code==='PGRST205'||probe.error?.code==='PGRST204'||probe.error?.code==='42703') return {ready:false,nodes:[] as SetupNode[],revisions:[] as SetupRevision[],completionCounts:{} as Record<string,number>};
 if(probe.error)throw probe.error;
 const [{data:nodes,error:nodeError},{data:revisions,error:revisionError},{data:counts,error:countError}]=await Promise.all([
  db.from('curriculum_nodes').select('id,parent_id,node_type,title,slug,short_description,icon,cover_url,position,status,is_learnable,is_required,published_revision_id,created_at,updated_at,archived_at').order('position'),
  db.from('lesson_revisions').select('id,lesson_id,revision_number,state,outcome,completion_policy,estimated_minutes,resource_cards,question_public,review_public,published_at,created_at'),
  db.rpc('admin_setup_completion_counts')
 ]);
 if(nodeError)throw nodeError;
 if(revisionError)throw revisionError;
 if(countError)throw countError;
 return {ready:true,nodes:(nodes||[]) as SetupNode[],revisions:(revisions||[]) as SetupRevision[],completionCounts:(counts||{}) as Record<string,number>};
}

export function ancestors(nodes:SetupNode[],node:SetupNode):SetupNode[]{
 const path:SetupNode[]=[];const seen=new Set<string>();let current:SetupNode|undefined=node;
 while(current&&!seen.has(current.id)){path.unshift(current);seen.add(current.id);current=nodes.find(n=>n.id===current?.parent_id);}
 return path;
}
export function descendants(nodes:SetupNode[],id:string):SetupNode[]{
 const result:SetupNode[]=[];const visit=(parentId:string)=>{for(const child of nodes.filter(n=>n.parent_id===parentId)){result.push(child);visit(child.id)}};visit(id);return result;
}
export function ownRevision(revisions:SetupRevision[],node:SetupNode){
 const own=revisions.filter(r=>r.lesson_id===node.id);
 return {published:own.find(r=>r.id===node.published_revision_id),draft:own.find(r=>r.state==='draft'),history:own.sort((a,b)=>b.revision_number-a.revision_number)};
}
