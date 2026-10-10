import { hierarchyPath } from './hierarchy';

export type PathNode = {
  id:string; parent_id:string|null; node_type:'domain'|'section'|'topic';
  title:string; slug:string; short_description:string; position:number;
  status:string; is_learnable:boolean; is_required:boolean;
  published_revision_id:string|null;
};

export function domainOf(nodes:PathNode[],node:PathNode):PathNode|undefined {
  return hierarchyPath(nodes,node)[0];
}

export function pathStats(nodes:PathNode[],domain:PathNode,completed:Set<string>){
  const descendants=nodes.filter(n=>n.id!==domain.id&&domainOf(nodes,n)?.id===domain.id);
  const eligible=[domain,...descendants].filter(n=>n.is_learnable&&n.is_required&&n.published_revision_id);
  const done=eligible.filter(n=>completed.has(n.id)).length;
  return {
    sections:descendants.filter(n=>n.node_type==='section').length,
    topics:descendants.filter(n=>n.node_type==='topic').length,
    available:[domain,...descendants].filter(n=>n.published_revision_id).length,
    done,total:eligible.length,
    percent:eligible.length?Math.round(done*100/eligible.length):0
  };
}
