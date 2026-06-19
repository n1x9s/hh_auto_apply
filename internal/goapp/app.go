package goapp

import (
	"context"
	"flag"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

type App struct {
	ProfileDir string
	Config     *Config
	API        *APIClient
}

type globalOptions struct {
	configDir             string
	profileID             string
	delaySeconds          float64
	userAgent             string
	proxyURL              string
	insecureSkipTLSVerify bool
}

func Run(ctx context.Context, args []string) error {
	opts, rest, err := parseGlobalFlags(args)
	if err != nil {
		return err
	}
	if len(rest) == 0 {
		printUsage()
		return nil
	}

	app, err := NewApp(opts)
	if err != nil {
		return err
	}

	switch rest[0] {
	case "serve", "web", "server":
		return app.commandServe(ctx, rest[1:])
	case "daemon", "cron":
		return app.commandDaemon(ctx, rest[1:])
	case "auth-url":
		fmt.Println(app.API.AuthorizeURL())
		return nil
	case "auth-code":
		return app.commandAuthCode(ctx, rest[1:])
	case "refresh-token", "refresh":
		return app.commandRefreshToken(ctx)
	case "whoami", "me":
		return app.commandWhoAmI(ctx)
	case "list-resumes", "resumes":
		return app.commandListResumes(ctx)
	case "update-resumes", "update":
		return app.commandUpdateResumes(ctx)
	case "call-api":
		return app.commandCallAPI(ctx, rest[1:])
	case "apply-similar", "apply":
		return app.commandApplySimilar(ctx, rest[1:])
	case "init-storage":
		return app.commandInitStorage()
	case "help", "-h", "--help":
		printUsage()
		return nil
	default:
		return fmt.Errorf("unknown command %q", rest[0])
	}
}

func NewApp(opts globalOptions) (*App, error) {
	profileDir, err := ResolveProfileDir(opts.configDir, opts.profileID)
	if err != nil {
		return nil, err
	}
	cfg, err := LoadConfig(profileDir)
	if err != nil {
		return nil, err
	}

	token := cfg.Token()
	delay := time.Duration(opts.delaySeconds * float64(time.Second))
	if delay <= 0 {
		delay = time.Duration(cfg.GetFloat("api_delay") * float64(time.Second))
	}
	userAgent := firstNonEmpty(opts.userAgent, cfg.GetString("user_agent"))
	proxyURL := firstNonEmpty(opts.proxyURL, cfg.GetString("proxy_url"))
	insecure := opts.insecureSkipTLSVerify ||
		cfg.GetBool("insecure_skip_tls_verify") ||
		truthy(os.Getenv("HH_INSECURE_SKIP_TLS_VERIFY"))

	api, err := NewAPIClient(ClientOptions{
		ClientID:              cfg.GetString("client_id"),
		ClientSecret:          cfg.GetString("client_secret"),
		UserAgent:             userAgent,
		AccessToken:           token.AccessToken,
		RefreshToken:          token.RefreshToken,
		AccessExpiresAt:       token.AccessExpiresAt,
		Delay:                 delay,
		ProxyURL:              proxyURL,
		InsecureSkipTLSVerify: insecure,
	})
	if err != nil {
		return nil, err
	}

	return &App{
		ProfileDir: profileDir,
		Config:     cfg,
		API:        api,
	}, nil
}

func parseGlobalFlags(args []string) (globalOptions, []string, error) {
	var opts globalOptions
	fs := flag.NewFlagSet("hh-applicant-tool-go", flag.ContinueOnError)
	fs.SetOutput(os.Stderr)
	fs.StringVar(&opts.configDir, "config-dir", "", "path to config directory")
	fs.StringVar(&opts.configDir, "config", "", "path to config directory")
	fs.StringVar(&opts.profileID, "profile-id", "", "profile subdirectory")
	fs.StringVar(&opts.profileID, "profile", "", "profile subdirectory")
	fs.Float64Var(&opts.delaySeconds, "api-delay", 0, "HH API delay in seconds")
	fs.Float64Var(&opts.delaySeconds, "delay", 0, "HH API delay in seconds")
	fs.StringVar(&opts.userAgent, "user-agent", "", "user-agent for HH requests")
	fs.StringVar(&opts.proxyURL, "proxy-url", "", "proxy URL for requests")
	fs.BoolVar(&opts.insecureSkipTLSVerify, "insecure-skip-tls-verify", false, "disable TLS certificate verification")

	if err := fs.Parse(args); err != nil {
		return opts, nil, err
	}
	return opts, fs.Args(), nil
}

func printUsage() {
	fmt.Print(`hh-applicant-tool-go

Usage:
  hh-applicant-tool-go [global flags] <command> [command flags]

Global flags:
  --config-dir PATH
  --profile-id NAME
  --api-delay SECONDS
  --user-agent VALUE
  --proxy-url URL
  --insecure-skip-tls-verify

Commands:
  serve                    Run Go web API and built-in HTML UI
  daemon                   Run periodic refresh/update/apply loop
  auth-url                 Print OAuth URL for manual authorization
  auth-code --code CODE     Exchange OAuth code and save token
  refresh-token            Refresh access token and save config
  whoami                   Print current HH user
  list-resumes             Print resumes
  update-resumes           Publish/update all resumes
  call-api METHOD ENDPOINT [key=value...]
  apply-similar [flags]    Apply to similar vacancies
  init-storage             Write schema.sql copy next to the profile database
`)
}

func (a *App) saveTokenIfChanged(before Token) error {
	after := a.API.Token()
	if before == after {
		return nil
	}
	return a.Config.SaveToken(after)
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

func parseParams(args []string) (url.Values, error) {
	values := url.Values{}
	for _, arg := range args {
		key, value, ok := strings.Cut(arg, "=")
		if !ok || key == "" {
			return nil, fmt.Errorf("expected key=value, got %q", arg)
		}
		values.Add(key, value)
	}
	return values, nil
}

func asString(m map[string]any, key string) string {
	return stringFromAny(m[key])
}

func asBool(m map[string]any, key string) bool {
	v, _ := m[key]
	switch x := v.(type) {
	case bool:
		return x
	case string:
		return truthy(x)
	default:
		return false
	}
}

func asItems(m map[string]any) []map[string]any {
	raw, _ := m["items"].([]any)
	items := make([]map[string]any, 0, len(raw))
	for _, item := range raw {
		if obj, ok := item.(map[string]any); ok {
			items = append(items, obj)
		}
	}
	return items
}

func asPages(m map[string]any) int {
	n := int64FromAny(m["pages"])
	if n <= 0 {
		return 0
	}
	return int(n)
}

func quote(value string) string {
	if value == "" {
		return "-"
	}
	return strconv.Quote(value)
}

func profileDBPath(profileDir string) string {
	return filepath.Join(profileDir, defaultDBFile)
}
