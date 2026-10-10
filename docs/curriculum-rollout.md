# Three-level curriculum rollout

## Existing schema audit

`curriculum_nodes` already stores the tree, linked by the same UUID to `lessons` and `lesson_revisions`. Attempts, completions, review schedules, resource snapshots, and answer keys refer to those stable IDs or revision IDs. The earlier tree permits a fourth `lesson` level. Product Vision is already a `topic` and keeps ID `10000000-0000-4000-8000-000000000012`.

## Migration

Apply migrations `202610080001` through `202610090005` in filename order to a backed-up Supabase project. Migration `202610090005_three_level_setup.sql`:

- Moves fourth-level lesson nodes beneath their section and changes them to `topic` while keeping their UUIDs. `curriculum_node_migration_map` records every former parent and new parent.
- Keeps legacy `lessons`, `lesson_revisions`, `resources`, attempts, completions, and review schedules. No old table is dropped.
- Adds enum levels and publication status, required state, cover image, archive timestamp, typed block validation, review intervals, and Admin-only setup RPCs.
- Verifies attempt, completion, review, resource, and revision counts, plus Product Vision's published node, before the migration finishes.

After `202610090005`, run the **entire** `20261010_seed_product_design_roadmap.sql` file in the SQL Editor. Do not select only the insert statements. The supplied seed needed matching `lessons` rows because `curriculum_nodes.id` references `lessons.id`. The corrected migration inserts those rows before each level, preserves adopted IDs and learner history, and switches paths through `select_learning_path(uuid)` in one transaction. Its seed runs in one `DO` statement with no staging table. If a previous run left an open failed transaction, run `rollback;` first. Then run `supabase/tests/learning_paths.sql` to check counts and foreign keys.

The Admin setup UI detects a missing migration and displays the required step. Learner flows continue to use the original schema until the expanded migrations are installed.

## Verification queries

Record counts before applying the migration. Afterward, compare the counts, run `supabase/tests/three_level_setup.sql` in a trusted SQL session, and inspect:

```sql
select 'attempts' as record, count(*) from public.attempts
union all select 'completions', count(*) from public.lesson_completions
union all select 'review_schedule', count(*) from public.review_schedule
union all select 'resources', count(*) from public.resources
union all select 'revisions', count(*) from public.lesson_revisions;

select old_node_id,new_node_id,old_parent_id,new_parent_id
from public.curriculum_node_migration_map order by old_node_id;

select id,node_type,parent_id,published_revision_id
from public.curriculum_nodes
where id='10000000-0000-4000-8000-000000000012';
```

Use disposable Admin and learner accounts to verify create, edit, reorder, publication, archive/restore, direct learner write denial, and completion on each level. The browser and access integration tests require the test-account environment variables described in the main README.

## Recovery

Run the migration in one transaction. If a statement fails before commit, roll it back. After commit, restore the pre-migration backup or point-in-time snapshot to a separate project, verify the record counts above, then redirect the app to that project. The old relationship tables are retained as a recovery source. Do not manually reverse the enum conversion or delete mapped nodes from a live project with learner history.

## Current limits

The live Supabase project has not received this migration, and authenticated database and browser tests remain pending. Existing `lessons` and `lesson_revisions` are compatibility storage; `curriculum_nodes` owns hierarchy and placement. Published required nodes are added to existing curriculum manifests so learners can open them; the progress denominator can grow when new required material is published. Completion records and streak event history remain unchanged.
