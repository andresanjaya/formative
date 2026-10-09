alter table public.lesson_revisions add column checkpoint_fields jsonb not null default '[]'::jsonb;
alter table public.lesson_revisions add column rubric_criteria jsonb not null default '[]'::jsonb;

drop policy read_lessons on public.lessons;
create policy read_lessons on public.lessons for select to authenticated using(public.is_admin() or (published_revision_id is not null and public.curriculum_visible(id)));
drop policy read_revisions on public.lesson_revisions;
create policy read_revisions on public.lesson_revisions for select to authenticated using(public.is_admin() or (state='published' and public.curriculum_visible(lesson_id)) or exists(select 1 from public.attempts a where a.revision_id=lesson_revisions.id and a.user_id=auth.uid()) or exists(select 1 from public.lesson_completions c where c.revision_id=lesson_revisions.id and c.user_id=auth.uid()));

update public.lesson_revisions set
 checkpoint_fields='["target_user","problem","problem_label","evidence","vision","value_proposition","mvp_scope","success_metric","tradeoff","reflection"]'::jsonb,
 rubric_criteria='["user","problem","evidence","vision","value","mvp","metric","tradeoff"]'::jsonb
where lesson_id='60000000-0000-4000-8000-000000000005';

create table public.node_prerequisites(node_id uuid not null references public.curriculum_nodes(id),prerequisite_id uuid not null references public.curriculum_nodes(id),primary key(node_id,prerequisite_id),check(node_id<>prerequisite_id));
alter table public.node_prerequisites enable row level security;
revoke all on public.node_prerequisites from anon,authenticated;
grant select on public.node_prerequisites to authenticated;
create policy read_prerequisites on public.node_prerequisites for select to authenticated using(public.is_admin() or (exists(select 1 from public.curriculum_nodes n where n.id=node_id and n.status='published') and exists(select 1 from public.curriculum_nodes n where n.id=prerequisite_id and n.status='published')));
create function public.prerequisite_guard() returns trigger language plpgsql set search_path='' as $$
begin
 perform pg_advisory_xact_lock(32472200);
 if exists(with recursive chain as (
  select prerequisite_id from public.node_prerequisites where node_id=new.prerequisite_id
  union select p.prerequisite_id from public.node_prerequisites p join chain c on p.node_id=c.prerequisite_id
 ) select 1 from chain where prerequisite_id=new.node_id) then raise exception 'circular prerequisite'; end if;
 return new;
end $$;
create trigger guard_prerequisite before insert or update on public.node_prerequisites for each row execute function public.prerequisite_guard();

create or replace function public.admin_get_lesson(p_lesson uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_revision public.lesson_revisions%rowtype; v_keys jsonb;
begin
 if not public.is_admin() then raise exception 'forbidden'; end if;
 if not exists(select 1 from public.curriculum_nodes where id=p_lesson) then raise exception 'node unavailable'; end if;
 select * into v_revision from public.lesson_revisions where lesson_id=p_lesson order by (state='draft') desc,revision_number desc limit 1;
 select coalesce(jsonb_agg(jsonb_build_object('question_id',question_id,'correct_option_id',correct_option_id,'correct_answer',coalesce(correct_answer,to_jsonb(correct_option_id)),'explanations',explanations,'review',review)),'[]'::jsonb) into v_keys from private.answer_keys where revision_id=v_revision.id;
 return jsonb_build_object('revision',to_jsonb(v_revision),'keys',v_keys);
end $$;

create function public.admin_save_node_draft(p_node uuid,p_expected int,p_outcome text,p_introduction text,p_content jsonb,p_questions jsonb,p_review jsonb,p_resources jsonb,p_reflection text,p_minutes int,p_policy text,p_fields jsonb,p_rubric jsonb,p_keys jsonb) returns int language plpgsql security definer set search_path='' as $$
declare v_rev public.lesson_revisions%rowtype; v_current int; v_key jsonb; v_item jsonb; v_resource uuid; v_pos int:=0;
begin
 if not public.is_admin() then raise exception 'forbidden'; end if;
 perform 1 from public.curriculum_nodes where id=p_node for update;
 if not found then raise exception 'node unavailable'; end if;
 if p_minutes<1 or p_minutes>180 or p_policy not in ('intro','lesson','checkpoint') or jsonb_typeof(p_content)<>'array' or jsonb_typeof(p_questions)<>'array' or jsonb_typeof(p_review)<>'array' or jsonb_typeof(p_resources)<>'array' or jsonb_typeof(p_keys)<>'array' then raise exception 'invalid draft'; end if;
 select coalesce(max(revision_number),0) into v_current from public.lesson_revisions where lesson_id=p_node;
 if v_current<>p_expected then raise exception 'stale revision'; end if;
 select * into v_rev from public.lesson_revisions where lesson_id=p_node and state='draft';
 if v_rev.id is null then
  insert into public.lesson_revisions(lesson_id,revision_number,state,author_id) values(p_node,v_current+1,'draft',auth.uid()) returning * into v_rev;
 else
  update public.lesson_revisions set revision_number=v_current+1 where id=v_rev.id returning * into v_rev;
 end if;
 update public.lesson_revisions set outcome=trim(p_outcome),introduction=trim(p_introduction),content=p_content,question_public=p_questions,review_public=p_review,resource_cards=p_resources,reflection_prompt=trim(p_reflection),estimated_minutes=p_minutes,completion_policy=p_policy,checkpoint_fields=p_fields,rubric_criteria=p_rubric where id=v_rev.id;
 delete from private.answer_keys where revision_id=v_rev.id;
 for v_key in select value from jsonb_array_elements(p_keys) loop
  insert into private.answer_keys(revision_id,question_id,correct_option_id,correct_answer,explanations,review)
  values(v_rev.id,v_key->>'question_id',coalesce(v_key->>'correct_option_id',v_key->'correct_answer'->>0),v_key->'correct_answer',v_key->'explanations',coalesce((v_key->>'review')::boolean,false));
 end loop;
 delete from public.revision_resources where revision_id=v_rev.id;
 for v_item in select value from jsonb_array_elements(p_resources) loop
  v_pos:=v_pos+1;
  insert into public.resources(type,title,url,publisher,language,reviewed_at) values(v_item->>'type',v_item->>'title',v_item->>'url',v_item->>'publisher',coalesce(v_item->>'language','en'),current_date) returning id into v_resource;
  insert into public.revision_resources(revision_id,resource_id,position,metadata_snapshot) values(v_rev.id,v_resource,v_pos,v_item);
 end loop;
 insert into public.admin_audit_log(actor_id,action,target_id,revision_number) values(auth.uid(),'save_draft',p_node,v_rev.revision_number);
 return v_rev.revision_number;
end $$;
revoke all on function public.admin_save_node_draft(uuid,int,text,text,jsonb,jsonb,jsonb,jsonb,text,int,text,jsonb,jsonb,jsonb) from public;
grant execute on function public.admin_save_node_draft(uuid,int,text,text,jsonb,jsonb,jsonb,jsonb,text,int,text,jsonb,jsonb,jsonb) to authenticated;

create or replace function public.admin_publish(p_lesson uuid,p_expected int) returns int language plpgsql security definer set search_path='' as $$
declare v_rev public.lesson_revisions%rowtype; v_node public.curriculum_nodes%rowtype; v_q jsonb; v_r jsonb; v_item jsonb; v_key private.answer_keys%rowtype; v_answer jsonb; v_type text; v_option_ids jsonb; v_required text;
begin
 if not public.is_admin() then raise exception 'forbidden'; end if;
 select * into v_node from public.curriculum_nodes where id=p_lesson for update;
 if v_node.id is null then raise exception 'node unavailable'; end if;
 select * into v_rev from public.lesson_revisions where lesson_id=p_lesson and state='draft' and revision_number=p_expected for update;
 if v_rev.id is null then raise exception 'stale or missing draft'; end if;
 if v_node.is_learnable=(v_rev.completion_policy='intro') then raise exception 'node learnability conflicts with content policy'; end if;
 if length(trim(v_rev.outcome))<10 or jsonb_array_length(v_rev.content)<1 then raise exception 'learning outcome and content required'; end if;
 if v_rev.completion_policy='lesson' and (jsonb_array_length(v_rev.question_public)<3 or jsonb_array_length(v_rev.question_public)>5 or jsonb_array_length(v_rev.review_public)<2 or length(trim(v_rev.reflection_prompt))<10) then raise exception 'lesson requires 3–5 checks, two review variants, and reflection'; end if;
 if v_rev.completion_policy='checkpoint' then
  if jsonb_array_length(v_rev.checkpoint_fields)<10 or jsonb_array_length(v_rev.rubric_criteria)<>8 then raise exception 'checkpoint fields and rubric required'; end if;
  foreach v_required in array array['target_user','problem','problem_label','evidence','vision','value_proposition','mvp_scope','success_metric','tradeoff','reflection'] loop
   if not v_rev.checkpoint_fields ? v_required then raise exception 'missing checkpoint field %',v_required; end if;
  end loop;
  foreach v_required in array array['user','problem','evidence','vision','value','mvp','metric','tradeoff'] loop
   if not v_rev.rubric_criteria ? v_required then raise exception 'missing rubric criterion %',v_required; end if;
  end loop;
 end if;
 for v_item in select value from jsonb_array_elements(v_rev.content) loop
  if v_item->>'type' not in ('heading','paragraph','callout') or length(trim(coalesce(v_item->>'text','')))<2 or (v_item->>'type'='callout' and length(trim(coalesce(v_item->>'title','')))<2) then raise exception 'invalid content block'; end if;
 end loop;
 for v_q in select value from jsonb_array_elements(v_rev.question_public || v_rev.review_public) loop
  v_type:=coalesce(v_q->>'type','single_choice');
  if v_type not in ('single_choice','multiple_choice','arrange_steps','strongest_rationale') or length(trim(coalesce(v_q->>'scenario','')))<10 or length(trim(coalesce(v_q->>'prompt','')))<10 or length(trim(coalesce(v_q->>'tag','')))<2 or v_q->>'difficulty' not in ('foundational','applied','advanced') or jsonb_array_length(v_q->'options')<2 then raise exception 'invalid scenario question'; end if;
  select * into v_key from private.answer_keys where revision_id=v_rev.id and question_id=v_q->>'id' and review=exists(select 1 from jsonb_array_elements(v_rev.review_public) q where q->>'id'=v_q->>'id');
  v_answer:=coalesce(v_key.correct_answer,to_jsonb(v_key.correct_option_id));
  select coalesce(jsonb_agg(o->>'id'),'[]'::jsonb) into v_option_ids from jsonb_array_elements(v_q->'options') o;
  if v_key.question_id is null or (v_type in ('single_choice','strongest_rationale') and not v_option_ids ? (v_answer #>> '{}')) or (v_type in ('multiple_choice','arrange_steps') and (jsonb_typeof(v_answer)<>'array' or jsonb_array_length(v_answer)<1 or exists(select 1 from jsonb_array_elements_text(v_answer) a where not v_option_ids ? a.value))) then raise exception 'invalid answer key'; end if;
  if v_type='arrange_steps' and jsonb_array_length(v_answer)<>jsonb_array_length(v_option_ids) then raise exception 'arrangement must include every step'; end if;
  if exists(select 1 from jsonb_array_elements(v_q->'options') o where length(trim(coalesce(o->>'text','')))<1 or length(trim(coalesce(v_key.explanations->>(o->>'id'),'')))<2) then raise exception 'every option needs an explanation'; end if;
 end loop;
 for v_r in select value from jsonb_array_elements(v_rev.resource_cards) loop
  if length(coalesce(v_r->>'title',''))<2 or length(coalesce(v_r->>'publisher',''))<2 or length(coalesce(v_r->>'language',''))<2 or (v_r->>'url') !~* '^https?://' then raise exception 'invalid resource metadata'; end if;
 end loop;
 if exists(with recursive dependencies as (select prerequisite_id from public.node_prerequisites where node_id=p_lesson union select p.prerequisite_id from public.node_prerequisites p join dependencies d on p.node_id=d.prerequisite_id) select 1 from dependencies where prerequisite_id=p_lesson) then raise exception 'circular prerequisite'; end if;
 update public.lesson_revisions set state='published',published_at=now() where id=v_rev.id;
 update public.lessons set published_revision_id=v_rev.id where id=p_lesson;
 update public.curriculum_nodes set published_revision_id=v_rev.id,status='published' where id=p_lesson;
 insert into public.admin_audit_log(actor_id,action,target_id,revision_number) values(auth.uid(),'publish',p_lesson,v_rev.revision_number);
 return v_rev.revision_number;
end $$;
