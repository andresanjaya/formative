
/* eslint-disable @next/next/no-img-element -- Curator supplied image URLs can use arbitrary hosts. */
import { Card, CardContent } from '@/components/ui/card';
export type ContentBlock={type:string;title?:string;text:string};
export function ContentBlocks({blocks}:{blocks:ContentBlock[]}){
 return <>{blocks.map((block,i)=>{
  switch(block.type){
   case 'heading':return <h2 className="space" key={i}>{block.text}</h2>;
   case 'list':return <ul className="space" key={i}>{block.text.split('\n').filter(Boolean).map((item,j)=><li key={j}>{item}</li>)}</ul>;
   case 'image':return <figure className="space" key={i}><img className="content-image" src={block.text} alt={block.title||''}/>{block.title&&<figcaption className="small muted">{block.title}</figcaption>}</figure>;
   case 'callout':return <div className="note space" key={i}><strong>{block.title}</strong><p>{block.text}</p></div>;
   case 'example':return <Card className="space" key={i}><CardContent><div className="tag">EXAMPLE</div>{block.title&&<h3>{block.title}</h3>}<p>{block.text}</p></CardContent></Card>;
   case 'resource_card':return <a className="resource space" key={i} href={block.text} target="_blank" rel="noopener noreferrer"><Card className="h-full"><CardContent>{block.title||block.text} ↗</CardContent></Card></a>;
   case 'question':return <Card className="space" key={i}><CardContent><div className="tag">REFLECT</div><p>{block.text}</p></CardContent></Card>;
   case 'reflection':return <div className="note space" key={i}><strong>{block.title||'Reflection'}</strong><p>{block.text}</p></div>;
   default:return <p className="space" key={i}>{block.text}</p>;
  }
 })}</>;
}
