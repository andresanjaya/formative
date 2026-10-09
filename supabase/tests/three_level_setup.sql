-- Run after migration 202610090005 in a trusted SQL session. This transaction
-- rolls back all fixture rows and Admin actions, even when assertions pass.
begin;

insert into public.lessons(id,title,slug,position,kind) values
 ('90000000-0000-4000-8000-000000000001','Test Domain','90000000-0000-4000-8000-000000000001',999,'lesson'),
 ('90000000-0000-4000-8000-000000000002','Test Section','90000000-0000-4000-8000-000000000002',1,'lesson'),
 ('90000000-0000-4000-8000-000000000003','Test Topic','90000000-0000-4000-8000-000000000003',1,'lesson'),
 ('90000000-0000-4000-8000-000000000004','Duplicate Topic','90000000-0000-4000-8000-000000000004',2,'lesson'),
 ('90000000-0000-4000-8000-000000000005','Invalid Section','90000000-0000-4000-8000-000000000005',2,'lesson'),
 ('90000000-0000-4000-8000-000000000006','Invalid Topic','90000000-0000-4000-8000-000000000006',2,'lesson');

insert into public.curriculum_nodes(id,parent_id,node_type,title,slug,position) values
 ('90000000-0000-4000-8000-000000000001',null,'domain','Test Domain','test-domain',999),
 ('90000000-0000-4000-8000-000000000002','90000000-0000-4000-8000-000000000001','section','Test Section','test-section',1),
 ('90000000-0000-4000-8000-000000000003','90000000-0000-4000-8000-000000000002','topic','Test Topic','test-topic',1);

do $$ begin
 begin
  insert into public.curriculum_nodes(id,parent_id,node_type,title,slug,position)
  values('90000000-0000-4000-8000-000000000004','90000000-0000-4000-8000-000000000002','topic','Duplicate Topic','test-topic',2);
  raise exception 'duplicate sibling slug was accepted';
 exception when unique_violation then null; end;
 begin
  insert into public.curriculum_nodes(id,parent_id,node_type,title,slug,position)
  values('90000000-0000-4000-8000-000000000005','90000000-0000-4000-8000-000000000002','section','Invalid Section','invalid-section',2);
  raise exception 'section under section was accepted';
 exception when raise_exception then
  if sqlerrm='section under section was accepted' then raise; end if;
 end;
 begin
  insert into public.curriculum_nodes(id,parent_id,node_type,title,slug,position)
  values('90000000-0000-4000-8000-000000000006','90000000-0000-4000-8000-000000000001','topic','Invalid Topic','invalid-topic',2);
  raise exception 'topic under domain was accepted';
 exception when raise_exception then
  if sqlerrm='topic under domain was accepted' then raise; end if;
 end;
 begin
  update public.curriculum_nodes set parent_id='90000000-0000-4000-8000-000000000003' where id='90000000-0000-4000-8000-000000000001';
  raise exception 'circular parent was accepted';
 exception when raise_exception then
  if sqlerrm='circular parent was accepted' then raise; end if;
 end;
 if (select count(*) from public.curriculum_nodes where id in
  ('90000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000002','90000000-0000-4000-8000-000000000003'))<>3 then
  raise exception 'valid three-level hierarchy was not stored';
 end if;
 if not exists(select 1 from public.curriculum_nodes n join public.lesson_revisions r on r.id=n.published_revision_id
  where n.id='10000000-0000-4000-8000-000000000012') then
  raise exception 'Product Vision published content missing';
 end if;
 if has_table_privilege('authenticated','public.curriculum_nodes','INSERT') or
    has_table_privilege('authenticated','public.curriculum_nodes','UPDATE') or
    has_table_privilege('authenticated','public.curriculum_nodes','DELETE') then
  raise exception 'direct curriculum writes are available to learners';
 end if;
end $$;

do $$
declare v_admin uuid; v_domain uuid; v_section uuid; v_topic uuid; v_other uuid; v_time timestamptz; v_position integer;
begin
 select user_id into v_admin from public.user_roles where role='admin' limit 1;
 if v_admin is null then
  raise notice 'Admin RPC transaction tests skipped: no Admin test account';
  return;
 end if;
 perform set_config('request.jwt.claim.sub',v_admin::text,true);
 select count(*)+1 into v_position from public.curriculum_nodes where parent_id is null;
 v_domain:=public.admin_setup_create('domain',null,'RPC Domain','rpc-domain','',null,null,v_position,false,true,3,'intro');
 v_section:=public.admin_setup_create('section',v_domain,'RPC Section','rpc-section','',null,null,1,false,true,3,'intro');
 v_topic:=public.admin_setup_create('topic',v_section,'RPC Topic','rpc-topic','',null,null,1,true,true,7,'lesson');
 v_other:=public.admin_setup_create('topic',v_section,'RPC Other','rpc-other','',null,null,2,true,false,7,'lesson');
 select updated_at into v_time from public.curriculum_nodes where id=v_other;
 perform public.admin_setup_update(v_other,v_time,v_section,'RPC Other','rpc-other','',null,null,1,true,false);
 if (select position from public.curriculum_nodes where id=v_other)<>1 or
    (select position from public.curriculum_nodes where id=v_topic)<>2 then
  raise exception 'serialized sibling reorder failed';
 end if;
 begin
  perform public.admin_setup_transition(v_domain,'archive',false);
  raise exception 'parent archive without child confirmation was accepted';
 exception when raise_exception then
  if sqlerrm='parent archive without child confirmation was accepted' then raise; end if;
 end;
 perform public.admin_setup_transition(v_domain,'archive',true);
 if (select status from public.curriculum_nodes where id=v_section)<>'draft' then
  raise exception 'archiving parent changed child publication state';
 end if;
 perform public.admin_setup_transition(v_domain,'restore',false);
 begin
  perform public.admin_setup_transition(v_section,'delete',false);
  raise exception 'parent with children was deleted';
 exception when raise_exception then
  if sqlerrm='parent with children was deleted' then raise; end if;
 end;
 perform public.admin_setup_transition(v_topic,'delete',false);
 perform public.admin_setup_transition(v_other,'delete',false);
 perform public.admin_setup_transition(v_section,'delete',false);
 perform public.admin_setup_transition(v_domain,'delete',false);
end $$;

-- Direct learner writes remain denied by grants/RLS.
rollback;
