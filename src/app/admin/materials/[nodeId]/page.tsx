import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Shell } from '@/components/Shell';
import { NodeEditor } from '@/components/NodeEditor';
import { ancestors,levelFor,ownRevision,setupData } from '@/lib/setup';
import { adminContext } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
export default async function Material({params,searchParams}:{params:Promise<{nodeId:string}>;searchParams:Promise<{tab?:string;preview?:string}>}){
 const [{nodeId},query]=await Promise.all([params,searchParams]);const data=await setupData();
 if(!data.ready)return <Shell title="Learning Materials" admin><Card><CardContent>Apply the curriculum migration to manage materials.</CardContent></Card></Shell>;
 const node=data.nodes.find(n=>n.id===nodeId);if(!node)notFound();const {db}=await adminContext();
 const [{data:editor,error},{data:children}]=await Promise.all([db.rpc('admin_get_lesson',{p_lesson:nodeId}),db.from('curriculum_nodes').select('title,status').eq('parent_id',nodeId)]);
 if(error)throw error;
 const path=ancestors(data.nodes,node);
 return <Shell title={node.title} admin><nav className="setup-crumbs" aria-label="Curriculum breadcrumb">{path.map((part,i)=><span key={part.id}>{i?' / ':''}<Link href={`/admin/setup/${levelFor(part.node_type)}/${part.id}`}>{part.title}</Link></span>)}</nav><div className="tag space">{node.node_type.toUpperCase()} MATERIAL</div><h1>{node.title}</h1><p className="muted">Published revision {ownRevision(data.revisions,node).published?.revision_number||'—'} · Draft revision {ownRevision(data.revisions,node).draft?.revision_number||'—'}</p><NodeEditor node={node} initial={{revision:editor?.revision||null,keys:editor?.keys||[]}} childDrafts={(children||[]).filter(c=>c.status==='draft').map(c=>c.title)} history={ownRevision(data.revisions,node).history} initialTab={query.tab} initialPreview={query.preview==='1'} setupMode/></Shell>;
}
