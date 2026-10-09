import { notFound } from 'next/navigation';
import { learnerContext } from '@/lib/auth';
import { Shell } from '@/components/Shell';
import { CheckpointForm } from '@/components/CheckpointForm';
import { UpgradeButton } from '@/components/UpgradeButton';

export default async function CheckpointNode({params}:{params:Promise<{nodeId:string}>}){
 const {nodeId}=await params;const {db,user}=await learnerContext();
 const [{data:node},{data:draft},{data:latest},{data:enrollment}]=await Promise.all([
  db.from('curriculum_nodes').select('id,title,published_revision_id').eq('id',nodeId).eq('status','published').maybeSingle(),
  db.from('checkpoint_drafts').select('project_name,answers').eq('user_id',user.id).eq('node_id',nodeId).maybeSingle(),
  db.from('checkpoint_submissions').select('revision_number').eq('user_id',user.id).eq('node_id',nodeId).order('revision_number',{ascending:false}).limit(1).maybeSingle(),
  db.from('enrollments').select('curriculum_version_id').eq('user_id',user.id).maybeSingle()
 ]);
 if(!node?.published_revision_id)notFound();
 const {data:version}=enrollment?.curriculum_version_id?await db.from('curriculum_versions').select('manifest').eq('id',enrollment.curriculum_version_id).maybeSingle():{data:null};
 if(!Array.isArray(version?.manifest)||!version.manifest.includes(nodeId))return <Shell title={node.title}><h1>{node.title}</h1><UpgradeButton/></Shell>;
 const {data:revision}=await db.from('lesson_revisions').select('completion_policy,checkpoint_fields,rubric_criteria').eq('id',node.published_revision_id).maybeSingle();
 if(revision?.completion_policy!=='checkpoint')notFound();
 return <Shell title={node.title}><div className="tag">APPLIED CHECKPOINT</div><h1>{node.title}</h1><p className="muted">Your draft saves as you work. Each submission remains in your private artifacts.</p><CheckpointForm nodeId={node.id} draft={draft} latestRevision={latest?.revision_number||0} fieldOrder={revision.checkpoint_fields} rubricOrder={revision.rubric_criteria}/></Shell>;
}
