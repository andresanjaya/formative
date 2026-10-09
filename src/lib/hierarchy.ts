export type HierarchyNode={id:string;parent_id:string|null;slug:string;status?:string;is_required?:boolean;published_revision_id?:string|null};

export function hierarchyPath<T extends HierarchyNode>(nodes:T[],node:T):T[]{
 const result:T[]=[];const seen=new Set<string>();let current:T|undefined=node;
 while(current&&!seen.has(current.id)){result.unshift(current);seen.add(current.id);current=nodes.find(n=>n.id===current?.parent_id)}
 return result;
}

export function resolvePublishedPath<T extends HierarchyNode>(nodes:T[],slugs:string[]):T|undefined{
 let parentId:string|null=null,current:T|undefined;
 for(const slug of slugs){current=nodes.find(n=>n.parent_id===parentId&&n.slug===slug&&n.status==='published');if(!current)return;parentId=current.id;}
 return current;
}

export function requiredDescendantProgress<T extends HierarchyNode>(nodes:T[],root:T,completed:Set<string>){
 const eligible=nodes.filter(n=>n.id!==root.id&&n.is_required&&n.published_revision_id&&hierarchyPath(nodes,n).some(p=>p.id===root.id)&&hierarchyPath(nodes,n).every(p=>p.status==='published'));
 return {done:eligible.filter(n=>completed.has(n.id)).length,total:eligible.length};
}
