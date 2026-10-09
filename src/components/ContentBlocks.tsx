/* eslint-disable @next/next/no-img-element -- Curator supplied image URLs can use arbitrary hosts. */
export type ContentBlock={type:string;title?:string;text:string};
export function ContentBlocks({blocks}:{blocks:ContentBlock[]}){
 return <>{blocks.map((block,i)=>{
  switch(block.type){
   case 'heading':return <h2 className="space" key={i}>{block.text}</h2>;
   case 'list':return <ul className="space" key={i}>{block.text.split('\n').filter(Boolean).map((item,j)=><li key={j}>{item}</li>)}</ul>;
   case 'image':return <figure className="space" key={i}><img className="content-image" src={block.text} alt={block.title||''}/>{block.title&&<figcaption className="small muted">{block.title}</figcaption>}</figure>;
   case 'callout':return <div className="note space" key={i}><strong>{block.title}</strong><p>{block.text}</p></div>;
   case 'example':return <div className="card space" key={i}><div className="tag">EXAMPLE</div>{block.title&&<h3>{block.title}</h3>}<p>{block.text}</p></div>;
   case 'resource_card':return <a className="resource card space" key={i} href={block.text} target="_blank" rel="noopener noreferrer">{block.title||block.text} ↗</a>;
   case 'question':return <div className="card space" key={i}><div className="tag">REFLECT</div><p>{block.text}</p></div>;
   case 'reflection':return <div className="note space" key={i}><strong>{block.title||'Reflection'}</strong><p>{block.text}</p></div>;
   default:return <p className="space" key={i}>{block.text}</p>;
  }
 })}</>;
}
