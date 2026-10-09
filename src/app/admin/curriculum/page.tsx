import { adminContext } from '@/lib/auth';
import { Shell } from '@/components/Shell';
import { AdminTree } from '@/components/AdminTree';
export default async function Curriculum(){
 const {db}=await adminContext();
 const [{data:nodes,error},{data:revisions}]=await Promise.all([
  db.from('curriculum_nodes').select('id,parent_id,node_type,title,slug,short_description,icon,position,status,is_learnable,published_revision_id').order('position'),
  db.from('lesson_revisions').select('lesson_id')
 ]);
 if(error)throw error;
 const contentIds=new Set((revisions||[]).map(r=>r.lesson_id));
 return <Shell title="Curriculum" admin><div className="tag">PRODUCT DESIGN FOUNDATIONS</div><h1>Curriculum</h1><p className="muted">Build any depth of learning content. Publishing a parent does not publish its draft children.</p><AdminTree nodes={(nodes||[]).map(n=>({...n,has_content:contentIds.has(n.id)}))}/></Shell>;
}

