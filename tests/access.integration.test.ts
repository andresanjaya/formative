import { describe,expect,it,beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const aEmail=process.env.TEST_LEARNER_A_EMAIL, aPassword=process.env.TEST_LEARNER_A_PASSWORD;
const bEmail=process.env.TEST_LEARNER_B_EMAIL, bPassword=process.env.TEST_LEARNER_B_PASSWORD;
const enabled=Boolean(url&&key&&aEmail&&aPassword&&bEmail&&bPassword);
const lessonId='10000000-0000-4000-8000-000000000012';

describe.skipIf(!enabled)('live Supabase access boundaries',()=>{
 let a:SupabaseClient,b:SupabaseClient,aId:string,bId:string;
 beforeAll(async()=>{
  a=createClient(url!,key!,{auth:{persistSession:false}});b=createClient(url!,key!,{auth:{persistSession:false}});
  const [sa,sb]=await Promise.all([a.auth.signInWithPassword({email:aEmail!,password:aPassword!}),b.auth.signInWithPassword({email:bEmail!,password:bPassword!})]);
  if(sa.error||sb.error||!sa.data.user||!sb.data.user)throw new Error('Test learner sign-in failed');
  aId=sa.data.user.id;bId=sb.data.user.id;
 });
 it('cannot read another learner profile, attempts, reflections or activity',async()=>{
  for(const table of ['profiles','attempts','reflections','daily_activity']){
   const {data,error}=await a.from(table).select('*').eq(table==='profiles'?'id':'user_id',bId);
   expect(error).toBeNull();expect(data).toEqual([]);
  }
 });
 it('cannot grant Admin or forge progress with direct writes',async()=>{
  const role=await a.from('user_roles').insert({user_id:aId,role:'admin'});
  expect(role.error).not.toBeNull();
  const forged=await a.from('lesson_completions').insert({user_id:aId,lesson_id:lessonId,attempt_id:crypto.randomUUID(),revision_id:crypto.randomUUID()});
  expect(forged.error).not.toBeNull();
  const activity=await a.from('daily_activity').insert({user_id:aId,local_date:'2026-10-08',qualifying_count:99});
  expect(activity.error).not.toBeNull();
 });
 it('cannot read private keys or unpublished revisions',async()=>{
  const keys=await a.schema('private').from('answer_keys').select('*');
  expect(keys.error).not.toBeNull();
  const revisions=await a.from('lesson_revisions').select('id,state').eq('state','draft');
  expect(revisions.error).toBeNull();expect(revisions.data).toEqual([]);
 });
 it('cannot publish or save an Admin draft',async()=>{
  const result=await a.rpc('admin_publish',{p_lesson:lessonId,p_expected:1});
  expect(result.error).not.toBeNull();
 });
});
