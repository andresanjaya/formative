import Link from 'next/link';
import { Shell } from './Shell';
import { PathAction } from './PathAction';
import { loadLearningPaths } from '@/lib/learning-paths';
import { pathStats } from '@/lib/path-metrics';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export async function PathSelection(){
  const {nodes,domains,enrollments,active,archivedSelection,completed}=await loadLearningPaths();
  return <Shell title="Learning paths"><div className="row wrap"><div><div className="tag">CHOOSE YOUR LEARNING PATH</div><h1>What do you want to grow next?</h1><p className="muted">Pick a path to see its roadmap. You can switch later without losing progress.</p></div>{active&&<Link className="button secondary" href={`/learn/${active.slug}`}>Continue current path</Link>}</div>
    {archivedSelection&&<p className="notice space">Your selected path is no longer published. Choose a published path to continue. Your progress is saved.</p>}
    {domains.length===0?<Card className="space"><CardHeader><CardTitle><h2>No learning paths yet</h2></CardTitle><CardDescription>Published paths will appear here when they are ready.</CardDescription></CardHeader></Card>:
    <div className="path-grid space">{domains.map(domain=>{const stats=pathStats(nodes,domain,completed);const started=enrollments.some(e=>e.domain_node_id===domain.id);return <Card className="path-card" key={domain.id}>
      <CardHeader><div className="tag">LEARNING PATH {String(domain.position).padStart(2,'0')}</div><CardTitle><h2>{domain.title}</h2></CardTitle>{domain.short_description&&<CardDescription>{domain.short_description}</CardDescription>}</CardHeader>
      <CardContent><div className="path-card-meta"><span>{stats.sections} Sections</span><span>{stats.topics} Topics</span><span>{stats.available} with content</span></div>
      {stats.available===0?<p className="small path-coming">Roadmap ready · Lessons coming soon</p>:started?<div className="small">{stats.done} of {stats.total} required completed<div className="meter" role="progressbar" aria-label={`${domain.title} progress`} aria-valuenow={stats.done} aria-valuemax={stats.total}><span style={{width:`${stats.percent}%`}}/></div></div>:null}</CardContent>
      <CardFooter className="path-card-actions"><PathAction domainId={domain.id} slug={domain.slug} label={started?'Continue path':'Start path'}/><Link className="textbtn" href={`/learn/${domain.slug}`}>View roadmap</Link></CardFooter>
    </Card>})}</div>}
  </Shell>;
}
