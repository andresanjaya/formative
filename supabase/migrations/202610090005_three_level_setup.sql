-- Three-level setup uses curriculum_nodes as the source of truth. The legacy
-- lessons/revisions IDs stay in place so attempts, reviews and completions survive.
-- Existing fourth-level lessons become topics beneath their grandparent section.
alter table public.curriculum_nodes add column if not exists cover_url text;
alter table public.curriculum_nodes alter column icon drop not null;
alter table public.curriculum_nodes add constraint curriculum_cover_https check(cover_url is null or cover_url ~* '^https://');
alter table public.curriculum_nodes add column if not exists is_required boolean not null default true;
alter table public.curriculum_nodes add column if not exists archived_at timestamptz;
alter table public.lesson_revisions add column if not exists review_intervals jsonb not null default '[1,3,7,14]'::jsonb;

create temporary table setup_pre_counts as select
 (select count(*) from public.attempts) attempts,
 (select count(*) from public.lesson_completions) completions,
 (select count(*) from public.review_schedule) reviews,
 (select count(*) from public.resources) resources,
 (select count(*) from public.lesson_revisions) revisions;

create table public.curriculum_node_migration_map(
 old_node_id uuid primary key references public.curriculum_nodes(id),
 new_node_id uuid not null references public.curriculum_nodes(id),
 old_parent_id uuid,
 new_parent_id uuid,
 migrated_at timestamptz not null default now()
);
insert into public.curriculum_node_migration_map(old_node_id,new_node_id,old_parent_id,new_parent_id)
select child.id,child.id,child.parent_id,parent.parent_id
from public.curriculum_nodes child join public.curriculum_nodes parent on parent.id=child.parent_id
where child.node_type='lesson' and parent.node_type='topic';
alter table public.curriculum_node_migration_map enable row level security;
revoke all on public.curriculum_node_migration_map from anon,authenticated;
grant select on public.curriculum_node_migration_map to authenticated;
create policy admin_migration_map on public.curriculum_node_migration_map for select to authenticated using(public.is_admin());

update public.curriculum_nodes child
set parent_id=parent.parent_id, node_type='topic'
from public.curriculum_nodes parent
where child.node_type='lesson' and child.parent_id=parent.id and parent.node_type='topic';

do $$ begin
 if exists(select 1 from public.curriculum_nodes where node_type='lesson') then
  raise exception 'unmapped fourth-level lesson remains';
 end if;
end $$;

alter table public.curriculum_nodes drop constraint if exists curriculum_nodes_node_type_check;
alter table public.curriculum_nodes drop constraint if exists curriculum_nodes_status_check;
drop policy if exists read_prerequisites on public.node_prerequisites;
create type public.curriculum_node_type as enum ('domain','section','topic');
create type public.publication_status as enum ('draft','published','archived');
alter table public.curriculum_nodes alter column node_type type public.curriculum_node_type using node_type::public.curriculum_node_type;
alter table public.curriculum_nodes alter column status drop default;
alter table public.curriculum_nodes alter column status type public.publication_status using status::public.publication_status;
alter table public.curriculum_nodes alter column status set default 'draft'::public.publication_status;
create policy read_prerequisites on public.node_prerequisites for select to authenticated using(
 public.is_admin() or (exists(select 1 from public.curriculum_nodes n where n.id=node_id and n.status='published')
 and exists(select 1 from public.curriculum_nodes n where n.id=prerequisite_id and n.status='published')));
update public.curriculum_nodes set archived_at=coalesce(archived_at,updated_at) where status='archived';

create or replace function public.curriculum_guard() returns trigger language plpgsql set search_path='' as $$
declare v_parent_type public.curriculum_node_type; v_parent_status public.publication_status;
begin
 perform pg_advisory_xact_lock(32472199);
 if new.parent_id=new.id then raise exception 'circular curriculum parent'; end if;
 if new.node_type='domain' then
  if new.parent_id is not null then raise exception 'domain must be a root'; end if;
 else
  select node_type,status into v_parent_type,v_parent_status from public.curriculum_nodes where id=new.parent_id;
  if v_parent_type is null then raise exception 'parent unavailable'; end if;
  if v_parent_status='archived' then
   if tg_op='INSERT' then raise exception 'parent unavailable'; end if;
   if new.parent_id is distinct from old.parent_id then raise exception 'parent unavailable'; end if;
  end if;
  if (new.node_type='section' and v_parent_type<>'domain') or
     (new.node_type='topic' and v_parent_type<>'section') then
   raise exception 'incompatible curriculum parent';
  end if;
 end if;
 if new.position<1 then raise exception 'invalid position'; end if;
 if new.parent_id is not null and exists(
  with recursive ancestors as (
   select id,parent_id from public.curriculum_nodes where id=new.parent_id
   union all select p.id,p.parent_id from public.curriculum_nodes p join ancestors a on p.id=a.parent_id
  ) select 1 from ancestors where id=new.id
 ) then raise exception 'circular curriculum parent'; end if;
 new.updated_at=now();
 return new;
end $$;

-- Earlier RPCs allow incompatible types and parents; the setup RPCs replace them.
revoke execute on function public.admin_create_node(uuid,text,text,text,text,boolean),
 public.admin_move_node(uuid,uuid,integer),
 public.admin_update_node(uuid,text,text,text,text,boolean,text) from authenticated;

create function public.admin_setup_create(
 p_type public.curriculum_node_type,p_parent uuid,p_title text,p_slug text,
 p_description text,p_icon text,p_cover text,p_position integer,p_learnable boolean,p_required boolean,p_minutes integer,p_policy text
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid:=gen_random_uuid(); v_last integer;
begin
 if not public.is_admin() then raise exception 'forbidden'; end if;
 if length(trim(coalesce(p_title,'')))<2 or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'invalid node details'; end if;
 if p_minutes<1 or p_minutes>180 or p_policy not in ('intro','lesson','checkpoint') or p_learnable=(p_policy='intro') then raise exception 'invalid learning settings'; end if;
 perform pg_advisory_xact_lock(32472199);
 select count(*) into v_last from public.curriculum_nodes where parent_id is not distinct from p_parent;
 if p_position<1 or p_position>v_last+1 then raise exception 'invalid position'; end if;
 update public.curriculum_nodes set position=position+1 where parent_id is not distinct from p_parent and position>=p_position;
 insert into public.lessons(id,title,slug,position,kind) values(v_id,trim(p_title),v_id::text,p_position,'lesson');
 insert into public.curriculum_nodes(id,parent_id,node_type,title,slug,short_description,icon,cover_url,position,status,is_learnable,is_required,created_by)
 values(v_id,p_parent,p_type,trim(p_title),p_slug,trim(coalesce(p_description,'')),nullif(trim(p_icon),''),nullif(trim(p_cover),''),p_position,'draft',p_learnable,p_required,auth.uid());
 insert into public.lesson_revisions(lesson_id,revision_number,state,completion_policy,estimated_minutes,author_id)
 values(v_id,1,'draft',p_policy,p_minutes,auth.uid());
 insert into public.admin_audit_log(actor_id,action,target_id) values(auth.uid(),'setup_create',v_id);
 return v_id;
end $$;

create function public.admin_setup_update(
 p_node uuid,p_expected timestamptz,p_parent uuid,p_title text,p_slug text,
 p_description text,p_icon text,p_cover text,p_position integer,p_learnable boolean,p_required boolean
) returns void language plpgsql security definer set search_path='' as $$
declare v_node public.curriculum_nodes%rowtype; v_count integer;
begin
 if not public.is_admin() then raise exception 'forbidden'; end if;
 if length(trim(coalesce(p_title,'')))<2 or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'invalid node details'; end if;
 perform pg_advisory_xact_lock(32472199);
 select * into v_node from public.curriculum_nodes where id=p_node for update;
 if not found then raise exception 'node unavailable'; end if;
 if v_node.updated_at<>p_expected then raise exception 'stale node'; end if;
 if v_node.published_revision_id is not null and exists(
  select 1 from public.lesson_revisions r where r.id=v_node.published_revision_id
  and p_learnable=(r.completion_policy='intro')
 ) then raise exception 'node learnability conflicts with content policy'; end if;
 select count(*) into v_count from public.curriculum_nodes where parent_id is not distinct from p_parent and id<>p_node;
 if p_position<1 or p_position>v_count+1 then raise exception 'invalid position'; end if;
 if v_node.parent_id is not distinct from p_parent then
  if p_position<v_node.position then
   update public.curriculum_nodes set position=position+1 where parent_id is not distinct from p_parent and id<>p_node and position>=p_position and position<v_node.position;
  elsif p_position>v_node.position then
   update public.curriculum_nodes set position=position-1 where parent_id is not distinct from p_parent and id<>p_node and position>v_node.position and position<=p_position;
  end if;
 else
  update public.curriculum_nodes set position=position-1 where parent_id is not distinct from v_node.parent_id and position>v_node.position;
  update public.curriculum_nodes set position=position+1 where parent_id is not distinct from p_parent and position>=p_position;
 end if;
 update public.curriculum_nodes set parent_id=p_parent,title=trim(p_title),slug=p_slug,
  short_description=trim(coalesce(p_description,'')),icon=nullif(trim(p_icon),''),
  cover_url=nullif(trim(p_cover),''),position=p_position,is_learnable=p_learnable,is_required=p_required
 where id=p_node;
 update public.lessons set title=trim(p_title),position=p_position where id=p_node;
 insert into public.admin_audit_log(actor_id,action,target_id) values(auth.uid(),'setup_update',p_node);
end $$;

create function public.admin_setup_transition(p_node uuid,p_action text,p_confirm_children boolean default false)
returns void language plpgsql security definer set search_path='' as $$
declare v_node public.curriculum_nodes%rowtype; v_children integer;
begin
 if not public.is_admin() then raise exception 'forbidden'; end if;
 perform pg_advisory_xact_lock(32472199);
 select * into v_node from public.curriculum_nodes where id=p_node for update;
 if not found then raise exception 'node unavailable'; end if;
 with recursive child_nodes as (
  select id from public.curriculum_nodes where parent_id=p_node
  union all select n.id from public.curriculum_nodes n join child_nodes c on n.parent_id=c.id
 ) select count(*) into v_children from child_nodes;
 if p_action='archive' then
  if v_children>0 and not p_confirm_children then raise exception 'confirm affected children'; end if;
  update public.curriculum_nodes set status='archived',archived_at=now() where id=p_node;
  update public.lessons set archived_at=now() where id=p_node;
 elsif p_action='restore' then
  if v_node.status<>'archived' then raise exception 'node is not archived'; end if;
  update public.curriculum_nodes set status='draft',archived_at=null where id=p_node;
  update public.lessons set archived_at=null where id=p_node;
 elsif p_action='publish' then
  if v_node.published_revision_id is null then raise exception 'publish material first'; end if;
  if exists(select 1 from public.lesson_revisions r where r.id=v_node.published_revision_id
   and v_node.is_learnable=(r.completion_policy='intro')) then raise exception 'node learnability conflicts with content policy'; end if;
  if v_node.parent_id is not null and not public.curriculum_visible(v_node.parent_id) then raise exception 'parent unavailable'; end if;
  update public.curriculum_nodes set status='published',archived_at=null where id=p_node;
  update public.lessons set archived_at=null where id=p_node;
  if v_node.is_learnable then
   update public.curriculum_versions set manifest=manifest || jsonb_build_array(p_node::text)
   where not manifest ? p_node::text;
  end if;
 elsif p_action='delete' then
  if v_node.status<>'draft' or v_children>0 or v_node.published_revision_id is not null or
     exists(select 1 from public.lesson_revisions where lesson_id=p_node and state='published') or
     exists(select 1 from public.revision_resources rr join public.lesson_revisions r on r.id=rr.revision_id where r.lesson_id=p_node) or
     exists(select 1 from public.attempts where lesson_id=p_node) or
     exists(select 1 from public.lesson_completions where lesson_id=p_node) or
     exists(select 1 from public.review_schedule where lesson_id=p_node) or
     exists(select 1 from public.node_intro_completions where node_id=p_node) or
     exists(select 1 from public.node_prerequisites where node_id=p_node or prerequisite_id=p_node) or
     exists(select 1 from public.checkpoint_submissions where node_id=p_node) then
   raise exception 'node has content, children, or learner history';
  end if;
  delete from private.answer_keys where revision_id in (select id from public.lesson_revisions where lesson_id=p_node);
  delete from public.lesson_revisions where lesson_id=p_node;
  delete from public.curriculum_nodes where id=p_node;
  delete from public.lessons where id=p_node;
 else raise exception 'invalid transition';
 end if;
 insert into public.admin_audit_log(actor_id,action,target_id) values(auth.uid(),'setup_'||p_action,p_node);
end $$;

revoke all on function public.admin_setup_create(public.curriculum_node_type,uuid,text,text,text,text,text,integer,boolean,boolean,integer,text),
 public.admin_setup_update(uuid,timestamptz,uuid,text,text,text,text,text,integer,boolean,boolean),
 public.admin_setup_transition(uuid,text,boolean) from public;
grant execute on function public.admin_setup_create(public.curriculum_node_type,uuid,text,text,text,text,text,integer,boolean,boolean,integer,text),
 public.admin_setup_update(uuid,timestamptz,uuid,text,text,text,text,text,integer,boolean,boolean),
 public.admin_setup_transition(uuid,text,boolean) to authenticated;

create function public.admin_setup_completion_counts() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_counts jsonb;
begin
 if not public.is_admin() then raise exception 'forbidden'; end if;
 select coalesce(jsonb_object_agg(node_id::text,learner_count),'{}'::jsonb) into v_counts
 from (select node_id,count(*) learner_count from (
  select lesson_id as node_id,user_id from public.lesson_completions
  union select node_id,user_id from public.node_intro_completions
 ) completed group by node_id) counts;
 return v_counts;
end $$;
revoke all on function public.admin_setup_completion_counts() from public;
grant execute on function public.admin_setup_completion_counts() to authenticated;

create function public.my_completion_history()
returns table(node_id uuid,title text,completed_at timestamptz,kind text,status text)
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'unauthorized'; end if;
 return query
 select h.node_id,h.title,h.completed_at,h.kind,h.status from (
  select c.lesson_id node_id,n.title,c.completed_at,'lesson'::text kind,n.status::text status
  from public.lesson_completions c join public.curriculum_nodes n on n.id=c.lesson_id where c.user_id=auth.uid()
  union all
  select c.node_id,n.title,c.completed_at,'introduction'::text,n.status::text
  from public.node_intro_completions c join public.curriculum_nodes n on n.id=c.node_id where c.user_id=auth.uid()
 ) h order by h.completed_at desc;
end $$;
revoke all on function public.my_completion_history() from public;
grant execute on function public.my_completion_history() to authenticated;

comment on table public.curriculum_nodes is 'Source of truth for three-level curriculum placement and publication; lessons and lesson_revisions retain matching IDs for existing learning history.';
comment on table public.lessons is 'Legacy compatibility table; curriculum_nodes owns placement and metadata. Do not remove until history verification and client migration are complete.';

do $$ declare v_pre record;
begin
 select * into v_pre from setup_pre_counts;
 if (select count(*) from public.attempts)<>v_pre.attempts or
    (select count(*) from public.lesson_completions)<>v_pre.completions or
    (select count(*) from public.review_schedule)<>v_pre.reviews or
    (select count(*) from public.resources)<>v_pre.resources or
    (select count(*) from public.lesson_revisions)<>v_pre.revisions then
  raise exception 'learner or content record counts changed during curriculum migration';
 end if;
 if not exists(select 1 from public.curriculum_nodes where id='10000000-0000-4000-8000-000000000012' and node_type='topic') then
  raise exception 'Product Vision node did not survive curriculum migration';
 end if;
end $$;

-- Extend the existing atomic publisher to validate the full typed block set.
create or replace function public.admin_publish(p_lesson uuid,p_expected int) returns int language plpgsql security definer set search_path='' as $$
declare v_rev public.lesson_revisions%rowtype; v_node public.curriculum_nodes%rowtype; v_q jsonb; v_r jsonb; v_item jsonb; v_key private.answer_keys%rowtype; v_answer jsonb; v_type text; v_option_ids jsonb; v_required text;
begin
 if not public.is_admin() then raise exception 'forbidden'; end if;
 select * into v_node from public.curriculum_nodes where id=p_lesson for update;
 if v_node.id is null then raise exception 'node unavailable'; end if;
 if v_node.status='archived' then raise exception 'restore archived node first'; end if;
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
  if v_item->>'type' not in ('heading','paragraph','list','image','callout','example','resource_card','question','reflection')
   or length(trim(coalesce(v_item->>'text','')))<2
   or (v_item->>'type' in ('callout','image','resource_card') and length(trim(coalesce(v_item->>'title','')))<2)
   or (v_item->>'type' in ('image','resource_card') and (v_item->>'text') !~* '^https://')
   then raise exception 'invalid content block'; end if;
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
 if v_node.is_learnable then
  update public.curriculum_versions set manifest=manifest || jsonb_build_array(p_lesson::text)
  where not manifest ? p_lesson::text;
 end if;
 insert into public.admin_audit_log(actor_id,action,target_id,revision_number) values(auth.uid(),'publish',p_lesson,v_rev.revision_number);
 return v_rev.revision_number;
end $$;

-- The existing streak algorithm is unchanged; optional nodes do not enter the denominator.
create or replace function public.progress_receipt() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_today date; v_tz text; v_manifest jsonb; v_count int; v_total int; v_current int:=0; v_longest int:=0; v_run int:=0; v_prev date; v_day date; v_cursor date; v_reviews int; v_due int;
begin
 if v_user is null then raise exception 'unauthorized'; end if;
 select learning_timezone into v_tz from public.profiles where id=v_user;
 v_today:=(now() at time zone coalesce(v_tz,'Asia/Makassar'))::date;
 select cv.manifest into v_manifest from public.enrollments e join public.curriculum_versions cv on cv.id=e.curriculum_version_id where e.user_id=v_user limit 1;
 select count(*) into v_total from public.curriculum_nodes n where public.curriculum_visible(n.id) and n.is_learnable and n.is_required and n.published_revision_id is not null and coalesce(v_manifest,'[]'::jsonb) ? n.id::text;
 select count(*) into v_count from public.lesson_completions lc join public.curriculum_nodes n on n.id=lc.lesson_id where lc.user_id=v_user and public.curriculum_visible(n.id) and n.is_learnable and n.is_required and coalesce(v_manifest,'[]'::jsonb) ? lc.lesson_id::text;
 select count(*) into v_reviews from public.review_attempts where user_id=v_user;
 select count(*) into v_due from public.review_schedule s join public.curriculum_nodes n on n.id=s.lesson_id and public.curriculum_visible(n.id) join public.lesson_revisions r on r.id=coalesce(s.revision_id,n.published_revision_id) and jsonb_array_length(r.review_public)>0 where s.user_id=v_user and s.next_due_local_date<=v_today;
 for v_day in select local_date from public.daily_activity where user_id=v_user order by local_date loop
  if v_prev is not null and v_day=v_prev+1 then v_run:=v_run+1; else v_run:=1; end if;
  v_longest:=greatest(v_longest,v_run); v_prev:=v_day;
 end loop;
 v_cursor:=case when exists(select 1 from public.daily_activity where user_id=v_user and local_date=v_today) then v_today else v_today-1 end;
 while exists(select 1 from public.daily_activity where user_id=v_user and local_date=v_cursor) loop v_current:=v_current+1; v_cursor:=v_cursor-1; end loop;
 return jsonb_build_object('completed',v_count,'total',v_total,'percent',case when v_total=0 then 0 else round(v_count::numeric*100/v_total) end,'current_streak',v_current,'longest_streak',v_longest,'today',v_today,'goal_done',exists(select 1 from public.daily_activity where user_id=v_user and local_date=v_today),'reviews_completed',v_reviews,'reviews_due',v_due);
end $$;

-- Setup editor saves review timing with the same revision and answer-key transaction.
create function public.admin_setup_save_node_draft(p_node uuid,p_expected int,p_outcome text,p_introduction text,p_content jsonb,p_questions jsonb,p_review jsonb,p_resources jsonb,p_reflection text,p_minutes int,p_policy text,p_fields jsonb,p_rubric jsonb,p_keys jsonb,p_intervals jsonb) returns int language plpgsql security definer set search_path='' as $$
declare v_rev public.lesson_revisions%rowtype; v_current int; v_key jsonb; v_item jsonb; v_resource uuid; v_pos int:=0;
begin
 if not public.is_admin() then raise exception 'forbidden'; end if;
 perform 1 from public.curriculum_nodes where id=p_node for update;
 if not found then raise exception 'node unavailable'; end if;
 if jsonb_typeof(p_intervals)<>'array' or jsonb_array_length(p_intervals)<>4 or exists(select 1 from jsonb_array_elements_text(p_intervals) d where d.value::int<1 or d.value::int>365) then raise exception 'invalid review intervals'; end if;
 if p_minutes<1 or p_minutes>180 or p_policy not in ('intro','lesson','checkpoint') or jsonb_typeof(p_content)<>'array' or jsonb_typeof(p_questions)<>'array' or jsonb_typeof(p_review)<>'array' or jsonb_typeof(p_resources)<>'array' or jsonb_typeof(p_keys)<>'array' then raise exception 'invalid draft'; end if;
 select coalesce(max(revision_number),0) into v_current from public.lesson_revisions where lesson_id=p_node;
 if v_current<>p_expected then raise exception 'stale revision'; end if;
 select * into v_rev from public.lesson_revisions where lesson_id=p_node and state='draft';
 if v_rev.id is null then
  insert into public.lesson_revisions(lesson_id,revision_number,state,author_id) values(p_node,v_current+1,'draft',auth.uid()) returning * into v_rev;
 else
  update public.lesson_revisions set revision_number=v_current+1 where id=v_rev.id returning * into v_rev;
 end if;
 update public.lesson_revisions set outcome=trim(p_outcome),introduction=trim(p_introduction),content=p_content,question_public=p_questions,review_public=p_review,resource_cards=p_resources,reflection_prompt=trim(p_reflection),estimated_minutes=p_minutes,completion_policy=p_policy,checkpoint_fields=p_fields,rubric_criteria=p_rubric,review_intervals=p_intervals where id=v_rev.id;
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
revoke all on function public.admin_setup_save_node_draft(uuid,int,text,text,jsonb,jsonb,jsonb,jsonb,text,int,text,jsonb,jsonb,jsonb,jsonb) from public;
grant execute on function public.admin_setup_save_node_draft(uuid,int,text,text,jsonb,jsonb,jsonb,jsonb,text,int,text,jsonb,jsonb,jsonb,jsonb) to authenticated;

-- Keep review schedules pinned to the revision that supplied the questions.
create or replace function public.complete_lesson(p_attempt uuid,p_idempotency uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_a public.attempts%rowtype; v_tz text; v_day date; v_questions int; v_correct int; v_inserted int; v_first int;
begin
 if v_user is null then raise exception 'unauthorized'; end if;
 perform 1 from public.profiles where id=v_user for update;
 select * into v_a from public.attempts where id=p_attempt and user_id=v_user for update;
 if v_a.id is null then raise exception 'attempt unavailable'; end if;
 if v_a.status='completed' then return public.progress_receipt(); end if;
 select jsonb_array_length(question_public) into v_questions from public.lesson_revisions where id=v_a.revision_id;
 select count(*) into v_correct from public.attempt_answers where attempt_id=p_attempt and correct;
 if v_questions=0 or v_correct<>v_questions or not exists(select 1 from public.reflections where attempt_id=p_attempt and length(trim(body))>0) then raise exception 'learning requirements unmet'; end if;
 select learning_timezone into v_tz from public.profiles where id=v_user;
 v_day:=(now() at time zone v_tz)::date;
 select coalesce((review_intervals->>0)::int,1) into v_first from public.lesson_revisions where id=v_a.revision_id;
 insert into public.lesson_completions(user_id,lesson_id,attempt_id,revision_id) values(v_user,v_a.lesson_id,p_attempt,v_a.revision_id) on conflict(user_id,lesson_id) do nothing;
 get diagnostics v_inserted=row_count;
 update public.attempts set status='completed',completed_at=now() where id=p_attempt;
 if v_inserted=1 then
  insert into public.learning_events(user_id,type,source_id,local_date,timezone_at_event) values(v_user,'lesson',v_a.lesson_id::text,v_day,v_tz);
  insert into public.daily_activity(user_id,local_date,qualifying_count) values(v_user,v_day,1) on conflict(user_id,local_date) do update set qualifying_count=daily_activity.qualifying_count+1;
  insert into public.review_schedule(user_id,lesson_id,next_due_local_date,revision_id) values(v_user,v_a.lesson_id,v_day+v_first,v_a.revision_id) on conflict(user_id,lesson_id) do nothing;
  update public.profiles set timezone_locked_at=coalesce(timezone_locked_at,now()) where id=v_user;
 end if;
 return public.progress_receipt() || jsonb_build_object('review_due',v_day+v_first,'completion_id',v_a.lesson_id,'request_id',p_idempotency);
end $$;
create or replace function public.complete_review(p_lesson uuid,p_occurrence int) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_s public.review_schedule%rowtype; v_tz text; v_today date; v_revision uuid; v_question jsonb; v_answer public.review_answers%rowtype; v_score numeric; v_days int; v_inserted int; v_intervals jsonb;
begin
 if v_user is null then raise exception 'unauthorized'; end if;
 perform 1 from public.profiles where id=v_user for update;
 select learning_timezone into v_tz from public.profiles where id=v_user;
 v_today:=(now() at time zone v_tz)::date;
 if exists(select 1 from public.review_attempts where user_id=v_user and lesson_id=p_lesson and occurrence=p_occurrence) then return public.progress_receipt() || jsonb_build_object('next_due',(select next_due_local_date from public.review_schedule where user_id=v_user and lesson_id=p_lesson)); end if;
 select * into v_s from public.review_schedule where user_id=v_user and lesson_id=p_lesson for update;
 if v_s.user_id is null or v_s.occurrence<>p_occurrence or v_s.next_due_local_date>v_today then raise exception 'review unavailable'; end if;
 if not public.curriculum_visible(p_lesson) then raise exception 'review unavailable'; end if;
 v_revision:=v_s.revision_id;
 select review_public->((p_occurrence-1)%jsonb_array_length(review_public)) into v_question from public.lesson_revisions where id=v_revision and jsonb_array_length(review_public)>0;
 select * into v_answer from public.review_answers where user_id=v_user and lesson_id=p_lesson and occurrence=p_occurrence and question_id=v_question->>'id';
 if v_answer.user_id is null or not v_answer.correct then raise exception 'correct the review question before finishing'; end if;
 v_score:=case when v_answer.first_correct then 1 else 0 end;
 insert into public.review_attempts(user_id,lesson_id,occurrence,first_score) values(v_user,p_lesson,p_occurrence,v_score) on conflict do nothing;
 get diagnostics v_inserted=row_count;
 if v_inserted=0 then return public.progress_receipt(); end if;
 insert into public.learning_events(user_id,type,source_id,local_date,timezone_at_event) values(v_user,'review',p_lesson::text||':'||p_occurrence,v_today,v_tz) on conflict do nothing;
 insert into public.daily_activity(user_id,local_date,qualifying_count) values(v_user,v_today,1) on conflict(user_id,local_date) do update set qualifying_count=daily_activity.qualifying_count+1;
 select review_intervals into v_intervals from public.lesson_revisions where id=v_revision;
 v_days:=coalesce((v_intervals->>(case when v_score<1 then 0 else least(v_s.interval_stage+1,3) end))::int,1);
 update public.review_schedule set next_due_local_date=v_today+v_days,interval_stage=case when v_score<1 then 0 else least(v_s.interval_stage+1,3) end,occurrence=occurrence+1,revision_id=(select published_revision_id from public.curriculum_nodes where id=p_lesson) where user_id=v_user and lesson_id=p_lesson;
 return public.progress_receipt() || jsonb_build_object('first_score',v_score,'next_due',v_today+v_days);
end $$;
