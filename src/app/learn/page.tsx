import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { UpgradeButton } from '@/components/UpgradeButton';
import { loadCurriculum, PILOT_SEQUENCE } from '@/lib/curriculum-data';
import { learnerContext } from '@/lib/auth';
import { curriculumAvailable } from '@/lib/schema';
import { LegacyLearn } from '@/components/LegacyLearn';

export default async function Learn(){
 const {db}=await learnerContext();
 if(!await curriculumAvailable(db))return <LegacyLearn/>;
 const {nodes,completions,attempts,required,receipt,legacyEnrollment}=await loadCurriculum();
 const sequence=PILOT_SEQUENCE.map(id=>nodes.find(n=>n.id===id)).filter((n):n is NonNullable<typeof n>=>Boolean(n));
 const next=sequence.find(n=>required.has(n.id)&&!completions.has(n.id));
 return <Shell title="Product Design" streak={receipt.current_streak}>
  <div className="grid"><div>
   <div className="tag">YOUR LEARNING PATH</div><h1>Think in Outcomes</h1>
   <p className="muted">Learn → Recall → Apply → Review → Improve. Six connected steps, ending with your own product direction.</p>
   {legacyEnrollment&&<UpgradeButton/>}
   {next&&<div className="card hero space"><div className="tag">YOUR NEXT STEP</div><h2 className="space">{next.title}</h2><p>{next.short_description}</p><Link className="button space" href={next.id===PILOT_SEQUENCE[5]?'/checkpoint':'/learn/'+next.id}>{attempts.has(next.id)?'Resume':'Start'} →</Link></div>}
   <h2 className="section-label">Think in Outcomes</h2><ol className="path">{sequence.map((node,i)=><li key={node.id} style={{listStyle:'none'}}>{required.has(node.id)?<Link className={'node '+(completions.has(node.id)?'done':next?.id===node.id?'current':'')} href={node.id===PILOT_SEQUENCE[5]?'/checkpoint':'/learn/'+node.id}><span className="bubble">{completions.has(node.id)?'✓':i+1}</span><span><span className="node-label">{completions.has(node.id)?'COMPLETE':attempts.has(node.id)?'IN PROGRESS':node.id===next?.id?'UP NEXT':'AVAILABLE'}</span><strong>{node.title}</strong><small>{node.short_description}</small></span></Link>:<div className="node disabled"><span className="bubble">{i+1}</span><span><span className="node-label">OPEN THE FULL UNIT</span><strong>{node.title}</strong><small>{node.short_description}</small></span></div>}</li>)}</ol>
   <h2 className="section-label">Explore Product Thinking</h2><div className="tree-cards">{nodes.filter(n=>!n.parent_id).map(n=><Link key={n.id} className="card tree-card" href={'/learn/nodes/'+n.id}><strong>{n.title}</strong><p className="small muted">{n.short_description}</p><span className="small">Open domain →</span></Link>)}</div>
  </div><aside className="stack"><div className="card"><div className="tag">UNIT PROGRESS</div><div className="progress-big space">{receipt.completed} of {receipt.total}</div><div className="meter" role="progressbar" aria-label="Unit completion" aria-valuenow={receipt.completed} aria-valuemin={0} aria-valuemax={receipt.total}><span style={{width:String(receipt.percent)+'%'}}/></div><p className="small muted">Published required lessons in your enrolled version count.</p></div><div className="card"><div className="tag">DAILY GOAL</div><h2 className="space">{receipt.goal_done?'You learned today!':'One good step today'}</h2><p className="muted">A completed lesson, checkpoint, or due review makes a learning day.</p></div></aside></div>
 </Shell>;
}

