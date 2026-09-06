-- BackendBhai — Ecommerce Database Schema
-- Source: dev1.md §6.9 (Order Service endpoints), dev4.md §6.3
-- Author: Dev 5 (Abhinav) — drafted for Dev 4 to wire into init scripts
-- Last updated: 2026-09-06
--
-- Note: Dev 4 owns this file's final version. This draft is based on
-- Dev 1's exact INSERT shape: INSERT INTO orders (user_id, items, status)

-- ─── Users ──────────────────────────────────────────────────────────

CREATE TABLE users (
    id          VARCHAR(50) PRIMARY KEY,
    email       VARCHAR(200) NOT NULL UNIQUE,
    name        VARCHAR(200) NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Products ───────────────────────────────────────────────────────

CREATE TABLE products (
    id          VARCHAR(50) PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    price       DECIMAL(10, 2) NOT NULL,
    stock       INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Orders ─────────────────────────────────────────────────────────
-- Dev 1's exact INSERT shape:
--   INSERT INTO orders (user_id, items, status)
--   VALUES ($1, $2, $3) RETURNING *

CREATE TABLE orders (
    id          VARCHAR(50) PRIMARY KEY,
    user_id     VARCHAR(50) NOT NULL REFERENCES users(id),
    items       JSONB NOT NULL,          -- Array of {id, name, qty, price}
    status      VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | paid | failed | cancelled
    total       DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- ─── Payments ───────────────────────────────────────────────────────

CREATE TABLE payments (
    id          VARCHAR(50) PRIMARY KEY,
    order_id    VARCHAR(50) NOT NULL REFERENCES orders(id),
    status      VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | completed | failed
    amount      DECIMAL(10, 2) NOT NULL,
    provider    VARCHAR(50) NOT NULL DEFAULT 'mock-payment',
    external_id VARCHAR(100),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_order_id ON payments(order_id);

-- ─── Seed Data ──────────────────────────────────────────────────────

INSERT INTO users (id, email, name) VALUES
    ('user-42', 'user42@example.com', 'Jane Smith'),
    ('user-99', 'user99@example.com', 'John Doe');

INSERT INTO products (id, name, price, stock) VALUES
    ('item-1', 'Wireless Mouse', 29.99, 100),
    ('item-2', 'Mechanical Keyboard', 89.99, 50),
    ('item-3', 'USB-C Hub', 49.99, 75),
    ('item-4', 'Monitor Stand', 39.99, 60),
    ('item-5', 'Webcam HD', 59.99, 40);
