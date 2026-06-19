package goapp

import (
	"crypto/rand"
	"fmt"
	"math/big"
)

var androidDevices = []string{
	"23053RN02A",
	"23053RN02Y",
	"23053RN02I",
	"23053RN02L",
	"23077RABDC",
}

func GenerateAndroidUserAgent() string {
	device := androidDevices[randInt(len(androidDevices))]
	minor := 100 + randInt(51)
	patch := 10000 + randInt(5001)
	android := 11 + randInt(5)
	return fmt.Sprintf(
		"ru.hh.android/7.%d.%d, Device: %s, Android OS: %d (UUID: %s)",
		minor,
		patch,
		device,
		android,
		randomUUID(),
	)
}

func randInt(max int) int {
	if max <= 0 {
		return 0
	}
	n, err := rand.Int(rand.Reader, big.NewInt(int64(max)))
	if err != nil {
		return 0
	}
	return int(n.Int64())
}

func randomUUID() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "00000000-0000-4000-8000-000000000000"
	}
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf(
		"%08x-%04x-%04x-%04x-%012x",
		b[0:4],
		b[4:6],
		b[6:8],
		b[8:10],
		b[10:16],
	)
}
