-- Formative: seed the complete UX/UI Product Design Roadmap hierarchy.
-- Adapted from the roadmap seed SQL supplied by the project owner on 2026-10-10.
--
-- Expected hierarchy:
--   domain -> section -> topic
--
-- Safe behavior:
--   * Idempotent through seed_key.
--   * Existing matching nodes are adopted rather than duplicated.
--   * Existing content, revisions, attempts, and completions are not deleted.
--   * Newly seeded nodes are published for roadmap discovery but are not
--     learnable/required until content is authored and enabled by an admin.
--
-- Run the entire file after 202610090005_three_level_setup.sql. Every curriculum
-- node needs a matching lessons row because curriculum_nodes.id is a foreign key.

begin;

alter table public.curriculum_nodes
  add column if not exists seed_key text;

create unique index if not exists curriculum_nodes_seed_key_uidx
  on public.curriculum_nodes (seed_key)
  where seed_key is not null;

create table if not exists public.learner_path_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  domain_node_id uuid not null references public.curriculum_nodes(id) on delete restrict,
  is_active boolean not null default false,
  enrolled_at timestamptz not null default now(),
  last_opened_at timestamptz,
  unique (user_id, domain_node_id)
);

create unique index if not exists learner_path_one_active_uidx
  on public.learner_path_enrollments (user_id)
  where is_active;

create index if not exists learner_path_enrollments_domain_idx
  on public.learner_path_enrollments (domain_node_id);

-- One statement seeds every node. No session-scoped or persistent staging table
-- is needed, even when a SQL editor submits statements separately.
do $roadmap$
declare
  v_seed record;
  v_parent uuid;
  v_id uuid;
begin
  for v_seed in
    select s.* from (
values
  -- Level 1: Learning paths / domains
  ('product-thinking', null, 'domain', 'Product Thinking', 'product-thinking', 1),
  ('design-research', null, 'domain', 'Design Research', 'design-research', 2),
  ('user-experience', null, 'domain', 'User Experience', 'user-experience', 3),
  ('user-interface', null, 'domain', 'User Interface', 'user-interface', 4),
  ('communication', null, 'domain', 'Communication', 'communication', 5),

  -- Product Thinking: sections
  ('product-thinking/pre-launch', 'product-thinking', 'section', 'Pre-launch', 'pre-launch', 1),
  ('product-thinking/launch', 'product-thinking', 'section', 'Launch', 'launch', 2),
  ('product-thinking/post-launch', 'product-thinking', 'section', 'Post-Launch', 'post-launch', 3),
  ('product-thinking/success-metrics', 'product-thinking', 'section', 'Success Metrics', 'success-metrics', 4),

  -- Product Thinking: topics
  ('product-thinking/pre-launch/product-vision', 'product-thinking/pre-launch', 'topic', 'Product Vision', 'product-vision', 1),
  ('product-thinking/pre-launch/product-strategy', 'product-thinking/pre-launch', 'topic', 'Product Strategy', 'product-strategy', 2),
  ('product-thinking/pre-launch/value-proposition', 'product-thinking/pre-launch', 'topic', 'Value Proposition', 'value-proposition', 3),
  ('product-thinking/pre-launch/product-market-fit', 'product-thinking/pre-launch', 'topic', 'Product-Market Fit', 'product-market-fit', 4),
  ('product-thinking/pre-launch/product-roadmap', 'product-thinking/pre-launch', 'topic', 'Product Roadmap', 'product-roadmap', 5),
  ('product-thinking/pre-launch/product-pitch', 'product-thinking/pre-launch', 'topic', 'Product Pitch', 'product-pitch', 6),
  ('product-thinking/launch/mvp', 'product-thinking/launch', 'topic', 'MVP', 'mvp', 1),
  ('product-thinking/launch/product-launch', 'product-thinking/launch', 'topic', 'Product Launch', 'product-launch', 2),
  ('product-thinking/launch/press-release', 'product-thinking/launch', 'topic', 'Press Release', 'press-release', 3),
  ('product-thinking/post-launch/product-usage-analytics', 'product-thinking/post-launch', 'topic', 'Product Usage Analytics', 'product-usage-analytics', 1),
  ('product-thinking/post-launch/customer-retention', 'product-thinking/post-launch', 'topic', 'Customer Retention', 'customer-retention', 2),
  ('product-thinking/post-launch/product-pivot', 'product-thinking/post-launch', 'topic', 'Product Pivot', 'product-pivot', 3),
  ('product-thinking/success-metrics/business-metrics', 'product-thinking/success-metrics', 'topic', 'Business Metrics', 'business-metrics', 1),
  ('product-thinking/success-metrics/design-metrics', 'product-thinking/success-metrics', 'topic', 'Design Metrics', 'design-metrics', 2),

  -- Design Research: sections
  ('design-research/discover-primary-research', 'design-research', 'section', 'Discover (Primary Research)', 'discover-primary-research', 1),
  ('design-research/types', 'design-research', 'section', 'Types', 'types', 2),
  ('design-research/explore-and-experiment', 'design-research', 'section', 'Explore and Experiment', 'explore-and-experiment', 3),
  ('design-research/planning-and-analysis', 'design-research', 'section', 'Planning and Analysis', 'planning-and-analysis', 4),

  -- Design Research: topics
  ('design-research/discover-primary-research/interviews', 'design-research/discover-primary-research', 'topic', 'Interviews', 'interviews', 1),
  ('design-research/discover-primary-research/surveys', 'design-research/discover-primary-research', 'topic', 'Surveys', 'surveys', 2),
  ('design-research/discover-primary-research/contextual-inquiry', 'design-research/discover-primary-research', 'topic', 'Contextual Inquiry', 'contextual-inquiry', 3),
  ('design-research/discover-primary-research/competitive-research', 'design-research/discover-primary-research', 'topic', 'Competitive Research', 'competitive-research', 4),
  ('design-research/discover-primary-research/swot-analysis', 'design-research/discover-primary-research', 'topic', 'SWOT Analysis', 'swot-analysis', 5),
  ('design-research/types/qualitative-research', 'design-research/types', 'topic', 'Qualitative Research', 'qualitative-research', 1),
  ('design-research/types/quantitative-research', 'design-research/types', 'topic', 'Quantitative Research', 'quantitative-research', 2),
  ('design-research/explore-and-experiment/task-analysis', 'design-research/explore-and-experiment', 'topic', 'Task Analysis', 'task-analysis', 1),
  ('design-research/explore-and-experiment/analytics', 'design-research/explore-and-experiment', 'topic', 'Analytics', 'analytics', 2),
  ('design-research/explore-and-experiment/ab-testing', 'design-research/explore-and-experiment', 'topic', 'A/B Testing', 'ab-testing', 3),
  ('design-research/explore-and-experiment/card-sorting', 'design-research/explore-and-experiment', 'topic', 'Card Sorting', 'card-sorting', 4),
  ('design-research/planning-and-analysis/research-planning', 'design-research/planning-and-analysis', 'topic', 'Research Planning', 'research-planning', 1),
  ('design-research/planning-and-analysis/analysis-of-findings', 'design-research/planning-and-analysis', 'topic', 'Analysis of Findings', 'analysis-of-findings', 2),
  ('design-research/planning-and-analysis/research-repository', 'design-research/planning-and-analysis', 'topic', 'Research Repository', 'research-repository', 3),

  -- User Experience: sections
  ('user-experience/discover', 'user-experience', 'section', 'Discover', 'discover', 1),
  ('user-experience/define', 'user-experience', 'section', 'Define', 'define', 2),
  ('user-experience/ideate', 'user-experience', 'section', 'Ideate', 'ideate', 3),
  ('user-experience/prototype', 'user-experience', 'section', 'Prototype', 'prototype', 4),
  ('user-experience/test-and-iterate', 'user-experience', 'section', 'Test and Iterate', 'test-and-iterate', 5),
  ('user-experience/content-strategy', 'user-experience', 'section', 'Content Strategy', 'content-strategy', 6),
  ('user-experience/ux-storytelling', 'user-experience', 'section', 'UX Storytelling', 'ux-storytelling', 7),
  ('user-experience/design-thinking', 'user-experience', 'section', 'Design Thinking', 'design-thinking', 8),
  ('user-experience/interaction-design', 'user-experience', 'section', 'Interaction Design', 'interaction-design', 9),
  ('user-experience/visual-design', 'user-experience', 'section', 'Visual Design', 'visual-design', 10),
  ('user-experience/jobs-to-be-done', 'user-experience', 'section', 'Jobs-to-be-Done', 'jobs-to-be-done', 11),
  ('user-experience/user-story', 'user-experience', 'section', 'User Story', 'user-story', 12),
  ('user-experience/ux-benchmarking', 'user-experience', 'section', 'UX Benchmarking', 'ux-benchmarking', 13),

  -- User Experience: topics
  ('user-experience/discover/personas', 'user-experience/discover', 'topic', 'Personas', 'personas', 1),
  ('user-experience/discover/empathy-map', 'user-experience/discover', 'topic', 'Empathy Map', 'empathy-map', 2),
  ('user-experience/discover/customer-journey-map', 'user-experience/discover', 'topic', 'Customer Journey Map', 'customer-journey-map', 3),
  ('user-experience/define/problem-statement', 'user-experience/define', 'topic', 'Problem Statement', 'problem-statement', 1),
  ('user-experience/ideate/brainstorming', 'user-experience/ideate', 'topic', 'Brainstorming', 'brainstorming', 1),
  ('user-experience/ideate/information-architecture', 'user-experience/ideate', 'topic', 'Information Architecture', 'information-architecture', 2),
  ('user-experience/ideate/user-flow', 'user-experience/ideate', 'topic', 'User Flow', 'user-flow', 3),
  ('user-experience/ideate/mind-map', 'user-experience/ideate', 'topic', 'Mind Map', 'mind-map', 4),
  ('user-experience/prototype/sketching', 'user-experience/prototype', 'topic', 'Sketching', 'sketching', 1),
  ('user-experience/prototype/wireframing', 'user-experience/prototype', 'topic', 'Wireframing', 'wireframing', 2),
  ('user-experience/prototype/prototyping', 'user-experience/prototype', 'topic', 'Prototyping', 'prototyping', 3),
  ('user-experience/test-and-iterate/usability-test', 'user-experience/test-and-iterate', 'topic', 'Usability Test', 'usability-test', 1),
  ('user-experience/interaction-design/human-computer-interaction', 'user-experience/interaction-design', 'topic', 'Human-Computer Interaction', 'human-computer-interaction', 1),
  ('user-experience/interaction-design/cognitive-psychology', 'user-experience/interaction-design', 'topic', 'Cognitive Psychology', 'cognitive-psychology', 2),
  ('user-experience/visual-design/basics-and-principles', 'user-experience/visual-design', 'topic', 'Basics & Principles', 'basics-and-principles', 1),
  ('user-experience/visual-design/gestalt-principles', 'user-experience/visual-design', 'topic', 'Gestalt Principles', 'gestalt-principles', 2),
  ('user-experience/visual-design/visual-hierarchy', 'user-experience/visual-design', 'topic', 'Visual Hierarchy', 'visual-hierarchy', 3),

  -- User Interface: sections
  ('user-interface/fundamentals', 'user-interface', 'section', 'Fundamentals', 'fundamentals', 1),
  ('user-interface/component-library', 'user-interface', 'section', 'Component Library', 'component-library', 2),
  ('user-interface/design-guidelines', 'user-interface', 'section', 'Design Guidelines', 'design-guidelines', 3),
  ('user-interface/design-handoff', 'user-interface', 'section', 'Design Handoff', 'design-handoff', 4),
  ('user-interface/design-systems', 'user-interface', 'section', 'Design Systems', 'design-systems', 5),
  ('user-interface/atomic-design', 'user-interface', 'section', 'Atomic Design', 'atomic-design', 6),
  ('user-interface/interactions', 'user-interface', 'section', 'Interactions', 'interactions', 7),
  ('user-interface/web-design', 'user-interface', 'section', 'Web Design', 'web-design', 8),
  ('user-interface/design-tools', 'user-interface', 'section', 'Design Tools', 'design-tools', 9),
  ('user-interface/usability', 'user-interface', 'section', 'Usability', 'usability', 10),
  ('user-interface/accessibility', 'user-interface', 'section', 'Accessibility', 'accessibility', 11),
  ('user-interface/mobile-design', 'user-interface', 'section', 'Mobile Design', 'mobile-design', 12),

  -- User Interface: topics
  ('user-interface/fundamentals/color-palette', 'user-interface/fundamentals', 'topic', 'Color Palette', 'color-palette', 1),
  ('user-interface/fundamentals/typography', 'user-interface/fundamentals', 'topic', 'Typography', 'typography', 2),
  ('user-interface/fundamentals/grids-and-spacings', 'user-interface/fundamentals', 'topic', 'Grids & Spacings', 'grids-and-spacings', 3),
  ('user-interface/fundamentals/iconography', 'user-interface/fundamentals', 'topic', 'Iconography', 'iconography', 4),
  ('user-interface/component-library/components', 'user-interface/component-library', 'topic', 'Components', 'components', 1),
  ('user-interface/component-library/ui-patterns', 'user-interface/component-library', 'topic', 'UI Patterns', 'ui-patterns', 2),
  ('user-interface/design-guidelines/design-principles', 'user-interface/design-guidelines', 'topic', 'Design Principles', 'design-principles', 1),
  ('user-interface/design-guidelines/documentation', 'user-interface/design-guidelines', 'topic', 'Documentation', 'documentation', 2),
  ('user-interface/interactions/ui-animation', 'user-interface/interactions', 'topic', 'UI Animation', 'ui-animation', 1),
  ('user-interface/interactions/micro-interactions', 'user-interface/interactions', 'topic', 'Micro-interactions', 'micro-interactions', 2),
  ('user-interface/web-design/html-and-css', 'user-interface/web-design', 'topic', 'HTML & CSS', 'html-and-css', 1),
  ('user-interface/web-design/responsive-layouts', 'user-interface/web-design', 'topic', 'Responsive Layouts', 'responsive-layouts', 2),
  ('user-interface/usability/usability-principles', 'user-interface/usability', 'topic', 'Usability Principles', 'usability-principles', 1),
  ('user-interface/usability/usability-issues', 'user-interface/usability', 'topic', 'Usability Issues', 'usability-issues', 2),
  ('user-interface/accessibility/accessible-design', 'user-interface/accessibility', 'topic', 'Accessible Design', 'accessible-design', 1),
  ('user-interface/accessibility/inclusive-design', 'user-interface/accessibility', 'topic', 'Inclusive Design', 'inclusive-design', 2),
  ('user-interface/accessibility/tools-and-checklist', 'user-interface/accessibility', 'topic', 'Tools & Checklist', 'tools-and-checklist', 3),
  ('user-interface/mobile-design/mobile-app-design', 'user-interface/mobile-design', 'topic', 'Mobile App Design', 'mobile-app-design', 1),
  ('user-interface/mobile-design/ios-and-android', 'user-interface/mobile-design', 'topic', 'iOS & Android', 'ios-and-android', 2),
  ('user-interface/mobile-design/mobile-ui-patterns', 'user-interface/mobile-design', 'topic', 'Mobile UI Patterns', 'mobile-ui-patterns', 3),

  -- Communication: sections
  ('communication/collaborating-with-stakeholders', 'communication', 'section', 'Collaborating with Stakeholders', 'collaborating-with-stakeholders', 1),
  ('communication/presentation-skills', 'communication', 'section', 'Presentation Skills', 'presentation-skills', 2),
  ('communication/interview-skills', 'communication', 'section', 'Interview Skills', 'interview-skills', 3),
  ('communication/soft-skills', 'communication', 'section', 'Soft Skills', 'soft-skills', 4),
  ('communication/design-portfolio', 'communication', 'section', 'Design Portfolio', 'design-portfolio', 5),
  ('communication/management', 'communication', 'section', 'Management', 'management', 6),
  ('communication/project-planning', 'communication', 'section', 'Project Planning', 'project-planning', 7),
  ('communication/product-teams', 'communication', 'section', 'Product Teams', 'product-teams', 8),
  ('communication/methodologies', 'communication', 'section', 'Methodologies', 'methodologies', 9),

  -- Communication: topics
  ('communication/collaborating-with-stakeholders/analysis-and-alignment', 'communication/collaborating-with-stakeholders', 'topic', 'Analysis & Alignment', 'analysis-and-alignment', 1),
  ('communication/presentation-skills/design-presentation', 'communication/presentation-skills', 'topic', 'Design Presentation', 'design-presentation', 1),
  ('communication/presentation-skills/collecting-feedback', 'communication/presentation-skills', 'topic', 'Collecting Feedback', 'collecting-feedback', 2),
  ('communication/interview-skills/interview-guide', 'communication/interview-skills', 'topic', 'Interview Guide', 'interview-guide', 1),
  ('communication/interview-skills/interview-questions', 'communication/interview-skills', 'topic', 'Interview Questions', 'interview-questions', 2),
  ('communication/design-portfolio/best-practices', 'communication/design-portfolio', 'topic', 'Best Practices', 'best-practices', 1),
  ('communication/design-portfolio/case-studies', 'communication/design-portfolio', 'topic', 'Case Studies', 'case-studies', 2),
  ('communication/project-planning/define-okrs', 'communication/project-planning', 'topic', 'Define OKRs', 'define-okrs', 1),
  ('communication/project-planning/design-questions', 'communication/project-planning', 'topic', 'Design Questions', 'design-questions', 2),
  ('communication/product-teams/team-structure', 'communication/product-teams', 'topic', 'Team Structure', 'team-structure', 1),
  ('communication/product-teams/collaboration', 'communication/product-teams', 'topic', 'Collaboration', 'collaboration', 2),
  ('communication/methodologies/agile-ux', 'communication/methodologies', 'topic', 'Agile UX', 'agile-ux', 1),
  ('communication/methodologies/lean-ux', 'communication/methodologies', 'topic', 'Lean UX', 'lean-ux', 2)
    ) as s(seed_key,parent_seed_key,node_type,title,slug,position)
    order by case s.node_type when 'domain' then 1 when 'section' then 2 else 3 end, s.seed_key
  loop
    if v_seed.parent_seed_key is null then
      v_parent := null;
    else
      select id into v_parent from public.curriculum_nodes where seed_key = v_seed.parent_seed_key;
      if v_parent is null then raise exception 'missing parent for %',v_seed.seed_key; end if;
    end if;

    select id into v_id from public.curriculum_nodes where seed_key = v_seed.seed_key;
    if v_id is null then
      select id into v_id from public.curriculum_nodes
      where parent_id is not distinct from v_parent
        and node_type::text = v_seed.node_type
        and lower(title) = lower(v_seed.title)
      limit 1;
      if v_id is not null then
        -- Keep the existing Product Vision and other matching node IDs/content.
        update public.curriculum_nodes set seed_key = v_seed.seed_key where id = v_id;
      else
        v_id := md5('formative-roadmap:' || v_seed.seed_key)::uuid;
        insert into public.lessons (id,topic_id,title,slug,position,kind)
        values (v_id,null,v_seed.title,v_id::text,v_seed.position,'lesson')
        on conflict (id) do nothing;
        insert into public.curriculum_nodes
          (id,parent_id,node_type,title,slug,short_description,position,
           status,is_learnable,is_required,seed_key)
        values
          (v_id,v_parent,v_seed.node_type::public.curriculum_node_type,
           v_seed.title,v_seed.slug,'',v_seed.position,
           'published'::public.publication_status,false,false,v_seed.seed_key);
      end if;
    end if;
  end loop;
end $roadmap$;

-- Learners can read only their own enrollments. All writes go through one
-- server-side transaction so two simultaneous switches cannot leave two active.
alter table public.learner_path_enrollments enable row level security;
revoke all on public.learner_path_enrollments from anon, authenticated;
grant select on public.learner_path_enrollments to authenticated;

drop policy if exists "learners read own path enrollments"
  on public.learner_path_enrollments;
create policy "learners read own path enrollments"
  on public.learner_path_enrollments
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "learners create own path enrollments" on public.learner_path_enrollments;
drop policy if exists "learners update own path enrollments" on public.learner_path_enrollments;

create or replace function public.select_learning_path(p_domain uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'unauthorized'; end if;
  -- The profile row serializes all switches for this learner.
  perform 1 from public.profiles where id = v_user for update;
  if not found then raise exception 'profile unavailable'; end if;
  if not exists (
    select 1 from public.curriculum_nodes
    where id = p_domain and parent_id is null
      and node_type = 'domain' and status = 'published'
  ) then raise exception 'path unavailable'; end if;
  update public.learner_path_enrollments
     set is_active = false
   where user_id = v_user and is_active;
  insert into public.learner_path_enrollments
    (user_id, domain_node_id, is_active, last_opened_at)
  values (v_user, p_domain, true, now())
  on conflict (user_id, domain_node_id) do update
    set is_active = true, last_opened_at = now();
end $$;
revoke all on function public.select_learning_path(uuid) from public;
grant execute on function public.select_learning_path(uuid) to authenticated;

do $$ begin
  if (select count(*) from public.curriculum_nodes where seed_key is not null) <> 125
     or (select count(*) from public.curriculum_nodes where seed_key is not null and node_type = 'domain') <> 5
     or (select count(*) from public.curriculum_nodes where seed_key is not null and node_type = 'section') <> 42
     or (select count(*) from public.curriculum_nodes where seed_key is not null and node_type = 'topic') <> 78
  then raise exception 'roadmap seed count mismatch'; end if;
end $$;

commit;

-- Verification queries (run after the migration):
--
-- 1) Expected seed counts: 5 domains, 42 sections, 78 topics, 125 total.
-- select node_type, count(*)
-- from public.curriculum_nodes
-- where seed_key is not null
-- group by node_type
-- order by node_type;
--
-- 2) Confirm all parents resolve.
-- select n.seed_key
-- from public.curriculum_nodes n
-- where n.seed_key is not null
--   and n.node_type::text <> 'domain'
--   and n.parent_id is null;
--
-- 3) Inspect the complete hierarchy.
-- select
--   d.title as domain,
--   s.title as section,
--   t.title as topic
-- from public.curriculum_nodes d
-- left join public.curriculum_nodes s on s.parent_id = d.id
-- left join public.curriculum_nodes t on t.parent_id = s.id
-- where d.node_type::text = 'domain'
--   and d.seed_key is not null
-- order by d.position, s.position, t.position;
