package goapp

import (
	"strings"
	"testing"
)

func TestGenerateAndroidUserAgent(t *testing.T) {
	ua := GenerateAndroidUserAgent()
	for _, part := range []string{
		"ru.hh.android/7.",
		"Device:",
		"Android OS:",
		"UUID:",
	} {
		if !strings.Contains(ua, part) {
			t.Fatalf("user-agent %q does not contain %q", ua, part)
		}
	}
}
