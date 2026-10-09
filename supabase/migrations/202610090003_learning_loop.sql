-- Private applied work and review projections.
alter table public.review_schedule add column revision_id uuid references public.lesson_revisions(id);
update public.review_schedule s set revision_id=c.revision_id from public.lesson_completions c where c.user_id=s.user_id and c.lesson_id=s.lesson_id;
update public.review_schedule s set revision_id=l.published_revision_id from public.lessons l where l.id=s.lesson_id and s.revision_id is null;
create function public.pin_review_revision() returns trigger language plpgsql set search_path='' as $$
begin
 if new.revision_id is null then select published_revision_id into new.revision_id from public.lessons where id=new.lesson_id; end if;
 return new;
end $$;
create trigger pin_review_revision before insert on public.review_schedule for each row execute function public.pin_review_revision();

create table public.checkpoint_drafts (
 user_id uuid not null references auth.users(id) on delete cascade,
 node_id uuid not null references public.curriculum_nodes(id),
 project_name text not null default '', answers jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now(), primary key(user_id,node_id)
);
create table public.checkpoint_submissions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 node_id uuid not null references public.curriculum_nodes(id), revision_number integer not null check(revision_number>0),
 project_name text not null, answers jsonb not null, rubric jsonb not null,
 submitted_at timestamptz not null default now(), unique(user_id,node_id,revision_number)
);
create index checkpoint_submissions_owner on public.checkpoint_submissions(user_id,node_id,submitted_at desc);
alter table public.checkpoint_drafts enable row level security;
alter table public.checkpoint_submissions enable row level security;
revoke all on public.checkpoint_drafts,public.checkpoint_submissions from anon,authenticated;
grant select on public.checkpoint_drafts,public.checkpoint_submissions to authenticated;
create policy own_checkpoint_drafts on public.checkpoint_drafts for select to authenticated using(user_id=auth.uid());
create policy own_checkpoint_submissions on public.checkpoint_submissions for select to authenticated using(user_id=auth.uid());

-- Keep historical first answers meaningful after adding explicit accuracy columns.
update public.attempt_answers aa set first_correct=(aa.first_answer=k.correct_option_id)
from public.attempts a,private.answer_keys k
where aa.attempt_id=a.id and k.revision_id=a.revision_id and k.review=false and k.question_id=aa.question_id and aa.first_correct is null;
update public.review_answers ra set first_correct=(ra.first_answer=k.correct_option_id)
from private.answer_keys k where ra.lesson_id='10000000-0000-4000-8000-000000000012' and k.revision_id='20000000-0000-4000-8000-000000000001' and k.review=true and k.question_id=ra.question_id and ra.first_correct is null;

create function public.save_checkpoint_draft(p_node uuid,p_project text,p_answers jsonb) returns timestamptz language plpgsql security definer set search_path='' as $$
declare v_time timestamptz;
begin
 if auth.uid() is null then raise exception 'unauthorized'; end if;
 if not exists(select 1 from public.curriculum_nodes where id=p_node and public.curriculum_visible(id) and is_learnable and exists(select 1 from public.lesson_revisions where id=published_revision_id and completion_policy='checkpoint')) then raise exception 'checkpoint unavailable'; end if;
 if not exists(select 1 from public.enrollments e join public.curriculum_versions cv on cv.id=e.curriculum_version_id where e.user_id=auth.uid() and cv.manifest ? p_node::text) then raise exception 'checkpoint unavailable in enrolled unit'; end if;
 if length(p_project)>150 or jsonb_typeof(p_answers)<>'object' or length(p_answers::text)>20000 then raise exception 'invalid draft'; end if;
 insert into public.checkpoint_drafts(user_id,node_id,project_name,answers) values(auth.uid(),p_node,trim(p_project),p_answers)
 on conflict(user_id,node_id) do update set project_name=excluded.project_name,answers=excluded.answers,updated_at=now() returning updated_at into v_time;
 return v_time;
end $$;

create function public.submit_checkpoint(p_node uuid,p_rubric jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_draft public.checkpoint_drafts%rowtype; v_revision integer; v_id uuid; v_lesson_revision uuid; v_attempt uuid; v_tz text; v_day date; v_key text; v_inserted integer;
begin
 if v_user is null then raise exception 'unauthorized'; end if;
 perform 1 from public.profiles where id=v_user for update;
 select * into v_draft from public.checkpoint_drafts where user_id=v_user and node_id=p_node for update;
 if v_draft.user_id is null or length(trim(v_draft.project_name))<2 then raise exception 'save a project draft first'; end if;
 foreach v_key in array array['target_user','problem','problem_label','evidence','vision','value_proposition','mvp_scope','success_metric','tradeoff','reflection'] loop
  if length(trim(coalesce(v_draft.answers->>v_key,'')))<3 then raise exception 'complete checkpoint field %',v_key; end if;
 end loop;
 if v_draft.answers->>'problem_label' not in ('observed','assumed') then raise exception 'label the problem as observed or assumed'; end if;
 foreach v_key in array array['user','problem','evidence','vision','value','mvp','metric','tradeoff'] loop
  if p_rubric->>v_key not in ('needs_work','partly_clear','clear') then raise exception 'complete the self-assessment'; end if;
 end loop;
 if (select count(*) from jsonb_object_keys(p_rubric))<>8 then raise exception 'invalid self-assessment'; end if;
 select published_revision_id into v_lesson_revision from public.curriculum_nodes where id=p_node and public.curriculum_visible(id) and is_learnable;
 if not exists(select 1 from public.lesson_revisions where id=v_lesson_revision and completion_policy='checkpoint') then raise exception 'checkpoint unavailable'; end if;
 if not exists(select 1 from public.enrollments e join public.curriculum_versions cv on cv.id=e.curriculum_version_id where e.user_id=v_user and cv.manifest ? p_node::text) then raise exception 'checkpoint unavailable in enrolled unit'; end if;
 select coalesce(max(revision_number),0)+1 into v_revision from public.checkpoint_submissions where user_id=v_user and node_id=p_node;
 insert into public.checkpoint_submissions(user_id,node_id,revision_number,project_name,answers,rubric) values(v_user,p_node,v_revision,v_draft.project_name,v_draft.answers,p_rubric) returning id into v_id;
 if not exists(select 1 from public.lesson_completions where user_id=v_user and lesson_id=p_node) then
  insert into public.attempts(user_id,lesson_id,revision_id,status,current_step,completed_at) values(v_user,p_node,v_lesson_revision,'completed',4,now()) returning id into v_attempt;
  insert into public.lesson_completions(user_id,lesson_id,attempt_id,revision_id) values(v_user,p_node,v_attempt,v_lesson_revision) on conflict do nothing;
  get diagnostics v_inserted=row_count;
  if v_inserted=1 then
   select learning_timezone into v_tz from public.profiles where id=v_user;
   v_day:=(now() at time zone v_tz)::date;
   insert into public.learning_events(user_id,type,source_id,local_date,timezone_at_event) values(v_user,'checkpoint',p_node::text,v_day,v_tz) on conflict do nothing;
   insert into public.daily_activity(user_id,local_date,qualifying_count) values(v_user,v_day,1) on conflict(user_id,local_date) do update set qualifying_count=daily_activity.qualifying_count+1;
   update public.profiles set timezone_locked_at=coalesce(timezone_locked_at,now()) where id=v_user;
  end if;
 end if;
 return jsonb_build_object('id',v_id,'revision_number',v_revision) || public.progress_receipt();
end $$;
revoke all on function public.save_checkpoint_draft(uuid,text,jsonb),public.submit_checkpoint(uuid,jsonb) from public;
grant execute on function public.save_checkpoint_draft(uuid,text,jsonb),public.submit_checkpoint(uuid,jsonb) to authenticated;

-- Existing members keep v1 until they explicitly take the full unit. No history changes.
create function public.upgrade_curriculum() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_version uuid;
begin
 if auth.uid() is null then raise exception 'unauthorized'; end if;
 select id into v_version from public.curriculum_versions where track_id='10000000-0000-4000-8000-000000000001' order by version_number desc limit 1;
 update public.enrollments set curriculum_version_id=v_version where user_id=auth.uid() and track_id='10000000-0000-4000-8000-000000000001';
 if not found then raise exception 'enrollment unavailable'; end if;
 return public.progress_receipt();
end $$;
revoke all on function public.upgrade_curriculum() from public;
grant execute on function public.upgrade_curriculum() to authenticated;

-- Newly created tree lessons have no legacy topic FK. Gate starts by the pinned manifest.
create or replace function public.start_lesson(p_lesson uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_revision uuid; v_attempt uuid;
begin
 if v_user is null then raise exception 'unauthorized'; end if;
 select n.published_revision_id into v_revision from public.curriculum_nodes n join public.enrollments e on e.user_id=v_user and e.track_id='10000000-0000-4000-8000-000000000001' join public.curriculum_versions cv on cv.id=e.curriculum_version_id
 where n.id=p_lesson and public.curriculum_visible(n.id) and n.is_learnable and cv.manifest ? p_lesson::text and exists(select 1 from public.lesson_revisions r where r.id=n.published_revision_id and r.completion_policy='lesson');
 if v_revision is null then raise exception 'lesson unavailable'; end if;
 select id into v_attempt from public.attempts where user_id=v_user and lesson_id=p_lesson and status='in_progress';
 if v_attempt is not null then return v_attempt; end if;
 insert into public.attempts(user_id,lesson_id,revision_id) values(v_user,p_lesson,v_revision) on conflict do nothing returning id into v_attempt;
 if v_attempt is null then select id into v_attempt from public.attempts where user_id=v_user and lesson_id=p_lesson and status='in_progress'; end if;
 return v_attempt;
end $$;

create function private.answer_is_correct(p_question jsonb,p_answer text,p_correct jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare v_type text:=coalesce(p_question->>'type','single_choice'); v_ids jsonb; v_answer jsonb;
begin
 select coalesce(jsonb_agg(o->>'id'),'[]'::jsonb) into v_ids from jsonb_array_elements(p_question->'options') o;
 if v_type in ('single_choice','strongest_rationale') then
  return p_answer in (select o->>'id' from jsonb_array_elements(p_question->'options') o) and to_jsonb(p_answer)=p_correct;
 end if;
 begin v_answer:=p_answer::jsonb; exception when others then return false; end;
 if jsonb_typeof(v_answer)<>'array' or jsonb_array_length(v_answer)<>jsonb_array_length(p_correct) or exists(select 1 from jsonb_array_elements_text(v_answer) a where not v_ids ? a.value) then return false; end if;
 if v_type='arrange_steps' then return v_answer=p_correct; end if;
 if v_type='multiple_choice' then return (select array_agg(value order by value) from jsonb_array_elements_text(v_answer))=(select array_agg(value order by value) from jsonb_array_elements_text(p_correct)) and (select count(distinct value) from jsonb_array_elements_text(v_answer))=jsonb_array_length(v_answer); end if;
 return false;
end $$;

create or replace function public.submit_answer(p_attempt uuid,p_question text,p_option text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_revision uuid; v_public jsonb; v_key private.answer_keys%rowtype; v_correct boolean; v_answer jsonb; v_explanation text;
begin
 select revision_id into v_revision from public.attempts where id=p_attempt and user_id=auth.uid() and status='in_progress' for update;
 if v_revision is null then raise exception 'attempt unavailable'; end if;
 select q into v_public from public.lesson_revisions r,jsonb_array_elements(r.question_public) q where r.id=v_revision and q->>'id'=p_question;
 if v_public is null then raise exception 'invalid question'; end if;
 select * into v_key from private.answer_keys where revision_id=v_revision and question_id=p_question and review=false;
 v_answer:=coalesce(v_key.correct_answer,to_jsonb(v_key.correct_option_id));
 v_correct:=private.answer_is_correct(v_public,p_option,v_answer);
 if coalesce(v_public->>'type','single_choice') in ('single_choice','strongest_rationale') and not exists(select 1 from jsonb_array_elements(v_public->'options') o where o->>'id'=p_option) then raise exception 'invalid option'; end if;
 if coalesce(v_public->>'type','single_choice') in ('multiple_choice','arrange_steps') then
  begin
   if jsonb_typeof(p_option::jsonb)<>'array' or exists(select 1 from jsonb_array_elements_text(p_option::jsonb) a where not exists(select 1 from jsonb_array_elements(v_public->'options') o where o->>'id'=a.value)) then raise exception 'invalid option'; end if;
  exception when invalid_text_representation then raise exception 'invalid option'; end;
 end if;
 insert into public.attempt_answers(attempt_id,question_id,first_answer,latest_answer,first_correct,correct) values(p_attempt,p_question,p_option,p_option,v_correct,v_correct)
 on conflict(attempt_id,question_id) do update set latest_answer=excluded.latest_answer,retries=attempt_answers.retries+1,correct=excluded.correct,evaluated_at=now();
 select string_agg(value,' ') into v_explanation from jsonb_each_text(v_key.explanations);
 return jsonb_build_object('correct',v_correct,'explanation',case when coalesce(v_public->>'type','single_choice') in ('single_choice','strongest_rationale') then coalesce(v_key.explanations->>p_option,'') else coalesce(v_explanation,'') end);
end $$;

create or replace function public.progress_receipt() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_today date; v_tz text; v_manifest jsonb; v_count int; v_total int; v_current int:=0; v_longest int:=0; v_run int:=0; v_prev date; v_day date; v_cursor date; v_reviews int; v_due int;
begin
 if v_user is null then raise exception 'unauthorized'; end if;
 select learning_timezone into v_tz from public.profiles where id=v_user;
 v_today:=(now() at time zone coalesce(v_tz,'Asia/Makassar'))::date;
 select cv.manifest into v_manifest from public.enrollments e join public.curriculum_versions cv on cv.id=e.curriculum_version_id where e.user_id=v_user limit 1;
 select count(*) into v_total from public.curriculum_nodes n where public.curriculum_visible(n.id) and n.is_learnable and n.published_revision_id is not null and coalesce(v_manifest,'[]'::jsonb) ? n.id::text;
 select count(*) into v_count from public.lesson_completions lc join public.curriculum_nodes n on n.id=lc.lesson_id where lc.user_id=v_user and public.curriculum_visible(n.id) and n.is_learnable and coalesce(v_manifest,'[]'::jsonb) ? lc.lesson_id::text;
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

create function public.review_queue() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_tz text; v_today date; v_due integer; v_next date; v_items jsonb;
begin
 if auth.uid() is null then raise exception 'unauthorized'; end if;
 select learning_timezone into v_tz from public.profiles where id=auth.uid();
 v_today:=(now() at time zone coalesce(v_tz,'Asia/Makassar'))::date;
 select coalesce(jsonb_agg(jsonb_build_object('lesson_id',q.lesson_id,'title',q.title,'occurrence',q.occurrence,'question',q.question) order by q.next_due_local_date,q.lesson_id),'[]'::jsonb) into v_items from (
  select s.lesson_id,n.title,s.occurrence,s.next_due_local_date,r.review_public->((s.occurrence-1)%jsonb_array_length(r.review_public)) as question
  from public.review_schedule s join public.curriculum_nodes n on n.id=s.lesson_id and public.curriculum_visible(n.id) join public.lesson_revisions r on r.id=coalesce(s.revision_id,n.published_revision_id)
  where s.user_id=auth.uid() and s.next_due_local_date<=v_today and jsonb_array_length(r.review_public)>0
  order by s.next_due_local_date,s.lesson_id limit 5
 ) q;
 select count(*) into v_due from public.review_schedule s join public.curriculum_nodes n on n.id=s.lesson_id and public.curriculum_visible(n.id) join public.lesson_revisions r on r.id=coalesce(s.revision_id,n.published_revision_id) and jsonb_array_length(r.review_public)>0 where s.user_id=auth.uid() and s.next_due_local_date<=v_today;
 select min(s.next_due_local_date) into v_next from public.review_schedule s join public.curriculum_nodes n on n.id=s.lesson_id and public.curriculum_visible(n.id) join public.lesson_revisions r on r.id=coalesce(s.revision_id,n.published_revision_id) and jsonb_array_length(r.review_public)>0 where s.user_id=auth.uid() and s.next_due_local_date>v_today;
 return jsonb_build_object('due',v_due,'items',v_items,'next_due',v_next,'today',v_today,'timezone',v_tz);
end $$;
revoke all on function public.review_queue() from public;
grant execute on function public.review_queue() to authenticated;

create or replace function public.submit_review_answer(p_lesson uuid,p_question text,p_option text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_schedule public.review_schedule%rowtype; v_revision uuid; v_question jsonb; v_key private.answer_keys%rowtype; v_tz text; v_today date; v_correct boolean; v_answer jsonb; v_explanation text;
begin
 if v_user is null then raise exception 'unauthorized'; end if;
 select learning_timezone into v_tz from public.profiles where id=v_user;
 v_today:=(now() at time zone v_tz)::date;
 select * into v_schedule from public.review_schedule where user_id=v_user and lesson_id=p_lesson for update;
 if v_schedule.user_id is null or v_schedule.next_due_local_date>v_today then raise exception 'review unavailable'; end if;
 if not public.curriculum_visible(p_lesson) then raise exception 'review unavailable'; end if;
 v_revision:=v_schedule.revision_id;
 select review_public->((v_schedule.occurrence-1)%jsonb_array_length(review_public)) into v_question from public.lesson_revisions where id=v_revision and jsonb_array_length(review_public)>0;
 if v_question is null or v_question->>'id'<>p_question then raise exception 'review question unavailable'; end if;
 select * into v_key from private.answer_keys where revision_id=v_revision and question_id=p_question and review=true;
 v_answer:=coalesce(v_key.correct_answer,to_jsonb(v_key.correct_option_id));
 v_correct:=private.answer_is_correct(v_question,p_option,v_answer);
 if coalesce(v_question->>'type','single_choice') in ('single_choice','strongest_rationale') and not exists(select 1 from jsonb_array_elements(v_question->'options') o where o->>'id'=p_option) then raise exception 'invalid option'; end if;
 if coalesce(v_question->>'type','single_choice') in ('multiple_choice','arrange_steps') then
  begin
   if jsonb_typeof(p_option::jsonb)<>'array' or exists(select 1 from jsonb_array_elements_text(p_option::jsonb) a where not exists(select 1 from jsonb_array_elements(v_question->'options') o where o->>'id'=a.value)) then raise exception 'invalid option'; end if;
  exception when invalid_text_representation then raise exception 'invalid option'; end;
 end if;
 insert into public.review_answers(user_id,lesson_id,occurrence,question_id,first_answer,latest_answer,first_correct,correct) values(v_user,p_lesson,v_schedule.occurrence,p_question,p_option,p_option,v_correct,v_correct)
 on conflict(user_id,lesson_id,occurrence,question_id) do update set latest_answer=excluded.latest_answer,correct=excluded.correct;
 select string_agg(value,' ') into v_explanation from jsonb_each_text(v_key.explanations);
 return jsonb_build_object('correct',v_correct,'explanation',case when coalesce(v_question->>'type','single_choice') in ('single_choice','strongest_rationale') then coalesce(v_key.explanations->>p_option,'') else coalesce(v_explanation,'') end);
end $$;

create or replace function public.complete_review(p_lesson uuid,p_occurrence int) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_s public.review_schedule%rowtype; v_tz text; v_today date; v_revision uuid; v_question jsonb; v_answer public.review_answers%rowtype; v_score numeric; v_days int; v_inserted int;
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
 v_days:=case when v_score<1 then 1 when v_s.interval_stage=0 then 3 when v_s.interval_stage=1 then 7 else 14 end;
 update public.review_schedule set next_due_local_date=v_today+v_days,interval_stage=case when v_score<1 then 0 else least(v_s.interval_stage+1,3) end,occurrence=occurrence+1,revision_id=(select published_revision_id from public.curriculum_nodes where id=p_lesson) where user_id=v_user and lesson_id=p_lesson;
 return public.progress_receipt() || jsonb_build_object('first_score',v_score,'next_due',v_today+v_days);
end $$;

create function public.weak_topics() returns jsonb language sql stable security definer set search_path='' as $$
 with scores as (
  select ra.lesson_id,count(*) as attempted,count(*) filter(where ra.first_correct)::numeric/nullif(count(*),0) as accuracy
  from public.review_answers ra where ra.user_id=auth.uid() group by ra.lesson_id
 )
 select coalesce(jsonb_agg(jsonb_build_object('lesson_id',rs.lesson_id,'title',n.title,'attempted',coalesce(s.attempted,0),'accuracy',case when s.accuracy is null then null else round(s.accuracy*100) end,'next_due',rs.next_due_local_date,'action',case when s.accuracy<0.7 then 'Revisit the lesson, then try the next review.' else 'Complete the scheduled review.' end) order by rs.next_due_local_date),'[]'::jsonb)
 from public.review_schedule rs join public.curriculum_nodes n on n.id=rs.lesson_id and public.curriculum_visible(n.id) left join scores s on s.lesson_id=rs.lesson_id
 where rs.user_id=auth.uid() and (s.accuracy<0.7 or rs.next_due_local_date<=(now() at time zone (select learning_timezone from public.profiles where id=auth.uid()))::date)
 $$;
revoke all on function public.weak_topics() from public;
grant execute on function public.weak_topics() to authenticated;
