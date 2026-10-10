'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { action } from '@/lib/client-api';
import { levels,type Level,type SetupNode } from '@/lib/setup-shared';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { Checkbox } from '@/components/ui/checkbox';

export function SetupForm({level,nodes,node,initialParentId}:{level:Level;nodes:SetupNode[];node?:SetupNode;initialParentId?:string}){
 const router=useRouter();const config=levels[level];
 const [minutes,setMinutes]=useState(7),[policy,setPolicy]=useState<'intro'|'lesson'|'checkpoint'>(level==='topics'?'lesson':'intro');
 const [title,setTitle]=useState(node?.title||''),[slug,setSlug]=useState(node?.slug||''),[description,setDescription]=useState(node?.short_description||''),[icon,setIcon]=useState(node?.icon||''),[coverUrl,setCoverUrl]=useState(node?.cover_url||''),[parentId,setParentId]=useState(node?.parent_id||initialParentId||''),[position,setPosition]=useState(node?.position||1),[learnable,setLearnable]=useState(node?.is_learnable??(level==='topics')),[required,setRequired]=useState(node?.is_required??true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const parents=nodes.filter(n=>n.node_type===(level==='sections'?'domain':'section')&&n.status!=='archived');
 const siblingCount=nodes.filter(n=>n.parent_id===(parentId||null)&&n.id!==node?.id).length;
 const selectedParent=parents.find(n=>n.id===parentId);
 const domainOf=(section:SetupNode)=>nodes.find(n=>n.id===section.parent_id)?.title||'Unknown domain';
 async function save(){setBusy(true);setError('');try{
  if(config.parent&&!parentId)throw new Error('Choose a parent.');
  if(!node&&learnable===(policy==='intro'))throw new Error('Introduction policy needs a non-lesson node; lessons and checkpoints must be learnable.');
  if(position<1||position>siblingCount+1)throw new Error(`Position must be between 1 and ${siblingCount+1}.`);
  const common={parentId:parentId||null,title,slug,description,icon,coverUrl,position,learnable,required};
  if(node){await action({action:'setupUpdate',nodeId:node.id,expected:node.updated_at,...common});router.push(`/admin/setup/${level}/${node.id}`);}
  else{const id=await action<string>({action:'setupCreate',nodeType:config.type,minutes,policy,...common});router.push(`/admin/setup/${level}/${id}`);}
  router.refresh();
 }catch(e){setError(e instanceof Error?e.message:'Could not save this node.');}finally{setBusy(false);}}
 return <form className="stack" onSubmit={e=>{e.preventDefault();void save();}}>
  {error&&<div className="error" role="alert">{error}</div>}
  <Card><CardContent><h2>Basic information</h2><div className="editor-grid"><div><label htmlFor="setup-title">Title</label><Input id="setup-title" required minLength={2} maxLength={120} value={title} onChange={e=>{const value=e.target.value;setTitle(value);if(!node)setSlug(value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''));}}/></div><div><label htmlFor="setup-slug">Slug</label><Input id="setup-slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={slug} onChange={e=>setSlug(e.target.value)}/></div><div><label htmlFor="setup-icon">Icon</label><Input id="setup-icon" maxLength={20} value={icon} onChange={e=>setIcon(e.target.value)}/></div><div><label htmlFor="setup-cover">Cover image URL</label><Input id="setup-cover" type="url" value={coverUrl} onChange={e=>setCoverUrl(e.target.value)} placeholder="https://"/></div></div><label htmlFor="setup-description">Short description</label><Textarea id="setup-description" maxLength={500} value={description} onChange={e=>setDescription(e.target.value)}/></CardContent></Card>
  <Card><CardContent><h2>Placement</h2>{config.parent&&<><label htmlFor="setup-parent">{level==='sections'?'Learning Domain':'Section'}</label><NativeSelect id="setup-parent" required value={parentId} onChange={e=>{setParentId(e.target.value);setPosition(1);}}><option value="">Choose a parent</option>{parents.map(p=><option key={p.id} value={p.id}>{level==='topics'?domainOf(p)+' / ':''}{p.title} ({p.status})</option>)}</NativeSelect>{!parents.length&&<p className="notice">No available parent. Create and publish the parent first.</p>}{node?.parent_id&&!selectedParent&&<p className="error" role="alert">The current parent is unavailable. Choose another parent before saving.</p>}{selectedParent&&<p className="small muted">Current parent: {selectedParent.title}</p>}</>}<label htmlFor="setup-position">Position among siblings</label><Input id="setup-position" type="number" min="1" max={siblingCount+1} value={position} onChange={e=>setPosition(Number(e.target.value))}/><label className="inline-check"><Checkbox checked={required} onChange={e=>setRequired(e.target.checked)}/> Required for aggregate progress</label></CardContent></Card>
  <Card><CardContent><h2>Learning settings</h2><label className="inline-check"><Checkbox checked={learnable} onChange={e=>{setLearnable(e.target.checked);if(!node)setPolicy(e.target.checked?'lesson':'intro');}}/> Has a lesson or checkpoint completion</label>{!node?<div className="editor-grid"><div><label htmlFor="setup-duration">Estimated duration, minutes</label><Input id="setup-duration" type="number" min={1} max={180} value={minutes} onChange={e=>setMinutes(Number(e.target.value))}/></div><div><label htmlFor="setup-policy">Completion policy</label><NativeSelect id="setup-policy" value={policy} onChange={e=>{const next=e.target.value as typeof policy;setPolicy(next);setLearnable(next!=='intro');}}><option value="intro">Introduction read</option><option value="lesson">Lesson with checks</option><option value="checkpoint">Applied checkpoint</option></NativeSelect></div></div>:<p className="small muted">Change duration and completion policy in the Material tab.</p>}<p className="small muted">Introduction material on a Domain or Section can be marked read independently from child progress.</p></CardContent></Card>
  <Card><CardContent><h2>Publication</h2><p>Status: <strong>{node?.status||'draft'}</strong>. New nodes are saved as drafts. Publish their material, then publish the node.</p><div className="row wrap"><button className="button" type="submit" disabled={busy||!title.trim()||!slug}>{busy?'Saving…':node?'Save changes':'Create draft'}</button>{node&&<Link className="button secondary" href={`/admin/materials/${node.id}`}>Manage material</Link>}<Link className="textbtn" href={node?`/admin/setup/${level}/${node.id}`:`/admin/setup/${level}`}>Cancel</Link></div></CardContent></Card>
 </form>;
}
