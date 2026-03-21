-- ============================================================
-- GuruORM vs Knex.js Benchmark Database Schema
-- E-commerce domain: users, products, orders, reviews
-- Designed for complex multi-join, aggregate, and search queries
-- ============================================================

SET client_min_messages = WARNING;

-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- for full-text search benchmarks
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ───────────────────────────────────────────────
-- Lookup / Reference Tables
-- ───────────────────────────────────────────────

CREATE TABLE countries (
  id         SERIAL PRIMARY KEY,
  code       CHAR(2)     NOT NULL UNIQUE,
  name       VARCHAR(80) NOT NULL
);

CREATE TABLE categories (
  id          SERIAL PRIMARY KEY,
  parent_id   INT         REFERENCES categories(id),
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tags (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(60) NOT NULL UNIQUE
);

-- ───────────────────────────────────────────────
-- Users & Addresses
-- ───────────────────────────────────────────────

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  uuid          UUID        NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(180) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  country_id    INT          REFERENCES countries(id),
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  role          VARCHAR(20)  NOT NULL DEFAULT 'customer'
                             CHECK (role IN ('customer','seller','admin')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_users_email        ON users(email);
CREATE INDEX idx_users_country      ON users(country_id);
CREATE INDEX idx_users_created      ON users(created_at);
CREATE INDEX idx_users_deleted      ON users(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_name_trgm    ON users USING gin(name gin_trgm_ops);

CREATE TABLE addresses (
  id           SERIAL PRIMARY KEY,
  user_id      INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  line1        VARCHAR(200) NOT NULL,
  line2        VARCHAR(200),
  city         VARCHAR(100) NOT NULL,
  state        VARCHAR(100),
  postal_code  VARCHAR(20),
  country_id   INT          REFERENCES countries(id),
  is_default   BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_addresses_user ON addresses(user_id);

-- ───────────────────────────────────────────────
-- Products
-- ───────────────────────────────────────────────

CREATE TABLE products (
  id            SERIAL PRIMARY KEY,
  seller_id     INT            NOT NULL REFERENCES users(id),
  category_id   INT            NOT NULL REFERENCES categories(id),
  name          VARCHAR(220)   NOT NULL,
  slug          VARCHAR(220)   NOT NULL UNIQUE,
  description   TEXT,
  price         NUMERIC(12,2)  NOT NULL CHECK (price >= 0),
  cost          NUMERIC(12,2)  NOT NULL DEFAULT 0,
  stock_qty     INT            NOT NULL DEFAULT 0,
  sku           VARCHAR(60)    UNIQUE,
  weight_kg     NUMERIC(8,3),
  is_active     BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_products_category   ON products(category_id);
CREATE INDEX idx_products_seller     ON products(seller_id);
CREATE INDEX idx_products_price      ON products(price);
CREATE INDEX idx_products_created    ON products(created_at);
CREATE INDEX idx_products_active     ON products(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_products_name_trgm  ON products USING gin(name gin_trgm_ops);

CREATE TABLE product_tags (
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag_id     INT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);

CREATE TABLE product_images (
  id          SERIAL PRIMARY KEY,
  product_id  INT          NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url         VARCHAR(500) NOT NULL,
  sort_order  INT          NOT NULL DEFAULT 0,
  is_primary  BOOLEAN      NOT NULL DEFAULT FALSE
);

-- ───────────────────────────────────────────────
-- Orders
-- ───────────────────────────────────────────────

CREATE TABLE orders (
  id              SERIAL PRIMARY KEY,
  user_id         INT            NOT NULL REFERENCES users(id),
  address_id      INT            REFERENCES addresses(id),
  status          VARCHAR(20)    NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending','confirmed','shipped','delivered','cancelled','refunded')),
  subtotal        NUMERIC(14,2)  NOT NULL DEFAULT 0,
  tax             NUMERIC(14,2)  NOT NULL DEFAULT 0,
  shipping_cost   NUMERIC(14,2)  NOT NULL DEFAULT 0,
  total           NUMERIC(14,2)  NOT NULL DEFAULT 0,
  currency        CHAR(3)        NOT NULL DEFAULT 'USD',
  notes           TEXT,
  placed_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  shipped_at      TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_user        ON orders(user_id);
CREATE INDEX idx_orders_status      ON orders(status);
CREATE INDEX idx_orders_placed      ON orders(placed_at);
CREATE INDEX idx_orders_total       ON orders(total);

CREATE TABLE order_items (
  id           SERIAL PRIMARY KEY,
  order_id     INT            NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   INT            NOT NULL REFERENCES products(id),
  quantity     INT            NOT NULL CHECK (quantity > 0),
  unit_price   NUMERIC(12,2)  NOT NULL,
  discount     NUMERIC(12,2)  NOT NULL DEFAULT 0,
  line_total   NUMERIC(14,2)  NOT NULL,
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order   ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- ───────────────────────────────────────────────
-- Reviews
-- ───────────────────────────────────────────────

CREATE TABLE reviews (
  id          SERIAL PRIMARY KEY,
  user_id     INT         NOT NULL REFERENCES users(id),
  product_id  INT         NOT NULL REFERENCES products(id),
  order_id    INT         REFERENCES orders(id),
  rating      SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title       VARCHAR(200),
  body        TEXT,
  is_verified BOOLEAN     NOT NULL DEFAULT FALSE,
  helpful     INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX idx_reviews_product     ON reviews(product_id);
CREATE INDEX idx_reviews_user        ON reviews(user_id);
CREATE INDEX idx_reviews_rating      ON reviews(rating);
CREATE INDEX idx_reviews_created     ON reviews(created_at);

-- ───────────────────────────────────────────────
-- Payments
-- ───────────────────────────────────────────────

CREATE TABLE payments (
  id             SERIAL PRIMARY KEY,
  order_id       INT            NOT NULL REFERENCES orders(id),
  method         VARCHAR(30)    NOT NULL,
  status         VARCHAR(20)    NOT NULL DEFAULT 'pending',
  amount         NUMERIC(14,2)  NOT NULL,
  currency       CHAR(3)        NOT NULL DEFAULT 'USD',
  transaction_id VARCHAR(120),
  paid_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_order  ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
