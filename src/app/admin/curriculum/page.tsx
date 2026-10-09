import { adminContext } from '@/lib/auth';
import { Shell } from '@/components/Shell';
import { AdminTree } from '@/components/AdminTree';
import Link from 'next/link';
import { curriculumAvailable } from '@/lib/schema';
import { PILOT_UNIT_ID } from '@/lib/data';
import { redirect } from 'next/navigation';
import { setupData } from '@/lib/setup';
export default async function Curriculum(){
 if((await setupData()).ready)redirect('/admin/setup/domains');
 const {db}=await adminContext();
 if(!await curriculumAvailable(db)){
  const [{data:lessons,error:lessonError},{data:previews,error:previewError}]=await Promise.all([
   db.from('lessons').select('id,title,position,published_revision_id').order('position'),
   db.from('path_previews').select('id,title,position').eq('unit_id',PILOT_UNIT_ID).order('position')
  ]);
  if(lessonError)throw lessonError;
  if(previewError)throw previewError;
  return <Shell title="Curriculum" admin><div className="tag">PRODUCT DESIGN FOUNDATIONS</div><h1>Curriculum</h1><p className="muted">The expanded curriculum is being prepared. The current lesson remains available to edit.</p><div className="stack space">{lessons?.map(lesson=><Link className="card" key={lesson.id} href={'/admin/lessons/'+lesson.id}><h2>{lesson.title}</h2><p className="small muted">{lesson.published_revision_id?'Published lesson':'Draft lesson'} · Open editor →</p></Link>)}{previews?.map(preview=><div className="card" key={preview.id}><h2>{preview.title}</h2><p className="small muted">Available after the curriculum update</p></div>)}</div></Shell>;
 }
 const [{data:nodes,error},{data:revisions}]=await Promise.all([
  db.from('curriculum_nodes').select('id,parent_id,node_type,title,slug,short_description,icon,position,status,is_learnable,published_revision_id').order('position'),
  db.from('lesson_revisions').select('lesson_id')
 ]);
 if(error)throw error;
 const contentIds=new Set((revisions||[]).map(r=>r.lesson_id));
 return <Shell title="Curriculum" admin><div className="tag">PRODUCT DESIGN FOUNDATIONS</div><h1>Curriculum</h1><p className="muted">Build any depth of learning content. Publishing a parent does not publish its draft children.</p><AdminTree nodes={(nodes||[]).map(n=>({...n,has_content:contentIds.has(n.id)}))}/></Shell>;
}

