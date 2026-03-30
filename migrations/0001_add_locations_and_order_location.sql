-- Migration: Add locations table and order location/manager columns
-- Run via: wrangler d1 execute stancil-store --remote --file=migrations/0001_add_locations_and_order_location.sql

-- ============================================================
-- Locations lookup table
-- ============================================================
CREATE TABLE IF NOT EXISTS locations (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  active INTEGER DEFAULT 1
);

INSERT OR IGNORE INTO locations (name) VALUES
  ('Gastonia'),
  ('Wilmington'),
  ('Leland'),
  ('Castle Hayne'),
  ('Commercial'),
  ('Ops Center'),
  ('Main'),
  ('Concord Warehouse');

-- ============================================================
-- Add location + manager fields to orders
-- ============================================================
ALTER TABLE orders ADD COLUMN location_selected TEXT;
ALTER TABLE orders ADD COLUMN manager_selected_name TEXT;
ALTER TABLE orders ADD COLUMN manager_selected_email TEXT;
