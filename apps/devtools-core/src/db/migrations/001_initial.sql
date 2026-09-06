CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE traces (
    id              VARCHAR(64) PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    root_service    VARCHAR(128) NOT NULL,
    start_time      BIGINT NOT NULL,
    end_time        BIGINT NOT NULL,
    duration_ms     BIGINT GENERATED ALWAYS AS (end_time - start_time) STORED,
    status          VARCHAR(16) NOT NULL DEFAULT 'ok',
    method          VARCHAR(16),
    path            VARCHAR(1024),
    status_code     INTEGER,
    request_headers JSONB DEFAULT '{}',
    request_body    TEXT,
    response_headers JSONB DEFAULT '{}',
    response_body   TEXT,
    response_size   INTEGER,
    services        TEXT[] DEFAULT '{}',
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_traces_root_service ON traces(root_service);
CREATE INDEX idx_traces_status ON traces(status);
CREATE INDEX idx_traces_method ON traces(method);
CREATE INDEX idx_traces_start_time ON traces(start_time DESC);
CREATE INDEX idx_traces_created_at ON traces(created_at DESC);
CREATE INDEX idx_traces_status_code ON traces(status_code);
CREATE INDEX idx_traces_services ON traces USING GIN(services);
CREATE INDEX idx_traces_path ON traces(path);
CREATE INDEX idx_traces_search ON traces
    USING GIN(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(path, '')));

CREATE TABLE spans (
    id              VARCHAR(64) PRIMARY KEY,
    trace_id        VARCHAR(64) NOT NULL REFERENCES traces(id) ON DELETE CASCADE,
    parent_span_id  VARCHAR(64),
    service_name    VARCHAR(128) NOT NULL,
    operation_name  VARCHAR(512) NOT NULL,
    span_type       VARCHAR(32) NOT NULL,
    start_time      BIGINT NOT NULL,
    end_time        BIGINT NOT NULL,
    duration_ms     BIGINT GENERATED ALWAYS AS (end_time - start_time) STORED,
    status          VARCHAR(16) NOT NULL DEFAULT 'ok',
    status_message  TEXT,
    attributes      JSONB DEFAULT '{}',
    depth           INTEGER DEFAULT 0,
    "order"         INTEGER DEFAULT 0
);
CREATE INDEX idx_spans_trace_id ON spans(trace_id);
CREATE INDEX idx_spans_parent_span_id ON spans(parent_span_id);
CREATE INDEX idx_spans_service_name ON spans(service_name);
CREATE INDEX idx_spans_status ON spans(status);
CREATE INDEX idx_spans_span_type ON spans(span_type);
CREATE INDEX idx_spans_trace_service ON spans(trace_id, service_name);
CREATE INDEX idx_spans_start_time ON spans(start_time);
CREATE INDEX idx_spans_attributes ON spans USING GIN(attributes);

CREATE TABLE span_events (
    id SERIAL PRIMARY KEY,
    span_id VARCHAR(64) NOT NULL REFERENCES spans(id) ON DELETE CASCADE,
    event_name VARCHAR(255) NOT NULL,
    "timestamp" BIGINT NOT NULL,
    attributes JSONB DEFAULT '{}'
);
CREATE INDEX idx_span_events_span_id ON span_events(span_id);

CREATE TABLE log_events (
    id SERIAL PRIMARY KEY,
    trace_id VARCHAR(64) REFERENCES traces(id) ON DELETE SET NULL,
    span_id VARCHAR(64),
    service_name VARCHAR(128) NOT NULL,
    "level" VARCHAR(16) NOT NULL,
    message TEXT NOT NULL,
    attributes JSONB DEFAULT '{}',
    "timestamp" BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(trace_id, span_id, "timestamp", message)
);
CREATE INDEX idx_log_events_trace_id ON log_events(trace_id);
CREATE INDEX idx_log_events_span_id ON log_events(span_id);
CREATE INDEX idx_log_events_service_name ON log_events(service_name);
CREATE INDEX idx_log_events_level ON log_events(level);
CREATE INDEX idx_log_events_timestamp ON log_events("timestamp" DESC);
CREATE INDEX idx_log_events_trace_service ON log_events(trace_id, service_name);
CREATE INDEX idx_log_events_message ON log_events USING GIN(to_tsvector('english', message));

CREATE TABLE services (
    name VARCHAR(128) PRIMARY KEY,
    version VARCHAR(64) DEFAULT '1.0.0',
    environment VARCHAR(64) DEFAULT 'hackathon-demo',
    request_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    avg_duration_ms NUMERIC(10,2) DEFAULT 0,
    last_seen TIMESTAMPTZ,
    first_seen TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE service_dependencies (
    id SERIAL PRIMARY KEY,
    source_service VARCHAR(128) NOT NULL REFERENCES services(name),
    target_service VARCHAR(128) NOT NULL REFERENCES services(name),
    dependency_type VARCHAR(32) NOT NULL,
    request_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    avg_duration_ms NUMERIC(10,2) DEFAULT 0,
    protocol VARCHAR(32),
    UNIQUE(source_service, target_service, dependency_type)
);
CREATE INDEX idx_service_deps_source ON service_dependencies(source_service);
CREATE INDEX idx_service_deps_target ON service_dependencies(target_service);

CREATE TABLE replay_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_trace_id VARCHAR(64) NOT NULL REFERENCES traces(id),
    replay_trace_id VARCHAR(64) REFERENCES traces(id),
    status VARCHAR(16) NOT NULL DEFAULT 'pending',
    request_snapshot JSONB NOT NULL,
    overrides JSONB DEFAULT '{}',
    original_duration_ms INTEGER,
    replay_duration_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
CREATE INDEX idx_replay_sessions_original ON replay_sessions(original_trace_id);
CREATE INDEX idx_replay_sessions_status ON replay_sessions(status);
CREATE INDEX idx_replay_sessions_created ON replay_sessions(created_at DESC);

-- Powers the Request Explorer (D-04)
CREATE VIEW request_summary AS
SELECT
    t.id AS trace_id, t.method, t.path, t.status_code, t.status, t.duration_ms,
    t.root_service, t.services, t.start_time, t.created_at,
    (SELECT COUNT(*) FROM spans s WHERE s.trace_id = t.id) AS span_count,
    (SELECT COUNT(*) FROM log_events l WHERE l.trace_id = t.id) AS log_count,
    (SELECT COUNT(*) FROM log_events l WHERE l.trace_id = t.id AND l."level" = 'error') AS error_count
FROM traces t
ORDER BY t.start_time DESC;
