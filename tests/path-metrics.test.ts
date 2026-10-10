import { describe,expect,it } from 'vitest';
import { pathStats,type PathNode } from '../src/lib/path-metrics';

const node=(id:string,parent_id:string|null,node_type:PathNode['node_type'],content=false,learnable=false,required=false):PathNode=>({
  id,parent_id,node_type,title:id,slug:id,short_description:'',position:1,status:'published',
  is_learnable:learnable,is_required:required,published_revision_id:content?'revision':null
});

describe('learning path metrics',()=>{
  it('keeps empty roadmap nodes visible without adding progress requirements',()=>{
    const domain=node('research',null,'domain');
    const section=node('discover','research','section');
    const topic=node('interviews','discover','topic');
    expect(pathStats([domain,section,topic],domain,new Set())).toEqual({sections:1,topics:1,available:0,done:0,total:0,percent:0});
  });
  it('counts only authored, required, learnable nodes and preserves prior completion',()=>{
    const domain=node('thinking',null,'domain');
    const section=node('prelaunch','thinking','section',true,false,false);
    const vision=node('vision','prelaunch','topic',true,true,true);
    const roadmap=node('strategy','prelaunch','topic',false,false,false);
    const optional=node('extra','prelaunch','topic',true,true,false);
    expect(pathStats([domain,section,vision,roadmap,optional],domain,new Set(['vision']))).toEqual({sections:1,topics:3,available:3,done:1,total:1,percent:100});
  });
});
