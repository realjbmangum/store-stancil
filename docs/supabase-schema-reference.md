# Employee Store — Supabase Schema (export 2026-03-06)

## Tables

### colors
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | autoincrement |
| color | varchar | NO | |
| description | text | YES | |
| active | boolean | YES | true |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |

### email_tracking
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| email | varchar | NO | |
| last_submission_month | varchar | NO | |
| can_resubmit | boolean | YES | false |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |

### logs
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | autoincrement |
| level | varchar | NO | |
| message | text | NO | |
| source | varchar | NO | |
| user_id | uuid | YES | |
| user_email | varchar | YES | |
| additional_data | jsonb | YES | |
| created_at | timestamptz | YES | now() |
| environment | varchar | YES | 'unknown' |

### order_items
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | autoincrement |
| order_id | bigint | NO | FK -> orders |
| product_id | bigint | NO | FK -> products |
| quantity | integer | NO | |
| price | numeric | NO | |
| created_at | timestamptz | YES | now() |
| product_size | text | YES | |
| item_fulfilled | boolean | YES | false |
| order_item_notes | text | YES | |
| product_variant_id | bigint | YES | FK -> product_variants |
| updated_on | timestamp | YES | |
| color | text | YES | |
| status | text | YES | 'Pending' |
| lead_time | text | YES | |

### orders
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | autoincrement |
| total_amount | numeric | NO | |
| credit_used | numeric | NO | |
| out_of_pocket | numeric | NO | |
| created_at | timestamptz | YES | now() |
| employee_email | text | YES | |
| user_id | text | YES | |
| order_fulfilled | boolean | YES | false |
| order_notes | text | YES | |
| status | text | YES | 'Pending' |

### product_variants
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | |
| product_id | bigint | YES | FK -> products |
| size | text | YES | |
| color | text | YES | |
| price | double precision | YES | |
| stock_quantity | bigint | YES | 0 |
| is_custom | boolean | YES | |
| lead_time | text | YES | |
| image_url | text | YES | |
| sku | text | YES | |
| is_credit_allowed | boolean | YES | |
| active | boolean | YES | |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | YES | now() |
| will_reorder | boolean | YES | true |

### products
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | autoincrement |
| name | varchar | NO | |
| description | text | YES | |
| category | text | YES | |
| image_url | text | YES | |
| display_order | bigint | YES | |
| active | boolean | YES | true |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |
| is_swag_bag | boolean | YES | false |
| base_image_url | text | YES | |

### profiles
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | text | NO | (Azure AD user ID) |
| first_name | text | YES | |
| last_name | text | YES | |
| email | text | YES | |
| role | text | YES | 'employee' |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |
| yearly_credit | double precision | YES | |
| primary_location | text | YES | |
| manager_name | text | YES | |
| manager_email | text | YES | |
| display_name | text | YES | |

### store_settings
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | integer | NO | autoincrement |
| is_open | boolean | YES | true |
| close_message | text | YES | 'The store is currently closed...' |
| updated_at | timestamptz | YES | now() |

### submission_products
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| submission_id | uuid | YES | FK -> submissions |
| product_id | integer | NO | |
| product_name | varchar | NO | |
| size | varchar | NO | |
| quantity | integer | NO | |
| created_at | timestamptz | YES | now() |

### submissions
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| first_name | varchar | NO | |
| last_name | varchar | NO | |
| work_email | varchar | NO | |
| submitted_at | timestamptz | YES | now() |
| created_at | timestamptz | YES | now() |

### swag_bag_items
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | autoincrement |
| swag_bag_id | bigint | NO | FK -> swag_bags |
| product_id | bigint | NO | FK -> products |
| variant_id | bigint | NO | FK -> product_variants |
| quantity | integer | NO | 1 |
| size | varchar | YES | |
| color | varchar | YES | |
| created_at | timestamptz | YES | now() |

### swag_bags
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | autoincrement |
| employee_name | varchar | NO | |
| notes | text | YES | |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |
