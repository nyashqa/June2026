package main

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type ctxKey string

const userIDKey ctxKey = "userID"

func jwtSecret() []byte {
	s := os.Getenv("JWT_SECRET")
	if s == "" {
		s = "dev-secret-change-me"
	}
	return []byte(s)
}

// --- anonymous credential generation: cute Y2K-style nicknames ---

var nickAdjectives = []string{
	"glitter", "pinky", "candy", "bubble", "sparkle", "velvet",
	"cherry", "sugar", "dreamy", "neon", "fluffy", "lacy",
}

var nickNouns = []string{
	"kitten", "barbie", "angel", "doll", "fairy", "star",
	"princess", "bunny", "cupcake", "vixen", "rose", "heart",
}

func randomPick(list []string) string {
	n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(list))))
	return list[n.Int64()]
}

func randomDigits(n int) string {
	const digits = "0123456789"
	b := make([]byte, n)
	for i := range b {
		x, _ := rand.Int(rand.Reader, big.NewInt(10))
		b[i] = digits[x.Int64()]
	}
	return string(b)
}

func randomPassword(n int) string {
	const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := make([]byte, n)
	for i := range b {
		x, _ := rand.Int(rand.Reader, big.NewInt(int64(len(chars))))
		b[i] = chars[x.Int64()]
	}
	return string(b)
}

func generateNickname() string {
	return fmt.Sprintf("%s_%s_%s", randomPick(nickAdjectives), randomPick(nickNouns), randomDigits(4))
}

func makeToken(userID int64) (string, error) {
	claims := jwt.MapClaims{
		"sub": fmt.Sprintf("%d", userID),
		"exp": time.Now().Add(30 * 24 * time.Hour).Unix(),
		"iat": time.Now().Unix(),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(jwtSecret())
}

func parseToken(tokenStr string) (int64, error) {
	tok, err := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return jwtSecret(), nil
	})
	if err != nil || !tok.Valid {
		return 0, errors.New("invalid token")
	}
	claims, ok := tok.Claims.(jwt.MapClaims)
	if !ok {
		return 0, errors.New("invalid claims")
	}
	sub, _ := claims["sub"].(string)
	var id int64
	if _, err := fmt.Sscanf(sub, "%d", &id); err != nil {
		return 0, errors.New("invalid subject")
	}
	return id, nil
}

// authMiddleware requires a Bearer token and puts the user id into the context.
func (s *server) authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		h := r.Header.Get("Authorization")
		if !strings.HasPrefix(h, "Bearer ") {
			writeError(w, http.StatusUnauthorized, "missing token")
			return
		}
		id, err := parseToken(strings.TrimPrefix(h, "Bearer "))
		if err != nil {
			writeError(w, http.StatusUnauthorized, "invalid token")
			return
		}
		next(w, r.WithContext(context.WithValue(r.Context(), userIDKey, id)))
	}
}

func userIDFrom(r *http.Request) int64 {
	id, _ := r.Context().Value(userIDKey).(int64)
	return id
}

// POST /api/auth/register — anonymous one-click registration.
// No email, no phone. Optionally accepts {"username": "..."}; otherwise
// generates a cute nickname + password and returns them once.
func (s *server) handleRegister(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req) // empty body is fine

	username := strings.TrimSpace(req.Username)
	generated := false
	if username == "" {
		username = generateNickname()
		generated = true
	}
	if len(username) > 32 {
		writeError(w, http.StatusBadRequest, "username too long (max 32)")
		return
	}

	password := req.Password
	if password == "" {
		password = randomPassword(12)
		generated = true
	}
	if len(password) < 6 {
		writeError(w, http.StatusBadRequest, "password too short (min 6)")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "hash error")
		return
	}

	var id int64
	for attempt := 0; ; attempt++ {
		err = s.db.QueryRow(r.Context(),
			`INSERT INTO users (username, pass_hash) VALUES ($1, $2) RETURNING id`,
			username, string(hash)).Scan(&id)
		if err == nil {
			break
		}
		// collision on a generated nickname → just roll a new one
		if generated && attempt < 5 && strings.Contains(err.Error(), "duplicate") {
			username = generateNickname()
			continue
		}
		writeError(w, http.StatusConflict, "username already taken")
		return
	}

	token, err := makeToken(id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "token error")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"token":    token,
		"username": username,
		// returned exactly once so the anonymous user can save it
		"password": password,
	})
}

// POST /api/auth/login
func (s *server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "bad json")
		return
	}

	var id int64
	var hash string
	err := s.db.QueryRow(r.Context(),
		`SELECT id, pass_hash FROM users WHERE username = $1`, req.Username).Scan(&id, &hash)
	if err != nil || bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.Password)) != nil {
		writeError(w, http.StatusUnauthorized, "wrong username or password")
		return
	}

	token, err := makeToken(id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "token error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"token": token, "username": req.Username})
}

// GET /api/me
func (s *server) handleMe(w http.ResponseWriter, r *http.Request) {
	var username string
	var createdAt time.Time
	err := s.db.QueryRow(r.Context(),
		`SELECT username, created_at FROM users WHERE id = $1`, userIDFrom(r)).
		Scan(&username, &createdAt)
	if err != nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"id":         userIDFrom(r),
		"username":   username,
		"created_at": createdAt,
	})
}
