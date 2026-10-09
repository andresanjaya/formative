import { SetupDetail } from '@/components/SetupPages';
import { getLevel } from '@/lib/setup';
export default async function Page({params}:{params:Promise<{level:string;id:string}>}){const {level,id}=await params;return <SetupDetail level={getLevel(level)} id={id} editing/>}
