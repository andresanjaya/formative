export const levels = {
  domains: { type:'domain', singular:'Learning Domain', plural:'Learning Domains', parent:null, child:'sections' },
  sections: { type:'section', singular:'Section', plural:'Sections', parent:'domains', child:'topics' },
  topics: { type:'topic', singular:'Topic', plural:'Topics', parent:'sections', child:null }
} as const;
export type Level = keyof typeof levels;
export function levelFor(type:string):Level { return type==='domain'?'domains':type==='section'?'sections':'topics'; }
export type SetupNode = {
 id:string;parent_id:string|null;node_type:'domain'|'section'|'topic';title:string;slug:string;
 short_description:string;icon:string|null;cover_url:string|null;position:number;status:'draft'|'published'|'archived';
 is_learnable:boolean;is_required:boolean;published_revision_id:string|null;created_at:string;updated_at:string;archived_at:string|null;
};
