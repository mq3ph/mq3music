-- Run in the EXISTING MQ3 Neon database before deploying this patch.
-- No existing balances or payment statuses are changed.
CREATE TABLE IF NOT EXISTS paypal_checkouts (
  load_order_id uuid PRIMARY KEY REFERENCES credit_load_orders(id),
  paypal_order_id text NOT NULL,
  environment text NOT NULL CHECK(environment IN ('live','sandbox')),
  capture_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(environment,paypal_order_id),
  UNIQUE(environment,capture_id)
);
-- Existing payments have unknown environment. Do not guess or backfill them.
