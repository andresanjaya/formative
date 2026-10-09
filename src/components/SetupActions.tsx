'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { action } from '@/lib/client-api';
import { levelFor,type SetupNode } from '@/lib/setup-shared';

export function SetupActions({node,affectedChildren,canDelete=false}:{node:SetupNode;affectedChildren:SetupNode[];canDelete?:boolean}){
 const router=useRouter();const [busy,setBusy]=useState(false),[error,setError]=useState('');const level=levelFor(node.node_type);
 async function change(transition:'archive'|'restore'|'publish'|'delete'){
  const childNames=affectedChildren.map(c=>c.title).join(', ');
  if(transition==='archive'&&affectedChildren.length&&!window.confirm(`Archive ${node.title}? Its ${affectedChildren.length} child node(s) will become unavailable to learners while this parent is archived: ${childNames}. Their records and publication states will stay intact.`))return;
  if(transition==='delete'&&!window.confirm(`Permanently delete the unused draft ${node.title}?`))return;
  setBusy(true);setError('');try{await action({action:'setupTransition',nodeId:node.id,transition,confirmChildren:transition==='archive'&&affectedChildren.length>0});if(transition==='delete')router.push(`/admin/setup/${level}`);else router.refresh();}catch(e){setError(e instanceof Error?e.message:'Action failed.');}finally{setBusy(false);}
 }
 return <><details className="tree-menu"><summary aria-label={`Actions for ${node.title}`}>Actions</summary><div className="tree-actions"><Link href={`/admin/setup/${level}/${node.id}`}>View</Link><Link href={`/admin/setup/${level}/${node.id}/edit`}>Edit</Link><Link href={`/admin/materials/${node.id}`}>Manage material</Link>{node.node_type==='topic'&&<><Link href={'/admin/materials/'+node.id+'?tab=resources'}>Manage resources</Link><Link href={'/admin/materials/'+node.id+'?tab=questions'}>Manage questions</Link></>}{node.node_type!=='topic'&&<Link href={`/admin/setup/${node.node_type==='domain'?'sections':'topics'}/new?parent=${node.id}`}>Add {node.node_type==='domain'?'Section':'Topic'}</Link>}<Link href={`/admin/materials/${node.id}?preview=1`}>Preview</Link>{node.status==='draft'&&<button type="button" disabled={busy||!node.published_revision_id} onClick={()=>void change('publish')}>Publish</button>}{node.status!=='archived'&&<button type="button" disabled={busy} onClick={()=>void change('archive')}>Archive</button>}{node.status==='archived'&&<button type="button" disabled={busy} onClick={()=>void change('restore')}>Restore to draft</button>}{canDelete&&<button type="button" disabled={busy} onClick={()=>void change('delete')}>Delete</button>}</div></details>{error&&<span className="error" role="alert">{error}</span>}</>;
}
