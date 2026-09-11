-- MQ3 Priority Name Requests · 50 Credits
-- Run this once in the Neon SQL Editor before deploying this version.

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS priority boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS credits integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS promo_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS purchased_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS priority_delivered_at timestamptz;

ALTER TABLE credit_transactions
  DROP CONSTRAINT IF EXISTS credit_transactions_transaction_type_check;

ALTER TABLE credit_transactions
  ADD CONSTRAINT credit_transactions_transaction_type_check
  CHECK (transaction_type IN (
    'welcome_bonus',
    'credit_purchase',
    'gift_sent',
    'admin_adjustment',
    'refund',
    'mp3_purchase',
    'mp3_refund',
    'name_priority'
  ));
