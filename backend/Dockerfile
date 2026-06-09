# --- build stage ---
FROM golang:1.23-alpine AS build
WORKDIR /app
COPY go.mod ./
COPY *.go ./
# go.sum is generated at build time so the repo stays clean without a local Go toolchain
RUN go mod tidy && CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /server .

# --- run stage ---
FROM alpine:3.20
RUN apk add --no-cache ca-certificates
COPY --from=build /server /server
EXPOSE 8080
ENTRYPOINT ["/server"]
