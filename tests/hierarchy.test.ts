import { describe,expect,it } from 'vitest';
import { hierarchyPath,requiredDescendantProgress,resolvePublishedPath } from '../src/lib/hierarchy';

const nodes=[
 {id:'d',parent_id:null,slug:'product-thinking',status:'published',is_required:true,published_revision_id:'rd'},
 {id:'s',parent_id:'d',slug:'pre-launch',status:'published',is_required:true,published_revision_id:'rs'},
 {id:'t',parent_id:'s',slug:'product-vision',status:'published',is_required:true,published_revision_id:'rt'},
 {id:'optional',parent_id:'s',slug:'extra',status:'published',is_required:false,published_revision_id:'ro'},
 {id:'draft',parent_id:'s',slug:'draft',status:'draft',is_required:true,published_revision_id:'rx'},
 {id:'archived',parent_id:'d',slug:'archived',status:'archived',is_required:true,published_revision_id:'ra'},
 {id:'hidden',parent_id:'archived',slug:'hidden',status:'published',is_required:true,published_revision_id:'rh'}
];

describe('three-level learner hierarchy',()=>{
 it('uses stored parents for the breadcrumb',()=>{
  expect(hierarchyPath(nodes,nodes[2]).map(n=>n.slug)).toEqual(['product-thinking','pre-launch','product-vision']);
 });
 it('does not expose drafts or archived branches',()=>{
  expect(resolvePublishedPath(nodes,['product-thinking','pre-launch','product-vision'])?.id).toBe('t');
  expect(resolvePublishedPath(nodes,['product-thinking','pre-launch','draft'])).toBeUndefined();
  expect(resolvePublishedPath(nodes,['product-thinking','archived','hidden'])).toBeUndefined();
 });
 it('keeps own completion separate from required descendants',()=>{
  expect(requiredDescendantProgress(nodes,nodes[0],new Set(['d']))).toEqual({done:0,total:2});
  expect(requiredDescendantProgress(nodes,nodes[0],new Set(['s','t','optional']))).toEqual({done:2,total:2});
  expect(requiredDescendantProgress(nodes,nodes[1],new Set(['s']))).toEqual({done:0,total:1});
 });
});
