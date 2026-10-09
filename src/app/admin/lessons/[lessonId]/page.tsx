import { notFound } from 'next/navigation';
import { adminContext } from '@/lib/auth';
import { Shell } from '@/components/Shell';
import { NodeEditor } from '@/components/NodeEditor';
import { AdminEditor } from '@/components/AdminEditor';
import { curriculumAvailable } from '@/lib/schema';
export default async function EditNode({params}:{params:Promise<{lessonId:string}>}){
 const {lessonId}=await params;const {db}=await adminContext();
 if(!await curriculumAvailable(db)){
  const [{data:lesson,error:lessonError},{data:editor,error:editorError}]=await Promise.all([
   db.from('lessons').select('id,title').eq('id',lessonId).maybeSingle(),
   db.rpc('admin_get_lesson',{p_lesson:lessonId})
  ]);
  if(lessonError)throw lessonError;
  if(editorError)throw editorError;
  if(!lesson||!editor?.revision)notFound();
  return <Shell title={lesson.title} admin><div className="tag">LESSON EDITOR</div><h1>{lesson.title}</h1><p className="muted">Save a draft, preview it, then publish.</p><AdminEditor lesson={lesson} initial={{revision:editor.revision,keys:editor.keys||[]}}/></Shell>;
 }
 const [{data:node},{data:children},{data:editor,error}]=await Promise.all([
  db.from('curriculum_nodes').select('id,title,status').eq('id',lessonId).maybeSingle(),
  db.from('curriculum_nodes').select('title,status').eq('parent_id',lessonId),
  db.rpc('admin_get_lesson',{p_lesson:lessonId})
 ]);
 if(!node||error)notFound();
 return <Shell title={node.title} admin><div className="tag">CURRICULUM NODE EDITOR</div><h1>{node.title}</h1><p className="muted">Draft → Preview → Publish. Existing completions remain intact.</p><NodeEditor node={node} initial={{revision:editor?.revision||null,keys:editor?.keys||[]}} childDrafts={(children||[]).filter(c=>c.status==='draft').map(c=>c.title)}/></Shell>;
}

