-- Add a curriculum tree without replacing legacy IDs or learner history.
alter table public.lessons alter column topic_id drop not null;
alter table public.lesson_revisions add column introduction text not null default '';
alter table public.lesson_revisions add column reflection_prompt text not null default '';
alter table public.lesson_revisions add column completion_policy text not null default 'lesson' check (completion_policy in ('intro','lesson','checkpoint'));
alter table public.attempt_answers add column first_correct boolean;
alter table public.review_answers add column first_correct boolean;
alter table private.answer_keys add column correct_answer jsonb;

create table public.curriculum_nodes (
 id uuid primary key references public.lessons(id),
 parent_id uuid references public.curriculum_nodes(id),
 node_type text not null check (node_type in ('domain','section','topic','lesson')),
 title text not null check (length(trim(title)) > 0),
 slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 short_description text not null default '', icon text not null default '◇',
 position integer not null check (position > 0),
 status text not null default 'draft' check (status in ('draft','published','archived')),
 is_learnable boolean not null default false,
 published_revision_id uuid references public.lesson_revisions(id),
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check (parent_id is distinct from id)
);
create unique index curriculum_sibling_slug on public.curriculum_nodes(parent_id,slug) nulls not distinct;
create index curriculum_parent_position on public.curriculum_nodes(parent_id,position,id);

create function public.curriculum_visible(p_node uuid) returns boolean language sql stable security definer set search_path='' as $$
 select not exists(select 1 from public.curriculum_nodes where id=p_node) or not exists(
  with recursive lineage as (
   select id,parent_id,status from public.curriculum_nodes where id=p_node
   union all select n.id,n.parent_id,n.status from public.curriculum_nodes n join lineage l on n.id=l.parent_id
  ) select 1 from lineage where status<>'published'
 )
 $$;
revoke all on function public.curriculum_visible(uuid) from public;
grant execute on function public.curriculum_visible(uuid) to authenticated;

create function public.curriculum_guard() returns trigger language plpgsql set search_path='' as $$
begin
 perform pg_advisory_xact_lock(32472199);
 if new.parent_id is not null and exists (
  with recursive ancestors as (
   select id,parent_id from public.curriculum_nodes where id=new.parent_id
   union all select p.id,p.parent_id from public.curriculum_nodes p join ancestors a on p.id=a.parent_id
  ) select 1 from ancestors where id=new.id
 ) then raise exception 'circular curriculum parent'; end if;
 new.updated_at:=now();
 return new;
end $$;
create trigger guard_curriculum before insert or update on public.curriculum_nodes for each row execute function public.curriculum_guard();

-- Existing Product Vision keeps its ID; every new node gets a matching lesson record
-- so the existing revision/editor/completion infrastructure can be reused.
insert into public.lessons(id,topic_id,title,slug,position,kind)
select id,null,title,id::text,position,'lesson' from (values
 ('10000000-0000-4000-8000-000000000003'::uuid,'Product Thinking',1),
 ('50000000-0000-4000-8000-000000000001'::uuid,'Pre-launch',1),
 ('50000000-0000-4000-8000-000000000002'::uuid,'Launch',2),
 ('50000000-0000-4000-8000-000000000003'::uuid,'Post-launch',3),
 ('50000000-0000-4000-8000-000000000004'::uuid,'Success Metrics',4),
 ('50000000-0000-4000-8000-000000000010'::uuid,'Product Strategy',2),
 ('50000000-0000-4000-8000-000000000011'::uuid,'Value Proposition',3),
 ('50000000-0000-4000-8000-000000000012'::uuid,'Product-Market Fit',4),
 ('50000000-0000-4000-8000-000000000013'::uuid,'Product Roadmap',5),
 ('50000000-0000-4000-8000-000000000014'::uuid,'Product Pitch',6),
 ('50000000-0000-4000-8000-000000000015'::uuid,'MVP',1),
 ('50000000-0000-4000-8000-000000000016'::uuid,'Product Launch',2),
 ('50000000-0000-4000-8000-000000000017'::uuid,'Press Release',3),
 ('50000000-0000-4000-8000-000000000018'::uuid,'Product Usage Analytics',1),
 ('50000000-0000-4000-8000-000000000019'::uuid,'Customer Retention',2),
 ('50000000-0000-4000-8000-000000000020'::uuid,'Product Pivot',3),
 ('50000000-0000-4000-8000-000000000021'::uuid,'Business Metrics',1),
 ('50000000-0000-4000-8000-000000000022'::uuid,'Design Metrics',2),
 ('60000000-0000-4000-8000-000000000001'::uuid,'Frame the Right Problem',1),
 ('60000000-0000-4000-8000-000000000002'::uuid,'Make the Value Clear',1),
 ('60000000-0000-4000-8000-000000000003'::uuid,'Choose Your MVP',1),
 ('60000000-0000-4000-8000-000000000004'::uuid,'Measure What Matters',1),
 ('60000000-0000-4000-8000-000000000005'::uuid,'Product Direction',1)
) as n(id,title,position) on conflict(id) do nothing;

insert into public.curriculum_nodes(id,parent_id,node_type,title,slug,short_description,position,status,is_learnable,published_revision_id) values
 ('10000000-0000-4000-8000-000000000003',null,'domain','Product Thinking','product-thinking','Learn to make product decisions around meaningful user outcomes.',1,'published',false,null),
 ('50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003','section','Pre-launch','pre-launch','Find a real problem and set a direction before building.',1,'published',false,null),
 ('50000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003','section','Launch','launch','Test a focused product with real people.',2,'published',false,null),
 ('50000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003','section','Post-launch','post-launch','Observe usage and improve what matters.',3,'published',false,null),
 ('50000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000003','section','Success Metrics','success-metrics','Choose measures that reveal outcomes.',4,'published',false,null),
 ('10000000-0000-4000-8000-000000000012','50000000-0000-4000-8000-000000000001','topic','Product Vision','product-vision','Describe a better future for a specific user.',1,'published',true,null),
 ('50000000-0000-4000-8000-000000000010','50000000-0000-4000-8000-000000000001','topic','Product Strategy','product-strategy','Choose which problem and opportunity to pursue.',2,'published',false,null),
 ('50000000-0000-4000-8000-000000000011','50000000-0000-4000-8000-000000000001','topic','Value Proposition','value-proposition','Explain why a solution matters to its user.',3,'published',false,null),
 ('50000000-0000-4000-8000-000000000012','50000000-0000-4000-8000-000000000001','topic','Product-Market Fit','product-market-fit','Look for sustained evidence of value.',4,'published',false,null),
 ('50000000-0000-4000-8000-000000000013','50000000-0000-4000-8000-000000000001','topic','Product Roadmap','product-roadmap','Sequence outcomes and learning.',5,'published',false,null),
 ('50000000-0000-4000-8000-000000000014','50000000-0000-4000-8000-000000000001','topic','Product Pitch','product-pitch','Share a coherent product direction.',6,'published',false,null),
 ('50000000-0000-4000-8000-000000000015','50000000-0000-4000-8000-000000000002','topic','MVP','mvp','Test the riskiest assumption with a focused release.',1,'published',false,null),
 ('50000000-0000-4000-8000-000000000016','50000000-0000-4000-8000-000000000002','topic','Product Launch','product-launch','Prepare the first useful release.',2,'published',false,null),
 ('50000000-0000-4000-8000-000000000017','50000000-0000-4000-8000-000000000002','topic','Press Release','press-release','Describe the promised user benefit.',3,'published',false,null),
 ('50000000-0000-4000-8000-000000000018','50000000-0000-4000-8000-000000000003','topic','Product Usage Analytics','product-usage-analytics','Understand behavior in context.',1,'published',false,null),
 ('50000000-0000-4000-8000-000000000019','50000000-0000-4000-8000-000000000003','topic','Customer Retention','customer-retention','Learn why people return or leave.',2,'published',false,null),
 ('50000000-0000-4000-8000-000000000020','50000000-0000-4000-8000-000000000003','topic','Product Pivot','product-pivot','Change direction when evidence warrants it.',3,'published',false,null),
 ('50000000-0000-4000-8000-000000000021','50000000-0000-4000-8000-000000000004','topic','Business Metrics','business-metrics','Connect product outcomes with business health.',1,'published',false,null),
 ('50000000-0000-4000-8000-000000000022','50000000-0000-4000-8000-000000000004','topic','Design Metrics','design-metrics','Measure useful experiences.',2,'published',false,null),
 ('60000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000010','lesson','Frame the Right Problem','frame-the-right-problem','Separate observations from assumptions.',1,'published',true,null),
 ('60000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000011','lesson','Make the Value Clear','make-the-value-clear','Connect a problem to a benefit.',1,'published',true,null),
 ('60000000-0000-4000-8000-000000000003','50000000-0000-4000-8000-000000000015','lesson','Choose Your MVP','choose-your-mvp','Test a risky assumption with minimal scope.',1,'published',true,null),
 ('60000000-0000-4000-8000-000000000004','50000000-0000-4000-8000-000000000021','lesson','Measure What Matters','measure-what-matters','Choose an outcome measure.',1,'published',true,null),
 ('60000000-0000-4000-8000-000000000005','50000000-0000-4000-8000-000000000014','lesson','Product Direction','product-direction','Apply the unit to one project.',1,'published',true,null)
on conflict(id) do nothing;

-- Introductory content belongs to the parent itself, never to a synthetic child.
insert into public.lesson_revisions(lesson_id,revision_number,state,outcome,introduction,content,question_public,review_public,resource_cards,completion_policy,estimated_minutes,published_at)
select n.id,1,'published','Describe how product thinking links evidence, choices, and outcomes.',n.short_description,
 jsonb_build_array(jsonb_build_object('type','paragraph','text',case when n.id='10000000-0000-4000-8000-000000000003' then 'Product thinking starts with a person and a change worth making. Explore the sections below to connect a problem, a direction, a small test, and evidence of impact.' when n.id='50000000-0000-4000-8000-000000000001' then 'Before building, gather observations, mark assumptions, and agree on the user benefit you want to create. The topics below move from direction to communication.' else n.short_description end)),
 '[]','[]','[]','intro',3,now()
from public.curriculum_nodes n where n.is_learnable=false and n.status='published'
on conflict(lesson_id,revision_number) do nothing;
update public.lessons l set published_revision_id=r.id from public.lesson_revisions r where l.id=r.lesson_id and r.completion_policy='intro' and l.published_revision_id is null;
update public.curriculum_nodes n set published_revision_id=l.published_revision_id from public.lessons l where n.id=l.id and n.published_revision_id is null;

create table public.node_intro_completions(user_id uuid not null references auth.users(id) on delete cascade,node_id uuid not null references public.curriculum_nodes(id),completed_at timestamptz not null default now(),primary key(user_id,node_id));
alter table public.curriculum_nodes enable row level security;
alter table public.node_intro_completions enable row level security;
revoke all on public.curriculum_nodes,public.node_intro_completions from anon,authenticated;
grant select on public.curriculum_nodes,public.node_intro_completions to authenticated;
create policy published_tree on public.curriculum_nodes for select to authenticated using(public.curriculum_visible(id) or public.is_admin());
create policy own_intro on public.node_intro_completions for select to authenticated using(user_id=auth.uid());

create function public.complete_node_intro(p_node uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'unauthorized'; end if;
 if not exists(select 1 from public.curriculum_nodes n join public.lesson_revisions r on r.id=n.published_revision_id where n.id=p_node and public.curriculum_visible(n.id) and r.completion_policy='intro') then raise exception 'intro unavailable'; end if;
 insert into public.node_intro_completions(user_id,node_id) values(auth.uid(),p_node) on conflict do nothing;
end $$;
revoke all on function public.complete_node_intro(uuid) from public;
grant execute on function public.complete_node_intro(uuid) to authenticated;

-- All edits run through admin RPCs; direct client updates are denied by RLS.
create function public.admin_create_node(p_parent uuid,p_type text,p_title text,p_slug text,p_description text,p_learnable boolean) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid:=gen_random_uuid(); v_position integer;
begin
 if not public.is_admin() then raise exception 'forbidden'; end if;
 if p_type not in ('domain','section','topic','lesson') or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(trim(p_title))<2 then raise exception 'invalid node'; end if;
 if p_parent is not null and not exists(select 1 from public.curriculum_nodes where id=p_parent) then raise exception 'parent unavailable'; end if;
 perform pg_advisory_xact_lock(32472199);
 select coalesce(max(position),0)+1 into v_position from public.curriculum_nodes where parent_id is not distinct from p_parent;
 insert into public.lessons(id,title,slug,position,kind) values(v_id,trim(p_title),v_id::text,v_position,'lesson');
 insert into public.curriculum_nodes(id,parent_id,node_type,title,slug,short_description,position,is_learnable,created_by) values(v_id,p_parent,p_type,trim(p_title),p_slug,trim(coalesce(p_description,'')),v_position,p_learnable,auth.uid());
 insert into public.admin_audit_log(actor_id,action,target_id) values(auth.uid(),'create_node',v_id);
 return v_id;
end $$;

create function public.admin_move_node(p_node uuid,p_parent uuid,p_position integer) returns void language plpgsql security definer set search_path='' as $$
declare v_old_parent uuid; v_old_position integer; v_count integer;
begin
 if not public.is_admin() then raise exception 'forbidden'; end if;
 perform pg_advisory_xact_lock(32472199);
 select parent_id,position into v_old_parent,v_old_position from public.curriculum_nodes where id=p_node for update;
 if not found then raise exception 'node unavailable'; end if;
 if p_parent is not null and not exists(select 1 from public.curriculum_nodes where id=p_parent) then raise exception 'parent unavailable'; end if;
 select count(*) into v_count from public.curriculum_nodes where parent_id is not distinct from p_parent and id<>p_node;
 if p_position<1 or p_position>v_count+1 then raise exception 'invalid position'; end if;
 if v_old_parent is not distinct from p_parent then
  if p_position<v_old_position then
   update public.curriculum_nodes set position=position+1 where parent_id is not distinct from p_parent and id<>p_node and position>=p_position and position<v_old_position;
  elsif p_position>v_old_position then
   update public.curriculum_nodes set position=position-1 where parent_id is not distinct from p_parent and id<>p_node and position>v_old_position and position<=p_position;
  end if;
  update public.curriculum_nodes set position=p_position where id=p_node;
 else
  update public.curriculum_nodes set position=position-1 where parent_id is not distinct from v_old_parent and position>v_old_position;
  update public.curriculum_nodes set position=position+1 where parent_id is not distinct from p_parent and position>=p_position;
  update public.curriculum_nodes set parent_id=p_parent,position=p_position where id=p_node;
 end if;
 insert into public.admin_audit_log(actor_id,action,target_id) values(auth.uid(),'move_node',p_node);
end $$;

create function public.admin_update_node(p_node uuid,p_title text,p_slug text,p_description text,p_type text,p_learnable boolean,p_status text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'forbidden'; end if;
 if length(trim(p_title))<2 or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or p_type not in ('domain','section','topic','lesson') or p_status not in ('draft','published','archived') then raise exception 'invalid node'; end if;
 if p_status='published' and not exists(select 1 from public.curriculum_nodes where id=p_node and published_revision_id is not null) then raise exception 'publish content first'; end if;
 if p_status='published' and exists(select 1 from public.curriculum_nodes n join public.lesson_revisions r on r.id=n.published_revision_id where n.id=p_node and (p_learnable=(r.completion_policy='intro'))) then raise exception 'node learnability conflicts with content policy'; end if;
 update public.curriculum_nodes set title=trim(p_title),slug=p_slug,short_description=trim(coalesce(p_description,'')),node_type=p_type,is_learnable=p_learnable,status=p_status where id=p_node;
 if not found then raise exception 'node unavailable'; end if;
 update public.lessons set title=trim(p_title),archived_at=case when p_status='archived' then now() else null end where id=p_node;
 insert into public.admin_audit_log(actor_id,action,target_id) values(auth.uid(),'update_node',p_node);
end $$;
revoke all on function public.admin_create_node(uuid,text,text,text,text,boolean),public.admin_move_node(uuid,uuid,integer),public.admin_update_node(uuid,text,text,text,text,boolean,text) from public;
grant execute on function public.admin_create_node(uuid,text,text,text,text,boolean),public.admin_move_node(uuid,uuid,integer),public.admin_update_node(uuid,text,text,text,text,boolean,text) to authenticated;
