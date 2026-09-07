-- Endpoints the platform knows about, however it learned them.
--   observed = seen in real telemetry (always safe, zero cost)
--   spec     = imported from an OpenAPI document
--   probe    = confirmed by actively calling it
CREATE TABLE IF NOT EXISTS discovered_endpoints (
    id                SERIAL PRIMARY KEY,
    service_name      VARCHAR(128) NOT NULL,
    method            VARCHAR(16)  NOT NULL,
    path              VARCHAR(1024) NOT NULL,
    source            VARCHAR(16)  NOT NULL,
    base_url          VARCHAR(1024),
    observation_count INTEGER DEFAULT 0,
    last_status_code  INTEGER,
    last_duration_ms  INTEGER,
    last_probed_at    TIMESTAMPTZ,
    first_seen        TIMESTAMPTZ DEFAULT NOW(),
    last_seen         TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (service_name, method, path)
);

CREATE INDEX IF NOT EXISTS idx_discovered_endpoints_service ON discovered_endpoints(service_name);
CREATE INDEX IF NOT EXISTS idx_discovered_endpoints_source ON discovered_endpoints(source);
