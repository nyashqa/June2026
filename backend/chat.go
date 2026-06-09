package main

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"
)

type Chat struct {
	ID           int64     `json:"id"`
	ProductID    int64     `json:"product_id"`
	ProductTitle string    `json:"product_title"`
	BuyerID      int64     `json:"buyer_id"`
	SellerID     int64     `json:"seller_id"`
	Peer         string    `json:"peer"` // the other participant's username
	LastBody     string    `json:"last_body"`
	LastAt       time.Time `json:"last_at"`
}

type Message struct {
	ID        int64     `json:"id"`
	ChatID    int64     `json:"chat_id"`
	SenderID  int64     `json:"sender_id"`
	Sender    string    `json:"sender"`
	Body      string    `json:"body"`
	CreatedAt time.Time `json:"created_at"`
}

// chatParticipants loads buyer/seller ids of a chat and checks the user is one of them.
func (s *server) chatParticipants(r *http.Request, chatID int64) (buyerID, sellerID int64, ok bool) {
	err := s.db.QueryRow(r.Context(),
		`SELECT c.buyer_id, p.seller_id
		 FROM chats c JOIN products p ON p.id = c.product_id
		 WHERE c.id = $1`, chatID).Scan(&buyerID, &sellerID)
	if err != nil {
		return 0, 0, false
	}
	me := userIDFrom(r)
	return buyerID, sellerID, me == buyerID || me == sellerID
}

// POST /api/products/{id}/chat  (auth) — buyer opens (or reuses) a chat with the seller.
func (s *server) handleStartChat(w http.ResponseWriter, r *http.Request) {
	productID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad id")
		return
	}
	buyerID := userIDFrom(r)

	var sellerID int64
	if err := s.db.QueryRow(r.Context(),
		`SELECT seller_id FROM products WHERE id = $1`, productID).Scan(&sellerID); err != nil {
		writeError(w, http.StatusNotFound, "product not found")
		return
	}
	if sellerID == buyerID {
		writeError(w, http.StatusBadRequest, "cannot chat with yourself")
		return
	}

	var chatID int64
	err = s.db.QueryRow(r.Context(),
		`INSERT INTO chats (product_id, buyer_id) VALUES ($1, $2)
		 ON CONFLICT (product_id, buyer_id) DO UPDATE SET buyer_id = EXCLUDED.buyer_id
		 RETURNING id`, productID, buyerID).Scan(&chatID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"chat_id": chatID})
}

// GET /api/chats  (auth) — my conversations as buyer or seller, newest activity first.
func (s *server) handleListChats(w http.ResponseWriter, r *http.Request) {
	me := userIDFrom(r)
	rows, err := s.db.Query(r.Context(),
		`SELECT c.id, c.product_id, p.title, c.buyer_id, p.seller_id,
		        CASE WHEN c.buyer_id = $1 THEN su.username ELSE bu.username END AS peer,
		        COALESCE(m.body, ''), COALESCE(m.created_at, c.created_at)
		 FROM chats c
		 JOIN products p ON p.id = c.product_id
		 JOIN users bu ON bu.id = c.buyer_id
		 JOIN users su ON su.id = p.seller_id
		 LEFT JOIN LATERAL (
		     SELECT body, created_at FROM messages
		     WHERE chat_id = c.id ORDER BY id DESC LIMIT 1
		 ) m ON TRUE
		 WHERE c.buyer_id = $1 OR p.seller_id = $1
		 ORDER BY COALESCE(m.created_at, c.created_at) DESC`, me)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	chats := []Chat{}
	for rows.Next() {
		var c Chat
		if err := rows.Scan(&c.ID, &c.ProductID, &c.ProductTitle, &c.BuyerID,
			&c.SellerID, &c.Peer, &c.LastBody, &c.LastAt); err != nil {
			writeError(w, http.StatusInternalServerError, "scan error")
			return
		}
		chats = append(chats, c)
	}
	writeJSON(w, http.StatusOK, chats)
}

// GET /api/chats/{id}/messages?after=N  (auth) — messages of a chat, oldest first.
// `after` lets the frontend poll for new messages only.
func (s *server) handleListMessages(w http.ResponseWriter, r *http.Request) {
	chatID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad id")
		return
	}
	if _, _, ok := s.chatParticipants(r, chatID); !ok {
		writeError(w, http.StatusNotFound, "chat not found")
		return
	}

	after, _ := strconv.ParseInt(r.URL.Query().Get("after"), 10, 64)
	rows, err := s.db.Query(r.Context(),
		`SELECT m.id, m.chat_id, m.sender_id, u.username, m.body, m.created_at
		 FROM messages m JOIN users u ON u.id = m.sender_id
		 WHERE m.chat_id = $1 AND m.id > $2
		 ORDER BY m.id ASC LIMIT 200`, chatID, after)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	msgs := []Message{}
	for rows.Next() {
		var m Message
		if err := rows.Scan(&m.ID, &m.ChatID, &m.SenderID, &m.Sender,
			&m.Body, &m.CreatedAt); err != nil {
			writeError(w, http.StatusInternalServerError, "scan error")
			return
		}
		msgs = append(msgs, m)
	}
	writeJSON(w, http.StatusOK, msgs)
}

// POST /api/chats/{id}/messages  (auth) — send a message into a chat.
func (s *server) handleSendMessage(w http.ResponseWriter, r *http.Request) {
	chatID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad id")
		return
	}
	if _, _, ok := s.chatParticipants(r, chatID); !ok {
		writeError(w, http.StatusNotFound, "chat not found")
		return
	}

	var req struct {
		Body string `json:"body"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "bad json")
		return
	}
	req.Body = strings.TrimSpace(req.Body)
	if req.Body == "" {
		writeError(w, http.StatusBadRequest, "message is empty")
		return
	}
	if len(req.Body) > 2000 {
		writeError(w, http.StatusBadRequest, "message too long (max 2000)")
		return
	}

	var m Message
	m.ChatID = chatID
	m.SenderID = userIDFrom(r)
	m.Body = req.Body
	err = s.db.QueryRow(r.Context(),
		`INSERT INTO messages (chat_id, sender_id, body) VALUES ($1, $2, $3)
		 RETURNING id, created_at`, chatID, m.SenderID, m.Body).Scan(&m.ID, &m.CreatedAt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusCreated, m)
}
