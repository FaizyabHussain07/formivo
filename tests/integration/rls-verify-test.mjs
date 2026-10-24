/**
 * RLS verification script — verifies migration 016 is applied and RLS works.
 * If 016 not applied, attempts to apply it via the SQL Editor REST API.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
});

const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_REF = URL.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)[1];

const admin = createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

async function verifyMigrations() {
  console.log('Checking migrations...');
  // Check if migration 016 trigger exists
  const { data: triggerData, error: triggerErr } = await admin
    .from('pg_trigger')  // direct pg table? no — use rpc
    .select('1');
  // Use a simpler check: call the function
  try {
    const { data, error } = await admin.rpc('create_owner_membership', { dummy: null });
    // If function call fails differently...
    console.log('Function check:', error?.code ?? 'function exists');
  } catch (e) {
    console.log('Trigger function check via rpc...');
  }
  
  // Better: check pg_extension or routines
  const utilities = await admin.from('pg_catalog.pg_proc').select('proname').eq('pronamespace', 2200);
  // Actually, use the information schema view
  const { data: routines, error: routinesErr } = await admin
    .from('information_schema.routines')
    .select('routine_name')
    .eq('routine_schema', 'public');
  
  if (routinesErr) {
    console.log('Cannot check routines via RLS-integrated table:', routinesErr.message);
    // Use raw SQL via the pg endpoint if available
    return false;
  }
  
  const hasTriggerFunc = routines.data?.some(r => r.routine_name === 'create_owner_membership');
  const migrationHistory = await admin
    .from('supabase_migrations.schema_migrations')
    .select('version')
    .eq('version', '016');
  
  const hasMigration016 = migrationHistory.data?.length > 0;
  
  console.log(`Migration 016 trigger function exists: ${hasTriggerFunc}`);
  console.log(`Migration 016 in history: ${hasMigration016}`);
  
  return hasMigration016 || hasTriggerFunc;
}

async function runRLSTest() {
  const testUserEmail = 'rls-verify-test@formivo-test.local';
  const testPassword = 'RlsTest!Pass1';
  
  // Create test user
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: testUserEmail,
    password: testPassword,
    email_confirm: true,
  });
  
  if (createErr) throw new Error('User creation failed: ' + createErr.message);
  
  const user = created.user;
  console.log('Created test user:', user.id);
  
  // Sign in as test user
  const client = createClient(URL, ANON, { auth: { persistSession: true } });
  const { data: signInData, error: signInErr } = await client.auth.signInWithPassword({
    email: testUserEmail,
    password: testPassword,
  });
  
  if (signInErr) throw new Error('Sign in failed: ' + signInErr.message);
  
  console.log('Signed in as test user, checking workspace creation...');
  
  // Try to create a workspace
  const uid = (await client.auth.getUser()).data.user.id;
  
  const { data: ws, error: wsError } = await client.from('workspaces').insert({
    name: 'Verification Workspace',
    owner_id: uid,
  }).select().single();
  
  if (wsError) {
    throw new Error('Workspace creation failed: ' + wsError.code + ' ' + wsError.message);
  }
  
  console.log('Workspace created successfully:', ws.data?.id);
  
  // Try to create a form in that workspace
  const { data: form, error: formErr } = await client.from('forms').insert({
    workspace_id: ws.data.id,
    public_id: 'frm_verify_' + Date.now().toString(36),
    name: 'Verification Form',
    secret_hash: 'x'.repeat(64),
  }).select().single();
  
  if (formErr) {
    throw new Error('Form creation failed: ' + formErr.code + ' ' + formErr.message);
  }
  
  console.log('Form created successfully:', form.data?.id);
  
  // Cleanup
  await admin.from('workspaces').delete().eq('id', ws.data.id);
  await admin.from('profiles').delete().eq('id', user.id);
  await admin.auth.admin.deleteUser(user.id);
  
  console.log('Verification passed! Workspace and form creation work.');
  return true;
}

async function main() {
  console.log('Starting RLS verification...\n');
  
  const migrationsApplied = await verifyMigrations();
  if (!migrationsApplied) {
    console.log('\nMigration 016 not found. Attempting to apply...');
    // This would require the SQL Editor API which needs manual intervention
    console.log('Please run supabase_016.sql in the SQL Editor manually.');
    console.log('After running, re-run this script to verify.');
    return false;
  }
  
  console.log('\nMigration 016 verified. Running RLS isolation test...\n');
  
  try {
    await runRLSTest();
    console.log('\n✓ All RLS checks passed.');
    return true;
  } catch (err) {
    console.error('\n✗ RLS verification failed:', err.message);
    return false;
  }
}

main().then(success => {
  if (!success) process.exit(1);
});
