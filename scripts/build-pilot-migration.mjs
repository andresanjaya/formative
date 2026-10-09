import { writeFileSync } from 'node:fs';

// Authoring source for the published pilot. Re-run to regenerate the SQL migration.
const questions = (prefix, entries, usage) => entries.map(([scenario, prompt, options, answer, explanations, type = 'single_choice', tag = prefix, difficulty = 'applied'], i) => ({
  public: { id: `${prefix}-${usage}-${i + 1}`, type, scenario, prompt, options: options.map((text, n) => ({ id: String.fromCharCode(97 + n), text })), tag, difficulty, usage },
  key: { question_id: `${prefix}-${usage}-${i + 1}`, correct_option_id: Array.isArray(answer) ? answer[0] : answer, correct_answer: answer, explanations: Object.fromEntries(explanations.map((v, n) => [String.fromCharCode(97 + n), v])), review: usage === 'review' }
}));

const lessons = [
  {
    id: '60000000-0000-4000-8000-000000000001', title: 'Frame the Right Problem', tag: 'problem-framing', minutes: 9,
    outcome: 'Separate observed user behavior from assumptions and write a specific problem statement.',
    introduction: 'A useful problem statement starts with a person, a situation, and an obstacle that evidence can test.',
    content: [
      { type: 'heading', text: 'Observe before naming a solution' },
      { type: 'paragraph', text: 'Teams often start with a feature request: “We need reminders.” That is a proposed solution, not a description of the difficulty people face. Ask what happened, for whom, and in what setting. Mark what you observed separately from what you infer.' },
      { type: 'callout', title: 'Rootin example', text: 'Three learners abandon a long setup form before creating their first routine. That is an observation. “They lack motivation” is an assumption. A narrower problem is that new learners cannot see value before setup asks for too much effort.' },
      { type: 'paragraph', text: 'A good frame remains open to several possible solutions. It names the user and context, explains the friction, and identifies what evidence is missing.' }
    ],
    reflection: 'For your project, write one observation, one assumption, and a problem statement that does not prescribe a feature.',
    initial: [
      ['A Rootin team sees many people leave during setup.', 'Which statement is an observation?', ['People leave the setup form before creating a routine.', 'People are not motivated enough.', 'The team should add badges.'], 'a', ['Yes. This describes a visible behavior.', 'Motivation is an explanation to test.', 'A badge is a proposed solution.']],
      ['A designer interviews two Slipboxd users who cannot find saved notes.', 'Which problem frame keeps solutions open?', ['Add a search bar immediately.', 'People retrieving older notes cannot locate them reliably.', 'The interface needs a blue navigation panel.'], 'b', ['This jumps to one solution.', 'Yes. It identifies a user task and friction.', 'This is a design prescription.']],
      ['A stakeholder says users want AI summaries, but no users have been asked.', 'What should the team do first?', ['Ship summaries because the stakeholder is senior.', 'Treat the request as evidence of user demand.', 'Label the claim as an assumption and investigate the underlying task.'], 'c', ['Authority is not user evidence.', 'The request is a hypothesis, not observed demand.', 'Yes. Find the task before committing to a solution.']]
    ],
    review: [
      ['A travel app receives complaints that booking takes too long.', 'Which next step best clarifies the problem?', ['Observe where and why bookings stall.', 'Immediately remove every booking field.', 'Launch a loyalty program.'], 'a', ['Yes. This separates friction from guessed fixes.', 'Some fields may be needed; investigate first.', 'This does not address booking friction.']],
      ['A team claims students are lazy because they skip a tutorial.', 'What is the strongest correction?', ['State the observable skip behavior and test possible causes.', 'Call the skip a motivation problem.', 'Force every student to watch the video.'], 'a', ['Yes. Keep observation and interpretation distinct.', 'This repeats the unsupported assumption.', 'This may add friction without learning why.']]
    ]
  },
  {
    id: '10000000-0000-4000-8000-000000000012', title: 'Product Vision', tag: 'product-vision', minutes: 8,
    resources: [{type:'article',title:'Product Vision vs. Mission',url:'https://www.svpg.com/product-vision-vs-mission/',publisher:'SVPG · Marty Cagan',language:'en'}],
    outcome: 'Describe a future user benefit and use it to choose between competing product ideas.',
    introduction: 'A product vision gives a team a direction beyond a feature list or a short-term target.',
    content: [
      { type: 'heading', text: 'Name the future change' },
      { type: 'paragraph', text: 'A vision describes the experience people should gain if the product succeeds. It is specific enough to guide trade-offs and broad enough to outlive one release. Features are possible means; metrics show whether progress occurred.' },
      { type: 'callout', title: 'Slipboxd example', text: '“Add tags and AI summaries” lists features. “Help researchers return to their own ideas and connect them when writing” describes a future benefit. The latter can guide which retrieval problem to solve first.' },
      { type: 'paragraph', text: 'A one-line exercise is only a starting point. Test the direction with evidence about users and use it when a tempting feature does not serve the intended benefit.' }
    ],
    reflection: 'Describe the future benefit your project should create for a specific user, then name one feature you might decline.',
    initial: [
      ['A team proposes badges, video playlists, and a streak counter for designers.', 'Which direction is a product vision?', ['Launch all three features this quarter.', 'Help designers turn fragmented learning into decisions they can use at work.', 'Increase registrations by 15%.'], 'b', ['This is a feature list.', 'Yes. It describes a user and future benefit.', 'This is a short-term target.']],
      ['Slipboxd can either improve note retrieval or add decorative themes.', 'Which reason best uses its vision?', ['Themes are easier to ship.', 'Retrieval helps researchers reconnect ideas when writing.', 'The competitor has themes.'], 'b', ['Speed alone does not establish user benefit.', 'Yes. It connects the choice to the future experience.', 'Copying a competitor does not test the vision.'], 'strongest_rationale'],
      ['A team has a compelling one-sentence vision but has never met a user.', 'What should it do next?', ['Treat the sentence as proof of demand.', 'Freeze all future product choices.', 'Investigate whether the intended benefit matches a real user need.'], 'c', ['A statement is not evidence.', 'A vision should guide learning, not stop it.', 'Yes. Validate the direction with users.']]
    ],
    review: [
      ['A roadmap meeting turns into a list of requested features.', 'Which question brings the team back to vision?', ['Which request is cheapest?', 'What future user benefit is each request meant to create?', 'Which request has the most screens?'], 'b', ['Cost matters later but cannot define direction.', 'Yes. Test each idea against the intended change.', 'Screen count does not express value.']],
      ['A team says its vision is “reach 10,000 users by June.”', 'What is missing?', ['A named future benefit for a user.', 'A larger numeric target.', 'More detailed colors.'], 'a', ['Yes. The number is a metric, not a vision.', 'Changing the target does not supply direction.', 'Visual detail is unrelated.']]
    ]
  },
  {
    id: '60000000-0000-4000-8000-000000000002', title: 'Make the Value Clear', tag: 'value-proposition', minutes: 9,
    outcome: 'Connect a specific user problem to a credible product benefit and its supporting reason.',
    introduction: 'A value proposition explains why a particular person would choose this solution for a real job.',
    content: [
      { type: 'heading', text: 'Connect problem, benefit, and reason' },
      { type: 'paragraph', text: 'Describe the user and their problem in plain language. Then explain the useful change your product promises and why your approach could deliver it. Avoid an inventory of capabilities without a reason to care.' },
      { type: 'callout', title: 'Slipboxd example', text: 'For researchers who lose ideas across notebooks, Slipboxd makes earlier notes easy to rediscover while drafting. Links between related notes offer a plausible way to make that benefit real. Whether it works still needs testing.' },
      { type: 'paragraph', text: 'A credible proposition is a hypothesis until people use the product. Test whether the audience recognizes the problem and whether the proposed benefit changes their behavior.' }
    ],
    reflection: 'Write your target user, problem, promised benefit, and the reason your approach could deliver it.',
    initial: [
      ['Slipboxd interviews researchers who lose useful notes while writing.', 'Which message is clearest?', ['A powerful platform with tags, themes, and widgets.', 'Find and connect your earlier notes when you need them in a draft.', 'The most innovative app available.'], 'b', ['This lists features without a job.', 'Yes. It connects a task to a benefit.', 'This claim has no concrete meaning.']],
      ['Rootin helps people begin a small routine.', 'Which pieces belong in a value proposition?', ['Specific user and problem.', 'Promised benefit.', 'Plausible reason the product helps.'], ['a','b','c'], ['Yes. Name who benefits and why they struggle.', 'Yes. State the useful change.', 'Yes. Explain why this approach may work.'], 'multiple_choice'],
      ['A team has a polished claim but no sign that people care.', 'What is the best next step?', ['Publish the claim as proven.', 'Test the problem and benefit with target users.', 'Add more adjectives.'], 'b', ['Polish does not validate value.', 'Yes. Check recognition and behavior.', 'Adjectives add no evidence.']]
    ],
    review: [
      ['A product page says “cloud-powered knowledge graph.”', 'What improvement makes value clearer?', ['Explain the researcher task and resulting benefit.', 'Add more technical terms.', 'Remove the target audience.'], 'a', ['Yes. Translate capability into user value.', 'Jargon can obscure the job.', 'Audience specificity matters.']],
      ['A value proposition promises instant confidence to every designer.', 'What is its main weakness?', ['It is too specific.', 'It lacks a credible, bounded benefit and audience.', 'It includes a user outcome.'], 'b', ['It is actually broad and vague.', 'Yes. Narrow the audience and claim.', 'A user outcome alone is not enough.']]
    ]
  },
  {
    id: '60000000-0000-4000-8000-000000000003', title: 'Choose Your MVP', tag: 'mvp-scope', minutes: 10,
    outcome: 'Choose a minimal test that can challenge the riskiest assumption behind a product idea.',
    introduction: 'An MVP is a focused learning vehicle, not simply the smallest list of features.',
    content: [
      { type: 'heading', text: 'Build to learn' },
      { type: 'paragraph', text: 'List what must be true for the product direction to work. Choose the riskiest unknown and the smallest experience that could reveal whether it holds. Keep the test usable enough that behavior means something.' },
      { type: 'callout', title: 'Rootin example', text: 'If the main risk is whether new users return to a routine, a simple daily check-in with a clear first action can test repeat use. A social feed and reward store would add scope without resolving that risk.' },
      { type: 'paragraph', text: 'State the trade-off. A narrow MVP may postpone polish or automation, but it must still let the target user experience the core benefit.' }
    ],
    reflection: 'Name your riskiest assumption, your smallest meaningful test, and one feature you will defer.',
    initial: [
      ['Rootin needs to learn whether people return after their first routine.', 'Which MVP best tests that risk?', ['A daily check-in and simple return path.', 'A full marketplace of routines.', 'A social feed before check-in works.'], 'a', ['Yes. This observes repeat behavior directly.', 'This adds broad scope before testing return use.', 'This tests sharing, not the central risk.']],
      ['A team plans an MVP and has four activities.', 'Which order supports learning?', ['Identify risky assumption.', 'Define observable signal.', 'Build a minimal usable experience.', 'Observe users and decide.'], ['a','b','c','d'], ['Start with the unknown that could break the idea.', 'Decide what evidence would change your mind.', 'Build only what lets users experience the benefit.', 'Use observed behavior to make the next choice.'], 'arrange_steps'],
      ['A team wants to cut onboarding so much that users cannot reach the core task.', 'What is the best response?', ['Keep the cut because fewer screens always means MVP.', 'Retain the minimum path to the core benefit.', 'Add every planned feature back.'], 'b', ['An unusable test gives weak evidence.', 'Yes. Minimal still needs meaningful use.', 'A full build is not required.']]
    ],
    review: [
      ['A team builds ten features to test whether anyone wants note retrieval.', 'What should it narrow first?', ['The assumption and behavior to observe.', 'The color palette.', 'The team logo.'], 'a', ['Yes. Scope follows the learning question.', 'Visual style does not define the risk.', 'Branding does not test demand.']],
      ['An MVP receives clicks but no completed core tasks.', 'Which inference is strongest?', ['The product is validated.', 'Clicks alone do not prove the promised benefit was reached.', 'The team should immediately scale marketing.'], 'b', ['Interest is not completed value.', 'Yes. Inspect the core outcome.', 'Promotion cannot fix an unproven experience.']]
    ]
  },
  {
    id: '60000000-0000-4000-8000-000000000004', title: 'Measure What Matters', tag: 'outcome-metrics', minutes: 9,
    outcome: 'Choose an outcome measure that shows whether the target user receives the intended benefit.',
    introduction: 'Counts of screens, releases, and clicks tell you what happened in the product, but rarely whether life improved for a user.',
    content: [
      { type: 'heading', text: 'Match the measure to the promise' },
      { type: 'paragraph', text: 'Begin with the change in the product vision. Choose a user behavior that would plausibly indicate that change, specify when it should happen, and pair it with a guardrail for harmful side effects.' },
      { type: 'callout', title: 'Slipboxd example', text: 'If Slipboxd promises useful retrieval during writing, a stronger measure is the share of drafting sessions in which a saved note is found and used. Total notes created is easier to count but does not prove retrieval value.' },
      { type: 'paragraph', text: 'Metrics are signals, not proof on their own. Combine behavior with qualitative evidence and watch for unintended incentives.' }
    ],
    reflection: 'Choose one outcome metric, its timeframe, and one guardrail for your project.',
    initial: [
      ['Slipboxd wants researchers to use earlier ideas when drafting.', 'Which metric is closest to that outcome?', ['Number of buttons shipped.', 'Share of drafting sessions using a retrieved saved note.', 'Total account signups.'], 'b', ['Output does not show user benefit.', 'Yes. This reflects the promised task.', 'Acquisition is not retrieval value.']],
      ['Rootin sees more notification opens but fewer completed routines.', 'What should the team conclude?', ['Notifications solved the problem.', 'Opens are a proxy; investigate completed routines and possible harm.', 'Send twice as many notifications.'], 'b', ['The core outcome moved the other way.', 'Yes. Compare proxy and outcome.', 'More volume may worsen the experience.']],
      ['A team wants to pick a measure before launch.', 'Which sequence is most sensible?', ['Name the intended benefit.', 'Choose observable user behavior.', 'Set a timeframe and guardrail.', 'Review the signal with user context.'], ['a','b','c','d'], ['Begin with the desired change.', 'Translate it into a behavior.', 'Bound the measure and watch side effects.', 'Interpret numbers alongside context.'], 'arrange_steps']
    ],
    review: [
      ['A learning app celebrates minutes spent even when learners cannot apply ideas.', 'What should it measure instead?', ['A behavior showing successful application.', 'More time in app regardless of benefit.', 'Number of animations shipped.'], 'a', ['Yes. Align the signal with learning benefit.', 'Time can reward friction.', 'Shipping work is not learning.']],
      ['A metric rises after a redesign, but interviews reveal confusion.', 'What is the best response?', ['Ignore interviews because the number rose.', 'Use both signals and inspect the behavior behind the number.', 'Declare a universal success.'], 'b', ['One number is incomplete evidence.', 'Yes. Investigate the apparent conflict.', 'The evidence is mixed.']]
    ]
  }
];

const sql = value => `'${String(value).replaceAll("'", "''")}'`;
const json = value => `${sql(JSON.stringify(value))}::jsonb`;
let out = `-- Generated from scripts/build-pilot-migration.mjs. Revisions are append-only.\n`;
for (const [index, lesson] of lessons.entries()) {
  const initial = questions(lesson.tag, lesson.initial, 'initial');
  const review = questions(lesson.tag, lesson.review, 'review');
  const revisionId = `70000000-0000-4000-8000-00000000000${index + 1}`;
  out += `insert into public.lesson_revisions(id,lesson_id,revision_number,state,outcome,introduction,content,question_public,review_public,resource_cards,reflection_prompt,completion_policy,estimated_minutes,published_at) select ${sql(revisionId)},${sql(lesson.id)},coalesce(max(revision_number),0)+1,'published',${sql(lesson.outcome)},${sql(lesson.introduction)},${json(lesson.content)},${json(initial.map(q => q.public))},${json(review.map(q => q.public))},${json(lesson.resources||[])},${sql(lesson.reflection)},'lesson',${lesson.minutes},now() from public.lesson_revisions where lesson_id=${sql(lesson.id)} on conflict(id) do nothing;\n`;
  for (const q of [...initial, ...review]) {
    const k = q.key;
    out += `insert into private.answer_keys(revision_id,question_id,correct_option_id,correct_answer,explanations,review) values(${sql(revisionId)},${sql(k.question_id)},${sql(k.correct_option_id)},${json(k.correct_answer)},${json(k.explanations)},${k.review}) on conflict do nothing;\n`;
  }
  out += `update public.lessons set published_revision_id=${sql(revisionId)} where id=${sql(lesson.id)};\n`;
  out += `update public.curriculum_nodes set published_revision_id=${sql(revisionId)} where id=${sql(lesson.id)};\n`;
}
out += `insert into public.lesson_revisions(id,lesson_id,revision_number,state,outcome,introduction,content,question_public,review_public,resource_cards,reflection_prompt,completion_policy,estimated_minutes,published_at) select '70000000-0000-4000-8000-000000000006','60000000-0000-4000-8000-000000000005',coalesce(max(revision_number),0)+1,'published','Combine a problem, vision, value, MVP, and measure into a coherent direction.','Apply the unit to one project and keep evidence distinct from assumptions.',${json([{type:'paragraph',text:'Choose Rootin, Slipboxd, or your own project. Explain who you serve, the problem and its evidence, the future benefit, a focused first test, the outcome measure, and the trade-off. Your self-assessment helps you revise; it is not a professional grade.'}])},'[]','[]','[]','Reflect on what evidence would most change your direction.','checkpoint',25,now() from public.lesson_revisions where lesson_id='60000000-0000-4000-8000-000000000005' on conflict(id) do nothing;\n`;
out += `update public.lessons set kind='checkpoint',published_revision_id='70000000-0000-4000-8000-000000000006' where id='60000000-0000-4000-8000-000000000005';\n`;
out += `update public.curriculum_nodes set published_revision_id='70000000-0000-4000-8000-000000000006' where id='60000000-0000-4000-8000-000000000005';\n`;
out += `insert into public.curriculum_versions(id,track_id,version_number,manifest) values('40000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001',2,${json(['60000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000012','60000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000003','60000000-0000-4000-8000-000000000004','60000000-0000-4000-8000-000000000005'])}) on conflict(track_id,version_number) do nothing;\n`;
writeFileSync(new URL('../supabase/migrations/202610090002_pilot_content.sql', import.meta.url), out);
