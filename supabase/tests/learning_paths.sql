-- Run after 20261010_seed_product_design_roadmap.sql in a trusted SQL session.
do $$
declare v_domains integer; v_sections integer; v_topics integer;
begin
  select count(*) filter (where node_type = 'domain'),
         count(*) filter (where node_type = 'section'),
         count(*) filter (where node_type = 'topic')
    into v_domains,v_sections,v_topics
    from public.curriculum_nodes where seed_key is not null;
  if row(v_domains,v_sections,v_topics) is distinct from row(5,42,78) then
    raise exception 'Unexpected roadmap counts: %, %, %',v_domains,v_sections,v_topics;
  end if;
  if exists (
    select 1 from public.curriculum_nodes n
    left join public.lessons l on l.id = n.id
    where n.seed_key is not null and l.id is null
  ) then raise exception 'Roadmap node without matching lesson'; end if;
  if exists (
    select 1 from public.curriculum_nodes n
    where n.seed_key is not null and n.node_type <> 'domain'
      and not exists (select 1 from public.curriculum_nodes p where p.id = n.parent_id)
  ) then raise exception 'Roadmap node with missing parent'; end if;
  if not exists (
    select 1 from public.curriculum_nodes
    where id = '10000000-0000-4000-8000-000000000012'
      and seed_key = 'product-thinking/pre-launch/product-vision'
      and published_revision_id is not null
  ) then raise exception 'Existing Product Vision was not adopted with its content'; end if;
  if exists (
    select 1 from public.curriculum_nodes
    where seed_key is not null and id <> '10000000-0000-4000-8000-000000000012'
      and is_learnable and published_revision_id is null
  ) then raise exception 'An empty roadmap node is learnable'; end if;
  if has_table_privilege('authenticated','public.learner_path_enrollments','INSERT')
     or has_table_privilege('authenticated','public.learner_path_enrollments','UPDATE')
     or has_table_privilege('authenticated','public.learner_path_enrollments','DELETE')
  then raise exception 'Learners have direct enrollment write access'; end if;
  if not has_function_privilege('authenticated','public.select_learning_path(uuid)','EXECUTE')
  then raise exception 'Learners cannot use the atomic path selector'; end if;
end $$;
