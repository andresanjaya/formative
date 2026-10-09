import { HierarchyPage } from '@/components/HierarchyPage';
export default async function Topic({params}:{params:Promise<{lessonId:string;sectionSlug:string;topicSlug:string}>}){const {lessonId,sectionSlug,topicSlug}=await params;return <HierarchyPage slugs={[lessonId,sectionSlug,topicSlug]}/>}
