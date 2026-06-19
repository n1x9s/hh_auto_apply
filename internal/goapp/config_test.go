package goapp

import (
	"path/filepath"
	"testing"
)

func TestConfigTokenRoundTrip(t *testing.T) {
	profileDir := t.TempDir()
	cfg, err := LoadConfig(profileDir)
	if err != nil {
		t.Fatal(err)
	}

	want := Token{
		AccessToken:     "USER-access",
		RefreshToken:    "refresh",
		AccessExpiresAt: 1234567890,
	}
	if err := cfg.SaveToken(want); err != nil {
		t.Fatal(err)
	}

	loaded, err := LoadConfig(profileDir)
	if err != nil {
		t.Fatal(err)
	}
	if got := loaded.Token(); got != want {
		t.Fatalf("token mismatch: got %#v, want %#v", got, want)
	}
	if loaded.Path() != filepath.Join(profileDir, defaultConfigFile) {
		t.Fatalf("unexpected config path: %s", loaded.Path())
	}
}

func TestResolveProfileDir(t *testing.T) {
	base := t.TempDir()
	got, err := ResolveProfileDir(base, "work")
	if err != nil {
		t.Fatal(err)
	}
	if got != filepath.Join(base, "work") {
		t.Fatalf("profile path mismatch: %s", got)
	}
}
