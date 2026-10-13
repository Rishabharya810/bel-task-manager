-- Seed data for local development
-- Creates demo users (auth.users) and matching profiles with manager hierarchy

-- Demo auth users
INSERT INTO auth.users (id, email, raw_user_meta_data, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'admin@bel.com', '{"full_name":"Rishab Arya"}', '$2a$10$encrypted_placeholder', NOW(), NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', 'manager@bel.com', '{"full_name":"Anurag Verma"}', '$2a$10$encrypted_placeholder', NOW(), NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', 'employee1@bel.com', '{"full_name":"Intern One"}', '$2a$10$encrypted_placeholder', NOW(), NOW(), NOW()),
  ('44444444-4444-4444-4444-444444444444', 'employee2@bel.com', '{"full_name":"Intern Two"}', '$2a$10$encrypted_placeholder', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Demo profiles with hierarchy: admin -> manager -> employees
INSERT INTO public.profiles (id, email, full_name, designation, department, phone, role, manager_id)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'admin@bel.com', 'Rishab Arya', 'System Administrator', 'IT', '1001', 'admin', NULL),
  ('22222222-2222-2222-2222-222222222222', 'manager@bel.com', 'Anurag Verma', 'Project Manager', 'R&D', '1002', 'manager', '11111111-1111-1111-1111-111111111111'),
  ('33333333-3333-3333-3333-333333333333', 'employee1@bel.com', 'Intern One', 'HR Intern', 'HR', '1003', 'employee', '22222222-2222-2222-2222-222222222222'),
  ('44444444-4444-4444-4444-444444444444', 'employee2@bel.com', 'Intern Two', 'Web Dev Intern', 'IT', '1004', 'employee', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO NOTHING;

-- Demo tasks
INSERT INTO public.tasks (id, title, description, status, priority, task_date, time_spent, assigned_to, created_by, collaborators)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Prepare internship completion report', 'Compile summary of all tasks and outcomes.', 'in-progress', 'high', CURRENT_DATE, 120, '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '{}'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Review task manager UI feedback', 'Review and implement feedback on dashboard.', 'pending', 'medium', CURRENT_DATE, 0, '44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', '{}'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Set up production deployment', 'Configure Cloudflare Pages and env vars.', 'pending', 'high', CURRENT_DATE, 0, '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '{}')
ON CONFLICT (id) DO NOTHING;

-- Demo subtasks
INSERT INTO public.subtasks (task_id, title, is_completed)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Gather task screenshots', TRUE),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Write final summary', FALSE),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Collect manager comments', FALSE)
ON CONFLICT DO NOTHING;

-- Demo logs
INSERT INTO public.task_logs (task_id, user_id, note)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'Started working on the report summary.'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Please include metrics and screenshots.')
ON CONFLICT DO NOTHING;
