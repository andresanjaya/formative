import { notFound } from 'next/navigation';
import { loadLesson } from '@/lib/data';
import { LessonPlayer } from '@/components/LessonPlayer';
export default async function LessonPage({params}:{params:Promise<{lessonId:string}>}){const {lessonId}=await params;const data=await loadLesson(lessonId);if(!data)notFound();return <LessonPlayer data={data}/>}
