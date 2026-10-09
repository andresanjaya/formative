/* eslint-disable @next/next/no-img-element -- Curator supplied cover URLs can use arbitrary hosts. */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Shell } from './Shell';
import { IntroComplete } from './IntroComplete';
import { ContentBlocks } from './ContentBlocks';
import { LessonPlayerV2 } from './LessonPlayerV2';
import { learnerContext } from '@/lib/auth';
import { loadLesson } from '@/lib/data';
import { hierarchyPath,resolvePublishedPath,requiredDescendantProgress } from '@/lib/hierarchy';

type Node={id:string;parent_id:string|null;status:string;node_type:string;title:string;slug:string;short_description:string;cover_url:string|null;position:number;is_required:boolean;published_revision_id:string|null};
type Revision={id:string;lesson_id:string;introduction:string;outcome:string;content:{type:string;title?:string;text:string}[];resource_cards:{title:string;url:string;publisher:string}[];completion_policy:string;estimated_minutes:number};
const href=(nodes:Node[],node:Node)=>'/learn/'+hierarchyPath(nodes,node).map(n=>n.slug).join('/');

export async function HierarchyPage({slugs}:{slugs:string[]}){
 const {db,user}=await learnerContext();
 const {data,error}=await db.from('curriculum_nodes').select('id,parent_id,status,node_type,title,slug,short_description,cover_url,position,is_required,published_revision_id').eq('status','published').order('position');
 if(error)notFound();const nodes=(data||[]) as Node[];
 const current=resolvePublishedPath(nodes,slugs);
 if(!current||current.node_type!==['domain','section','topic'][slugs.length-1])notFound();
 const revisionIds=nodes.map(n=>n.published_revision_id).filter((id):id is string=>Boolean(id));
 const [{data:revisions},{data:intros},{data:completions}]=await Promise.all([
  db.from('lesson_revisions').select('id,lesson_id,introduction,outcome,content,resource_cards,completion_policy,estimated_minutes').in('id',revisionIds.length?revisionIds:['00000000-0000-0000-0000-000000000000']),
  db.from('node_intro_completions').select('node_id').eq('user_id',user.id),
  db.from('lesson_completions').select('lesson_id').eq('user_id',user.id)
 ]);
 const byRevision=new Map(((revisions||[]) as Revision[]).map(r=>[r.id,r]));
 const introDone=new Set((intros||[]).map(i=>i.node_id)),lessonDone=new Set((completions||[]).map(c=>c.lesson_id));
 const ownDone=(n:Node)=>{const policy=byRevision.get(n.published_revision_id||'')?.completion_policy;return policy==='intro'?introDone.has(n.id):lessonDone.has(n.id)};
 const own=byRevision.get(current.published_revision_id||'');
 const children=nodes.filter(n=>n.parent_id===current.id).sort((a,b)=>a.position-b.position);
 const allCompleted=new Set(nodes.filter(ownDone).map(n=>n.id));
 const progress=requiredDescendantProgress(nodes,current,allCompleted);
 const next=children.find(n=>n.is_required&&!ownDone(n))||children[0];
 const crumbs=hierarchyPath(nodes,current);
 const lessonData=own?.completion_policy==='lesson'?await loadLesson(current.id):null;
 return <Shell title={current.title}><nav className="setup-crumbs" aria-label="Curriculum breadcrumb"><Link href="/learn">Learn</Link>{crumbs.map(n=><span key={n.id}> / <Link href={href(nodes,n)}>{n.title}</Link></span>)}</nav><div className="tag space">{current.node_type.toUpperCase()} · {ownDone(current)?'OWN MATERIAL COMPLETE':'OWN MATERIAL NOT COMPLETED'}</div><h1>{current.title}</h1><p className="muted">{current.short_description}</p>
 {current.cover_url&&<img className="hierarchy-cover space" src={current.cover_url} alt=""/>}
 {own&&own.completion_policy==='intro'&&<section className="card space"><div className="tag">OWN MATERIAL · {own.estimated_minutes} MIN</div>{own.introduction&&<p>{own.introduction}</p>}<ContentBlocks blocks={own.content}/>{introDone.has(current.id)?<p className="feedback">Own material completed. Child progress is tracked separately.</p>:<IntroComplete nodeId={current.id}/>}</section>}
 {own?.completion_policy==='lesson'&&(lessonData?<section className="space"><h2>Own material</h2><LessonPlayerV2 data={lessonData} embedded/></section>:<div className="card space"><p>This material is published but is not in your enrolled curriculum version.</p></div>)}
 {own?.completion_policy==='checkpoint'&&<div className="card space"><h2>Applied checkpoint</h2><Link className="button" href={'/checkpoint/'+current.id}>Open checkpoint</Link></div>}
 {!own&&<div className="card space"><h2>Material is being prepared</h2><p className="muted">Explore the published child path below.</p></div>}
 {children.length>0&&<section className="space"><div className="row wrap"><h2>{current.node_type==='domain'?'Sections':'Topics'}</h2><span className="small muted">Required published descendants: {progress.done} of {progress.total} completed</span></div><div className="meter" role="progressbar" aria-label="Required child progress" aria-valuenow={progress.done} aria-valuemax={progress.total}><span style={{width:progress.total?`${Math.round(progress.done*100/progress.total)}%`:'0%'}}/></div><div className="tree-cards space">{children.map(child=><Link key={child.id} className="card tree-card" href={href(nodes,child)}><div className="tag">{child.node_type} · {ownDone(child)?'Own material complete':'Explore'}</div><h3>{child.title}</h3><p className="small muted">{child.short_description}</p></Link>)}</div>{next&&<Link className="button space" href={href(nodes,next)}>Continue to {next.title} →</Link>}</section>}
 </Shell>;
}
