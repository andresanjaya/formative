import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Shell } from '@/components/Shell';
import { IntroComplete } from '@/components/IntroComplete';
import { UpgradeButton } from '@/components/UpgradeButton';
import { loadCurriculum, nodeProgress } from '@/lib/curriculum-data';

export default async function NodePage({params}:{params:Promise<{nodeId:string}>}){
 const {nodeId}=await params;
 const {db,user,nodes,completions,required}=await loadCurriculum();
 const node=nodes.find(n=>n.id===nodeId);if(!node)notFound();
 const children=nodes.filter(n=>n.parent_id===nodeId).sort((a,b)=>a.position-b.position);
 const progress=nodeProgress(nodes,nodeId,completions,required);
 const [{data:revision},{data:intro}]=await Promise.all([
  node.published_revision_id?db.from('lesson_revisions').select('introduction,outcome,content,resource_cards,completion_policy,estimated_minutes').eq('id',node.published_revision_id).maybeSingle():Promise.resolve({data:null}),
  db.from('node_intro_completions').select('node_id').eq('user_id',user.id).eq('node_id',nodeId).maybeSingle()
 ]);
 const next=children.find(child=>!completions.has(child.id))||children[0];
 return <Shell title={node.title}><div className="node-page"><Link className="textbtn" href={node.parent_id?'/learn/nodes/'+node.parent_id:'/learn'}>← Back to path</Link><div className="tag space">{node.node_type} · {progress.state}</div><h1>{node.title}</h1><p className="muted">{node.short_description}</p>
  {revision&&<section className="card space"><div className="tag">INTRODUCTION · {revision.estimated_minutes} MIN</div>{revision.introduction&&<p>{revision.introduction}</p>}{(revision.content as {type:string;title?:string;text:string}[]).map((block,i)=>block.type==='heading'?<h2 className="space" key={i}>{block.text}</h2>:block.type==='callout'?<div className="note space" key={i}><strong>{block.title}</strong><p>{block.text}</p></div>:<p key={i}>{block.text}</p>)}{revision.completion_policy==='intro'&&(intro?<p className="feedback">Introduction read. Your child lessons have their own progress.</p>:<IntroComplete nodeId={nodeId}/>)}{revision.completion_policy==='lesson'&&(required.has(nodeId)?<Link className="button space" href={'/learn/'+nodeId}>Study this topic →</Link>:<UpgradeButton/>)}{revision.completion_policy==='checkpoint'&&(required.has(nodeId)?<Link className="button space" href="/checkpoint">Open checkpoint →</Link>:<UpgradeButton/>)}</section>}
  <section className="space"><div className="row wrap"><h2>In this area</h2><span className="small muted">{progress.done} of {progress.total} required descendants complete</span></div><div className="meter" role="progressbar" aria-label="Area progress" aria-valuenow={progress.done} aria-valuemax={progress.total}><span style={{width:progress.total?String(Math.round(progress.done*100/progress.total))+'%':'0%'}}/></div><div className="tree-cards space">{children.map(child=><Link className="card tree-card" key={child.id} href={'/learn/nodes/'+child.id}><span className="tag">{child.node_type} · {completions.has(child.id)?'Completed':'Explore'}</span><h3>{child.title}</h3><p className="small muted">{child.short_description}</p><span className="small">Open →</span></Link>)}</div></section>
  {next&&<Link className="button space" href={'/learn/nodes/'+next.id}>Continue to {next.title} →</Link>}
 </div></Shell>;
}
