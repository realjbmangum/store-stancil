# PRD: Stancil Employee Store Rebuild

> **Project:** Stancil Employee Store
> **Author:** Brian Mangum / LIGHTHOUSE 27 LLC
> **Date:** 2026-03-06
> **Status:** Draft
> **Domain:** store.stancilservices.com (or store.thestancilway.com TBD)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Goals](#2-goals)
3. [Non-Goals](#3-non-goals)
4. [User Roles](#4-user-roles)
5. [User Stories (Employee)](#5-user-stories-employee)
6. [User Stories (Admin/HR)](#6-user-stories-adminhr)
7. [Pages & Routes](#7-pages--routes)
8. [D1 Schema](#8-d1-schema)
9. [API Endpoints](#9-api-endpoints)
10. [Data Migration Plan](#10-data-migration-plan)
11. [Technical Considerations](#11-technical-considerations)
12. [Build Phases](#12-build-phases)
13. [Open Questions](#13-open-questions)

---

## 1. Overview

Stancil Services is a painting, drywall, and plumbing contractor. They operate an internal employee merchandise store at store.stancilservices.com where employees can browse company-branded products (apparel, drinkware, tools, accessories) and place orders using a $200/year company credit.

The current store is built on Supabase with Azure AD authentication. It is functional but has a dated, unpolished UI that does not match the company's recently redesigned main website at thestancilway.com.

This project rebuilds the store from the ground up on Cloudflare's stack (D1 + R2 + Pages) with Astro 5 SSR, a full visual redesign aligned to the Stancil brand, and the same feature set — plus architectural improvements that set up future capabilities like Stripe payment processing.

---

## 2. Goals

| # | Goal | Measure of Success |
|---|------|--------------------|
| G1 | **Match brand identity** — Store looks and feels like thestancilway.com | Side-by-side comparison passes visual review; same fonts, colors, card patterns |
| G2 | **Migrate off Supabase** — All data and functionality on Cloudflare D1/R2/Pages | Supabase project can be paused with zero impact to store operations |
| G3 | **Maintain all existing functionality** — Nothing employees or admins rely on is lost | Every current feature has a 1:1 equivalent or explicit replacement |
| G4 | **Mobile-first responsive design** — Usable on phones in the field | All pages pass manual review on 375px viewport |
| G5 | **Improve admin efficiency** — Faster product/order/inventory management | Admin tasks require fewer clicks than current UI |
| G6 | **Future-proof for Stripe** — Architecture supports adding payment processing later | Order model includes payment fields; checkout flow has a clear Stripe insertion point |

---

## 3. Non-Goals

| # | Explicitly Not Building | Rationale |
|---|------------------------|-----------|
| N1 | Stripe / payment processing | Planned for a future phase; out-of-pocket is tracked but not collected |
| N2 | Manager approval workflow | Orders go directly to HR — no approval chain exists today |
| N3 | Shipping / tracking integration | Orders are fulfilled internally; no carrier integration needed |
| N4 | Public-facing storefront | This is an internal employee-only tool behind Cloudflare Access |
| N5 | Inventory auto-replenishment | Stock is managed manually by HR/IT |
| N6 | Multi-tenant / multi-company | This serves Stancil Services only |
| N7 | Image upload in admin UI (Phase 1) | Images reference existing R2 URLs initially; admin upload comes in Phase 3 |

---

## 4. User Roles

### Employee (`role = 'employee'`)

- Browse and filter products
- View product details with variant options (size, color)
- Add items to cart
- Check out using yearly credit (and track out-of-pocket overage)
- View their own order history
- Submit swag bag requests (once per month)

### Admin (`role = 'admin'`)

All employee capabilities, plus:

- **Products:** Create, edit, deactivate products and variants; manage images, pricing, stock
- **Orders:** View all orders, update fulfillment status per item or per order, add notes
- **Employees:** View/edit employee profiles, adjust credit balances, add new employees
- **Swag Bags:** Create bundles assigned to new-hire employees, manage swag bag items
- **Store Settings:** Open/close the store with a custom message
- **Reports:** View order summaries, credit usage, inventory levels
- **Logs:** View application logs for debugging

---

## 5. User Stories (Employee)

### E1: Browse Products

**As an employee, I want to see all available products so I can find items I want to order.**

Acceptance Criteria:
- Products display in a responsive grid (4 columns desktop, 2 columns tablet, 1 column mobile)
- Each product card shows: image, name, price range (if variants have different prices), stock indicator, credit-eligible badge
- Inactive products and products with zero stock across all variants do not appear
- Page loads in under 2 seconds

### E2: Filter Products by Category

**As an employee, I want to filter products by category so I can quickly find what I need.**

Acceptance Criteria:
- Category pill filters display horizontally: All, Accessories, Apparel, Drinkware, Office Supplies, Tools
- Selecting a category instantly filters the grid (no page reload)
- "All" is selected by default
- Active filter pill is visually distinct (filled vs. outlined)

### E3: Filter Credit-Eligible Items

**As an employee, I want to toggle a filter showing only credit-eligible items so I can maximize my company benefit.**

Acceptance Criteria:
- "Show Only Credit-Eligible Items" checkbox/toggle above the product grid
- When active, only products with at least one credit-eligible variant are shown
- Filter works in combination with category filters

### E4: View Product Detail

**As an employee, I want to see full details for a product so I can choose the right size and color.**

Acceptance Criteria:
- Product detail page shows: large image, name, description, category
- Variant selector: size dropdown, color dropdown (only showing in-stock combinations)
- Selected variant shows: price, stock quantity, credit eligibility, lead time (if custom)
- Image updates when a different color variant with its own image is selected
- "Add to Cart" button (disabled if out of stock)
- Back link to product listing

### E5: Add to Cart

**As an employee, I want to add items to my cart so I can order multiple products at once.**

Acceptance Criteria:
- Clicking "Add to Cart" adds the selected variant (size + color) with quantity 1
- If the same variant is already in the cart, quantity increments
- Cart icon in the header shows current item count (badge)
- Cart persists across page navigation within the session
- Cannot add more than available stock quantity

### E6: View and Edit Cart

**As an employee, I want to review my cart before checking out so I can make changes.**

Acceptance Criteria:
- Cart page/drawer shows all items with: product name, size, color, unit price, quantity, line total
- Quantity can be adjusted (min 1, max available stock)
- Items can be removed
- Cart shows subtotal
- Cart shows estimated credit usage vs. out-of-pocket based on credit-eligible items and remaining credit balance
- "Proceed to Checkout" button
- "Continue Shopping" link

### E7: Checkout with Credit

**As an employee, I want to place my order using my yearly credit so I can get company merchandise.**

Acceptance Criteria:
- Checkout page shows order summary with all items
- Displays: total amount, credit available, credit to be used, out-of-pocket amount
- Credit is applied automatically to credit-eligible items first
- Non-credit-eligible items are always out-of-pocket
- If credit-eligible items exceed remaining credit, the overage goes to out-of-pocket
- "Place Order" button submits the order
- On success: order is created with status "Pending," credit balance is deducted, stock is decremented, confirmation page is shown
- HR receives an email notification of the new order
- Employee sees order confirmation with order number

### E8: View Order History

**As an employee, I want to see my past orders so I can track their status.**

Acceptance Criteria:
- Order history page lists all orders for the logged-in employee
- Each order shows: order number, date, total, credit used, out-of-pocket, status
- Clicking an order shows line items with individual fulfillment status
- Orders are sorted newest first

### E9: Submit Swag Bag Request

**As an employee, I want to submit a swag bag request so I can receive my new-hire bundle.**

Acceptance Criteria:
- Swag bag request form collects: first name, last name, work email
- Employee selects products and sizes from available swag bag items
- Form validates that the email is a valid work email
- Submission is blocked if the employee already submitted this month (based on email_tracking)
- On success: submission is recorded, confirmation is shown
- HR is notified of the new submission

### E10: View Credit Balance

**As an employee, I want to see my remaining credit balance so I know how much I can spend.**

Acceptance Criteria:
- Credit balance is visible in the header or profile area on every page
- Shows: total yearly credit ($200), credit used, credit remaining
- Updates after placing an order

---

## 6. User Stories (Admin/HR)

### A1: Manage Products

**As an admin, I want to create, edit, and deactivate products so I can control what's available in the store.**

Acceptance Criteria:
- Product list view shows all products (including inactive) with: name, category, active status, variant count, display order
- Create product form: name, description, category (dropdown), image URL, display order, active toggle, is_swag_bag toggle
- Edit product: all fields editable
- Deactivate product: sets active to false (does not delete — preserves order history)
- Drag-and-drop or manual display_order adjustment

### A2: Manage Product Variants

**As an admin, I want to manage size/color/price variants for each product so employees see accurate options.**

Acceptance Criteria:
- Variant list within product edit page
- Create variant: size, color (from colors table), price, stock quantity, SKU, is_credit_allowed, is_custom, lead_time, image URL (optional, overrides product image), active toggle, will_reorder flag
- Edit variant: all fields editable
- Deactivate variant: hides from store but preserves in order history
- Bulk stock update: quick-edit stock quantities across multiple variants

### A3: Manage Colors

**As an admin, I want to maintain the list of available colors so they can be assigned to product variants.**

Acceptance Criteria:
- Color list with: color name, description, active status
- Create, edit, deactivate colors
- Deactivating a color does not affect existing variants using it

### A4: View and Manage Orders

**As an admin, I want to view all employee orders so I can fulfill them.**

Acceptance Criteria:
- Order list shows all orders with: order number, employee name/email, date, total, credit used, out-of-pocket, status, fulfillment status
- Filter orders by: status (Pending/Fulfilled/Partial), date range, employee
- Order detail shows line items with: product, variant (size/color), quantity, price, item fulfillment status, notes
- Mark individual items as fulfilled
- Mark entire order as fulfilled (auto-marks all items)
- Add notes to order or individual items
- Order status auto-updates: Pending (default) -> Partial (some items fulfilled) -> Fulfilled (all items fulfilled)

### A5: Manage Employee Profiles

**As an admin, I want to manage employee profiles so credit and access stay current.**

Acceptance Criteria:
- Employee list with: name, email, role, location, credit remaining, manager
- Create employee profile (for employees not yet in the system)
- Edit profile: all fields including yearly_credit amount
- Reset credit: manually adjust credit balance (e.g., annual reset)
- View employee's order history from their profile
- Cannot delete profiles (would break order history) — deactivate by changing role or removing from Azure AD

### A6: Manage Swag Bags

**As an admin, I want to create pre-built product bundles for new hires so onboarding is streamlined.**

Acceptance Criteria:
- Swag bag list shows: employee name, item count, notes, created date
- Create swag bag: assign employee name, add notes
- Add/remove items: select product, variant (size/color), quantity
- View swag bag contents with all items and details
- View swag bag submissions from employees (from the request form)
- Mark submissions as fulfilled

### A7: Store Settings

**As an admin, I want to open or close the store so I can control access during inventory or holidays.**

Acceptance Criteria:
- Toggle store open/closed
- When closed: employees see a custom message instead of the store
- Custom close message is editable (rich text or plain text)
- Admins can still access the store and admin panel when closed

### A8: Admin Dashboard

**As an admin, I want to see a summary dashboard so I can quickly understand store health.**

Acceptance Criteria:
- Dashboard shows:
  - Total orders (this month / all time)
  - Total revenue (credit + out-of-pocket)
  - Orders pending fulfillment (count)
  - Low stock alerts (variants below threshold, e.g., < 5)
  - Recent orders (last 10)
  - Credit usage summary (total credit issued vs. used across all employees)
- Links to drill into each section

### A9: View Logs

**As an admin, I want to view application logs so I can debug issues.**

Acceptance Criteria:
- Log list with: timestamp, level (info/warn/error), message, source, user email
- Filter by: level, source, date range, user
- Expandable row shows full additional_data JSON
- Newest first

---

## 7. Pages & Routes

### Employee Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home / Product Listing | Product grid with category filters and credit filter |
| `/product/[id]` | Product Detail | Full product info with variant selector and add-to-cart |
| `/cart` | Shopping Cart | Cart contents, quantity editing, checkout link |
| `/checkout` | Checkout | Order summary, credit breakdown, place order |
| `/checkout/confirmation/[orderId]` | Order Confirmation | Post-order confirmation with order number |
| `/orders` | Order History | List of the employee's past orders |
| `/orders/[id]` | Order Detail | Line items and fulfillment status for one order |
| `/swag-bag` | Swag Bag Request | Form to submit a new-hire swag bag request |
| `/profile` | Profile / Credit | View profile info and credit balance |

### Admin Routes

| Route | Page | Description |
|-------|------|-------------|
| `/admin` | Admin Dashboard | Summary stats, alerts, recent activity |
| `/admin/products` | Product List | All products with search, filter, sort |
| `/admin/products/new` | Create Product | New product form |
| `/admin/products/[id]` | Edit Product | Edit product + manage variants |
| `/admin/colors` | Color Management | CRUD for the colors table |
| `/admin/orders` | Order List | All orders with filters |
| `/admin/orders/[id]` | Order Detail | Fulfillment management for one order |
| `/admin/employees` | Employee List | All employee profiles |
| `/admin/employees/[id]` | Employee Detail | Edit profile, view order history |
| `/admin/swag-bags` | Swag Bag List | All swag bags and submissions |
| `/admin/swag-bags/new` | Create Swag Bag | Build a new swag bag bundle |
| `/admin/swag-bags/[id]` | Edit Swag Bag | Modify swag bag contents |
| `/admin/settings` | Store Settings | Open/close toggle, close message |
| `/admin/logs` | Application Logs | Filterable log viewer |

### Shared / System

| Route | Page | Description |
|-------|------|-------------|
| `/closed` | Store Closed | Shown when store is_open = false (employees only) |

---

## 8. D1 Schema

All tables use SQLite-compatible types. `INTEGER` for booleans (0/1). `TEXT` for timestamps (ISO 8601). `REAL` for monetary values. `TEXT` for JSON blobs.

```sql
-- ============================================================
-- COLORS
-- ============================================================
CREATE TABLE colors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  color TEXT NOT NULL,
  description TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  image_url TEXT,
  base_image_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  is_swag_bag INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active ON products(active);
CREATE INDEX idx_products_display_order ON products(display_order);

-- ============================================================
-- PRODUCT VARIANTS
-- ============================================================
CREATE TABLE product_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  size TEXT,
  color TEXT,
  price REAL NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  is_custom INTEGER NOT NULL DEFAULT 0,
  lead_time TEXT,
  image_url TEXT,
  sku TEXT,
  is_credit_allowed INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  will_reorder INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_product_variants_active ON product_variants(active);
CREATE INDEX idx_product_variants_sku ON product_variants(sku);

-- ============================================================
-- PROFILES (employees)
-- ============================================================
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,  -- Azure AD object ID from Cloudflare Access
  first_name TEXT,
  last_name TEXT,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'employee',  -- 'employee' or 'admin'
  yearly_credit REAL NOT NULL DEFAULT 200.00,
  credit_used REAL NOT NULL DEFAULT 0.00,
  primary_location TEXT,
  manager_name TEXT,
  manager_email TEXT,
  display_name TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  employee_email TEXT NOT NULL,
  total_amount REAL NOT NULL DEFAULT 0.00,
  credit_used REAL NOT NULL DEFAULT 0.00,
  out_of_pocket REAL NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'Pending',  -- Pending, Partial, Fulfilled, Cancelled
  order_fulfilled INTEGER NOT NULL DEFAULT 0,
  order_notes TEXT,
  -- Future Stripe fields
  stripe_payment_intent_id TEXT,
  stripe_payment_status TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES profiles(id)
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_employee_email ON orders(employee_email);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE TABLE order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  product_variant_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price REAL NOT NULL,
  product_size TEXT,
  color TEXT,
  item_fulfilled INTEGER NOT NULL DEFAULT 0,
  order_item_notes TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',  -- Pending, Fulfilled, Cancelled
  lead_time TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (product_variant_id) REFERENCES product_variants(id)
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_order_items_status ON order_items(status);

-- ============================================================
-- SWAG BAGS
-- ============================================================
CREATE TABLE swag_bags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_name TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Created',  -- Created, Fulfilled
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- SWAG BAG ITEMS
-- ============================================================
CREATE TABLE swag_bag_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  swag_bag_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  variant_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  size TEXT,
  color TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (swag_bag_id) REFERENCES swag_bags(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (variant_id) REFERENCES product_variants(id)
);

CREATE INDEX idx_swag_bag_items_swag_bag_id ON swag_bag_items(swag_bag_id);

-- ============================================================
-- SUBMISSIONS (swag bag requests from employees)
-- ============================================================
CREATE TABLE submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  work_email TEXT NOT NULL,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_submissions_work_email ON submissions(work_email);

-- ============================================================
-- SUBMISSION PRODUCTS
-- ============================================================
CREATE TABLE submission_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id INTEGER NOT NULL,
  product_id INTEGER,
  product_name TEXT,
  size TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (submission_id) REFERENCES submissions(id)
);

CREATE INDEX idx_submission_products_submission_id ON submission_products(submission_id);

-- ============================================================
-- EMAIL TRACKING (swag bag submission rate limiting)
-- ============================================================
CREATE TABLE email_tracking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  last_submission_month TEXT NOT NULL,  -- Format: 'YYYY-MM'
  can_resubmit INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_email_tracking_email ON email_tracking(email);

-- ============================================================
-- STORE SETTINGS
-- ============================================================
CREATE TABLE store_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,  -- Single row
  is_open INTEGER NOT NULL DEFAULT 1,
  close_message TEXT DEFAULT 'The store is currently closed. Please check back later.',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Insert default row
INSERT INTO store_settings (id, is_open) VALUES (1, 1);

-- ============================================================
-- LOGS
-- ============================================================
CREATE TABLE logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT NOT NULL DEFAULT 'info',  -- info, warn, error
  message TEXT NOT NULL,
  source TEXT,
  user_id TEXT,
  user_email TEXT,
  additional_data TEXT,  -- JSON string
  environment TEXT DEFAULT 'production',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_logs_level ON logs(level);
CREATE INDEX idx_logs_source ON logs(source);
CREATE INDEX idx_logs_created_at ON logs(created_at);
CREATE INDEX idx_logs_user_email ON logs(user_email);
```

### Schema Changes from Supabase

| Change | Rationale |
|--------|-----------|
| `profiles.id` is `TEXT` (not UUID) | Azure AD object IDs are strings; D1 has no native UUID type |
| Added `profiles.credit_used` column | Derived field for faster queries — avoids summing all orders each time |
| Added `profiles.active` column | Soft-delete support without removing from Azure AD |
| Added `orders.stripe_payment_intent_id` and `stripe_payment_status` | Future-proofing for Stripe integration |
| Added `swag_bags.status` column | Track fulfillment of swag bags |
| `store_settings` uses single-row pattern (`id = 1`) | Explicit constraint for settings singleton |
| `email_tracking.last_submission_month` is `TEXT 'YYYY-MM'` | Simple month comparison without date parsing |
| All timestamps are `TEXT` in ISO 8601 | D1/SQLite standard; no native timestamp type |
| All booleans are `INTEGER` (0/1) | SQLite convention |
| All monetary values are `REAL` | SQLite has no DECIMAL; REAL is sufficient for internal store pricing |

---

## 9. API Endpoints

All endpoints are Astro server endpoints under `src/pages/api/`. Authentication is handled by Cloudflare Access — every request includes the user's identity. Admin endpoints additionally check `profiles.role = 'admin'`.

### Products

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/products` | List active products (with optional category filter) |
| GET | `/api/products/[id]` | Get product with all active variants |
| POST | `/api/products` | Create product (admin) |
| PATCH | `/api/products/[id]` | Update product (admin) |

### Product Variants

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/products/[id]/variants` | List active variants for a product |
| POST | `/api/products/[id]/variants` | Create variant (admin) |
| PATCH | `/api/variants/[id]` | Update variant (admin) |
| PATCH | `/api/variants/bulk-stock` | Bulk update stock quantities (admin) |

### Colors

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/colors` | List active colors |
| POST | `/api/colors` | Create color (admin) |
| PATCH | `/api/colors/[id]` | Update color (admin) |

### Cart

Cart is managed client-side (localStorage or session state). No server-side cart endpoints — the cart is submitted as a complete order at checkout.

### Orders

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/orders` | List orders for current user (or all orders for admin) |
| GET | `/api/orders/[id]` | Get order with line items |
| POST | `/api/orders` | Create order (checkout) — validates stock, deducts credit, decrements inventory |
| PATCH | `/api/orders/[id]` | Update order status/notes (admin) |
| PATCH | `/api/orders/[id]/items/[itemId]` | Update item fulfillment status/notes (admin) |

### Profiles

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/profile` | Get current user's profile and credit balance |
| GET | `/api/employees` | List all employees (admin) |
| GET | `/api/employees/[id]` | Get employee profile with order history (admin) |
| POST | `/api/employees` | Create employee profile (admin) |
| PATCH | `/api/employees/[id]` | Update employee profile/credit (admin) |

### Swag Bags

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/swag-bags` | List all swag bags (admin) |
| GET | `/api/swag-bags/[id]` | Get swag bag with items (admin) |
| POST | `/api/swag-bags` | Create swag bag (admin) |
| PATCH | `/api/swag-bags/[id]` | Update swag bag (admin) |
| POST | `/api/swag-bags/[id]/items` | Add item to swag bag (admin) |
| DELETE | `/api/swag-bags/[id]/items/[itemId]` | Remove item from swag bag (admin) |

### Submissions (Swag Bag Requests)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/submissions` | List all submissions (admin) |
| POST | `/api/submissions` | Submit swag bag request (employee) — checks email_tracking |
| GET | `/api/submissions/check/[email]` | Check if employee can submit this month |

### Store Settings

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/settings` | Get store open/closed status |
| PATCH | `/api/settings` | Update store settings (admin) |

### Logs

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/logs` | List logs with filters (admin) |
| POST | `/api/logs` | Write a log entry (internal use) |

### Dashboard

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/admin/dashboard` | Aggregated stats for admin dashboard |

---

## 10. Data Migration Plan

### Step 1: Export from Supabase

Use the Supabase CLI or direct SQL to export each table as CSV or JSON:

```bash
# For each table:
supabase db dump --data-only --table=products > products.json
supabase db dump --data-only --table=product_variants > product_variants.json
supabase db dump --data-only --table=colors > colors.json
supabase db dump --data-only --table=profiles > profiles.json
supabase db dump --data-only --table=orders > orders.json
supabase db dump --data-only --table=order_items > order_items.json
supabase db dump --data-only --table=swag_bags > swag_bags.json
supabase db dump --data-only --table=swag_bag_items > swag_bag_items.json
supabase db dump --data-only --table=submissions > submissions.json
supabase db dump --data-only --table=submission_products > submission_products.json
supabase db dump --data-only --table=email_tracking > email_tracking.json
supabase db dump --data-only --table=store_settings > store_settings.json
supabase db dump --data-only --table=logs > logs.json
```

### Step 2: Transform Data

Write a migration script (Node.js) that:

1. Reads each JSON/CSV export
2. Maps Supabase types to D1 types:
   - `uuid` -> keep as `TEXT` string
   - `boolean` -> `0` or `1`
   - `timestamptz` -> ISO 8601 `TEXT`
   - `numeric` / `decimal` -> `REAL`
   - `jsonb` -> `TEXT` (JSON string)
3. Maps `profiles.id` (Supabase auth UUID) to Azure AD object ID
   - May need a mapping table or manual reconciliation
   - If Azure AD IDs are already stored, use as-is
4. Adds `credit_used` to profiles by summing existing orders
5. Validates foreign key integrity

### Step 3: Create D1 Database and Import

```bash
# Create the D1 database
npx wrangler d1 create stancil-store

# Run schema
npx wrangler d1 execute stancil-store --file=./migrations/001-schema.sql

# Import data (use wrangler d1 execute with INSERT statements)
npx wrangler d1 execute stancil-store --file=./migrations/002-seed-data.sql
```

### Step 4: Image URLs

- Product images are currently stored in R2 on a different Cloudflare account
- **Phase 1:** Keep existing `image_url` values pointing to the current R2 URLs — they are publicly accessible and will continue to work
- **Phase 3 (Admin):** Add image upload functionality that writes to R2 on the Stancil Cloudflare account, and update `image_url` accordingly
- **Later:** Bulk-migrate images from the old R2 to Stancil R2 using `wrangler r2 object get/put`

### Step 5: Validation

- Compare row counts: Supabase vs. D1 for every table
- Spot-check 10 random records per table
- Verify credit balances match (profiles.yearly_credit minus sum of orders.credit_used)
- Test order history for 3 real employees
- Confirm image URLs load correctly

---

## 11. Technical Considerations

### Authentication Flow

1. Cloudflare Access sits in front of `store.stancilservices.com`
2. Access is configured with Azure AD as the identity provider
3. All Stancil employees are in the Azure AD group and can authenticate
4. On each request, Cloudflare Access provides a signed JWT in the `Cf-Access-Jwt-Assertion` header
5. The Astro middleware:
   - Validates the JWT against the Access certs endpoint
   - Extracts the user's email and Azure AD object ID
   - Looks up or creates the user's profile in D1
   - Attaches the profile to `Astro.locals.user`
6. Admin routes additionally check `Astro.locals.user.role === 'admin'`
7. When the store is closed (`store_settings.is_open = 0`), non-admin users are redirected to `/closed`

### Image Handling

- All product images are served from R2 via public URLs
- No image processing or resizing is performed server-side
- Images should be optimized before upload (WebP preferred, max 500KB)
- Product cards use `loading="lazy"` for images below the fold
- Fallback placeholder image for products with no image_url

### Email Notifications

- Use SendGrid (already in the infrastructure stack) to send:
  - **Order placed** -> HR notification with order details
  - **Swag bag submitted** -> HR notification
- Emails are sent from server-side API endpoints after successful database writes
- Email failures are logged but do not block the order (fire-and-forget with retry)

### Credit Calculation Logic

```
For each order:
1. Separate cart items into credit-eligible and non-eligible
2. Sum credit-eligible item totals
3. Available credit = profiles.yearly_credit - profiles.credit_used
4. credit_to_use = MIN(credit_eligible_total, available_credit)
5. out_of_pocket = total_amount - credit_to_use
6. Update profiles.credit_used += credit_to_use
7. Store credit_used and out_of_pocket on the order
```

Credit-eligibility is per-variant (`product_variants.is_credit_allowed`), not per-product.

### Stripe Future-Proofing

The schema includes `stripe_payment_intent_id` and `stripe_payment_status` on the orders table. When Stripe is added:

1. Checkout creates a Stripe PaymentIntent for the `out_of_pocket` amount
2. Employee enters payment details via Stripe Elements
3. On payment confirmation, order status transitions from "Payment Pending" to "Pending" (fulfillment)
4. If `out_of_pocket = 0`, Stripe is skipped entirely

No Stripe code is written in this build — only the schema and architectural hooks.

### Performance

- D1 queries should use prepared statements with bound parameters
- Product listing page should be cacheable with short TTL (1-5 min) or use stale-while-revalidate
- Admin pages are not cached
- Cart is client-side (no server round-trips for add/remove/update)

### Error Handling

- All API endpoints return consistent JSON: `{ success: boolean, data?: any, error?: string }`
- Client-side errors show toast notifications
- Server errors are logged to the `logs` table
- Stock conflicts (item sold out between add-to-cart and checkout) return a clear error with the option to update the cart

---

## 12. Build Phases

### Phase 1: Foundation + Product Browsing

**Goal:** D1 schema live, data migrated, employees can browse products.

- [ ] Initialize Astro 5 project with `@astrojs/cloudflare` adapter and Tailwind v4
- [ ] Configure brand tokens (colors, fonts) in Tailwind config
- [ ] Create D1 database (`stancil-store`) and run schema migration
- [ ] Write and run data migration script (Supabase -> D1)
- [ ] Set up Cloudflare Access auth middleware (JWT validation, user lookup)
- [ ] Build shared layout: header (logo, nav, cart icon, credit balance), footer
- [ ] Build product listing page (`/`) with card grid
- [ ] Build category pill filters (client-side filtering)
- [ ] Build credit-eligible toggle filter
- [ ] Build product detail page (`/product/[id]`) with variant selector
- [ ] Build store-closed redirect logic
- [ ] Deploy to Cloudflare Pages

**Deliverable:** Employees can log in, browse products, filter by category, and view product details.

### Phase 2: Cart + Checkout + Credit System

**Goal:** Employees can place orders using their credit.

- [ ] Build cart (client-side with localStorage)
- [ ] Build cart page/drawer (`/cart`) with quantity editing and removal
- [ ] Build credit calculation display in cart (estimated credit vs. out-of-pocket)
- [ ] Build checkout page (`/checkout`) with order summary and credit breakdown
- [ ] Build order creation API (`POST /api/orders`) with:
  - Stock validation and decrement
  - Credit calculation and deduction
  - Order + order_items creation
  - SendGrid email to HR
- [ ] Build order confirmation page (`/checkout/confirmation/[orderId]`)
- [ ] Build order history page (`/orders`) and order detail page (`/orders/[id]`)
- [ ] Build profile/credit page (`/profile`)

**Deliverable:** Full employee shopping flow from browse to order confirmation.

### Phase 3: Admin Dashboard

**Goal:** HR/IT can manage products, orders, inventory, and employees.

- [ ] Build admin layout with sidebar navigation
- [ ] Build admin dashboard (`/admin`) with summary stats
- [ ] Build product management (`/admin/products`, create, edit)
- [ ] Build variant management (within product edit)
- [ ] Build image upload to R2 (with fallback to URL input)
- [ ] Build color management (`/admin/colors`)
- [ ] Build order management (`/admin/orders`, detail with fulfillment toggles)
- [ ] Build employee management (`/admin/employees`, edit, credit adjustment)
- [ ] Build log viewer (`/admin/logs`)

**Deliverable:** Admins can manage the full store lifecycle without touching the database directly.

### Phase 4: Swag Bags + Store Settings + Polish

**Goal:** All remaining features, polish, and hardening.

- [ ] Build swag bag management (`/admin/swag-bags`, create, edit, items)
- [ ] Build swag bag request form (`/swag-bag`) with email tracking
- [ ] Build submission list in admin
- [ ] Build store settings page (`/admin/settings`) with open/close toggle
- [ ] Add scroll animations and grain textures where appropriate
- [ ] Cross-browser testing and mobile QA
- [ ] Accessibility pass (labels, contrast, focus states, keyboard nav)
- [ ] Error state polish (empty states, loading states, error toasts)
- [ ] Performance optimization (image lazy loading, query optimization)
- [ ] Final design review against thestancilway.com brand

**Deliverable:** Feature-complete store matching all current capabilities plus the new design.

### Phase 5: Stripe Integration (Future)

**Goal:** Collect payment for out-of-pocket amounts.

- [ ] Set up Stripe account for Stancil
- [ ] Add Stripe Elements to checkout page (only shown when out-of-pocket > 0)
- [ ] Create PaymentIntent on order creation
- [ ] Handle payment confirmation webhook
- [ ] Update order status flow to include payment states
- [ ] Test with Stripe test mode
- [ ] Go live with Stripe

**Deliverable:** Employees can pay for out-of-pocket amounts with a credit card.

---

## 13. Open Questions

| # | Question | Impact | Status |
|---|----------|--------|--------|
| Q1 | **Domain:** `store.stancilservices.com` or `store.thestancilway.com`? | DNS, Cloudflare Access config, communication to employees | TBD |
| Q2 | **Profile ID mapping:** Are the current Supabase `profiles.id` values already Azure AD object IDs, or are they Supabase auth UUIDs that need mapping? | Data migration complexity | Needs investigation |
| Q3 | **Credit reset cycle:** Is the $200 credit on a calendar year basis? When does it reset? Is it automated or manual? | May need a cron worker for annual reset | TBD |
| Q4 | **Out-of-pocket tracking:** Before Stripe, how are out-of-pocket charges actually collected? Payroll deduction? Honor system? | Affects checkout UX messaging | TBD |
| Q5 | **R2 image access:** Are the current R2 image URLs publicly accessible long-term, or do they need to be migrated before the old account is changed? | Determines Phase 1 vs. Phase 3 image migration | TBD |
| Q6 | **Low-stock threshold:** What quantity triggers a "low stock" alert in the admin dashboard? | Admin dashboard config | Default to 5, make configurable |
| Q7 | **Order email recipients:** Does the HR notification go to a single email or a distribution list? | SendGrid config | TBD |
| Q8 | **Existing Cloudflare Access config:** Is Cloudflare Access already configured on the Stancil account with Azure AD, or does this need to be set up from scratch? | Setup effort in Phase 1 | TBD |
| Q9 | **Swag bag vs. submissions:** Are these two separate workflows (admin-created bags vs. employee-submitted requests), or should they be unified? | Feature design | Keep separate for now, match current behavior |
| Q10 | **Will_reorder flag:** What happens when a variant is out of stock but `will_reorder = 1`? Can employees still see it? Pre-order? | UX for out-of-stock items | TBD — show as "Coming Back Soon" but disable add-to-cart |

---

*End of PRD. Ready for review and Phase 1 kickoff.*
