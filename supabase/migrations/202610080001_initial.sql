create extension if not exists pgcrypto;
create schema if not exists private;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text, learning_timezone text not null default 'Asia/Makassar', timezone_locked_at timestamptz,
 created_at timestamptz not null default now()
);
create table public.user_roles (user_id uuid not null references auth.users(id) on delete cascade, role text not null check(role in ('admin')), primary key(user_id,role));
create table public.tracks (id uuid primary key default gen_random_uuid(), title text not null, slug text not null unique);
create table public.units (id uuid primary key default gen_random_uuid(), track_id uuid not null references public.tracks, title text not null, position int not null);
create table public.topics (id uuid primary key default gen_random_uuid(), unit_id uuid not null references public.units, title text not null, position int not null);
create table public.lessons (id uuid primary key default gen_random_uuid(), topic_id uuid not null references public.topics, title text not null, slug text not null unique, position int not null, kind text not null default 'lesson' check(kind in ('lesson','checkpoint')), published_revision_id uuid, archived_at timestamptz);
create table public.path_previews (id uuid primary key default gen_random_uuid(), unit_id uuid not null references public.units, title text not null, position int not null, kind text not null default 'lesson', unique(unit_id,position));
create table public.lesson_revisions (
 id uuid primary key default gen_random_uuid(), lesson_id uuid not null references public.lessons(id), revision_number int not null,
 state text not null check(state in ('draft','published')), outcome text not null default '',
 content jsonb not null default '[]', question_public jsonb not null default '[]', review_public jsonb not null default '[]', resource_cards jsonb not null default '[]',
 estimated_minutes int not null default 7, author_id uuid references auth.users, created_at timestamptz not null default now(), published_at timestamptz,
 unique(lesson_id,revision_number)
);
alter table public.lessons add constraint published_revision_fk foreign key(published_revision_id) references public.lesson_revisions(id);
create unique index one_draft_per_lesson on public.lesson_revisions(lesson_id) where state='draft';
create table private.answer_keys (revision_id uuid not null references public.lesson_revisions(id) on delete cascade, question_id text not null, correct_option_id text not null, explanations jsonb not null, review boolean not null default false, primary key(revision_id,question_id,review));
create table public.resources (id uuid primary key default gen_random_uuid(), type text not null check(type in ('article','youtube','file','reference')), title text not null, url text not null, publisher text not null, language text not null default 'en', reviewed_at date, created_at timestamptz not null default now(), check(url ~* '^https?://'));
create table public.revision_resources (revision_id uuid not null references public.lesson_revisions(id) on delete cascade, resource_id uuid not null references public.resources(id), position int not null, metadata_snapshot jsonb not null, primary key(revision_id,resource_id));
create table public.curriculum_versions (id uuid primary key default gen_random_uuid(), track_id uuid not null references public.tracks, version_number int not null, manifest jsonb not null default '[]', created_at timestamptz not null default now(), unique(track_id,version_number));
create table public.enrollments (user_id uuid not null references auth.users(id) on delete cascade, track_id uuid not null references public.tracks, curriculum_version_id uuid not null references public.curriculum_versions, enrolled_at timestamptz not null default now(), primary key(user_id,track_id));
create table public.attempts (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, lesson_id uuid not null references public.lessons, revision_id uuid not null references public.lesson_revisions, status text not null default 'in_progress' check(status in ('in_progress','completed')), current_step int not null default 0, started_at timestamptz not null default now(), completed_at timestamptz);
create unique index one_open_attempt on public.attempts(user_id,lesson_id) where status='in_progress';
create table public.attempt_answers (attempt_id uuid not null references public.attempts(id) on delete cascade, question_id text not null, first_answer text not null, latest_answer text not null, retries int not null default 0, correct boolean not null default false, evaluated_at timestamptz not null default now(), primary key(attempt_id,question_id));
create table public.reflections (attempt_id uuid primary key references public.attempts(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade, body text not null, updated_at timestamptz not null default now());
create table public.lesson_completions (user_id uuid not null references auth.users(id) on delete cascade, lesson_id uuid not null references public.lessons, attempt_id uuid not null unique references public.attempts, revision_id uuid not null references public.lesson_revisions, completed_at timestamptz not null default now(), primary key(user_id,lesson_id));
create table public.review_schedule (user_id uuid not null references auth.users(id) on delete cascade, lesson_id uuid not null references public.lessons, next_due_local_date date not null, interval_stage int not null default 0, occurrence int not null default 1, primary key(user_id,lesson_id));
create table public.review_attempts (user_id uuid not null references auth.users(id) on delete cascade, lesson_id uuid not null references public.lessons, occurrence int not null, first_score numeric not null, completed_at timestamptz not null default now(), primary key(user_id,lesson_id,occurrence));
create table public.review_answers (user_id uuid not null references auth.users(id) on delete cascade, lesson_id uuid not null references public.lessons, occurrence int not null, question_id text not null, first_answer text not null, latest_answer text not null, correct boolean not null, primary key(user_id,lesson_id,occurrence,question_id));
create table public.learning_events (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, type text not null check(type in ('lesson','review','checkpoint')), source_id text not null, occurred_at timestamptz not null default now(), local_date date not null, timezone_at_event text not null, unique(user_id,type,source_id));
create table public.daily_activity (user_id uuid not null references auth.users(id) on delete cascade, local_date date not null, qualifying_count int not null default 1, primary key(user_id,local_date));
create table public.notes (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, lesson_id uuid references public.lessons, body text not null default '', updated_at timestamptz not null default now());
create table public.bookmarks (user_id uuid not null references auth.users(id) on delete cascade, resource_id uuid not null references public.resources, primary key(user_id,resource_id));
create table public.practice_submissions (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, lesson_id uuid not null references public.lessons, body text not null, submitted_at timestamptz not null default now(), unique(user_id,lesson_id));
create table public.resource_reports (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, resource_id uuid not null references public.resources, reason text not null, status text not null default 'open', created_at timestamptz not null default now());
create table public.admin_audit_log (id uuid primary key default gen_random_uuid(), actor_id uuid not null references auth.users, action text not null, target_id uuid not null, revision_number int, occurred_at timestamptz not null default now());

create index on public.attempts(user_id,lesson_id);
create index on public.lesson_completions(user_id);
create index on public.review_schedule(user_id,next_due_local_date);
create index on public.daily_activity(user_id,local_date);

-- Exposed tables are readable only where needed. Mutations go through checked RPCs.
do $$ declare t text; begin
 foreach t in array array['profiles','user_roles','tracks','units','topics','lessons','path_previews','lesson_revisions','resources','revision_resources','curriculum_versions','enrollments','attempts','attempt_answers','reflections','lesson_completions','review_schedule','review_attempts','review_answers','learning_events','daily_activity','notes','bookmarks','practice_submissions','resource_reports','admin_audit_log'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
 end loop;
end $$;
revoke all on schema private from public, anon, authenticated;
revoke all on private.answer_keys from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select on public.profiles,public.user_roles,public.tracks,public.units,public.topics,public.lessons,public.path_previews,public.lesson_revisions,public.resources,public.revision_resources,public.curriculum_versions,public.enrollments,public.attempts,public.attempt_answers,public.reflections,public.lesson_completions,public.review_schedule,public.review_attempts,public.review_answers,public.learning_events,public.daily_activity,public.notes,public.bookmarks,public.practice_submissions,public.resource_reports to authenticated;

create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.user_roles where user_id=auth.uid() and role='admin') $$;
revoke all on function public.is_admin() from public; grant execute on function public.is_admin() to authenticated;
create policy own_profile on public.profiles for select to authenticated using(id=auth.uid());
create policy own_role on public.user_roles for select to authenticated using(user_id=auth.uid());
create policy read_tracks on public.tracks for select to authenticated using(true);
create policy read_units on public.units for select to authenticated using(true);
create policy read_topics on public.topics for select to authenticated using(true);
create policy read_lessons on public.lessons for select to authenticated using(published_revision_id is not null or public.is_admin());
create policy read_path_previews on public.path_previews for select to authenticated using(true);
create policy read_revisions on public.lesson_revisions for select to authenticated using(state='published' or public.is_admin());
create policy read_resources on public.resources for select to authenticated using(exists(select 1 from public.revision_resources rr join public.lesson_revisions lr on lr.id=rr.revision_id where rr.resource_id=resources.id and lr.state='published') or public.is_admin());
create policy read_revision_resources on public.revision_resources for select to authenticated using(exists(select 1 from public.lesson_revisions lr where lr.id=revision_id and lr.state='published') or public.is_admin());
create policy read_versions on public.curriculum_versions for select to authenticated using(exists(select 1 from public.enrollments e where e.curriculum_version_id=id and e.user_id=auth.uid()) or public.is_admin());
create policy own_enrollment on public.enrollments for select to authenticated using(user_id=auth.uid());
create policy own_attempt on public.attempts for select to authenticated using(user_id=auth.uid());
create policy own_answers on public.attempt_answers for select to authenticated using(exists(select 1 from public.attempts a where a.id=attempt_id and a.user_id=auth.uid()));
create policy own_reflections on public.reflections for select to authenticated using(user_id=auth.uid());
create policy own_completions on public.lesson_completions for select to authenticated using(user_id=auth.uid());
create policy own_schedule on public.review_schedule for select to authenticated using(user_id=auth.uid());
create policy own_reviews on public.review_attempts for select to authenticated using(user_id=auth.uid());
create policy own_review_answers on public.review_answers for select to authenticated using(user_id=auth.uid());
create policy own_events on public.learning_events for select to authenticated using(user_id=auth.uid());
create policy own_activity on public.daily_activity for select to authenticated using(user_id=auth.uid());
create policy own_notes on public.notes for select to authenticated using(user_id=auth.uid());
create policy own_bookmarks on public.bookmarks for select to authenticated using(user_id=auth.uid());
create policy own_practice on public.practice_submissions for select to authenticated using(user_id=auth.uid());
create policy own_reports on public.resource_reports for select to authenticated using(user_id=auth.uid());

create function public.bootstrap_user(p_timezone text default 'Asia/Makassar') returns void language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_track uuid; v_version uuid;
begin
 if v_user is null then raise exception 'unauthorized'; end if;
 if p_timezone not in (select name from pg_timezone_names) then raise exception 'invalid timezone'; end if;
 insert into public.profiles(id,learning_timezone) values(v_user,p_timezone) on conflict(id) do update set learning_timezone=case when profiles.timezone_locked_at is null then excluded.learning_timezone else profiles.learning_timezone end;
 select id into v_track from public.tracks where slug='product-design-foundations';
 select id into v_version from public.curriculum_versions where track_id=v_track order by version_number desc limit 1;
 insert into public.enrollments(user_id,track_id,curriculum_version_id) values(v_user,v_track,v_version) on conflict(user_id,track_id) do nothing;
end $$;

create function public.start_lesson(p_lesson uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_revision uuid; v_attempt uuid;
begin
 if v_user is null then raise exception 'unauthorized'; end if;
 select l.published_revision_id into v_revision from public.lessons l join public.units u on u.id=(select t.unit_id from public.topics t where t.id=l.topic_id) join public.enrollments e on e.track_id=u.track_id and e.user_id=v_user join public.curriculum_versions cv on cv.id=e.curriculum_version_id where l.id=p_lesson and l.archived_at is null and cv.manifest ? p_lesson::text;
 if v_revision is null then raise exception 'lesson unavailable'; end if;
 select id into v_attempt from public.attempts where user_id=v_user and lesson_id=p_lesson and status='in_progress';
 if v_attempt is not null then return v_attempt; end if;
 insert into public.attempts(user_id,lesson_id,revision_id) values(v_user,p_lesson,v_revision) on conflict do nothing returning id into v_attempt;
 if v_attempt is null then select id into v_attempt from public.attempts where user_id=v_user and lesson_id=p_lesson and status='in_progress'; end if;
 return v_attempt;
end $$;

create function public.save_position(p_attempt uuid,p_step int) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_step < 0 or p_step > 5 then raise exception 'invalid step'; end if;
 update public.attempts set current_step=p_step where id=p_attempt and user_id=auth.uid() and status='in_progress';
 if not found then raise exception 'attempt unavailable'; end if;
end $$;

create function public.submit_answer(p_attempt uuid,p_question text,p_option text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_revision uuid; v_public jsonb; v_key private.answer_keys%rowtype; v_correct boolean;
begin
 select revision_id into v_revision from public.attempts where id=p_attempt and user_id=auth.uid() and status='in_progress' for update;
 if v_revision is null then raise exception 'attempt unavailable'; end if;
 select q into v_public from public.lesson_revisions r, jsonb_array_elements(r.question_public) q where r.id=v_revision and q->>'id'=p_question;
 if v_public is null or not exists(select 1 from jsonb_array_elements(v_public->'options') o where o->>'id'=p_option) then raise exception 'invalid option'; end if;
 select * into v_key from private.answer_keys where revision_id=v_revision and question_id=p_question and review=false;
 v_correct:=p_option=v_key.correct_option_id;
 insert into public.attempt_answers(attempt_id,question_id,first_answer,latest_answer,correct) values(p_attempt,p_question,p_option,p_option,v_correct)
 on conflict(attempt_id,question_id) do update set latest_answer=excluded.latest_answer,retries=attempt_answers.retries+1,correct=excluded.correct,evaluated_at=now();
 return jsonb_build_object('correct',v_correct,'explanation',coalesce(v_key.explanations->>p_option,''));
end $$;

create function public.save_reflection(p_attempt uuid,p_body text) returns void language plpgsql security definer set search_path='' as $$
begin
 if length(trim(p_body)) < 1 or length(p_body)>4000 then raise exception 'reflection must be 1–4000 characters'; end if;
 if not exists(select 1 from public.attempts where id=p_attempt and user_id=auth.uid() and status='in_progress') then raise exception 'attempt unavailable'; end if;
 insert into public.reflections(attempt_id,user_id,body) values(p_attempt,auth.uid(),trim(p_body)) on conflict(attempt_id) do update set body=excluded.body,updated_at=now();
end $$;

create function public.progress_receipt() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_today date; v_tz text; v_manifest jsonb; v_count int; v_total int; v_current int:=0; v_longest int:=0; v_run int:=0; v_prev date; v_day date; v_cursor date;
begin
 if v_user is null then raise exception 'unauthorized'; end if;
 select learning_timezone into v_tz from public.profiles where id=v_user;
 v_today:=(now() at time zone coalesce(v_tz,'Asia/Makassar'))::date;
 select cv.manifest into v_manifest from public.enrollments e join public.curriculum_versions cv on cv.id=e.curriculum_version_id where e.user_id=v_user limit 1;
 v_total:=coalesce(jsonb_array_length(v_manifest),0);
 select count(*) into v_count from public.lesson_completions lc where lc.user_id=v_user and v_manifest ? lc.lesson_id::text;
 for v_day in select local_date from public.daily_activity where user_id=v_user order by local_date loop
  if v_prev is not null and v_day=v_prev+1 then v_run:=v_run+1; else v_run:=1; end if;
  v_longest:=greatest(v_longest,v_run); v_prev:=v_day;
 end loop;
 v_cursor:=case when exists(select 1 from public.daily_activity where user_id=v_user and local_date=v_today) then v_today else v_today-1 end;
 while exists(select 1 from public.daily_activity where user_id=v_user and local_date=v_cursor) loop v_current:=v_current+1; v_cursor:=v_cursor-1; end loop;
 return jsonb_build_object('completed',v_count,'total',v_total,'percent',case when v_total=0 then 0 else round(v_count::numeric*100/v_total) end,'current_streak',v_current,'longest_streak',v_longest,'today',v_today,'goal_done',exists(select 1 from public.daily_activity where user_id=v_user and local_date=v_today));
end $$;

create function public.complete_lesson(p_attempt uuid,p_idempotency uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_a public.attempts%rowtype; v_tz text; v_day date; v_questions int; v_correct int; v_inserted int;
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
 insert into public.lesson_completions(user_id,lesson_id,attempt_id,revision_id) values(v_user,v_a.lesson_id,p_attempt,v_a.revision_id) on conflict(user_id,lesson_id) do nothing;
 get diagnostics v_inserted=row_count;
 update public.attempts set status='completed',completed_at=now() where id=p_attempt;
 if v_inserted=1 then
  insert into public.learning_events(user_id,type,source_id,local_date,timezone_at_event) values(v_user,'lesson',v_a.lesson_id::text,v_day,v_tz);
  insert into public.daily_activity(user_id,local_date,qualifying_count) values(v_user,v_day,1) on conflict(user_id,local_date) do update set qualifying_count=daily_activity.qualifying_count+1;
  insert into public.review_schedule(user_id,lesson_id,next_due_local_date) values(v_user,v_a.lesson_id,v_day+1) on conflict(user_id,lesson_id) do nothing;
  update public.profiles set timezone_locked_at=coalesce(timezone_locked_at,now()) where id=v_user;
 end if;
 return public.progress_receipt() || jsonb_build_object('review_due',v_day+1,'completion_id',v_a.lesson_id,'request_id',p_idempotency);
end $$;

-- Only trusted provisioning grants roles. Draft content and private keys move together.
create function public.admin_get_lesson(p_lesson uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_revision public.lesson_revisions%rowtype; v_keys jsonb;
begin
 if not public.is_admin() then raise exception 'forbidden'; end if;
 select * into v_revision from public.lesson_revisions where lesson_id=p_lesson order by (state='draft') desc, revision_number desc limit 1;
 select coalesce(jsonb_agg(jsonb_build_object('question_id',question_id,'correct_option_id',correct_option_id,'explanations',explanations,'review',review)),'[]'::jsonb) into v_keys from private.answer_keys where revision_id=v_revision.id;
 return jsonb_build_object('revision',to_jsonb(v_revision),'keys',v_keys);
end $$;

create function public.admin_save_draft(p_lesson uuid,p_expected int,p_outcome text,p_content jsonb,p_questions jsonb,p_review jsonb,p_resources jsonb,p_keys jsonb) returns int language plpgsql security definer set search_path='' as $$
declare v_rev public.lesson_revisions%rowtype; v_current int; v_key jsonb; v_item jsonb; v_resource uuid; v_pos int:=0;
begin
 if not public.is_admin() then raise exception 'forbidden'; end if;
 perform 1 from public.lessons where id=p_lesson for update;
 select coalesce(max(revision_number),0) into v_current from public.lesson_revisions where lesson_id=p_lesson;
 if v_current<>p_expected then raise exception 'stale revision'; end if;
 select * into v_rev from public.lesson_revisions where lesson_id=p_lesson and state='draft';
 if v_rev.id is null then
  insert into public.lesson_revisions(lesson_id,revision_number,state,author_id) values(p_lesson,v_current+1,'draft',auth.uid()) returning * into v_rev;
 else
  update public.lesson_revisions set revision_number=v_current+1 where id=v_rev.id returning * into v_rev;
 end if;
 update public.lesson_revisions set outcome=trim(p_outcome),content=p_content,question_public=p_questions,review_public=p_review,resource_cards=p_resources where id=v_rev.id;
 delete from private.answer_keys where revision_id=v_rev.id;
 for v_key in select value from jsonb_array_elements(p_keys) loop
  insert into private.answer_keys(revision_id,question_id,correct_option_id,explanations,review) values(v_rev.id,v_key->>'question_id',v_key->>'correct_option_id',v_key->'explanations',coalesce((v_key->>'review')::boolean,false));
 end loop;
 delete from public.revision_resources where revision_id=v_rev.id;
 for v_item in select value from jsonb_array_elements(p_resources) loop
  v_pos:=v_pos+1;
  insert into public.resources(type,title,url,publisher,language,reviewed_at) values(v_item->>'type',v_item->>'title',v_item->>'url',v_item->>'publisher',coalesce(v_item->>'language','en'),current_date) returning id into v_resource;
  insert into public.revision_resources(revision_id,resource_id,position,metadata_snapshot) values(v_rev.id,v_resource,v_pos,v_item);
 end loop;
 insert into public.admin_audit_log(actor_id,action,target_id,revision_number) values(auth.uid(),'save_draft',p_lesson,v_rev.revision_number);
 return v_rev.revision_number;
end $$;

create function public.admin_publish(p_lesson uuid,p_expected int) returns int language plpgsql security definer set search_path='' as $$
declare v_rev public.lesson_revisions%rowtype; v_q jsonb; v_r jsonb; v_item jsonb; v_key text; v_explanations jsonb;
begin
 if not public.is_admin() then raise exception 'forbidden'; end if;
 perform 1 from public.lessons where id=p_lesson for update;
 select * into v_rev from public.lesson_revisions where lesson_id=p_lesson and state='draft' and revision_number=p_expected for update;
 if v_rev.id is null then raise exception 'stale or missing draft'; end if;
 if length(trim(v_rev.outcome))<10 or jsonb_array_length(v_rev.content)<1 or jsonb_array_length(v_rev.question_public)<1 or jsonb_array_length(v_rev.review_public)<2 or jsonb_array_length(v_rev.resource_cards)<1 then raise exception 'missing lesson content, checks, review items, or resources'; end if;
 for v_item in select value from jsonb_array_elements(v_rev.content) loop
  if v_item->>'type' not in ('heading','paragraph','callout') or length(trim(coalesce(v_item->>'text','')))<2 or (v_item->>'type'='callout' and length(trim(coalesce(v_item->>'title','')))<2) then raise exception 'invalid content block'; end if;
 end loop;
 for v_q in select value from jsonb_array_elements(v_rev.question_public || v_rev.review_public) loop
  if length(coalesce(v_q->>'prompt',''))<10 or jsonb_array_length(v_q->'options')<2 then raise exception 'invalid question'; end if;
  select correct_option_id,explanations into v_key,v_explanations from private.answer_keys where revision_id=v_rev.id and question_id=v_q->>'id' and review=exists(select 1 from jsonb_array_elements(v_rev.review_public) q where q->>'id'=v_q->>'id');
  if v_key is null or not exists(select 1 from jsonb_array_elements(v_q->'options') o where o->>'id'=v_key) then raise exception 'missing answer key'; end if;
  if exists(select 1 from jsonb_array_elements(v_q->'options') o where length(trim(coalesce(o->>'text','')))<1 or length(trim(coalesce(v_explanations->>(o->>'id'),'')))<2) then raise exception 'missing answer explanation or option text'; end if;
 end loop;
 for v_r in select value from jsonb_array_elements(v_rev.resource_cards) loop
  if length(coalesce(v_r->>'title',''))<2 or length(coalesce(v_r->>'publisher',''))<2 or (v_r->>'url') !~* '^https?://' then raise exception 'invalid resource metadata'; end if;
 end loop;
 update public.lesson_revisions set state='published',published_at=now() where id=v_rev.id;
 update public.lessons set published_revision_id=v_rev.id where id=p_lesson;
 insert into public.admin_audit_log(actor_id,action,target_id,revision_number) values(auth.uid(),'publish',p_lesson,v_rev.revision_number);
 return v_rev.revision_number;
end $$;

create function public.submit_review_answer(p_lesson uuid,p_question text,p_option text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_schedule public.review_schedule%rowtype; v_revision uuid; v_question jsonb; v_key private.answer_keys%rowtype; v_tz text; v_today date; v_correct boolean;
begin
 if v_user is null then raise exception 'unauthorized'; end if;
 select learning_timezone into v_tz from public.profiles where id=v_user;
 v_today:=(now() at time zone v_tz)::date;
 select * into v_schedule from public.review_schedule where user_id=v_user and lesson_id=p_lesson for update;
 if v_schedule.user_id is null or v_schedule.next_due_local_date>v_today then raise exception 'review unavailable'; end if;
 select published_revision_id into v_revision from public.lessons where id=p_lesson;
 select q into v_question from public.lesson_revisions r,jsonb_array_elements(r.review_public) q where r.id=v_revision and q->>'id'=p_question;
 if v_question is null or not exists(select 1 from jsonb_array_elements(v_question->'options') o where o->>'id'=p_option) then raise exception 'invalid review option'; end if;
 select * into v_key from private.answer_keys where revision_id=v_revision and question_id=p_question and review=true;
 v_correct:=p_option=v_key.correct_option_id;
 insert into public.review_answers(user_id,lesson_id,occurrence,question_id,first_answer,latest_answer,correct) values(v_user,p_lesson,v_schedule.occurrence,p_question,p_option,p_option,v_correct)
 on conflict(user_id,lesson_id,occurrence,question_id) do update set latest_answer=excluded.latest_answer,correct=excluded.correct;
 return jsonb_build_object('correct',v_correct,'explanation',coalesce(v_key.explanations->>p_option,''));
end $$;

create function public.complete_review(p_lesson uuid,p_occurrence int) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_s public.review_schedule%rowtype; v_tz text; v_today date; v_revision uuid; v_total int; v_correct int; v_first int; v_score numeric; v_days int;
begin
 if v_user is null then raise exception 'unauthorized'; end if;
 perform 1 from public.profiles where id=v_user for update;
 select learning_timezone into v_tz from public.profiles where id=v_user;
 v_today:=(now() at time zone v_tz)::date;
 if exists(select 1 from public.review_attempts where user_id=v_user and lesson_id=p_lesson and occurrence=p_occurrence) then return public.progress_receipt(); end if;
 select * into v_s from public.review_schedule where user_id=v_user and lesson_id=p_lesson for update;
 if v_s.user_id is null or v_s.occurrence<>p_occurrence or v_s.next_due_local_date>v_today then raise exception 'review unavailable'; end if;
 select published_revision_id into v_revision from public.lessons where id=p_lesson;
 select jsonb_array_length(review_public) into v_total from public.lesson_revisions where id=v_revision;
 select count(*) into v_correct from public.review_answers where user_id=v_user and lesson_id=p_lesson and occurrence=p_occurrence and correct;
 if v_total<1 or v_correct<>v_total then raise exception 'correct all review items before finishing'; end if;
 select count(*) into v_first from public.review_answers a join private.answer_keys k on k.revision_id=v_revision and k.question_id=a.question_id and k.review=true where a.user_id=v_user and a.lesson_id=p_lesson and a.occurrence=p_occurrence and a.first_answer=k.correct_option_id;
 v_score:=v_first::numeric/v_total;
 insert into public.review_attempts(user_id,lesson_id,occurrence,first_score) values(v_user,p_lesson,p_occurrence,v_score) on conflict do nothing;
 insert into public.learning_events(user_id,type,source_id,local_date,timezone_at_event) values(v_user,'review',p_lesson::text||':'||p_occurrence,v_today,v_tz) on conflict do nothing;
 insert into public.daily_activity(user_id,local_date,qualifying_count) values(v_user,v_today,1) on conflict(user_id,local_date) do update set qualifying_count=daily_activity.qualifying_count+1;
 v_days:=case when v_score<0.8 then 1 when v_s.interval_stage=0 then 3 when v_s.interval_stage=1 then 7 else 14 end;
 update public.review_schedule set next_due_local_date=v_today+v_days,interval_stage=case when v_score<0.8 then 0 else least(v_s.interval_stage+1,3) end,occurrence=occurrence+1 where user_id=v_user and lesson_id=p_lesson;
 return public.progress_receipt() || jsonb_build_object('first_score',v_score,'next_due',v_today+v_days);
end $$;

revoke all on function public.bootstrap_user(text),public.start_lesson(uuid),public.save_position(uuid,int),public.submit_answer(uuid,text,text),public.save_reflection(uuid,text),public.progress_receipt(),public.complete_lesson(uuid,uuid),public.admin_get_lesson(uuid),public.admin_save_draft(uuid,int,text,jsonb,jsonb,jsonb,jsonb,jsonb),public.admin_publish(uuid,int),public.submit_review_answer(uuid,text,text),public.complete_review(uuid,int) from public;
grant execute on function public.bootstrap_user(text),public.start_lesson(uuid),public.save_position(uuid,int),public.submit_answer(uuid,text,text),public.save_reflection(uuid,text),public.progress_receipt(),public.complete_lesson(uuid,uuid),public.admin_get_lesson(uuid),public.admin_save_draft(uuid,int,text,jsonb,jsonb,jsonb,jsonb,jsonb),public.admin_publish(uuid,int),public.submit_review_answer(uuid,text,text),public.complete_review(uuid,int) to authenticated;

insert into storage.buckets(id,name,public) values('content-drafts','content-drafts',false),('learning-assets','learning-assets',true),('learner-work','learner-work',false) on conflict(id) do nothing;
create policy admin_draft_storage on storage.objects for all to authenticated using(bucket_id='content-drafts' and public.is_admin()) with check(bucket_id='content-drafts' and public.is_admin());
create policy published_asset_read on storage.objects for select to authenticated using(bucket_id='learning-assets');
create policy admin_asset_write on storage.objects for all to authenticated using(bucket_id='learning-assets' and public.is_admin()) with check(bucket_id='learning-assets' and public.is_admin());
create policy own_work on storage.objects for all to authenticated using(bucket_id='learner-work' and (storage.foldername(name))[1]=auth.uid()::text) with check(bucket_id='learner-work' and (storage.foldername(name))[1]=auth.uid()::text);
