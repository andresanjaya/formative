import { describe,it,expect } from 'vitest';
import { descendants,nodeProgress,type CurriculumNode } from '../src/lib/curriculum-data';
const node=(id:string,parent_id:string|null,is_learnable=false,status='published',position=1):CurriculumNode=>({id,parent_id,is_learnable,status,position,node_type:'topic',title:id,slug:id,short_description:'',icon:'◇',published_revision_id:'revision'});
describe('published descendant progress',()=>{
 const nodes=[node('thinking',null),node('prelaunch','thinking'),node('vision','prelaunch',true),node('strategy','prelaunch'),node('problem','strategy',true),node('draft','thinking',true,'draft')];
 it('finds content nested beyond three levels',()=>{expect(descendants(nodes,'thinking').map(n=>n.id)).toContain('problem');});
 it('counts only required published descendants and keeps parent introduction separate',()=>{
  const result=nodeProgress(nodes,'thinking',new Set(['thinking','vision']),new Set(['vision','problem','draft']));
  expect(result).toEqual({done:1,total:2,state:'In progress'});
 });
 it('preserves completion across version expansion',()=>{
  const completed=new Set(['vision']);
  expect(nodeProgress(nodes,'thinking',completed,new Set(['vision']))).toMatchObject({done:1,total:1,state:'Completed'});
  expect(nodeProgress(nodes,'thinking',completed,new Set(['vision','problem']))).toMatchObject({done:1,total:2,state:'In progress'});
 });
});
