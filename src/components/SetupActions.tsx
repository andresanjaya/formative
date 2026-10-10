'use client';
import { MoreHorizontalIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { action } from '@/lib/client-api';
import { levelFor,type SetupNode } from '@/lib/setup-shared';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function SetupActions({node,affectedChildren,canDelete=false}:{node:SetupNode;affectedChildren:SetupNode[];canDelete?:boolean}){
 const router=useRouter();const [busy,setBusy]=useState(false),[error,setError]=useState('');const level=levelFor(node.node_type);
 async function change(transition:'archive'|'restore'|'publish'|'delete'){
  const childNames=affectedChildren.map(c=>c.title).join(', ');
  if(transition==='archive'&&affectedChildren.length&&!window.confirm(`Archive ${node.title}? Its ${affectedChildren.length} child node(s) will become unavailable to learners while this parent is archived: ${childNames}. Their records and publication states will stay intact.`))return;
  if(transition==='delete'&&!window.confirm(`Permanently delete the unused draft ${node.title}?`))return;
  setBusy(true);setError('');try{await action({action:'setupTransition',nodeId:node.id,transition,confirmChildren:transition==='archive'&&affectedChildren.length>0});if(transition==='delete')router.push(`/admin/setup/${level}`);else router.refresh();}catch(e){setError(e instanceof Error?e.message:'Action failed.');}finally{setBusy(false);}
 }
 return <>
  <DropdownMenu>
   <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon" className="size-8" disabled={busy} aria-label={`Actions for ${node.title}`} />}>
    <MoreHorizontalIcon aria-hidden="true" />
   </DropdownMenuTrigger>
   <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={()=>router.push(`/admin/setup/${level}/${node.id}`)}>View</DropdownMenuItem>
    <DropdownMenuItem onClick={()=>router.push(`/admin/setup/${level}/${node.id}/edit`)}>Edit</DropdownMenuItem>
    <DropdownMenuItem onClick={()=>router.push(`/admin/materials/${node.id}`)}>Manage material</DropdownMenuItem>
    {node.node_type==='topic'&&<>
     <DropdownMenuItem onClick={()=>router.push(`/admin/materials/${node.id}?tab=resources`)}>Manage resources</DropdownMenuItem>
     <DropdownMenuItem onClick={()=>router.push(`/admin/materials/${node.id}?tab=questions`)}>Manage questions</DropdownMenuItem>
    </>}
    {node.node_type!=='topic'&&<DropdownMenuItem onClick={()=>router.push(`/admin/setup/${node.node_type==='domain'?'sections':'topics'}/new?parent=${node.id}`)}>Add {node.node_type==='domain'?'Section':'Topic'}</DropdownMenuItem>}
    <DropdownMenuItem onClick={()=>router.push(`/admin/materials/${node.id}?preview=1`)}>Preview</DropdownMenuItem>
    <DropdownMenuSeparator />
    {node.status==='draft'&&<DropdownMenuItem disabled={busy||!node.published_revision_id} onClick={()=>void change('publish')}>Publish</DropdownMenuItem>}
    {node.status!=='archived'&&<DropdownMenuItem disabled={busy} onClick={()=>void change('archive')}>Archive</DropdownMenuItem>}
    {node.status==='archived'&&<DropdownMenuItem disabled={busy} onClick={()=>void change('restore')}>Restore to draft</DropdownMenuItem>}
    {canDelete&&<DropdownMenuItem variant="destructive" disabled={busy} onClick={()=>void change('delete')}>Delete</DropdownMenuItem>}
   </DropdownMenuContent>
  </DropdownMenu>
  {error&&<span className="error" role="alert">{error}</span>}
 </>;
}
