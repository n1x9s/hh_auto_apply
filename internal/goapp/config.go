package goapp

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
)

const (
	defaultConfigFile = "config.json"
	defaultDBFile     = "data"
)

type Config struct {
	path string
	data map[string]any
}

type Token struct {
	AccessToken     string `json:"access_token"`
	RefreshToken    string `json:"refresh_token"`
	AccessExpiresAt int64  `json:"access_expires_at"`
}

func DefaultConfigDir() (string, error) {
	if v := os.Getenv("CONFIG_DIR"); v != "" {
		return v, nil
	}

	switch runtime.GOOS {
	case "darwin":
		home, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		return filepath.Join(home, "Library", "Application Support", "hh-applicant-tool"), nil
	case "windows":
		if v := os.Getenv("APPDATA"); v != "" {
			return filepath.Join(v, "hh-applicant-tool"), nil
		}
	}

	base, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(base, "hh-applicant-tool"), nil
}

func ResolveProfileDir(configDir, profileID string) (string, error) {
	if configDir == "" {
		var err error
		configDir, err = DefaultConfigDir()
		if err != nil {
			return "", err
		}
	}
	if profileID == "" {
		profileID = os.Getenv("HH_PROFILE_ID")
	}
	if profileID == "" || profileID == "." {
		return filepath.Clean(configDir), nil
	}
	return filepath.Join(configDir, profileID), nil
}

func LoadConfig(profileDir string) (*Config, error) {
	cfg := &Config{
		path: filepath.Join(profileDir, defaultConfigFile),
		data: map[string]any{},
	}

	raw, err := os.ReadFile(cfg.path)
	if errors.Is(err, os.ErrNotExist) {
		return cfg, nil
	}
	if err != nil {
		return nil, err
	}
	if len(strings.TrimSpace(string(raw))) == 0 {
		return cfg, nil
	}
	if err := json.Unmarshal(raw, &cfg.data); err != nil {
		return nil, fmt.Errorf("read config %s: %w", cfg.path, err)
	}
	return cfg, nil
}

func (c *Config) Path() string {
	return c.path
}

func (c *Config) Save() error {
	if err := os.MkdirAll(filepath.Dir(c.path), 0o700); err != nil {
		return err
	}
	raw, err := json.MarshalIndent(c.data, "", "  ")
	if err != nil {
		return err
	}
	raw = append(raw, '\n')
	return os.WriteFile(c.path, raw, 0o600)
}

func (c *Config) GetString(key string) string {
	v, _ := c.data[key]
	switch x := v.(type) {
	case string:
		return x
	case fmt.Stringer:
		return x.String()
	default:
		return ""
	}
}

func (c *Config) GetFloat(key string) float64 {
	v, _ := c.data[key]
	switch x := v.(type) {
	case float64:
		return x
	case float32:
		return float64(x)
	case int:
		return float64(x)
	case int64:
		return float64(x)
	case json.Number:
		n, _ := x.Float64()
		return n
	case string:
		n, _ := strconv.ParseFloat(x, 64)
		return n
	default:
		return 0
	}
}

func (c *Config) GetBool(key string) bool {
	v, _ := c.data[key]
	switch x := v.(type) {
	case bool:
		return x
	case string:
		return truthy(x)
	default:
		return false
	}
}

func (c *Config) Set(key string, value any) {
	c.data[key] = value
}

func (c *Config) Token() Token {
	raw, ok := c.data["token"].(map[string]any)
	if !ok {
		return Token{}
	}
	return Token{
		AccessToken:     stringFromAny(raw["access_token"]),
		RefreshToken:    stringFromAny(raw["refresh_token"]),
		AccessExpiresAt: int64FromAny(raw["access_expires_at"]),
	}
}

func (c *Config) SaveToken(token Token) error {
	c.data["token"] = map[string]any{
		"access_token":      token.AccessToken,
		"refresh_token":     token.RefreshToken,
		"access_expires_at": token.AccessExpiresAt,
	}
	return c.Save()
}

func stringFromAny(v any) string {
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}

func int64FromAny(v any) int64 {
	switch x := v.(type) {
	case int:
		return int64(x)
	case int64:
		return x
	case float64:
		return int64(x)
	case json.Number:
		n, _ := x.Int64()
		return n
	case string:
		n, _ := strconv.ParseInt(x, 10, 64)
		return n
	default:
		return 0
	}
}

func truthy(value string) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "1", "true", "yes", "on":
		return true
	default:
		return false
	}
}
