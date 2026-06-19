package goapp

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

type webServer struct {
	app       *App
	staticDir string
}

func (a *App) commandServe(ctx context.Context, args []string) error {
	fs := flag.NewFlagSet("serve", flag.ContinueOnError)
	fs.SetOutput(os.Stderr)
	host := fs.String("host", "127.0.0.1", "host to bind")
	fs.StringVar(host, "H", "127.0.0.1", "host to bind")
	port := fs.Int("port", 8080, "port to listen")
	fs.IntVar(port, "p", 8080, "port to listen")
	staticDir := fs.String("static-dir", "", "optional static directory")
	if err := fs.Parse(args); err != nil {
		return err
	}
	if *staticDir == "" {
		*staticDir = defaultStaticDir()
	}

	srv := &http.Server{
		Addr:              net.JoinHostPort(*host, strconv.Itoa(*port)),
		Handler:           (&webServer{app: a, staticDir: *staticDir}).routes(),
		ReadHeaderTimeout: 10 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		fmt.Println("Starting Go web server at http://" + srv.Addr)
		errCh <- srv.ListenAndServe()
	}()

	select {
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := srv.Shutdown(shutdownCtx); err != nil {
			return err
		}
		return nil
	case err := <-errCh:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return err
	}
}

func defaultStaticDir() string {
	candidates := []string{
		filepath.Join("web", "static"),
		"static",
	}
	for _, candidate := range candidates {
		if st, err := os.Stat(filepath.Join(candidate, "index.html")); err == nil && !st.IsDir() {
			return candidate
		}
	}
	return ""
}

func (s *webServer) routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/", s.handleAPI)
	mux.HandleFunc("/", s.handleStatic)
	return logRequests(mux)
}

func (s *webServer) handleAPI(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api")
	if path == "" {
		path = "/"
	}

	switch {
	case path == "/auth/status" && r.Method == http.MethodGet:
		s.authStatus(w, r)
	case path == "/auth/me" && r.Method == http.MethodGet:
		s.proxyGET(w, r, "/me")
	case path == "/auth/refresh" && r.Method == http.MethodPost:
		s.authRefresh(w, r)
	case path == "/resumes" && r.Method == http.MethodGet:
		s.listResumes(w, r)
	case path == "/resumes/publish-all" && r.Method == http.MethodPost:
		s.publishAllResumes(w, r)
	case strings.HasPrefix(path, "/resumes/") && strings.HasSuffix(path, "/publish") && r.Method == http.MethodPost:
		resumeID := strings.TrimSuffix(strings.TrimPrefix(path, "/resumes/"), "/publish")
		s.publishResume(w, r, resumeID)
	case path == "/vacancies/search" && r.Method == http.MethodGet:
		s.proxyPaginatedGET(w, r, "/vacancies")
	case strings.HasPrefix(path, "/vacancies/similar/") && r.Method == http.MethodGet:
		resumeID := strings.TrimPrefix(path, "/vacancies/similar/")
		s.proxyPaginatedGET(w, r, "/resumes/"+resumeID+"/similar_vacancies")
	case path == "/vacancies/apply-batch" && r.Method == http.MethodPost:
		s.applyBatch(w, r)
	case path == "/vacancies/auto-apply" && r.Method == http.MethodPost:
		s.autoApply(w, r)
	case strings.HasPrefix(path, "/vacancies/") && strings.HasSuffix(path, "/apply") && r.Method == http.MethodPost:
		vacancyID := strings.TrimSuffix(strings.TrimPrefix(path, "/vacancies/"), "/apply")
		s.applyVacancy(w, r, vacancyID)
	case strings.HasPrefix(path, "/vacancies/") && r.Method == http.MethodGet:
		s.proxyGET(w, r, "/vacancies/"+strings.TrimPrefix(path, "/vacancies/"))
	case path == "/negotiations" && r.Method == http.MethodGet:
		s.proxyPaginatedGET(w, r, "/negotiations")
	case strings.HasPrefix(path, "/negotiations/") && strings.HasSuffix(path, "/messages") && r.Method == http.MethodGet:
		id := strings.TrimSuffix(strings.TrimPrefix(path, "/negotiations/"), "/messages")
		s.getMessages(w, r, id)
	case strings.HasPrefix(path, "/negotiations/") && strings.HasSuffix(path, "/messages") && r.Method == http.MethodPost:
		id := strings.TrimSuffix(strings.TrimPrefix(path, "/negotiations/"), "/messages")
		s.sendMessage(w, r, id)
	case strings.HasPrefix(path, "/negotiations/") && r.Method == http.MethodDelete:
		s.deleteNegotiation(w, r, strings.TrimPrefix(path, "/negotiations/"))
	case strings.HasPrefix(path, "/negotiations/") && r.Method == http.MethodGet:
		s.proxyGET(w, r, "/negotiations/"+strings.TrimPrefix(path, "/negotiations/"))
	case path == "/employers" && r.Method == http.MethodGet:
		s.listEmployers(w, r)
	case path == "/employers/blacklist" && r.Method == http.MethodPost:
		s.addBlacklist(w, r)
	case strings.HasPrefix(path, "/employers/blacklist/") && r.Method == http.MethodDelete:
		s.removeBlacklist(w, r, strings.TrimPrefix(path, "/employers/blacklist/"))
	case strings.HasPrefix(path, "/employers/") && r.Method == http.MethodGet:
		s.proxyGET(w, r, "/employers/"+strings.TrimPrefix(path, "/employers/"))
	case path == "/contacts" && r.Method == http.MethodGet:
		s.emptyPaginated(w, r)
	case path == "/contacts/export" && r.Method == http.MethodGet:
		s.exportContacts(w, r)
	case path == "/settings" && r.Method == http.MethodGet:
		s.listSettings(w, r)
	case strings.HasPrefix(path, "/settings/") && r.Method == http.MethodGet:
		s.getSetting(w, r, strings.TrimPrefix(path, "/settings/"))
	case strings.HasPrefix(path, "/settings/") && r.Method == http.MethodPut:
		s.putSetting(w, r, strings.TrimPrefix(path, "/settings/"))
	case strings.HasPrefix(path, "/settings/") && r.Method == http.MethodDelete:
		s.deleteSetting(w, r, strings.TrimPrefix(path, "/settings/"))
	case path == "/config" && r.Method == http.MethodGet:
		s.getConfig(w, r)
	case strings.HasPrefix(path, "/config/") && r.Method == http.MethodGet:
		s.getConfigItem(w, r, strings.TrimPrefix(path, "/config/"))
	case strings.HasPrefix(path, "/config/") && r.Method == http.MethodPut:
		s.putConfigItem(w, r, strings.TrimPrefix(path, "/config/"))
	case strings.HasPrefix(path, "/config/") && r.Method == http.MethodDelete:
		s.deleteConfigItem(w, r, strings.TrimPrefix(path, "/config/"))
	case path == "/stats/dashboard" && r.Method == http.MethodGet:
		s.dashboardStats(w, r)
	case path == "/stats/overview" && r.Method == http.MethodGet:
		s.statsOverview(w, r)
	case path == "/stats/negotiations-by-state" && r.Method == http.MethodGet:
		writeJSON(w, http.StatusOK, map[string]any{"states": map[string]int{}})
	default:
		writeError(w, http.StatusNotFound, "not found")
	}
}

func (s *webServer) handleStatic(w http.ResponseWriter, r *http.Request) {
	if s.staticDir == "" {
		s.handleBuiltinUI(w, r)
		return
	}
	if st, err := os.Stat(filepath.Join(s.staticDir, "index.html")); err != nil || st.IsDir() {
		s.handleBuiltinUI(w, r)
		return
	}

	cleanPath := filepath.Clean(strings.TrimPrefix(r.URL.Path, "/"))
	if cleanPath == "." {
		cleanPath = "index.html"
	}
	filePath := filepath.Join(s.staticDir, cleanPath)
	if !strings.HasPrefix(filePath, filepath.Clean(s.staticDir)+string(os.PathSeparator)) && filepath.Clean(filePath) != filepath.Join(filepath.Clean(s.staticDir), "index.html") {
		writeError(w, http.StatusBadRequest, "bad static path")
		return
	}
	if st, err := os.Stat(filePath); err == nil && !st.IsDir() {
		http.ServeFile(w, r, filePath)
		return
	}
	http.ServeFile(w, r, filepath.Join(s.staticDir, "index.html"))
}

func (s *webServer) handleBuiltinUI(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("content-type", "text/html; charset=utf-8")
	_, _ = w.Write([]byte(`<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>HH Applicant Tool</title>
  <style>
    :root { color-scheme: light dark; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: Canvas; color: CanvasText; }
    main { max-width: 920px; margin: 0 auto; padding: 40px 20px; }
    h1 { font-size: 28px; margin: 0 0 8px; }
    p { color: color-mix(in srgb, CanvasText 72%, transparent); line-height: 1.55; }
    code, pre { background: color-mix(in srgb, CanvasText 8%, transparent); border-radius: 8px; }
    code { padding: 2px 6px; }
    pre { overflow: auto; padding: 14px; }
    section { border-top: 1px solid color-mix(in srgb, CanvasText 18%, transparent); padding: 22px 0; }
    a { color: LinkText; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
    .card { border: 1px solid color-mix(in srgb, CanvasText 18%, transparent); border-radius: 8px; padding: 14px; }
  </style>
</head>
<body>
  <main>
    <h1>HH Applicant Tool</h1>
    <p>Go runtime is running. Use the API links below or the CLI for authorization and automation.</p>

    <section>
      <h2>Auth</h2>
      <pre>hh-applicant-tool-go auth-url
hh-applicant-tool-go auth-code --code &lt;oauth-code&gt;</pre>
    </section>

    <section>
      <h2>API</h2>
      <div class="grid">
        <a class="card" href="/api/auth/status">Auth status</a>
        <a class="card" href="/api/auth/me">Current user</a>
        <a class="card" href="/api/resumes">Resumes</a>
        <a class="card" href="/api/stats/dashboard">Dashboard stats</a>
        <a class="card" href="/api/contacts">Contacts</a>
        <a class="card" href="/api/settings">Settings</a>
      </div>
    </section>

    <section>
      <h2>CLI</h2>
      <pre>hh-applicant-tool-go daemon
hh-applicant-tool-go update-resumes
hh-applicant-tool-go apply-similar --dry-run --search golang</pre>
    </section>
  </main>
</body>
</html>`))
}

func (s *webServer) authStatus(w http.ResponseWriter, r *http.Request) {
	token := s.app.Config.Token()
	writeJSON(w, http.StatusOK, map[string]any{
		"authenticated":           token.AccessToken != "",
		"access_token_expires":    tokenTime(token.AccessExpiresAt),
		"refresh_token_expires":   nil,
		"access_token_expires_at": token.AccessExpiresAt,
	})
}

func (s *webServer) authRefresh(w http.ResponseWriter, r *http.Request) {
	before := s.app.API.Token()
	if s.app.API.IsAccessExpired() {
		if err := s.app.API.RefreshAccessToken(r.Context()); err != nil {
			writeErr(w, err)
			return
		}
	}
	if err := s.app.saveTokenIfChanged(before); err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"success":              true,
		"message":              "Token refreshed successfully",
		"access_token_expires": tokenTime(s.app.API.Token().AccessExpiresAt),
	})
}

func (s *webServer) listResumes(w http.ResponseWriter, r *http.Request) {
	var raw map[string]any
	if !s.apiCall(w, r, func() error {
		return s.app.API.Get(r.Context(), "/resumes/mine", nil, &raw)
	}) {
		return
	}
	writeJSON(w, http.StatusOK, asItems(raw))
}

func (s *webServer) publishResume(w http.ResponseWriter, r *http.Request, resumeID string) {
	var out map[string]any
	if !s.apiCall(w, r, func() error {
		return s.app.API.Post(r.Context(), "/resumes/"+resumeID+"/publish", nil, &out)
	}) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"success":   true,
		"message":   "Resume published",
		"resume_id": resumeID,
	})
}

func (s *webServer) publishAllResumes(w http.ResponseWriter, r *http.Request) {
	resumes, err := s.app.getResumes(r.Context())
	if err != nil {
		writeErr(w, err)
		return
	}
	published := []string{}
	failed := []string{}
	for _, resume := range resumes {
		id := asString(resume, "id")
		if id == "" {
			continue
		}
		var out map[string]any
		if err := s.app.API.Post(r.Context(), "/resumes/"+id+"/publish", nil, &out); err != nil {
			failed = append(failed, id)
			continue
		}
		published = append(published, id)
	}
	_ = s.app.Config.SaveToken(s.app.API.Token())
	writeJSON(w, http.StatusOK, map[string]any{
		"success":   len(failed) == 0,
		"published": published,
		"failed":    failed,
		"message":   "Publish all completed",
	})
}

func (s *webServer) applyVacancy(w http.ResponseWriter, r *http.Request, vacancyID string) {
	var req map[string]any
	if !readBody(w, r, &req) {
		return
	}
	params := formFromMap(req)
	if params.Get("vacancy_id") == "" {
		params.Set("vacancy_id", vacancyID)
	}
	var out map[string]any
	if !s.apiCall(w, r, func() error {
		return s.app.API.Post(r.Context(), "/negotiations", params, &out)
	}) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"success":        true,
		"message":        "Applied",
		"negotiation_id": out["id"],
	})
}

func (s *webServer) applyBatch(w http.ResponseWriter, r *http.Request) {
	var req map[string]any
	if !readBody(w, r, &req) {
		return
	}
	resumeID := stringFromAny(req["resume_id"])
	message := stringFromAny(req["message"])
	ids := anySlice(req["vacancy_ids"])
	applied := []int{}
	failed := []map[string]any{}
	for _, rawID := range ids {
		vacancyID := int64FromAny(rawID)
		params := url.Values{
			"resume_id":  {resumeID},
			"vacancy_id": {strconv.FormatInt(vacancyID, 10)},
			"message":    {message},
		}
		var out map[string]any
		if err := s.app.API.Post(r.Context(), "/negotiations", params, &out); err != nil {
			failed = append(failed, map[string]any{"vacancy_id": vacancyID, "error": err.Error()})
			continue
		}
		applied = append(applied, int(vacancyID))
	}
	_ = s.app.Config.SaveToken(s.app.API.Token())
	writeJSON(w, http.StatusOK, map[string]any{
		"success": len(failed) == 0,
		"applied": applied,
		"failed":  failed,
		"message": "Batch apply completed",
	})
}

func (s *webServer) autoApply(w http.ResponseWriter, r *http.Request) {
	var req map[string]any
	if !readBody(w, r, &req) {
		return
	}
	results, counts, err := s.app.autoApply(
		r.Context(),
		stringFromAny(req["resume_id"]),
		stringFromAny(req["message_template"]),
		boolFromAny(req["dry_run"]),
		intDefault(req["total_pages"], 5),
		intDefault(req["per_page"], 50),
	)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"success":       counts.failed == 0,
		"applied_count": counts.applied,
		"skipped_count": counts.skipped,
		"failed_count":  counts.failed,
		"results":       results,
		"message":       "Auto apply completed",
	})
}

func (s *webServer) getMessages(w http.ResponseWriter, r *http.Request, id string) {
	var raw map[string]any
	if !s.apiCall(w, r, func() error {
		return s.app.API.Get(r.Context(), "/negotiations/"+id+"/messages", r.URL.Query(), &raw)
	}) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"messages": asItems(raw),
		"found":    int64FromAny(raw["found"]),
	})
}

func (s *webServer) sendMessage(w http.ResponseWriter, r *http.Request, id string) {
	var req map[string]any
	if !readBody(w, r, &req) {
		return
	}
	var out map[string]any
	if !s.apiCall(w, r, func() error {
		return s.app.API.Post(r.Context(), "/negotiations/"+id+"/messages", formFromMap(req), &out)
	}) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "message": "Message sent"})
}

func (s *webServer) deleteNegotiation(w http.ResponseWriter, r *http.Request, id string) {
	var out map[string]any
	if !s.apiCall(w, r, func() error {
		return s.app.API.Delete(r.Context(), "/negotiations/active/"+id, nil, &out)
	}) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "message": "Negotiation deleted"})
}

func (s *webServer) listEmployers(w http.ResponseWriter, r *http.Request) {
	if truthy(r.URL.Query().Get("blacklisted")) {
		s.proxyPaginatedGET(w, r, "/employers/blacklisted")
		return
	}
	s.emptyPaginated(w, r)
}

func (s *webServer) addBlacklist(w http.ResponseWriter, r *http.Request) {
	var req map[string]any
	if !readBody(w, r, &req) {
		return
	}
	employerID := strconv.FormatInt(int64FromAny(req["employer_id"]), 10)
	var out map[string]any
	if !s.apiCall(w, r, func() error {
		return s.app.API.Put(r.Context(), "/employers/blacklisted/"+employerID, nil, &out)
	}) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "message": "Employer blacklisted"})
}

func (s *webServer) removeBlacklist(w http.ResponseWriter, r *http.Request, employerID string) {
	var out map[string]any
	if !s.apiCall(w, r, func() error {
		return s.app.API.Delete(r.Context(), "/employers/blacklisted/"+employerID, nil, &out)
	}) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "message": "Employer removed from blacklist"})
}

func (s *webServer) exportContacts(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("content-type", "text/csv; charset=utf-8")
	w.Header().Set("content-disposition", `attachment; filename="contacts.csv"`)
	cw := csv.NewWriter(w)
	_ = cw.Write([]string{"vacancy_id", "vacancy_name", "employer_id", "employer_name", "full_name", "email", "phones", "created_at"})
	cw.Flush()
}

func (s *webServer) listSettings(w http.ResponseWriter, r *http.Request) {
	settings := s.settingsMap()
	items := make([]map[string]any, 0, len(settings))
	for key, value := range settings {
		items = append(items, map[string]any{"key": key, "value": maskSensitive(key, value)})
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *webServer) getSetting(w http.ResponseWriter, r *http.Request, key string) {
	if isSensitiveKey(key) {
		writeError(w, http.StatusForbidden, "Cannot access sensitive setting")
		return
	}
	settings := s.settingsMap()
	value, ok := settings[key]
	if !ok {
		writeError(w, http.StatusNotFound, "Setting not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"key": key, "value": value})
}

func (s *webServer) putSetting(w http.ResponseWriter, r *http.Request, key string) {
	if isSensitiveKey(key) {
		writeError(w, http.StatusForbidden, "Cannot modify sensitive setting")
		return
	}
	var req map[string]any
	if !readBody(w, r, &req) {
		return
	}
	settings := s.settingsMap()
	settings[key] = req["value"]
	s.app.Config.data["settings"] = settings
	if err := s.app.Config.Save(); err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "message": "Setting updated"})
}

func (s *webServer) deleteSetting(w http.ResponseWriter, r *http.Request, key string) {
	if isSensitiveKey(key) {
		writeError(w, http.StatusForbidden, "Cannot delete sensitive setting")
		return
	}
	settings := s.settingsMap()
	delete(settings, key)
	s.app.Config.data["settings"] = settings
	if err := s.app.Config.Save(); err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "message": "Setting deleted"})
}

func (s *webServer) settingsMap() map[string]any {
	if settings, ok := s.app.Config.data["settings"].(map[string]any); ok {
		return settings
	}
	settings := map[string]any{}
	s.app.Config.data["settings"] = settings
	return settings
}

func (s *webServer) getConfig(w http.ResponseWriter, r *http.Request) {
	out := map[string]any{}
	for key, value := range s.app.Config.data {
		out[key] = maskSensitive(key, value)
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *webServer) getConfigItem(w http.ResponseWriter, r *http.Request, key string) {
	if isSensitiveKey(key) {
		writeError(w, http.StatusForbidden, "Cannot access sensitive config")
		return
	}
	value, ok := s.app.Config.data[key]
	if !ok {
		writeError(w, http.StatusNotFound, "Config key not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"key": key, "value": value})
}

func (s *webServer) putConfigItem(w http.ResponseWriter, r *http.Request, key string) {
	if isSensitiveKey(key) {
		writeError(w, http.StatusForbidden, "Cannot modify sensitive config")
		return
	}
	var req map[string]any
	if !readBody(w, r, &req) {
		return
	}
	s.app.Config.data[key] = req["value"]
	if err := s.app.Config.Save(); err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "message": "Config updated"})
}

func (s *webServer) deleteConfigItem(w http.ResponseWriter, r *http.Request, key string) {
	if isSensitiveKey(key) {
		writeError(w, http.StatusForbidden, "Cannot delete sensitive config")
		return
	}
	delete(s.app.Config.data, key)
	if err := s.app.Config.Save(); err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "message": "Config deleted"})
}

func (s *webServer) dashboardStats(w http.ResponseWriter, r *http.Request) {
	stats := map[string]any{
		"total_resumes":           0,
		"active_resumes":          0,
		"total_negotiations":      0,
		"active_negotiations":     0,
		"invitations":             0,
		"discarded":               0,
		"total_employers":         0,
		"blacklisted_employers":   0,
		"total_contacts":          0,
		"total_vacancies_applied": 0,
		"negotiations_today":      0,
		"negotiations_this_week":  0,
	}
	if s.app.API.Token().AccessToken == "" {
		writeJSON(w, http.StatusOK, stats)
		return
	}
	if resumes, err := s.app.getResumes(r.Context()); err == nil {
		stats["total_resumes"] = len(resumes)
		active := 0
		for _, resume := range resumes {
			if status, _ := resume["status"].(map[string]any); asString(status, "id") == "published" {
				active++
			}
		}
		stats["active_resumes"] = active
	}
	var negotiations map[string]any
	if err := s.app.API.Get(r.Context(), "/negotiations", url.Values{"page": {"0"}, "per_page": {"1"}}, &negotiations); err == nil {
		stats["total_negotiations"] = int64FromAny(negotiations["found"])
		stats["active_negotiations"] = int64FromAny(negotiations["found"])
		stats["total_vacancies_applied"] = int64FromAny(negotiations["found"])
	}
	writeJSON(w, http.StatusOK, stats)
}

func (s *webServer) statsOverview(w http.ResponseWriter, r *http.Request) {
	s.dashboardStats(w, r)
}

func (s *webServer) proxyGET(w http.ResponseWriter, r *http.Request, endpoint string) {
	var out any
	if !s.apiCall(w, r, func() error {
		return s.app.API.Get(r.Context(), endpoint, r.URL.Query(), &out)
	}) {
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *webServer) proxyPaginatedGET(w http.ResponseWriter, r *http.Request, endpoint string) {
	var raw map[string]any
	if !s.apiCall(w, r, func() error {
		return s.app.API.Get(r.Context(), endpoint, r.URL.Query(), &raw)
	}) {
		return
	}
	writeJSON(w, http.StatusOK, normalizePaginated(raw, r.URL.Query()))
}

func (s *webServer) emptyPaginated(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, normalizePaginated(map[string]any{"items": []any{}, "found": 0, "pages": 0}, r.URL.Query()))
}

func (s *webServer) apiCall(w http.ResponseWriter, r *http.Request, fn func() error) bool {
	before := s.app.API.Token()
	if err := fn(); err != nil {
		writeErr(w, err)
		return false
	}
	if err := s.app.saveTokenIfChanged(before); err != nil {
		writeErr(w, err)
		return false
	}
	return true
}

func normalizePaginated(raw map[string]any, query url.Values) map[string]any {
	page := intDefault(raw["page"], intDefault(query.Get("page"), 0))
	perPage := intDefault(raw["per_page"], intDefault(query.Get("per_page"), 20))
	total := int64FromAny(raw["total"])
	if total == 0 {
		total = int64FromAny(raw["found"])
	}
	pages := int64FromAny(raw["pages"])
	return map[string]any{
		"items":    raw["items"],
		"total":    total,
		"page":     page,
		"per_page": perPage,
		"pages":    pages,
	}
}

func tokenTime(ts int64) any {
	if ts <= 0 {
		return nil
	}
	return time.Unix(ts, 0).Format(time.RFC3339)
}

func readBody(w http.ResponseWriter, r *http.Request, out any) bool {
	defer r.Body.Close()
	if err := json.NewDecoder(r.Body).Decode(out); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return false
	}
	return true
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("content-type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func writeErr(w http.ResponseWriter, err error) {
	var apiErr *APIError
	if errors.As(err, &apiErr) {
		writeJSON(w, apiErr.StatusCode, map[string]any{"detail": apiErr.Error()})
		return
	}
	writeError(w, http.StatusInternalServerError, err.Error())
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]any{"detail": message})
}

func logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start).Round(time.Millisecond))
	})
}

func formFromMap(m map[string]any) url.Values {
	values := url.Values{}
	for key, value := range m {
		switch x := value.(type) {
		case nil:
			continue
		case []any:
			for _, item := range x {
				values.Add(key, fmt.Sprint(item))
			}
		default:
			values.Set(key, fmt.Sprint(x))
		}
	}
	return values
}

func anySlice(v any) []any {
	switch x := v.(type) {
	case []any:
		return x
	default:
		return nil
	}
}

func boolFromAny(v any) bool {
	switch x := v.(type) {
	case bool:
		return x
	case string:
		return truthy(x)
	default:
		return false
	}
}

func intDefault(v any, fallback int) int {
	n := int64FromAny(v)
	if n == 0 {
		return fallback
	}
	return int(n)
}

func isSensitiveKey(key string) bool {
	key = strings.ToLower(key)
	return strings.Contains(key, "token") || strings.Contains(key, "password") || strings.Contains(key, "secret")
}

func maskSensitive(key string, value any) any {
	if isSensitiveKey(key) {
		return "***"
	}
	return value
}
