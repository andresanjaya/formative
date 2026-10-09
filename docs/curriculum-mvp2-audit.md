# Curriculum audit and MVP 2 migration

## Original implementation

| Level | Parent | Description | Blocks, resources, questions, reflection | Learner opening | Admin child creation |
| --- | --- | --- | --- | --- | --- |
| Track | none | title and slug only | no | no material page | no |
| Unit | Track | title and position only | no | fixed path page only | no |
| Topic | Unit | title and position only | no | no material page | no |
| Lesson | Topic | title, slug, kind, position | versioned `lesson_revisions`; reflection stored per attempt | yes if published | no |

The seed placed Product Thinking in `topics`, Product Vision in `lessons`, and five other unit items in `path_previews`. Pre-launch did not exist. Neither Product Thinking nor Pre-launch could hold their own lesson content. The Admin page listed one editable Product Vision lesson and could not add or reorder children. The learner path and progress denominator were tied to one lesson.

Existing learner history remains in `attempts`, `attempt_answers`, `reflections`, `lesson_completions`, `review_schedule`, `review_attempts`, `review_answers`, `learning_events`, and `daily_activity`. No history table is dropped or rewritten.

## Migration

1. `202610080002_legacy_pilot_data.sql` makes the old pilot seed available before the tree migration on a fresh database. Its inserts are idempotent and do not replace a newer Product Vision live revision.
2. `202610090001_curriculum_tree.sql` adds self-referencing `curriculum_nodes` with no depth cap, sibling slug uniqueness, positive positions, and cycle rejection. The Product Vision node keeps lesson ID `10000000-0000-4000-8000-000000000012`. Product Thinking uses the legacy topic ID `10000000-0000-4000-8000-000000000003`. Legacy track, unit, topic, lesson, revision, and learner tables stay in place.
3. `202610090002_pilot_content.sql` adds authored revisions for five regular lessons and the Product Direction checkpoint. The Product Vision revision is appended with a stable new revision ID; its earlier revision, attempts, completions, and review records remain.
4. `202610090003_learning_loop.sql` adds checkpoint drafts and versioned submissions, first-answer accuracy columns, multi-type answer evaluation, pinned review revision per occurrence, the due review queue, weak-topic projection, and an explicit curriculum upgrade for existing v1 enrollments.
5. `202610090004_admin_authoring.sql` adds node authoring and publication validation, private answer-key retrieval for curators, prerequisite cycle rejection, and tighter learner read policies using the tree's published-ancestor check.

The matching `lessons` row for each node reuses the existing versioned revision and learner completion infrastructure. A node can own content and children. Intro-only completion is kept separately in `node_intro_completions`. The pilot's six required node IDs are in curriculum manifest v2; parent progress counts published required descendants from the enrolled manifest.

## Access and deployment

- Learner data tables allow owner-only reads. Checkpoint writes, tree edits, answers, and review updates use authenticated `security definer` RPCs with ownership or curator checks. Direct writes from `authenticated` remain revoked.
- Draft and archived nodes, including descendants of an unpublished ancestor, are hidden by `curriculum_visible`. A learner can still read a historical revision tied to their own attempt or completion.
- Answer keys remain in `private.answer_keys`; lesson and review payloads contain only public question data.
- Apply migrations in filename order. `supabase/seed.sql` can run afterward and will not reset a newer Product Vision live revision.
- Existing v1 learners choose **Open the full unit** to move to manifest v2. Their Product Vision completion remains; the denominator changes to the six published required nodes. New enrollments use v2 automatically.
- Curator access still requires a trusted administrator to grant `user_roles.role = 'admin'`. The publishable Supabase key cannot grant that role.

## Verification boundary

TypeScript, ESLint, unit tests, SQL parsing, production build, and desktop/mobile sample-data browser checks run locally. Live migration execution, authenticated ownership tests, draft refresh against Supabase, revision preservation against actual records, and the six-item learner journey require a database connection and test accounts. The user asked to leave those live tests pending.
