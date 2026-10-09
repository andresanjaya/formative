import { HierarchyPage } from '@/components/HierarchyPage';
export default async function Section({params}:{params:Promise<{lessonId:string;sectionSlug:string}>}){const {lessonId,sectionSlug}=await params;return <HierarchyPage slugs={[lessonId,sectionSlug]}/>}
