import { SetupNew } from '@/components/SetupPages';
import { getLevel } from '@/lib/setup';
export default async function Page({params,searchParams}:{params:Promise<{level:string}>;searchParams:Promise<{parent?:string}>}){
 const [{level},{parent}]=await Promise.all([params,searchParams]);return <SetupNew level={getLevel(level)} parentId={parent}/>;
}
