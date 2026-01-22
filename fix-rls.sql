-- Fix RLS Policies (Row Level Security)
-- Run this in Supabase SQL Editor

-- 1. Departments
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Departments" ON departments;
CREATE POLICY "Public Access Departments" ON departments FOR ALL USING (true) WITH CHECK (true);

-- 2. Agents
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Agents" ON agents;
CREATE POLICY "Public Access Agents" ON agents FOR ALL USING (true) WITH CHECK (true);

-- 3. Agent Departments (Relation)
ALTER TABLE agent_departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Agent Departments" ON agent_departments;
CREATE POLICY "Public Access Agent Departments" ON agent_departments FOR ALL USING (true) WITH CHECK (true);

-- 4. Conversation Assignments (Relation)
ALTER TABLE conversation_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Assignments" ON conversation_assignments;
CREATE POLICY "Public Access Assignments" ON conversation_assignments FOR ALL USING (true) WITH CHECK (true);

-- Summary
-- This explicitly allows ALL operations (Select, Insert, Update, Delete) on these tables.
-- Essential for the backend API to work correctly if using standard keys.
