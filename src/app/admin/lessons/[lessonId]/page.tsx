import { notFound } from 'next/navigation';
import { adminContext } from '@/lib/auth';
import { Shell } from '@/components/Shell';
import { AdminEditor } from '@/components/AdminEditor';
export default async function EditLesson({params}:{params:Promise<{lessonId:string}>}){const {lessonId}=await params;const {db}=await adminContext();const {data:lesson}=await db.from('lessons').select('id,title,published_revision_id').eq('id',lessonId).maybeSingle();if(!lesson)notFound();const {data:editor,error}=await db.rpc('admin_get_lesson',{p_lesson:lessonId});if(error||!editor?.revision)notFound();return <Shell title={lesson.title} admin><div className="tag">LESSON EDITOR</div><h1>{lesson.title}</h1><p className="muted">Draft → Preview → Publish. Learners keep the previous revision until publication succeeds.</p><AdminEditor lesson={lesson} initial={editor}/></Shell>}
