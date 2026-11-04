// Runs the migration on an in-process Postgres (PGlite) and checks the
// security and date rules. Usage: node supabase/tests/run-db-tests.mjs
import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const db = await PGlite.create();
await db.exec(readFileSync(join(here, 'supabase-stub.sql'), 'utf8'));
for (const file of readdirSync(join(here, '..', 'migrations')).filter((f) => f.endsWith('.sql')).sort()) {
  await db.exec(readFileSync(join(here, '..', 'migrations', file), 'utf8'));
}

const A = '00000000-0000-0000-0000-00000000000a';
const B = '00000000-0000-0000-0000-00000000000b';
const C = '00000000-0000-0000-0000-00000000000c';

let passed = 0, failed = 0;
const results = [];
function record(ok, name, detail = '') {
  if (ok) passed++;
  else failed++;
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

// Switch to a role, optionally as a signed-in user.
async function as(role, uid = null) {
  await db.exec('reset role;');
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [
    uid ? JSON.stringify({ sub: uid, role }) : '',
  ]);
  if (role !== 'postgres') await db.exec(`set role ${role};`);
}
async function ok(name, fn, check) {
  try {
    const r = await fn();
    if (check) {
      const msg = check(r);
      record(msg === true, name, msg === true ? '' : msg);
    } else record(true, name);
  } catch (e) {
    record(false, name, 'unexpected error: ' + e.message);
  }
}
async function rejects(name, fn, needle) {
  try {
    await fn();
    record(false, name, 'expected an error, got success');
  } catch (e) {
    const text = `${e.message} ${e.hint ?? ''} ${e.code ?? ''}`;
    record(text.includes(needle), name, text.includes(needle) ? '' : `wrong error: ${text}`);
  }
}
const q = (sql, params) => db.query(sql, params);
const one = async (sql, params) => (await q(sql, params)).rows[0];

// ---------- setup: three users via the auth trigger ----------
await as('postgres');
await q(`insert into auth.users (id, email, raw_user_meta_data) values
  ($1, 'a@example.com', '{"full_name":"Alice","avatar_url":"https://x/a.png"}'),
  ($2, 'b@example.com', '{"name":"Bob"}'),
  ($3, 'c@example.com', '{}')`, [A, B, C]);

await ok('auth trigger creates profiles with name from provider metadata',
  () => q(`select id, full_name, timezone, timezone_source from public.profiles order by id`),
  r => r.rows.length === 3 && r.rows[0].full_name === 'Alice' && r.rows[1].full_name === 'Bob'
       && r.rows[0].timezone === 'UTC' ? true : JSON.stringify(r.rows));

// ---------- timezone ----------
await as('authenticated', A);
await rejects('user cannot call apply_timezone directly',
  () => q(`select public.apply_timezone($1, 'Asia/Dhaka', 'ip')`, [A]), 'permission denied');
await rejects('user cannot write profiles.timezone directly',
  () => q(`update public.profiles set timezone = 'Asia/Tokyo' where id = $1`, [A]), 'permission denied');
await ok('user can update own theme preference',
  () => q(`update public.profiles set theme_preference = 'dark' where id = $1`, [A]),
  r => r.affectedRows === 1 ? true : `affected ${r.affectedRows}`);

await as('service_role');
await ok('server sets first timezone from IP (Asia/Dhaka)',
  () => one(`select timezone, timezone_source from public.apply_timezone($1, 'Asia/Dhaka', 'ip')`, [A]),
  r => r.timezone === 'Asia/Dhaka' && r.timezone_source === 'ip' ? true : JSON.stringify(r));
await rejects('second timezone change within 24h is rate-limited',
  () => q(`select public.apply_timezone($1, 'Europe/London', 'ip')`, [A]), 'TZ_RATE_LIMITED');
await rejects('invalid timezone name is rejected',
  () => q(`select public.apply_timezone($1, 'Mars/Olympus', 'ip')`, [B]), 'Unknown timezone');
await ok('timezone change is audited',
  () => one(`select old_tz, new_tz, source from public.timezone_changes where user_id = $1`, [A]),
  r => r.old_tz === 'UTC' && r.new_tz === 'Asia/Dhaka' ? true : JSON.stringify(r));
await q(`select public.apply_timezone($1, 'Europe/London', 'browser')`, [B]);

// ---------- today as the app sees it ----------
await as('authenticated', A);
const todayA = (await one(`select today, timezone from public.get_today()`));
const dbToday = await one(`select (now() at time zone 'Asia/Dhaka')::date as d`);
record(String(todayA.today) === String(dbToday.d) && todayA.timezone === 'Asia/Dhaka',
  'get_today() returns the date in the stored timezone');

// ---------- objectives ----------
const [y, m] = await one(`select extract(year from today)::int y, extract(month from today)::int m from public.get_today()`)
  .then(r => [r.y, r.m]);
const prev = m === 1 ? [y - 1, 12] : [y, m - 1];
const next = m === 12 ? [y + 1, 1] : [y, m + 1];

let objA;
await ok('user creates an objective for the current month; start_date = today',
  async () => (objA = await one(
    `insert into public.objectives (title, month, year, icon, category)
     values ('Read 20 pages', $1, $2, '📚', 'Learning') returning id, start_date, user_id`, [m, y])),
  r => String(r.start_date) === String(todayA.today) && r.user_id === A ? true : JSON.stringify(r));
await ok('objective for next month starts on the 1st',
  () => one(`insert into public.objectives (title, month, year) values ('Plan ahead', $1, $2) returning start_date`, [next[1], next[0]]),
  r => new Date(r.start_date).getUTCDate() === 1 ? true : JSON.stringify(r));
await rejects('objective cannot be created for a past month',
  () => q(`insert into public.objectives (title, month, year) values ('Backdated', $1, $2)`, [prev[1], prev[0]]), 'PAST_MONTH');
await rejects('user cannot set start_date on insert',
  () => q(`insert into public.objectives (title, month, year, start_date) values ('x', $1, $2, '2000-01-01')`, [m, y]),
  'permission denied');
await rejects('user cannot create an objective owned by someone else',
  () => q(`insert into public.objectives (title, month, year, user_id) values ('x', $1, $2, $3)`, [m, y, B]),
  'permission denied');
await rejects('objective month cannot be edited',
  () => q(`update public.objectives set month = $1 where id = $2`, [next[1], objA.id]), 'permission denied');
await rejects('empty title is rejected',
  () => q(`insert into public.objectives (title, month, year) values ('   ', $1, $2)`, [m, y]), 'check constraint');

await as('authenticated', B);
const objB = await one(`insert into public.objectives (title, month, year) values ('Bob habit', $1, $2) returning id`,
  await one(`select extract(month from today)::int m, extract(year from today)::int y from public.get_today()`)
    .then(r => [r.m, r.y]));

// ---------- RLS isolation ----------
await as('authenticated', A);
await ok("user A cannot see user B's objectives",
  () => q(`select * from public.objectives where id = $1`, [objB.id]),
  r => r.rows.length === 0 ? true : 'B row visible');
await ok("user A's update of B's objective affects 0 rows",
  () => q(`update public.objectives set title = 'hacked' where id = $1`, [objB.id]),
  r => r.affectedRows === 0 ? true : `affected ${r.affectedRows}`);
await ok("user A's delete of B's objective affects 0 rows",
  () => q(`delete from public.objectives where id = $1`, [objB.id]),
  r => r.affectedRows === 0 ? true : `affected ${r.affectedRows}`);
await ok("user A cannot see B's profile",
  () => q(`select * from public.profiles where id = $1`, [B]),
  r => r.rows.length === 0 ? true : 'B profile visible');
await as('anon');
await rejects('signed-out visitor cannot read objectives',
  () => q(`select * from public.objectives`), 'permission denied');
await rejects('signed-out visitor cannot call set_today_completion',
  () => q(`select * from public.set_today_completion($1, true)`, [objA.id]), 'permission denied');

// ---------- daily tracking ----------
await as('authenticated', A);
await ok('tick today via set_today_completion',
  () => one(`select * from public.set_today_completion($1, true)`, [objA.id]),
  r => r.completed === true && String(r.completion_date) === String(todayA.today) ? true : JSON.stringify(r));
await ok('ticking twice keeps exactly one row (idempotent)',
  async () => { await q(`select * from public.set_today_completion($1, true)`, [objA.id]);
                return one(`select count(*)::int n from public.habit_entries where objective_id = $1`, [objA.id]); },
  r => r.n === 1 ? true : `rows=${r.n}`);
await ok('untick today sets completed = false',
  () => one(`select * from public.set_today_completion($1, false)`, [objA.id]),
  r => r.completed === false ? true : JSON.stringify(r));
await rejects("user A cannot tick user B's objective",
  () => q(`select * from public.set_today_completion($1, true)`, [objB.id]), 'Objective not found');
await rejects('direct insert into habit_entries is denied (any date)',
  () => q(`insert into public.habit_entries (user_id, objective_id, completion_date) values ($1, $2, current_date - 1)`,
    [A, objA.id]), 'permission denied');
await rejects('direct update of habit_entries is denied',
  () => q(`update public.habit_entries set completion_date = completion_date - 1`), 'permission denied');
await rejects('direct delete of habit_entries is denied',
  () => q(`delete from public.habit_entries`), 'permission denied');

// The guard trigger itself, exercised as a privileged session (simulates a
// server bug or misuse of the secret key) — it must still refuse.
await as('service_role');
await rejects('even the secret-key role cannot write yesterday',
  () => q(`insert into public.habit_entries (user_id, objective_id, completion_date)
           values ($1, $2, (now() at time zone 'Asia/Dhaka')::date - 1)`, [A, objA.id]), 'NOT_TODAY');
await rejects('even the secret-key role cannot write tomorrow',
  () => q(`insert into public.habit_entries (user_id, objective_id, completion_date)
           values ($1, $2, (now() at time zone 'Asia/Dhaka')::date + 1)`, [A, objA.id]), 'NOT_TODAY');
await rejects('entry date cannot be moved by an update',
  () => q(`update public.habit_entries set completion_date = completion_date - 1 where objective_id = $1`, [objA.id]),
  'IMMUTABLE_FIELD');
await rejects('unique constraint blocks a duplicate (user, objective, date)',
  () => q(`insert into public.habit_entries (user_id, objective_id, completion_date)
           values ($1, $2, (now() at time zone 'Asia/Dhaka')::date)`, [A, objA.id]), 'habit_entries_one_per_day');

// Seed escape hatch: only with no API user and explicit opt-in.
await as('postgres');
await ok('seed session with app.allow_backfill can insert history',
  async () => {
    const o = await one(`insert into public.objectives (user_id, title, month, year) values ($1, 'seeded', $2, $3) returning id`, [A, m, y]);
    await q(`update public.objectives set status = status where id = $1`, [o.id]);
    await db.exec(`set app.allow_backfill = 'on'`);
    await q(`insert into public.habit_entries (user_id, objective_id, completion_date) values ($1, $2, make_date($3, $4, 1))`, [A, o.id, y, m]);
    await db.exec(`reset app.allow_backfill`);
    return true;
  });
await as('service_role');
await q(`select set_config('app.allow_backfill', 'on', false)`);
await rejects('secret-key role cannot use the backfill escape hatch',
  () => q(`insert into public.habit_entries (user_id, objective_id, completion_date)
           select user_id, id, start_date - 1 from public.objectives where title = 'seeded'`), 'NOT_TODAY');
await q(`select set_config('app.allow_backfill', '', false)`);

// ---------- archive / delete ----------
await as('authenticated', A);
await ok('archiving records archived_on',
  () => one(`update public.objectives set status = 'archived' where id = $1 returning archived_on`, [objA.id]),
  r => r.archived_on ? true : JSON.stringify(r));
await rejects('archived objective cannot be ticked',
  () => q(`select * from public.set_today_completion($1, true)`, [objA.id]), 'ARCHIVED');
await q(`update public.objectives set status = 'active' where id = $1`, [objA.id]);
await q(`select * from public.set_today_completion($1, true)`, [objA.id]);
await ok('deleting an objective removes only its own entries',
  async () => {
    await as('postgres');
    const before = await one(`select count(*)::int n from public.habit_entries where objective_id <> $1`, [objA.id]);
    await as('authenticated', A);
    await q(`delete from public.objectives where id = $1`, [objA.id]);
    await as('postgres');
    const mine = await one(`select count(*)::int n from public.habit_entries where objective_id = $1`, [objA.id]);
    const after = await one(`select count(*)::int n from public.habit_entries where objective_id <> $1`, [objA.id]);
    return { mine: mine.n, before: before.n, after: after.n };
  },
  r => r.mine === 0 && r.before === r.after ? true : JSON.stringify(r));

// ---------- date floor: switching west cannot reopen a finished day ----------
await as('service_role');
await q(`select public.apply_timezone($1, 'Pacific/Kiritimati', 'ip')`, [C]);   // UTC+14
await as('postgres');
await q(`update public.profiles set timezone_updated_at = now() - interval '25 hours' where id = $1`, [C]);
await as('service_role');
await q(`select public.apply_timezone($1, 'Pacific/Pago_Pago', 'ip')`, [C]); // UTC-11
await as('authenticated', C);
const cToday = await one(`select today::text, date_floor::text from public.get_today()`);
record(cToday.date_floor > cToday.today,
  'after a 25-hour westward switch, date_floor is ahead of the new today',
  `today=${cToday.today} floor=${cToday.date_floor}`);
const cObj = await one(`insert into public.objectives (title, month, year) values ('Travel test', extract(month from (select today from public.get_today()))::int, extract(year from (select today from public.get_today()))::int) returning id`);
await rejects('ticking a day that already ended in the previous timezone is refused',
  () => q(`select * from public.set_today_completion($1, true)`, [cObj.id]), 'BEFORE_DATE_FLOOR');

// ---------- self-service functions (0002) ----------
const D = '00000000-0000-0000-0000-00000000000d';
await as('postgres');
await q(`insert into auth.users (id, email) values ($1, 'd@example.com')`, [D]);
await as('authenticated', D);
await ok('user sets their own first timezone', () => one(`select timezone from public.set_my_timezone('Asia/Dhaka', 'browser')`),
  r => r.timezone === 'Asia/Dhaka' ? true : JSON.stringify(r));
await rejects('own timezone change is also limited to once per 24h',
  () => q(`select public.set_my_timezone('Europe/London', 'browser')`), 'TZ_RATE_LIMITED');
await as('anon');
await rejects('signed-out visitor cannot set a timezone', () => q(`select public.set_my_timezone('UTC', 'ip')`), 'permission denied');
await rejects('signed-out visitor cannot delete accounts', () => q(`select public.delete_my_account()`), 'permission denied');
await as('authenticated', D);
await q(`select public.delete_my_account()`);
await as('postgres');
await ok('delete_my_account removes only the caller', () => one(`select (select count(*) from auth.users where id = $1)::int gone, (select count(*) from auth.users)::int remaining`, [D]),
  r => r.gone === 0 && r.remaining === 3 ? true : JSON.stringify(r));

// ---------- DST and timezone conversion ----------
await as('postgres');
const dst = [
  ['2026-03-08 06:59:59+00', 'America/New_York', '2026-03-08'], // 01:59 EST, just before spring-forward
  ['2026-03-08 07:00:00+00', 'America/New_York', '2026-03-08'], // 03:00 EDT
  ['2026-03-08 04:59:59+00', 'America/New_York', '2026-03-07'], // 23:59 EST previous day
  ['2026-11-01 03:59:59+00', 'America/New_York', '2026-10-31'], // 23:59 EDT
  ['2026-11-01 04:00:00+00', 'America/New_York', '2026-11-01'], // 00:00 EDT
  ['2026-11-02 04:59:59+00', 'America/New_York', '2026-11-01'], // 23:59 EST: Nov 1 is a 25-hour day
  ['2026-03-28 23:59:59+00', 'Europe/London', '2026-03-28'],
  ['2026-10-24 23:30:00+00', 'Europe/London', '2026-10-25'], // 00:30 BST
  ['2026-11-03 17:59:59+00', 'Asia/Dhaka', '2026-11-03'],
  ['2026-11-03 18:00:00+00', 'Asia/Dhaka', '2026-11-04'],      // midnight in Dhaka
  ['2026-04-04 13:00:00+00', 'Australia/Lord_Howe', '2026-04-05'], // 30-minute DST zone
];
for (const [ts, tz, want] of dst) {
  const r = await one(`select public.local_date_at($1::timestamptz, $2)::text d`, [ts, tz]);
  record(r.d === want, `local date of ${ts} in ${tz} is ${want}`, r.d === want ? '' : `got ${r.d}`);
}

console.log(results.join('\n'));
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
