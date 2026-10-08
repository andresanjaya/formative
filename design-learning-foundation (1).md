# Design learning app — product and engineering foundation

Version 1 · 8 October 2026 · Prepared for Andre Sanjaya

**Recommendation:** Build a personal-first product-design learning companion with a guided roadmap, curated resources, short practice, and visible learning history. Use one web app with Admin/Curator and Learner roles. Keep course progress, practice evidence, and streaks distinct.

**Working label in the visual prototype:** Formative. This is a placeholder, not a cleared brand or domain.

**Deliverable status:** Product proposal and engineering specification with a clickable visual concept. No production application, database, authentication, or deployment has been implemented. Prototype data is illustrative. Decisions below are proposed defaults unless explicitly attributed to the brief.

## 1. Brief, evidence, and assumptions

### What the brief establishes

- Learn UI/UX and product design using product-design-roadmap.com as a starting reference.
- An author uploads or curates learning material; a learner consumes it.
- A topic can contain several resources, including websites and YouTube videos.
- Visual progress and a streak should encourage regular learning.
- Use the supplied Duolingo style reference, with a different primary color.

### What was inspected

Both supplied screenshots and the complete DESIGN (3).md were inspected. One screenshot shows a Product Vision description with two articles and one video. The other shows the Product Thinking branch split into Pre-launch, Launch, Post-Launch, and Success Metrics. These establish content organization, not learning effectiveness or hidden interactions.

The roadmap's main page returned an app shell to text retrieval. Its public JavaScript asset was then inspected for topic structure and resource URLs. Five primary branches were found: Product Thinking, Design Research, User Experience, User Interface, and Communication. The proposed curriculum below reorganizes these deliberately; it is not a verbatim import. Individual linked resources have not all been editorially reviewed.

### Assumption register

| ID | Proposed default | Reason and remaining uncertainty |
|---|---|---|
| A1 | Responsive web first; learner optimized for phone, admin for desktop | Fits resource links and a small initial build. Native apps are not requested. |
| A2 | Andre is the initial curator and learner; later invite other learners | Personal motivation is explicit; a public business model is not. |
| A3 | One account can learn and, if authorized, enter Admin | Two roles do not require two accounts or two apps. |
| A4 | English interface and initial lessons; schema supports language metadata | Current brief and reference material use English. Indonesian can be added intentionally later. |
| A5 | Daily goal is one qualifying lesson or review | Session duration is an estimate, not a hard stopwatch gate. |
| A6 | Core sessions aim for 5–10 minutes; external deep dives have separate estimates | Prevent a long video from masquerading as a short lesson. Needs pilot timing. |
| A7 | No payments, social feed, AI grading, or certification in MVP | None is needed to test this learning habit. |
| A8 | Next.js + TypeScript + Supabase, deployed through the user's own workflow | A proposed implementation choice, not a provisioned service. |
| A9 | Online completion required; local answer drafts survive temporary network loss | Offline reward reconciliation would add substantial complexity. |
| A10 | Account timezone selected explicitly; Andre's default suggestion is Asia/Makassar | Needed to define days fairly. Never infer learning-day boundaries from server UTC. |

These assumptions are reversible. Highest-impact decisions to revisit before production: private versus open enrollment, content language, and whether learners expect formal assessment.

## 2. Persona before problem framing

**Primary persona: Andre as a self-directed working designer.** Grounded in this request, not a research interview. Goal: steadily build product-design knowledge while seeing what has been learned and what comes next. Reported need: visual progress and streak motivation. Inferred frustrations to validate: “I have resources, but choosing and returning to the right material is work”; “Finishing a video doesn't tell me whether I can use the idea.”

**Secondary persona: Andre as curator.** Same person, different task. Goal: add, organize, preview, and update lessons without editing application code. Inferred frustration: “Maintaining resources must not take more energy than learning.” No invented demographic profile is needed.

Future novice learners are a hypothesis. Do not assume an experienced designer and a complete beginner require the same curriculum entry point.

## 3. Problems, outcomes, and How Might We

| Problem | Owner and evidence status | Metric | HMW and priority |
|---|---|---|---|
| P1: A broad topic map does not specify the next manageable learning action | Learner; inferred from breadth of roadmap | M1 activation | H1: How might we make the next session obvious without hiding the wider curriculum? P0 |
| P2: Learning effort is hard to see over time | Learner; visual progress explicitly requested | M2 active learning days | H2: How might we show consistent effort without making one missed day erase progress? P0 |
| P3: Resource consumption alone provides weak evidence of understanding | Learner; product-design inference | M3 delayed check; M4 applied work | H3: How might we invite recall and application without treating subjective design decisions as universally right or wrong? P1 |
| P4: Curated content needs dependable management | Curator; upload/manage role explicitly requested | M5 publishing success | H4: How might we publish and maintain material without developer intervention or exposing drafts? P0 |
| P5: Website/video handoffs can interrupt sessions | Learner; inferred from resource types | M1 and M2, with return funnel diagnostics | H5: How might we resume after an external resource without pretending to verify reading or watch time? P0 |

### Measurement definitions

All targets below are **proposed decision criteria**, not measured baselines or industry benchmarks.

- **M1 Activation:** new enrolled learners with a first qualifying completion within 24 hours / all new enrolled learners in the cohort. For the initial moderated pilot, all participants should be able to find and complete a first session without facilitator instructions; record raw counts and blockers.
- **M2 Consistency:** distinct qualifying local learning days per learner per rolling seven days. For Andre's initial two-week pilot, target at least four days each week, then check whether the effort felt sustainable. No claim that this cadence is optimal.
- **M3 Delayed understanding:** correct first responses to unseen equivalent objective questions 7 days later / questions answered. Record baseline and follow-up plus missing follow-ups; hints and retries are separate. An initial proposed signal is an improvement over baseline, not a certificate threshold.
- **M4 Application:** submitted exercises meeting each authored rubric criterion / exercises reviewed. Self-check and mentor review must be labeled separately. In the personal pilot, complete one small applied artifact per unit and record what changed after reflection.
- **M5 Publishing:** valid lessons published without developer intervention / publishing attempts; also track preparation time and failed validation reasons. Pilot goal: the curator independently publishes and updates one complete lesson, with no draft leakage.

H1→P1→M1; H2→P2→M2; H3→P3→M3/M4; H4→P4→M5; H5→P5→M1/M2. This closes the coverage check.

### Product position and trade-off

Interactive design learning already exists: Uxcel describes guided lessons, paths, and practical challenges [S3]. Do not position this as a novel category. The proposed value is **your curated learning route, external resources in one place, and a personal record of applied learning**.

Choose a guided path with an optional topic-list view. A strict linear course is simple but frustrating for experienced learners; an unrestricted graph is flexible but weak at helping someone decide what to do next. Default to the next incomplete lesson while allowing jumps to most published lessons. Reserve prerequisites for actual dependent exercises, with a reason displayed. Confidence: medium; the brief supports guidance and progress, but no usability study has tested this combination.

## 4. Scope and solution groups

| Priority | Mechanism | Why |
|---|---|---|
| P0 | Auth, two roles, secure progress ownership | Needed for dependable personal progress and author access |
| P0 | Curator curriculum editor, resources, preview, draft/publish/archive | Enables the user's material-management role |
| P0 | Learner path/list, lesson player, resume, completion receipt | Gives a complete learning journey |
| P0 | Server-recorded progress, daily goal, current/longest streak | Explicit motivation requirements |
| P0 | Resource links with author/source, save and return behavior | Core resource workflow |
| P1, included in first usable release | Objective checks with explanation; short reflection; unit mini-project | Makes completion meaningful rather than link clicking |
| P1, included in first usable release | Simple scheduled review and activity calendar | Creates a recurring learning loop |
| P1 | Bookmarks, private notes, broken-resource reporting | Makes curation useful across sessions |
| P2 | Opt-in reminders, badges, curated alternative paths, PWA install polish | Add only after observing actual use |
| P3 | Leaderboards, currencies, avatar shop, AI tutor, community, subscriptions | Significant distraction or operational cost before learning value is tested |

Functional grouping: **Learn** (path, sessions, resources); **Remember** (checks and review); **Apply** (reflection and mini-project); **See progress** (completion, calendar, streak); **Curate** (editor, publishing, quality control). One completion event supports progress, streak, and analytics without three competing sources of truth.

Do not ship hearts that block learning after mistakes. Use explanation and retry. Avoid competitive XP in MVP; the daily goal and visible completion already provide a clear feedback loop.

## 5. Reference scan and implications

Flows were reviewed first using official product descriptions, then screen patterns through their documented home-screen and section examples. Mobbin and Lazyweb were not available; no signed-in competitor audit is claimed.

| Reference | Verified observation or evidence | Proposed application and limit |
|---|---|---|
| Supplied roadmap screenshots + public app data [S1] | Topic groupings, a description, article/video resource links | Keep a topic/resource model; add learning outcomes and practice. Does not prove a learning sequence. |
| Duolingo official path explanation [S2] | Guided progression integrates review and unit guidance | Offer one recommended next action and easy return to the current position. Its 2022 explanation is a historical pattern reference, not a claim about every current screen. |
| Duolingo review guidance [S2b] | Learners can navigate sections and revisit content | Make completed lessons available for review. |
| Uxcel official learning guide [S3] | Interactive design learning and practical challenges | Pair conceptual checks with application; a vendor description is not independent efficacy evidence. |
| Karpicke & Blunt (2011) [S4] | Retrieval practice improved meaningful learning in their educational-text study | Support a recall step and later review. Transfer to professional design judgment remains an inference, and our scheduling intervals are not validated by this study. |
| WCAG guidance [S5] | Contrast and target-size requirements | Use accessible text and controls; test complete states and keyboard flows. |
| Supabase official documentation [S6] | Auth, server rendering integration, and database row access controls | Use database-enforced ownership and server-authoritative mutations. |

## 6. Curriculum and learning architecture

**Hierarchy:** Track → Unit → Topic → Lesson → ordered content blocks. Resources attach to a lesson revision, and may be reused through a resource catalog. A topic can have several lessons; a resource is not automatically a lesson.

**Initial track:** Product Design Foundations. Proposed curriculum, informed by the roadmap rather than copied wholesale:

| Unit | Themes | Practical output |
|---|---|---|
| 1. Think in outcomes | Product vision, user problem, value proposition, MVP, success metrics | One-page product direction for a small app |
| 2. Understand people | Research questions, method choice, interviews, synthesis | Interview guide and evidence/assumption board |
| 3. Shape the experience | Information architecture, task flows, interaction states, content | One core task flow with failure and recovery |
| 4. Make interfaces clear | Hierarchy, typography, spacing, color, responsive UI, accessibility | One annotated screen with accessible states |
| 5. Test and improve | Prototypes, usability tasks, observations, prioritization | Test plan and evidence-linked revisions |
| 6. Work as a product designer | Components, design systems, handoff, communication, measurement | Handoff package and concise design rationale |

Launch with **one complete pilot unit**, not six thin ones. Other units remain unlisted drafts or clearly marked previews outside the progress denominator. Initial unit: five lessons (problem framing, vision, value proposition, MVP, success metrics) plus one applied checkpoint. The full roadmap is a content backlog, not a launch commitment.

### Lesson anatomy

1. Outcome: “After this lesson, you can…” plus core duration estimate.
2. Learn: short original explanation and a concrete example.
3. Explore: one recommended resource; optional deeper links. External reading time is separately labeled.
4. Check: 2–4 objective questions or constrained scenario choices with authored rationales.
5. Apply: short reflection where useful; larger artifacts belong to unit checkpoints.
6. Finish: qualifying completion confirmed by the server; then show next action and review date.

Core objective lessons require every required check to be answered correctly, with unlimited explained retries. Store first-attempt accuracy separately. A corrected answer allows completion but is not proof of durable mastery. Questions that depend on context must state that context; open-ended design work uses a rubric and self-assessment, not a binary “correct design.”

A resource can be marked “read/watched — self-reported.” This alone never grants lesson completion. A blocked external resource cannot block the core lesson: provide an original summary and practice that stand alone, or a reviewed alternative.

### Worked lesson: Product Vision

**Outcome:** Distinguish a desired future user experience from a list of features, and draft a brief vision direction.

**Original teaching copy:** A product vision describes a future worth working toward. It helps people connect today's decisions to a shared direction. A feature list tells you what might be built; the vision explains the change those features should help create. A one-sentence statement is a starting exercise, not a complete strategic vision. See the SVPG discussion for the distinction between a mission statement and a compelling product vision [S7].

**Scenario:** A team is designing a learning companion for working designers.

- Option A: “Ship a streak counter, ten badges, and video playlists.”
- Option B: “Help designers turn fragmented learning into confident decisions they can apply at work.”
- Option C: “Increase this month's registrations by 15%.”

**Check:** Which option best expresses the intended future benefit in this scenario? B. A is a feature list; C is a near-term metric target. B still needs richer examples and strategic context to become a complete vision.

**Reflection:** Describe who benefits, what becomes better, and one experience that would demonstrate the change. Suggested 2–4 sentences; no minimum character count presented as quality evidence.

**Self-check rubric:** Identifies a user; describes a meaningful future change; is not merely a feature list; can inform a trade-off. Show these criteria explicitly.

**Resources found in the supplied roadmap:**

- Product Vision vs. Mission — SVPG: https://www.svpg.com/product-vision-vs-mission/ (opened and reviewed for this proposal).
- What is a Product Vision Statement? — ProductPlan: https://www.productplan.com/glossary/product-vision/ (URL identified, content not reviewed).
- 3 Things that Make a MEANINGFUL Vision | Simon Sinek — YouTube: https://www.youtube.com/watch?v=zpzZumZCdWA (URL identified, video not reviewed).

Before publishing, curator checks relevance, access, language, actual duration, and whether each item is suitable as required or optional. Never copy complete third-party articles or download/rehost videos as a default content workflow.

## 7. Roles and information architecture

| Capability | Visitor | Learner | Admin/Curator |
|---|---|---|---|
| View product introduction and public track outline | Yes | Yes | Yes |
| Read enrolled published lessons | No | Yes | Yes |
| Save own notes, attempts, bookmarks, progress | No | Own only | Own only in learner mode |
| Edit curriculum and resource metadata | No | No | Yes |
| Preview unpublished lessons | No | No | Yes |
| Publish/archive revisions | No | No | Yes |
| Read another learner's private notes | No | No | No through normal app access |
| Grant admin role | No | No | Trusted provisioning only; no general UI in MVP |

**Learner navigation:** Learn, Review, Library, Progress. Profile/settings in the avatar menu. On mobile these four destinations form a bottom bar; lesson mode removes global navigation and preserves a clear exit/resume action.

**Admin navigation:** Overview, Curriculum, Resources, Reports. Settings includes account preferences, not role self-promotion. “Switch to learning” returns to the learner experience without changing permissions.

| Route | Purpose and key contents |
|---|---|
| `/` | Product explanation, sample topic, sign in |
| `/onboarding` | Experience/goal, timezone, first track; skip nonessential preferences |
| `/learn` | Resume CTA, selected unit, path/list, unit picker |
| `/learn/[lessonId]` | Objective, blocks, resources, checks, reflection, saved position |
| `/review` | Due queue, short review session, empty state |
| `/library` | Saved resources/notes, search by title/topic/type |
| `/progress` | Track completion, units, active-day calendar, current/longest streak, submitted work |
| `/settings` | Profile, timezone, privacy/export/delete request, preferences |
| `/admin` | Drafts, published lessons, reported resources |
| `/admin/curriculum` | Ordered units/topics/lessons, publication status |
| `/admin/lessons/[id]` | Details, content, resources, checks, preview, revision history |
| `/admin/resources` | Catalog, links/files, reports, review dates |

### Main journeys

**First session:** sign in → select track/timezone → first lesson overview → learn → optional external resource → return to saved step → checks → reflection if required → server confirms completion → progress/streak receipt → recommended next lesson.

**Return visit:** Learn resumes an unfinished lesson first. Otherwise show a due-review suggestion and the next lesson, with one primary CTA. Learner may choose either; review is not a surprise prerequisite.

**Curate:** create draft → set objective and location → write blocks → attach resources → author checks/rationales → preview learner/mobile view → resolve validation issues → publish immutable revision. Editing a published lesson creates a new draft; the current published revision remains live.

**External resource:** record session position before opening link in a new tab → show source/type and external indicator → on return offer “Continue lesson,” not “Video completed.” Embed only supported providers with a fallback external link. No arbitrary iframe HTML accepted from the editor.

## 8. Progress, streak, and review rules

### Three separate concepts

- **Course progress:** count of required lessons completed in the enrolled curriculum version / count of required lessons in that version. Display count and percent, for example 2 of 6. No average of unit percentages with unequal denominators.
- **Learning consistency:** distinct qualifying local days, current streak, longest streak. Not a proficiency rating.
- **Practice evidence:** original answers, reflections, self-checked artifacts, and delayed review results. Avoid radar “skill scores” unless an assessment model is validated.

Node states: Not started, In progress, Completed, Needs review, Prerequisite needed, Unavailable. Completed + Needs review can coexist; a review never erases completion. Include icons and text, not color alone.

### Qualifying activity

A first lesson completion, a complete scheduled review session, or a first unit-checkpoint submission meeting its structural requirements qualifies. Merely logging in, opening a resource, or editing a note does not. Reopening a previously completed lesson does not create a new award. A scheduled review occurrence is a distinct activity; repeated submission of the same occurrence is idempotent.

### Streak behavior

- One or more qualifying activities on a local date count as one learning day.
- If there is activity today, current streak ends today. If not today but yesterday was active, preserve the streak and show “Continue today.”
- If neither today nor yesterday is active, current streak is zero. The next qualifying activity starts at one.
- Longest streak and completed lessons remain unchanged when the current streak breaks.
- For MVP there are no freezes, paid repairs, or backdated awards. “Welcome back. Your learning is still here.”
- Compute using server timestamps and an explicit IANA learning timezone. No trusting device clocks or client-supplied dates.
- MVP timezone becomes fixed after the first qualifying activity. Show it before enrollment and in settings. A correction requires a documented migration/recompute from timestamps; do not silently rewrite dates. This avoids travel and timezone-switch exploits while deferring a more flexible policy.
- Use calendar-date differences, not 24-hour intervals; test daylight-saving zones even though Asia/Makassar has no daylight saving.
- Do not display streak success until server persistence succeeds. A pending submission says “Saving your progress…” and offers retry without double counting.

### Review v1

On lesson completion create a review due the next local date. After a successful review schedule in 3, then 7, then 14 days; repeat at 14 days thereafter. A review succeeds when at least 80% of its first responses are correct and all missed items have subsequently been corrected. If under 80%, completing corrections still counts as a finished review session, but schedule again the next day. These are simple product defaults, not scientifically optimized intervals or mastery thresholds.

Every published lesson needs at least two alternative review items beyond initial checks. Prioritize unseen variants and disclose when a question repeats. An author can update the pool by publishing a revision. Overdue items remain available without punishment; limit a suggested daily session to five questions. Empty queue: offer optional recap without claiming it is a due review or generating infinite reward events.

### Changes to curriculum

Enrollment pins an immutable curriculum manifest listing required lesson IDs. A newer curriculum version is offered explicitly with an explanation; existing completion stays intact. Minor lesson edits preserve credit. A substantial new objective is a new lesson ID, not a silent reset. Existing attempts remain tied to the revision they started. Emergency-withdrawn material shows an unavailable state; affected enrollment manifests get an explicit replacement/migration choice. Never divide by drafts, archived unassigned lessons, or an empty denominator.

## 9. Content management specification

### Lesson editor

Required: title, stable slug, track/unit/topic, language, outcome, level, estimated core minutes, original content blocks, completion policy, objective checks with rationales, review pool, resource attribution, and author review date. Optional: prerequisite lesson IDs, reflection prompt, cover image, source notes.

Supported blocks v1: heading, paragraph, list, image with alt text, callout, resource card, single-choice question, reflection. Use typed JSON plus server validation; do not execute uploaded MDX, scripts, or arbitrary HTML. A Markdown paste/import can convert into supported blocks with a preview.

Resources: type `article | youtube | file | reference`, title, URL or storage key, publisher/author, language, duration estimate (nullable), required/recommended/optional label, transcript/caption note, access note, last reviewed date, report status. Separate “required core content” from “recommended external reading.”

### Publishing gates

Validate required fields, at least one meaningful outcome, all checks with valid option references and explanations, review variants, asset ownership/visibility, image alt text, resource schemes, prerequisite cycles, and missing references. Link reachability and pedagogical quality are curator checks, not proof supplied by schema validation. Display warnings separately from blocking errors.

Publish is atomic: persist revision and answer keys, publish asset references, then change live pointer and manifest when explicitly requested. Draft preview is authenticated and uncached. A failed publish leaves the previous live revision intact. Optimistic locking on draft revision number prevents overwriting concurrent edits.

Archive, do not hard-delete lessons referenced by attempts. Provide a version history and rollback by publishing a new revision based on an older one. Record author, time, and reason.

### Resource maintenance

MVP uses manual “Report unavailable” and a curator queue. Later link checking must treat 403/login walls as “needs review,” not necessarily dead links. Arbitrary server-side URL fetching is excluded from MVP; if introduced, block private networks, validate redirects, and bound response size and time.

For user-uploaded PDFs/images: verify allowed MIME and actual file type, enforce a proposed 10 MB per-file cap, use generated storage names, and serve untrusted documents as downloads. Limit initial formats to PDF, PNG, JPEG, and WebP. Public learning assets must be intentionally published; private learner work uses a separate bucket and owner policies. Avoid uploading confidential workplace material.

## 10. Visual direction and screen specifications

**Direction: a playful design studio.** White and lightly tinted surfaces, violet learning actions, tactile button bases, generous spacing, and warm encouragement. Keep the playful quality of the reference while using original iconography and layout details. A small abstract cursor/frame character could be developed later; it is not needed to validate the learning loop.

The supplied style file conflicts with itself: its color table warns against using green as primary CTA while its button section specifies green. It also uses a 1.18 body line height and light gray text unsuitable as defaults for sustained reading. Treat it as inspiration, not a normative component specification.

### Proposed tokens

| Token | Value | Role |
|---|---|---|
| Primary | `#6D28D9` | Main CTA, active node, selected navigation |
| Primary base | `#4C1D95` | Tactile lower edge/pressed treatment |
| Primary soft | `#F3E8FF` | Selected surface, decorative learning panels |
| Canvas | `#FCFBFF` | Main background |
| Surface | `#FFFFFF` | Content cards |
| Text | `#221B35` | Headings and body |
| Muted text | `#655D73` | Secondary copy |
| Decorative border | `#E3DDEB` | Card separation; not sufficient alone for interactive boundaries |
| Control border | `#82778F` | Unselected actionable controls |
| Success | `#166534` on `#F0FDF4` | Correct answers and completion |
| Attention | `#9A3412` on `#FFF7ED` | Streak/day status |
| Error | `#B91C1C` on `#FEF2F2` | Validation and incorrect answers |

Proposed type: Nunito 800 for short display headings; system sans or Inter for body/UI. Use licensed/openly available fonts rather than Duolingo's proprietary typefaces. Body 16px/1.6, labels 14px/1.4, screen titles 28–36px/1.2. Prototype uses local system fonts to remain self-contained.

Spacing: 4px base; 8/12/16/24/32/48. Cards 20px radius; buttons 14px; nodes 64–72px. Primary buttons at least 48px high, 2px border, 4px solid lower shadow; translate down on press. Motion 120–200ms; honor reduced-motion. Do not communicate success only through motion or sound.

### Layout

- Desktop 1200–1440px: 220px left navigation; flexible central learning column; optional 280px progress sidebar. Lesson reading width about 680px.
- Tablet: remove progress sidebar, place daily summary above path.
- Phone 360–430px: one column, 16–20px side gutters, four-item bottom navigation; include safe-area padding. Path stays within viewport without horizontal drag.
- Admin: dense enough for editing with a curriculum tree and editor/preview; mobile falls back to stacked panels. Drag reorder must also offer Move up/Move down.

### Essential screens

| Screen | Main hierarchy | Important states |
|---|---|---|
| Learn | Unit context → next lesson → labeled path → alternate list | New learner, resume, unit complete, no published content |
| Lesson | Exit/save → position indicator → objective/content → one action | External return, feedback, save failure, unavailable resource |
| Completion | What was completed → daily goal/streak → next option | Already counted today, first day, returning after gap |
| Review | Due count → reason to revisit → start | No due items, incomplete review, all done |
| Progress | Lesson count → activity calendar → unit detail → artifacts | No activity, partial unit, completed track, version upgrade |
| Admin curriculum | Content tree → draft/published status → edit action | Empty unit, validation failure, conflicting edit |
| Admin editor | Title/objective → blocks/resources/checks → preview/publish | Unsaved, saving, saved, invalid, publish failed |

### Accessibility behavior

Meet WCAG 2.2 AA as a product target, not a claim of certification. Text contrast at least 4.5:1 for normal text; 3:1 for large text. Our proposed control size is 44–48px minimum, which is stricter than the WCAG AA 24px minimum subject to its exceptions [S5]. Check meaningful graphical/control contrast separately.

Use actual buttons/links, visible focus, programmatic labels, an ordered-list path, text equivalents for badges, live announcements for answer/save results, keyboard-accessible question options, and an accessible progress label. Dialogs must trap and restore focus. Allow 200% zoom and test 320px reflow. Video resources need caption/transcript availability notes or an equivalent learning route. Never auto-play audio. A progress calendar has a text summary/list alternative.

## 11. Frontend implementation structure

**Recommended stack:** Next.js App Router, TypeScript, Tailwind CSS, Supabase Auth/Postgres/Storage, schema validation with Zod, and a small accessible component primitive set. Pin supported versions during setup and retain the lockfile; this document intentionally does not guess future package versions. No separate Express service is required for MVP.

Server rendering loads authenticated curriculum and progress. Client components handle question interaction, lesson step state, local answer drafts, and editor controls. Use server endpoints for completion and publishing. Keep answer keys out of client bundles and preloaded lesson JSON.

Suggested structure:

```text
src/app/(public)/
src/app/(auth)/
src/app/(learner)/learn/
src/app/(learner)/review/
src/app/(learner)/library/
src/app/(learner)/progress/
src/app/admin/curriculum/
src/app/admin/lessons/[id]/
src/app/api/attempts/
src/app/api/admin/
src/components/learning/     # path, node, player, resources, questions
src/components/progress/     # streak, daily goal, calendar, unit progress
src/components/admin/        # tree, block editor, publish panel
src/components/ui/           # buttons, dialogs, fields, feedback
src/lib/content/             # block schemas and safe rendering
src/lib/server/              # authorization, scoring, completion, publication
src/lib/supabase/            # server/client adapters
supabase/migrations/
tests/domain/
tests/access/
tests/e2e/
```

Session position auto-saves after a meaningful step and on explicit exit. Local draft keys include user ID + attempt ID + revision ID; clear on logout. Never cache private server-rendered pages globally. Avoid offline service-worker caching of authenticated responses in MVP.

## 12. Backend data model

Use normalized relationships for identity/progress and versioned JSON for ordered content blocks. All IDs are UUIDs unless a natural unique key is stated. Timestamps are server-generated UTC; learning dates are derived using the account's stored timezone.

| Entity | Key fields and constraints |
|---|---|
| `profiles` | `id → auth.users`, display_name, locale, learning_timezone, timezone_locked_at |
| `user_roles` | user_id, role; unique pair; only trusted provisioning can grant admin |
| `tracks`, `units`, `topics`, `lessons` | Stable identities/slugs, parent FK, ordering, archived_at; lessons have published_revision_id |
| `lesson_revisions` | lesson_id, revision_number, state, outcome, blocks_json, estimated_minutes, completion_policy, author_id; unique lesson/revision |
| `question_keys` in private schema | revision_id, question_id, correct_option_ids, rationale, rubric; unavailable to learner direct queries |
| `resources` | Stable ID, canonical URL/provider/type, publisher, review status |
| `revision_resources` | revision_id, resource_id, immutable metadata snapshot, order, relevance note |
| `curriculum_versions` | track_id, version_number, immutable ordered manifest of required lesson IDs |
| `enrollments` | user_id, track_id, curriculum_version_id, enrolled_at; one active enrollment per user/track |
| `attempts` | user_id, lesson_id, revision_id, status, current_step, started_at, completed_at |
| `attempt_answers` | attempt_id, question_id, first_answer, latest_answer, retries, evaluated_at; unique attempt/question |
| `lesson_completions` | user_id, lesson_id, attempt_id, completed_revision_id, completed_at; unique user/lesson |
| `review_schedule` | user_id, lesson_id, next_due_local_date, interval_stage; unique user/lesson |
| `review_attempts` | user_id, lesson_id, schedule_occurrence_id, revision_id, first_score, corrected, completed_at; unique occurrence completion |
| `practice_submissions` | user_id, checkpoint_lesson_id, text or private asset key, rubric responses, submitted_at; distinguish self-check from reviewed |
| `learning_events` | user_id, type, source_id, occurred_at, local_date, timezone_at_event; unique user/type/source |
| `daily_activity` | user_id, local_date, qualifying_count; unique user/date; derived projection |
| `notes`, `bookmarks` | user_id + lesson/resource, content; owner-only |
| `resource_reports` | user_id, resource_id, reason, status, created_at |
| `admin_audit_log` | actor_id, action, target_id, revision, occurred_at; append-only |

For MVP, curriculum placement is one parent per lesson. Cross-listed lessons and arbitrary graphs are deferred. Store prerequisite edges separately with cycle validation if actually needed. Index all owner IDs, ordering parent IDs, attempt/revision FKs, and `(user_id, next_due_local_date)`.

### API contracts

| Endpoint | Input | Server responsibilities / output |
|---|---|---|
| `GET /api/learn` | Auth session | Published enrolled manifest + own summary; no answer keys |
| `POST /api/attempts` | lessonId | Verify enrollment/access, select live revision, create/resume attempt |
| `PATCH /api/attempts/:id/position` | stepId | Check owner and valid block; save resume position |
| `POST /api/attempts/:id/answers` | questionId, answer | Validate option membership; grade against pinned private key; return feedback |
| `POST /api/attempts/:id/complete` | idempotencyKey | Re-evaluate required state; atomic completion/event/day update; return authoritative receipt |
| `POST /api/reviews/start` | due lessonId | Reserve scheduled occurrence; choose review variants |
| `POST /api/reviews/:id/complete` | answers, idempotencyKey | Grade, save first score/corrections, schedule next review, record qualifying event |
| `POST /api/checkpoints/:id/submit` | reflection/artifact reference, rubric answers, idempotencyKey | Verify owner, structure and referenced upload; persist first submission and activity atomically |
| `GET /api/progress` | Auth session, trackId | Versioned denominator, completion, streak and activity data |
| `POST /api/resource-reports` | resourceId, reason | Validate and rate-limit report; no progress award |
| `PATCH /api/admin/lessons/:id/draft` | expectedRevision, typed content | Check admin; validate; return conflict if stale |
| `POST /api/admin/lessons/:id/publish` | expectedRevision | Check admin + gates; atomic live-pointer change; audit |

Errors: 401 no session, 403 unauthorized, 404 inaccessible/missing object, 409 stale revision or conflicting request, 422 field/learning requirements unmet, 429 rate limit, 503 retryable persistence outage. Use stable error codes and user-friendly messages; do not expose internal SQL details.

### Completion transaction

1. Authenticate and derive user ID on server; ignore client user/date/score claims.
2. Lock per-user progress state (consistent lock order for all activity types), then lock the attempt/occurrence.
3. Verify ownership, pinned revision, required checks, reflection/checkpoint structural requirements, and non-withdrawn content rules.
4. Return the existing receipt for an already completed source; reuse of an idempotency key with different payload returns conflict.
5. Insert completion and a unique qualifying learning event using server time and stored timezone.
6. Upsert the unique local-day activity projection. Recompute current/longest streak from distinct dates, or update a cache under the same lock.
7. Create/update review schedule; commit the transaction.
8. Return completed lesson count, denominator, today goal, streak and review date. UI celebrates only after success.

Use a database transaction/RPC for this operation; a series of independent REST inserts is not atomic. Test simultaneous completion from two tabs and two different lessons on the same day. The event ledger is authoritative; cached totals are rebuildable.

### Authorization and storage

Enable RLS and minimum grants on all exposed tables [S6]. Learners may select their own attempts/progress/notes, select published enrolled content, and update only explicitly allowed preference/note fields. Critical progress tables and roles have no learner direct write grant. Answer keys and privileged logic live in a non-exposed schema; return rationales only as intended feedback after answer submission.

Server handlers repeat authorization; hiding the Admin link is never the access control. Privileged database functions must verify caller and role, use a fixed safe search path, restrict EXECUTE, and avoid trusting passed user IDs. Never put service credentials in NEXT_PUBLIC variables or client code. Confirm session server-side using the current supported Supabase server-auth method.

Storage: `content-drafts` private admin-only; `learning-assets` contains only intentionally published curriculum media; `learner-work` private with owner policies and short-lived signed access. Admin access to curriculum must not imply access to private reflections. Database operators still have privileged infrastructure access; do not promise end-to-end encryption.

Validate input sizes, sanitize rendered content, allow only http/https resource URLs, set safe external-link attributes, and use CSRF protections/origin checks appropriate for cookie-authenticated mutations. Rate-limit auth/report/submission routes. Do not use arbitrary user-provided URLs as server fetch targets.

## 13. Operations and deployment

Use separate local/development and production environments. Commit SQL migrations and seed authored pilot content, not private learner data. Environment configuration: public Supabase URL/publishable key, server-only credentials only when necessary, and application origin. Verify auth callback URLs for local and deployed environments.

Before launch: migrate database, provision Andre's admin role through a trusted script/dashboard, configure upload policies, publish the pilot unit, verify multi-account access isolation, configure auth email delivery, and verify reset/sign-in flows. Deployment through Vercel or another supported Next.js host is a proposed user workflow; no deployment is performed in this deliverable.

Track error rate, save failures, publish conflicts, auth failures, and resource reports. Analytics events: `lesson_started`, `resource_opened`, `answer_submitted`, `lesson_completed`, `review_completed`, `checkpoint_submitted`, `publish_failed`. Exclude answer text, note bodies, and private file URLs from analytics. Deduplicate completion analytics by server event ID.

Backups and restore: check the chosen database plan's actual backup capabilities before launch; retain migrations and exported curriculum. Rehearse restoring a staging database and reconstructing projections from events. Define account deletion to remove private uploads, notes, attempts, and identifiers; do not merely hide the profile. Start with a documented manual export/delete workflow if automation is deferred.

Cost drivers: hosting, active database/storage usage, outbound email, and optional monitoring. No paid AI API is necessary for MVP. Do not assume provider free tiers will cover a public launch without checking current limits and usage.

## 14. Delivery sequence and acceptance gates

Build in vertical slices; time estimates are intentionally omitted until content volume and available hours are known.

| Slice | Work | Gate |
|---|---|---|
| 1. Content pilot | Author one complete unit, checks, variants, rubric; review sources | Another designer can explain each outcome and why its answers/rubric are defensible |
| 2. Identity + curriculum | Auth, roles, schema, RLS, draft editor, publish, learner renderer | Learner cannot see drafts or mutate curriculum; admin publishes without code edits |
| 3. One complete lesson | Resume, resources, checks, feedback, reflection, atomic completion | Refresh and retry preserve work; double submit creates one completion |
| 4. Habit and retention | Progress denominator, timezone dates, streak, review scheduler | Same-day/midnight/missed-day/concurrent tests pass; labels distinguish progress from mastery |
| 5. Polish + pilot | Mobile/desktop states, keyboard/reader checks, reports, backup/restore | Realistic learner/admin tasks work without instruction; critical defects fixed |

### Required tests

- Learner A cannot read or modify Learner B's attempts, notes, artifacts, or activity.
- Learner cannot grant admin, fetch draft/answer-key rows, publish, forge a completion, or increment a streak directly.
- Completion retry, parallel tabs, and parallel qualifying sources preserve one day and correct event counts.
- Asia/Makassar 23:59→00:00 creates separate dates; server UTC boundary does not.
- Daylight-saving transitions and leap day use calendar-day rules.
- Missing today but active yesterday preserves the streak; two-day gap resets only current streak.
- New drafts do not change a learner's denominator; a published edit does not erase credit; curriculum upgrades are explicit.
- Failed publish leaves current content live; stale draft save produces a recoverable conflict.
- Answer keys do not appear in initial network payload, source bundle, or learner database reads.
- External link failure permits core learning; returning resumes; save failure has a retry state with no false reward.
- Keyboard and screen-reader flows, visible focus, contrast, reduced motion, 200% zoom, and mobile reflow are checked manually as well as automatically.

## 15. Validation plan and open decisions

Start with Andre for two weeks, plus a small formative round covering at least a novice learner, a working designer, and the curator workflow. Recruit enough people to cover those differences; do not treat a small convenience sample as statistically representative.

Tasks: identify next lesson, use and return from a resource, answer an incorrect check and recover, explain what the progress number means, find review, resume after a gap; as curator, publish then correct a lesson. Observe task completion, confusion, lost work, and how the streak feels. Prototype tests can assess comprehension/navigation but cannot establish durable learning or backend reliability.

Decision rules: revise the path if participants cannot identify a next step unaided; simplify the player if resource handoffs lose position; revise labels if completion is read as professional proficiency; reduce streak prominence if it causes avoidance after a missed day. Validate learning with alternate delayed questions and applied work, not satisfaction alone.

Open decisions, not blockers for the proposed pilot: final name; English vs Indonesian; open vs invite-only enrollment; long-term content reviewer; reminder channel; whether any learner work will be shared. Default remains private-first, English, no social publishing.

## 16. Implementation kickoff prompt

> Build the first vertical slice from this foundation, using the attached visual concept as a style reference. Implement Next.js + TypeScript and Supabase with pinned supported versions. Start with auth, database migrations, RLS, Admin/Curator permissions, one editable pilot lesson, draft/publish, and a learner lesson view. Use real database content; do not hard-code the curriculum into UI components. Preserve immutable revisions and keep answer keys server-side. Then implement attempts and atomic idempotent completion before connecting streaks. Follow the specified violet design tokens, reading typography, accessible states, and responsive layouts. Treat external resources as linked learning material and distinguish self-reported consumption from completion. Do not add payments, hearts, leaderboards, AI grading, or extra roles. Report assumptions and blockers honestly. Deliver the slice with access-control and completion-integrity tests, setup instructions, and a list of remaining scope. Never claim a visual prototype is a working backend.

## 17. Decision log

1. Read user brief and attachments; recorded explicit requirements and proposed platform/language defaults.
2. Identified learner and curator task contexts before framing problems.
3. Defined outcome metrics before selecting mechanisms.
4. Reviewed external path, review, retrieval-learning, accessibility, and access-control references; distinguished evidence from proposed rules.
5. Inspected roadmap app data to verify its five major branches and sample resources.
6. Chose guided path + list, small standalone lessons, and separate habit/completion/practice indicators.
7. Chose one app with two roles and server-authoritative completion; specified immutable content/enrollment versions.
8. Proposed violet visual language with accessible reading defaults; created a self-contained clickable concept for Learn, Lesson, Progress, and Admin. Prototype state and statistics are demonstration-only.

## Deliverable verification

The HTML concept is self-contained and uses no external UI dependencies. JavaScript syntax, unique element IDs, navigation targets, and Markdown code fences were checked. Calculated contrast: primary violet/white 7.10:1; muted text/white 6.24:1; main text/canvas 15.97:1. These checks do not establish full accessibility conformance. Browser rendering and end-to-end interaction verification could not run because the browser runtime was unavailable and its download failed. Inspect the concept in a browser before using it as a final visual handoff. Production acceptance tests above are requirements, not tests already passed.

## Sources

Accessed 8 October 2026. Product examples are contextual references, not evidence that this proposed app works.

- **S1** Product Design Roadmap: https://product-design-roadmap.com/ — user screenshots plus public app topic/resource data. Full third-party descriptions were not imported.
- **S2** Duolingo, home-screen/path explanation: https://blog.duolingo.com/new-duolingo-home-screen-design/
- **S2b** Duolingo, reviewing lessons: https://blog.duolingo.com/how-to-review-lessons-on-duolingo/
- **S3** Uxcel, learning workflow: https://help.uxcel.com/en/articles/3943379-how-does-learning-work-on-uxcel
- **S4** Karpicke & Blunt (2011), Retrieval Practice Produces More Learning than Elaborative Studying with Concept Mapping: https://learninglab.psych.purdue.edu/downloads/2011/2011_Karpicke_Blunt_Science.pdf
- **S5** W3C contrast: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html ; target size: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum
- **S6** Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security ; Next.js: https://supabase.com/docs/guides/getting-started/quickstarts/nextjs ; server auth: https://supabase.com/docs/guides/auth/server-side
- **S7** Marty Cagan, Product Vision vs. Mission: https://www.svpg.com/product-vision-vs-mission/
