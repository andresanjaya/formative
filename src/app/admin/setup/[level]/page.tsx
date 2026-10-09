import { SetupList } from '@/components/SetupPages';
import { getLevel } from '@/lib/setup';
export default async function Page({params,searchParams}:{params:Promise<{level:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const [{level},filters]=await Promise.all([params,searchParams]);return <SetupList level={getLevel(level)} filters={filters}/>;
}
