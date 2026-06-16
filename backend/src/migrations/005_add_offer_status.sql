-- Stavy nabídek používají stejný číselník jako stavy zakázek.
ALTER TABLE offers ADD COLUMN IF NOT EXISTS status_id INTEGER REFERENCES order_statuses(id);

UPDATE offers
SET status_id = (
  SELECT id
  FROM order_statuses
  WHERE lower(name) = lower('Nabídka')
  ORDER BY id ASC
  LIMIT 1
)
WHERE status_id IS NULL;
