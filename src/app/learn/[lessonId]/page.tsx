import { notFound } from 'next/navigation';
import { loadLesson } from '@/lib/data';
import { LessonPlayerV2 } from '@/components/LessonPlayerV2';
export default async function LessonPage({params}:{params:Promise<{lessonId:string}>}){const {lessonId}=await params;const data=await loadLesson(lessonId);if(!data)notFound();return <LessonPlayerV2 data={data}/>}
