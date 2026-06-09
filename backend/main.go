package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

type server struct {
	db *pgxpool.Pool
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

// cors allows the Next.js frontend (different origin in Dokploy) to call the API.
func cors(next http.Handler) http.Handler {
	allowed := os.Getenv("CORS_ORIGIN")
	if allowed == "" {
		allowed = "*"
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", allowed)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func main() {
	ctx := context.Background()
	s := &server{db: connectDB(ctx)}
	defer s.db.Close()

	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok 💖"})
	})

	// auth
	mux.HandleFunc("POST /api/auth/register", s.handleRegister)
	mux.HandleFunc("POST /api/auth/login", s.handleLogin)
	mux.HandleFunc("GET /api/me", s.authMiddleware(s.handleMe))

	// products
	mux.HandleFunc("GET /api/products", s.handleListProducts)
	mux.HandleFunc("GET /api/products/{id}", s.handleGetProduct)
	mux.HandleFunc("POST /api/products", s.authMiddleware(s.handleCreateProduct))
	mux.HandleFunc("POST /api/products/{id}/buy", s.authMiddleware(s.handleBuyProduct))
	mux.HandleFunc("GET /api/orders", s.authMiddleware(s.handleMyOrders))

	// chat (buyer <-> seller)
	mux.HandleFunc("POST /api/products/{id}/chat", s.authMiddleware(s.handleStartChat))
	mux.HandleFunc("GET /api/chats", s.authMiddleware(s.handleListChats))
	mux.HandleFunc("GET /api/chats/{id}/messages", s.authMiddleware(s.handleListMessages))
	mux.HandleFunc("POST /api/chats/{id}/messages", s.authMiddleware(s.handleSendMessage))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("💖 pinky-market backend listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, cors(mux)))
}
