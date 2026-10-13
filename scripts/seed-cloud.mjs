// One-time seed script for the Supabase cloud project.
// Run: node scripts/seed-cloud.mjs
// Requires SUPABASE_SERVICE_ROLE_KEY env var (or .env.local with that key).

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env.local') });

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const demoUsers = [
  { id: '11111111-1111-1111-1111-111111111111', email: 'admin@bel.com', password: 'Admin@123', full_name: 'Rishab Arya', role: 'admin' },
  { id: '22222222-2222-2222-2222-222222222222', email: 'manager@bel.com', password: 'Manager@123', full_name: 'Anurag Verma', role: 'manager', manager_id: '11111111-1111-1111-1111-111111111111' },
  { id: '33333333-3333-3333-3333-333333333333', email: 'employee1@bel.com', password: 'Employee@1', full_name: 'Intern One', role: 'employee', manager_id: '22222222-2222-2222-2222-222222222222' },
  { id: '44444444-4444-4444-4444-444444444444', email: 'employee2@bel.com', password: 'Employee@2', full_name: 'Intern Two', role: 'employee', manager_id: '22222222-2222-2222-2222-222222222222' }
];

async function seed() {
  console.log('Creating demo users...');
  for (const u of demoUsers) {
    const { error } = await supabase.auth.admin.createUser({
      id: u.id,
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.full_name }
    });
    if (error && error.message !== 'User already registered') {
      console.error(`Failed to create ${u.email}:`, error.message);
    } else {
      console.log(`  ${u.email}: ${error ? 'already exists' : 'created'}`);
    }
  }

  console.log('Upserting profiles...');
  const profiles = demoUsers.map(u => ({
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    designation: u.role === 'admin' ? 'System Administrator' : u.role === 'manager' ? 'Project Manager' : 'Intern',
    department: u.role === 'admin' ? 'IT' : 'R&D',
    phone: '',
    role: u.role,
    manager_id: u.manager_id || null
  }));
  const { error: pErr } = await supabase.from('profiles').upsert(profiles, { onConflict: 'id' });
  if (pErr) console.error('Profile upsert error:', pErr.message);

  console.log('Seeding tasks...');
  const tasks = [
    { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', title: 'Prepare internship completion report', description: 'Compile summary of all tasks and outcomes.', status: 'in-progress', priority: 'high', assigned_to: '33333333-3333-3333-3333-333333333333', created_by: '22222222-2222-2222-2222-222222222222' },
    { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', title: 'Review task manager UI feedback', description: 'Review and implement feedback on dashboard.', status: 'pending', priority: 'medium', assigned_to: '44444444-4444-4444-4444-444444444444', created_by: '22222222-2222-2222-2222-222222222222' },
    { id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', title: 'Set up production deployment', description: 'Configure GitHub Pages and env vars.', status: 'pending', priority: 'high', assigned_to: '22222222-2222-2222-2222-222222222222', created_by: '11111111-1111-1111-1111-111111111111' }
  ];
  const { error: tErr } = await supabase.from('tasks').upsert(tasks, { onConflict: 'id' });
  if (tErr) console.error('Task upsert error:', tErr.message);

  console.log('Seeding subtasks...');
  const subtasks = [
    { task_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', title: 'Gather task screenshots', is_completed: true },
    { task_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', title: 'Write final summary', is_completed: false },
    { task_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', title: 'Collect manager comments', is_completed: false }
  ];
  const { error: sErr } = await supabase.from('subtasks').upsert(subtasks, { onConflict: 'id' });
  if (sErr) console.error('Subtask upsert error:', sErr.message);

  console.log('Seeding logs...');
  const logs = [
    { task_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', user_id: '33333333-3333-3333-3333-333333333333', note: 'Started working on the report summary.' },
    { task_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', user_id: '22222222-2222-2222-2222-222222222222', note: 'Please include metrics and screenshots.' }
  ];
  const { error: lErr } = await supabase.from('task_logs').upsert(logs, { onConflict: 'id' });
  if (lErr) console.error('Log upsert error:', lErr.message);

  console.log('Done.');
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
