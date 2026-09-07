-- Node kind is derived from span attributes at ingest (db.system, messaging.system,
-- whether the service ever emits server spans), never from its name. Nullable so a
-- service observed only as a dependency target can be classified later.
ALTER TABLE services ADD COLUMN IF NOT EXISTS kind VARCHAR(32);

CREATE INDEX IF NOT EXISTS idx_services_kind ON services(kind);
