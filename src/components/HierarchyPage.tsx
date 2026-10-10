/* eslint-disable @next/next/no-img-element -- Curator supplied cover URLs can use arbitrary hosts. */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Shell } from './Shell';
import { IntroComplete } from './IntroComplete';
import { ContentBlocks } from './ContentBlocks';
import { LessonPlayerV2 } from './LessonPlayerV2';
import { PathAction } from './PathAction';
import { learnerContext } from '@/lib/auth';
import { loadLesson } from '@/lib/data';
import { hierarchyPath,resolvePublishedPath,requiredDescendantProgress } from '@/lib/hierarchy';
import { Card, CardContent } from '@/components/ui/card';

type Node={id:string;parent_id:string|null;status:string;node_type:string;title:string;slug:string;short_description:string;cover_url:string|null;position:number;is_learnable:boolean;is_required:boolean;published_revision_id:string|null};
type Revision={id:string;lesson_id:string;introduction:string;outcome:string;content:{type:string;title?:string;text:string}[];resource_cards:{title:string;url:string;publisher:string}[];completion_policy:string;estimated_minutes:number};
const href=(nodes:Node[],node:Node)=>'/learn/'+hierarchyPath(nodes,node).map(n=>n.slug).join('/');

export async function HierarchyPage({slugs}:{slugs:string[]}){
  const {db,user}=await learnerContext();
  const {data,error}=await db.from('curriculum_nodes').select('id,parent_id,status,node_type,title,slug,short_description,cover_url,position,is_learnable,is_required,published_revision_id').eq('status','published').order('position');
  if(error)notFound();
  const nodes=(data||[]) as Node[];
  const current=resolvePublishedPath(nodes,slugs);
  if(!current||current.node_type!==['domain','section','topic'][slugs.length-1])notFound();
  const crumbs=hierarchyPath(nodes,current);
  const domain=crumbs[0];
  const {data:enrollments,error:enrollmentError}=await db.from('learner_path_enrollments').select('domain_node_id,is_active').eq('user_id',user.id);
  if(enrollmentError&&enrollmentError.code!=='PGRST205')throw enrollmentError;
  const activeDomain=nodes.find(n=>n.node_type==='domain'&&enrollments?.some(e=>e.is_active&&e.domain_node_id===n.id));

  const revisionIds=nodes.map(n=>n.published_revision_id).filter((id):id is string=>Boolean(id));
  const [{data:revisions},{data:intros},{data:completions}]=await Promise.all([
    db.from('lesson_revisions').select('id,lesson_id,introduction,outcome,content,resource_cards,completion_policy,estimated_minutes').in('id',revisionIds.length?revisionIds:['00000000-0000-0000-0000-000000000000']),
    db.from('node_intro_completions').select('node_id').eq('user_id',user.id),
    db.from('lesson_completions').select('lesson_id').eq('user_id',user.id)
  ]);
  const byRevision=new Map(((revisions||[]) as Revision[]).map(r=>[r.id,r]));
  const introDone=new Set((intros||[]).map(i=>i.node_id));
  const lessonDone=new Set((completions||[]).map(c=>c.lesson_id));
  const ownDone=(n:Node)=>byRevision.get(n.published_revision_id||'')?.completion_policy==='intro'?introDone.has(n.id):lessonDone.has(n.id);
  const own=byRevision.get(current.published_revision_id||'');
  const children=nodes.filter(n=>n.parent_id===current.id).sort((a,b)=>a.position-b.position);
  const allCompleted=new Set(nodes.filter(ownDone).map(n=>n.id));
  const progress=requiredDescendantProgress(nodes,current,allCompleted);
  const recommended=nodes.find(n=>n.id!==current.id&&n.is_learnable&&n.published_revision_id&&!ownDone(n)&&hierarchyPath(nodes,n).some(p=>p.id===current.id));
  const lessonData=own?.completion_policy==='lesson'?await loadLesson(current.id):null;

  return <Shell title={current.title}>
    <nav className="setup-crumbs" aria-label="Curriculum breadcrumb"><Link href="/learn/paths">Learning paths</Link>{crumbs.map(n=><span key={n.id}> / <Link href={href(nodes,n)}>{n.title}</Link></span>)}</nav>
    <div className="row wrap"><div><div className="tag space">{current.node_type.toUpperCase()} · {own?ownDone(current)?'OWN MATERIAL COMPLETE':'MATERIAL AVAILABLE':'ROADMAP ONLY'}</div><h1>{current.title}</h1></div>
      {!enrollmentError&&<div className="row wrap"><Link className="button secondary" href="/learn/paths">Explore paths</Link>{activeDomain?.id===domain.id?<Link className="button secondary" href={`/learn/${domain.slug}`}>Continue current path</Link>:<PathAction domainId={domain.id} slug={domain.slug} label="Switch to this path"/>}</div>}
    </div>
    <p className="muted">{current.short_description}</p>
    {current.cover_url&&<img className="hierarchy-cover space" src={current.cover_url} alt=""/>}
    {own?.completion_policy==='intro'&&<Card className="space"><CardContent><div className="tag">OWN MATERIAL · {own.estimated_minutes} MIN</div>{own.introduction&&<p>{own.introduction}</p>}<ContentBlocks blocks={own.content}/>{introDone.has(current.id)?<p className="feedback">Own material completed. Child progress is tracked separately.</p>:<IntroComplete nodeId={current.id}/>}</CardContent></Card>}
    {own?.completion_policy==='lesson'&&(lessonData?<section className="space"><Card><CardContent><h2>Own material</h2><LessonPlayerV2 data={lessonData} embedded/></CardContent></Card></section>:<Card className="space"><CardContent><p>This material is published but is not in your enrolled curriculum version.</p></CardContent></Card>)}
    {own?.completion_policy==='checkpoint'&&<Card className="space"><CardContent><h2>Applied checkpoint</h2><Link className="button" href={'/checkpoint/'+current.id}>Open checkpoint</Link></CardContent></Card>}
    {!own&&<Card className="space"><CardContent><h2>{current.node_type==='topic'?'Content coming soon':'Roadmap ready · Lessons coming soon'}</h2><p className="muted">{current.node_type==='topic'?'This topic has no learning material yet. You can explore its place in the roadmap.':'Explore the published path below.'}</p></CardContent></Card>}
    {children.length>0?<section className="space"><Card><CardContent><div className="row wrap"><h2>{current.node_type==='domain'?'Sections':'Topics'}</h2><span className="small muted">Required learnable descendants: {progress.done} of {progress.total} completed</span></div>
      <div className="meter" role="progressbar" aria-label="Required child progress" aria-valuenow={progress.done} aria-valuemax={progress.total}><span style={{width:progress.total?`${Math.round(progress.done*100/progress.total)}%`:'0%'}}/></div>
      <div className="tree-cards space">{children.map(child=>{const related=nodes.filter(n=>n.parent_id===child.id);return <Link key={child.id} className="tree-card" href={href(nodes,child)}><Card className="h-full"><CardContent><div className="tag">{child.node_type} · {child.published_revision_id?ownDone(child)?'Own material complete':'Content available':'Roadmap only'}</div><h3>{child.title}</h3><p className="small muted">{child.short_description}</p>{child.node_type==='section'&&<p className="small muted">{related.length} topics · {related.filter(n=>n.published_revision_id).length} with content</p>}</CardContent></Card></Link>})}</div>
      {recommended&&<Link className="button space" href={href(nodes,recommended)}>Recommended next: {recommended.title} →</Link>}
    </CardContent></Card></section>:current.node_type!=='topic'&&<Card className="space"><CardContent><h2>No {current.node_type==='domain'?'Sections':'Topics'} yet</h2><p className="muted">Check back as this roadmap grows.</p></CardContent></Card>}
  </Shell>;
}
