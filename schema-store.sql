-- Employee Store — D1 (SQLite) schema
-- Converted from Supabase/Postgres on 2026-03-06
-- Source: docs/employee-store-schema.md
-- Database: stancil-store

PRAGMA foreign_keys = ON;

-- ============================================================
-- 1. colors
-- ============================================================
CREATE TABLE IF NOT EXISTS colors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  color TEXT NOT NULL,
  description TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_colors_active ON colors (active);

-- ============================================================
-- 2. products
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  image_url TEXT,
  display_order INTEGER,
  active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  is_swag_bag INTEGER DEFAULT 0,
  base_image_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_products_active ON products (active);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);

-- ============================================================
-- 3. product_variants (FK → products)
-- ============================================================
CREATE TABLE IF NOT EXISTS product_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER,
  size TEXT,
  color TEXT,
  price REAL,
  stock_quantity INTEGER DEFAULT 0,
  is_custom INTEGER,
  lead_time TEXT,
  image_url TEXT,
  sku TEXT,
  is_credit_allowed INTEGER,
  active INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  will_reorder INTEGER DEFAULT 1,
  FOREIGN KEY (product_id) REFERENCES products (id)
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants (product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_active ON product_variants (active);

-- ============================================================
-- 4. locations
-- ============================================================
CREATE TABLE IF NOT EXISTS locations (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  active INTEGER DEFAULT 1
);

INSERT OR IGNORE INTO locations (name) VALUES
  ('Gastonia'), ('Wilmington'), ('Leland'), ('Castle Hayne'),
  ('Commercial'), ('Ops Center'), ('Main'), ('Concord Warehouse');

-- ============================================================
-- 5. orders
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  total_amount REAL NOT NULL,
  credit_used REAL NOT NULL,
  out_of_pocket REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  employee_email TEXT,
  user_id TEXT,
  order_fulfilled INTEGER DEFAULT 0,
  order_notes TEXT,
  status TEXT DEFAULT 'Pending',
  location_selected TEXT,
  manager_selected_name TEXT,
  manager_selected_email TEXT
);

CREATE INDEX IF NOT EXISTS idx_orders_employee_email ON orders (employee_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);

-- ============================================================
-- 6. order_items (FK → orders, products, product_variants)
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  price REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  product_size TEXT,
  item_fulfilled INTEGER DEFAULT 0,
  order_item_notes TEXT,
  product_variant_id INTEGER,
  updated_on TEXT,
  color TEXT,
  status TEXT DEFAULT 'Pending',
  lead_time TEXT,
  FOREIGN KEY (order_id) REFERENCES orders (id),
  FOREIGN KEY (product_id) REFERENCES products (id),
  FOREIGN KEY (product_variant_id) REFERENCES product_variants (id)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items (product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_status ON order_items (status);

-- ============================================================
-- 7. profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  role TEXT DEFAULT 'employee',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  yearly_credit REAL,
  primary_location TEXT,
  manager_name TEXT,
  manager_email TEXT,
  display_name TEXT
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles (role);

-- ============================================================
-- 8. store_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS store_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  is_open INTEGER DEFAULT 1,
  close_message TEXT DEFAULT 'The store is currently closed...',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- 9. swag_bags
-- ============================================================
CREATE TABLE IF NOT EXISTS swag_bags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_name TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- 10. swag_bag_items (FK → swag_bags, products, product_variants)
-- ============================================================
CREATE TABLE IF NOT EXISTS swag_bag_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  swag_bag_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  variant_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  size TEXT,
  color TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (swag_bag_id) REFERENCES swag_bags (id),
  FOREIGN KEY (product_id) REFERENCES products (id),
  FOREIGN KEY (variant_id) REFERENCES product_variants (id)
);

CREATE INDEX IF NOT EXISTS idx_swag_bag_items_swag_bag_id ON swag_bag_items (swag_bag_id);
