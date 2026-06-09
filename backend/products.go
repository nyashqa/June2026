package main

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"
)

type Product struct {
	ID          int64     `json:"id"`
	SellerID    int64     `json:"seller_id"`
	Seller      string    `json:"seller"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	PriceCents  int64     `json:"price_cents"`
	Currency    string    `json:"currency"`
	SizeLabel   string    `json:"size_label"`
	Color       string    `json:"color"`
	DaysWorn    int       `json:"days_worn"`
	ImageURL    string    `json:"image_url"`
	IsSold      bool      `json:"is_sold"`
	CreatedAt   time.Time `json:"created_at"`
}

const productCols = `p.id, p.seller_id, u.username, p.title, p.description, p.price_cents,
	p.currency, p.size_label, p.color, p.days_worn, p.image_url, p.is_sold, p.created_at`

// GET /api/products
func (s *server) handleListProducts(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(r.Context(),
		`SELECT `+productCols+`
		 FROM products p JOIN users u ON u.id = p.seller_id
		 ORDER BY p.created_at DESC LIMIT 100`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	products := []Product{}
	for rows.Next() {
		var p Product
		if err := rows.Scan(&p.ID, &p.SellerID, &p.Seller, &p.Title, &p.Description,
			&p.PriceCents, &p.Currency, &p.SizeLabel, &p.Color, &p.DaysWorn,
			&p.ImageURL, &p.IsSold, &p.CreatedAt); err != nil {
			writeError(w, http.StatusInternalServerError, "scan error")
			return
		}
		products = append(products, p)
	}
	writeJSON(w, http.StatusOK, products)
}

// GET /api/products/{id}
func (s *server) handleGetProduct(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad id")
		return
	}
	var p Product
	err = s.db.QueryRow(r.Context(),
		`SELECT `+productCols+`
		 FROM products p JOIN users u ON u.id = p.seller_id WHERE p.id = $1`, id).
		Scan(&p.ID, &p.SellerID, &p.Seller, &p.Title, &p.Description,
			&p.PriceCents, &p.Currency, &p.SizeLabel, &p.Color, &p.DaysWorn,
			&p.ImageURL, &p.IsSold, &p.CreatedAt)
	if err != nil {
		writeError(w, http.StatusNotFound, "product not found")
		return
	}
	writeJSON(w, http.StatusOK, p)
}

// POST /api/products  (auth)
func (s *server) handleCreateProduct(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Title       string `json:"title"`
		Description string `json:"description"`
		PriceCents  int64  `json:"price_cents"`
		Currency    string `json:"currency"`
		SizeLabel   string `json:"size_label"`
		Color       string `json:"color"`
		DaysWorn    int    `json:"days_worn"`
		ImageURL    string `json:"image_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "bad json")
		return
	}
	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" {
		writeError(w, http.StatusBadRequest, "title is required")
		return
	}
	if req.PriceCents <= 0 {
		writeError(w, http.StatusBadRequest, "price must be positive")
		return
	}
	if req.Currency == "" {
		req.Currency = "RUB"
	}
	if req.DaysWorn <= 0 {
		req.DaysWorn = 1
	}

	var id int64
	err := s.db.QueryRow(r.Context(),
		`INSERT INTO products (seller_id, title, description, price_cents, currency,
		                       size_label, color, days_worn, image_url)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
		userIDFrom(r), req.Title, req.Description, req.PriceCents, req.Currency,
		req.SizeLabel, req.Color, req.DaysWorn, req.ImageURL).Scan(&id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"id": id})
}

// POST /api/products/{id}/buy  (auth) — creates an order and marks the item sold.
func (s *server) handleBuyProduct(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad id")
		return
	}
	buyerID := userIDFrom(r)

	tx, err := s.db.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db error")
		return
	}
	defer tx.Rollback(r.Context())

	var sellerID int64
	var sold bool
	err = tx.QueryRow(r.Context(),
		`SELECT seller_id, is_sold FROM products WHERE id = $1 FOR UPDATE`, id).
		Scan(&sellerID, &sold)
	if err != nil {
		writeError(w, http.StatusNotFound, "product not found")
		return
	}
	if sold {
		writeError(w, http.StatusConflict, "already sold, sorry babe 💔")
		return
	}
	if sellerID == buyerID {
		writeError(w, http.StatusBadRequest, "cannot buy your own listing")
		return
	}

	var orderID int64
	if err := tx.QueryRow(r.Context(),
		`INSERT INTO orders (product_id, buyer_id) VALUES ($1, $2) RETURNING id`,
		id, buyerID).Scan(&orderID); err != nil {
		writeError(w, http.StatusInternalServerError, "db error")
		return
	}
	if _, err := tx.Exec(r.Context(),
		`UPDATE products SET is_sold = TRUE WHERE id = $1`, id); err != nil {
		writeError(w, http.StatusInternalServerError, "db error")
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"order_id": orderID, "status": "new"})
}

// GET /api/orders  (auth) — current user's purchases.
func (s *server) handleMyOrders(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(r.Context(),
		`SELECT o.id, o.status, o.created_at, p.id, p.title, p.price_cents, p.currency
		 FROM orders o JOIN products p ON p.id = o.product_id
		 WHERE o.buyer_id = $1 ORDER BY o.created_at DESC`, userIDFrom(r))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	type order struct {
		ID         int64     `json:"id"`
		Status     string    `json:"status"`
		CreatedAt  time.Time `json:"created_at"`
		ProductID  int64     `json:"product_id"`
		Title      string    `json:"title"`
		PriceCents int64     `json:"price_cents"`
		Currency   string    `json:"currency"`
	}
	orders := []order{}
	for rows.Next() {
		var o order
		if err := rows.Scan(&o.ID, &o.Status, &o.CreatedAt, &o.ProductID,
			&o.Title, &o.PriceCents, &o.Currency); err != nil {
			writeError(w, http.StatusInternalServerError, "scan error")
			return
		}
		orders = append(orders, o)
	}
	writeJSON(w, http.StatusOK, orders)
}
