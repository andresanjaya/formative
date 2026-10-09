import { notFound } from 'next/navigation';
import { loadLesson } from '@/lib/data';
import { LessonPlayerV2 } from '@/components/LessonPlayerV2';
import { HierarchyPage } from '@/components/HierarchyPage';
export default async function LessonPage({params}:{params:Promise<{lessonId:string}>}){const {lessonId}=await params;if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lessonId))return <HierarchyPage slugs={[lessonId]}/>;const data=await loadLesson(lessonId);if(!data)notFound();return <LessonPlayerV2 data={data}/>}
