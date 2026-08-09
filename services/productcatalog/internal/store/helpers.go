package store

import (
	"crypto/rand"
	"encoding/hex"
	"time"
)

func nowUnix() int64 { return time.Now().Unix() }

func newID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return "prod_" + hex.EncodeToString(b)
}
