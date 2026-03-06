# Employee Store -- D1 Setup

## 1. Create the database

```bash
wrangler d1 create stancil-store
```

Copy the `database_id` from the output for step 4.

## 2. Apply the schema

```bash
wrangler d1 execute stancil-store --file=schema-store.sql --remote
```

## 3. Generate and load seed data

```bash
node scripts/migrate-store.cjs
wrangler d1 execute stancil-store --file=scripts/seed-store.sql --remote
```

> **Note:** The seed SQL disables foreign key checks during bulk insert,
> then re-enables them. If you need to re-seed, drop all tables first or
> recreate the database.

## 4. Add wrangler.jsonc binding

Add a new entry to the `d1_databases` array in `wrangler.jsonc`:

```jsonc
{
  "d1_databases": [
    // ... existing bindings ...
    {
      "binding": "STORE_DB",
      "database_name": "stancil-store",
      "database_id": "<FILL_IN_AFTER_CREATION>"
    }
  ]
}
```

## 5. Verify

```bash
wrangler d1 execute stancil-store --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;" --remote
```

Expected tables (9): `colors`, `order_items`, `orders`, `product_variants`, `products`, `profiles`, `store_settings`, `swag_bag_items`, `swag_bags`.
