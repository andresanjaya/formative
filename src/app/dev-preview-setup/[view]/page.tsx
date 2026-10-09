import { notFound } from 'next/navigation';
import { Shell } from '@/components/Shell';
import { SetupForm } from '@/components/SetupForm';
import { NodeEditor } from '@/components/NodeEditor';
import type { SetupNode } from '@/lib/setup-shared';

export const dynamic='force-dynamic';
const now='2026-10-09T00:00:00+00:00';
const nodes:SetupNode[]=[
 {id:'10000000-0000-4000-8000-000000000003',parent_id:null,node_type:'domain',title:'Product Thinking',slug:'product-thinking',short_description:'Evidence, choices, outcomes.',icon:null,cover_url:null,position:1,status:'published',is_learnable:false,is_required:true,published_revision_id:'11111111-1111-4111-8111-111111111111',created_at:now,updated_at:now,archived_at:null},
 {id:'50000000-0000-4000-8000-000000000001',parent_id:'10000000-0000-4000-8000-000000000003',node_type:'section',title:'Pre-launch',slug:'pre-launch',short_description:'Set direction before building.',icon:null,cover_url:null,position:1,status:'published',is_learnable:false,is_required:true,published_revision_id:'22222222-2222-4222-8222-222222222222',created_at:now,updated_at:now,archived_at:null}
];
export default async function Preview({params}:{params:Promise<{view:string}>}){
 if(process.env.NODE_ENV!=='development')notFound();const {view}=await params;
 if(view==='form')return <Shell title="Add Topic" admin><div className="notice">Sample data preview · saving requires a real Admin account</div><h1 className="space">Add Topic</h1><SetupForm level="topics" nodes={nodes} initialParentId={nodes[1].id}/></Shell>;
 if(view==='editor')return <Shell title="Product Vision" admin><div className="notice">Sample data preview · saving requires a real Admin account</div><h1 className="space">Product Vision</h1><NodeEditor node={{id:'10000000-0000-4000-8000-000000000012',title:'Product Vision',status:'published'}} initial={{revision:null,keys:[]}} childDrafts={[]} history={[]} setupMode/></Shell>;
 notFound();
}
