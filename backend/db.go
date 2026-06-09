package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

const schema = `
CREATE TABLE IF NOT EXISTS users (
	id           BIGSERIAL PRIMARY KEY,
	username     TEXT UNIQUE NOT NULL,
	pass_hash    TEXT NOT NULL,
	created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
	id           BIGSERIAL PRIMARY KEY,
	seller_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	title        TEXT NOT NULL,
	description  TEXT NOT NULL DEFAULT '',
	price_cents  BIGINT NOT NULL CHECK (price_cents >= 0),
	currency     TEXT NOT NULL DEFAULT 'RUB',
	size_label   TEXT NOT NULL DEFAULT '',
	color        TEXT NOT NULL DEFAULT '',
	days_worn    INT  NOT NULL DEFAULT 1,
	image_url    TEXT NOT NULL DEFAULT '',
	is_sold      BOOLEAN NOT NULL DEFAULT FALSE,
	created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
	id           BIGSERIAL PRIMARY KEY,
	product_id   BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
	buyer_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	status       TEXT NOT NULL DEFAULT 'new',
	created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chats (
	id           BIGSERIAL PRIMARY KEY,
	product_id   BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
	buyer_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
	UNIQUE (product_id, buyer_id)
);

CREATE TABLE IF NOT EXISTS messages (
	id           BIGSERIAL PRIMARY KEY,
	chat_id      BIGINT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
	sender_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	body         TEXT NOT NULL,
	created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_created ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_chats_buyer ON chats(buyer_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id, id);
`

func connectDB(ctx context.Context) *pgxpool.Pool {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://pinky:pinky@localhost:5432/pinky?sslmode=disable"
	}

	var pool *pgxpool.Pool
	var err error
	// retry: postgres in docker may start slower than the app
	for i := 0; i < 30; i++ {
		pool, err = pgxpool.New(ctx, dsn)
		if err == nil {
			if err = pool.Ping(ctx); err == nil {
				break
			}
		}
		log.Printf("waiting for postgres (%d/30): %v", i+1, err)
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		log.Fatalf("could not connect to postgres: %v", err)
	}

	if _, err := pool.Exec(ctx, schema); err != nil {
		log.Fatalf("migration failed: %v", err)
	}
	log.Println("database ready")
	return pool
}
