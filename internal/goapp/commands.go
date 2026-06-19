package goapp

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

func (a *App) commandAuthCode(ctx context.Context, args []string) error {
	fs := flag.NewFlagSet("auth-code", flag.ContinueOnError)
	fs.SetOutput(os.Stderr)
	code := fs.String("code", "", "OAuth code from redirect URL")
	redirectURL := fs.String("url", "", "full OAuth redirect URL")
	if err := fs.Parse(args); err != nil {
		return err
	}
	authCode := strings.TrimSpace(*code)
	if authCode == "" && *redirectURL != "" {
		parsed, err := url.Parse(*redirectURL)
		if err != nil {
			return err
		}
		authCode = parsed.Query().Get("code")
	}
	if authCode == "" {
		return fmt.Errorf("auth code is required")
	}

	if err := a.API.Authenticate(ctx, authCode); err != nil {
		return err
	}
	if err := a.Config.SaveToken(a.API.Token()); err != nil {
		return err
	}
	fmt.Println("authorized")
	return nil
}

func (a *App) commandRefreshToken(ctx context.Context) error {
	before := a.API.Token()
	if !a.API.IsAccessExpired() {
		fmt.Println("token is not expired")
		return nil
	}
	if err := a.API.RefreshAccessToken(ctx); err != nil {
		return err
	}
	if err := a.saveTokenIfChanged(before); err != nil {
		return err
	}
	fmt.Println("token refreshed")
	return nil
}

func (a *App) commandWhoAmI(ctx context.Context) error {
	before := a.API.Token()
	var me map[string]any
	if err := a.API.Get(ctx, "/me", nil, &me); err != nil {
		return err
	}
	if err := a.saveTokenIfChanged(before); err != nil {
		return err
	}
	return printJSON(me)
}

func (a *App) commandListResumes(ctx context.Context) error {
	before := a.API.Token()
	resumes, err := a.getResumes(ctx)
	if err != nil {
		return err
	}
	if err := a.saveTokenIfChanged(before); err != nil {
		return err
	}
	for _, resume := range resumes {
		status := ""
		if s, ok := resume["status"].(map[string]any); ok {
			status = asString(s, "id")
		}
		fmt.Printf("%s\t%s\t%s\n", asString(resume, "id"), status, asString(resume, "title"))
	}
	return nil
}

func (a *App) commandUpdateResumes(ctx context.Context) error {
	before := a.API.Token()
	resumes, err := a.getResumes(ctx)
	if err != nil {
		return err
	}
	for _, resume := range resumes {
		id := asString(resume, "id")
		title := asString(resume, "title")
		if id == "" {
			continue
		}
		var out map[string]any
		if err := a.API.Post(ctx, "/resumes/"+id+"/publish", nil, &out); err != nil {
			fmt.Fprintf(os.Stderr, "update %s failed: %v\n", quote(title), err)
			continue
		}
		fmt.Println("updated", title)
	}
	return a.saveTokenIfChanged(before)
}

func (a *App) commandCallAPI(ctx context.Context, args []string) error {
	if len(args) < 2 {
		return fmt.Errorf("usage: call-api METHOD ENDPOINT [key=value...]")
	}
	method := strings.ToUpper(args[0])
	endpoint := args[1]
	params, err := parseParams(args[2:])
	if err != nil {
		return err
	}

	before := a.API.Token()
	var out any
	switch method {
	case http.MethodGet:
		err = a.API.Get(ctx, endpoint, params, &out)
	case http.MethodPost:
		err = a.API.Post(ctx, endpoint, params, &out)
	case http.MethodPut:
		err = a.API.Put(ctx, endpoint, params, &out)
	case http.MethodDelete:
		err = a.API.Delete(ctx, endpoint, params, &out)
	default:
		err = fmt.Errorf("unsupported method %q", method)
	}
	if err != nil {
		return err
	}
	if err := a.saveTokenIfChanged(before); err != nil {
		return err
	}
	return printJSON(out)
}

func (a *App) commandApplySimilar(ctx context.Context, args []string) error {
	fs := flag.NewFlagSet("apply-similar", flag.ContinueOnError)
	fs.SetOutput(os.Stderr)
	resumeID := fs.String("resume-id", "", "resume ID")
	search := fs.String("search", "", "search text")
	pages := fs.Int("pages", 20, "number of pages")
	totalPages := fs.Int("total-pages", 0, "number of pages")
	perPage := fs.Int("per-page", 100, "items per page")
	dryRun := fs.Bool("dry-run", false, "do not send applications")
	forceMessage := fs.Bool("force-message", false, "always send message")
	message := fs.String("message", "Здравствуйте, меня заинтересовала ваша вакансия.", "application message")
	if err := fs.Parse(args); err != nil {
		return err
	}
	if *totalPages > 0 {
		*pages = *totalPages
	}

	return a.applySimilarOnce(
		ctx,
		*resumeID,
		*search,
		*pages,
		*perPage,
		*dryRun,
		*forceMessage,
		*message,
	)
}

func (a *App) applySimilarOnce(ctx context.Context, resumeID, search string, pages, perPage int, dryRun, forceMessage bool, message string) error {
	before := a.API.Token()
	resumes, err := a.getResumes(ctx)
	if err != nil {
		return err
	}
	for _, resume := range resumes {
		id := asString(resume, "id")
		if resumeID != "" && id != resumeID {
			continue
		}
		status, _ := resume["status"].(map[string]any)
		if asString(status, "id") != "published" {
			continue
		}
		if err := a.applyForResume(ctx, id, asString(resume, "title"), search, pages, perPage, dryRun, forceMessage, message); err != nil {
			return err
		}
	}
	return a.saveTokenIfChanged(before)
}

func (a *App) getResumes(ctx context.Context) ([]map[string]any, error) {
	var raw map[string]any
	if err := a.API.Get(ctx, "/resumes/mine", nil, &raw); err != nil {
		return nil, err
	}
	return asItems(raw), nil
}

func (a *App) applyForResume(ctx context.Context, resumeID, title, search string, pages, perPage int, dryRun, forceMessage bool, message string) error {
	fmt.Println("resume", title)
	for page := 0; page < pages; page++ {
		params := url.Values{}
		params.Set("page", fmt.Sprint(page))
		params.Set("per_page", fmt.Sprint(perPage))
		if search != "" {
			params.Set("text", search)
		}

		var raw map[string]any
		if err := a.API.Get(ctx, "/resumes/"+resumeID+"/similar_vacancies", params, &raw); err != nil {
			return err
		}
		items := asItems(raw)
		if len(items) == 0 {
			return nil
		}
		for _, vacancy := range items {
			if shouldSkipVacancy(vacancy) {
				continue
			}
			vacancyID := asString(vacancy, "id")
			alternateURL := asString(vacancy, "alternate_url")
			name := asString(vacancy, "name")
			needsMessage := forceMessage || asBool(vacancy, "response_letter_required")
			applyParams := url.Values{
				"resume_id":  {resumeID},
				"vacancy_id": {vacancyID},
				"message":    {""},
			}
			if needsMessage {
				applyParams.Set("message", message)
			}
			if dryRun {
				fmt.Println("dry-run apply", alternateURL, name)
				continue
			}
			var out map[string]any
			if err := a.API.Post(ctx, "/negotiations", applyParams, &out); err != nil {
				fmt.Fprintf(os.Stderr, "apply %s failed: %v\n", alternateURL, err)
				continue
			}
			fmt.Println("applied", alternateURL, name)
			time.Sleep(time.Second)
		}
		if page >= asPages(raw)-1 {
			return nil
		}
	}
	return nil
}

func shouldSkipVacancy(vacancy map[string]any) bool {
	if asBool(vacancy, "has_test") || asBool(vacancy, "archived") {
		return true
	}
	if asString(vacancy, "response_url") != "" {
		return true
	}
	if raw, ok := vacancy["relations"].([]any); ok && len(raw) > 0 {
		return true
	}
	return false
}

type autoApplyCounts struct {
	applied int
	skipped int
	failed  int
}

func (a *App) autoApply(ctx context.Context, resumeID, message string, dryRun bool, pages, perPage int) ([]map[string]any, autoApplyCounts, error) {
	before := a.API.Token()
	resumes, err := a.getResumes(ctx)
	if err != nil {
		return nil, autoApplyCounts{}, err
	}

	results := []map[string]any{}
	counts := autoApplyCounts{}
	for _, resume := range resumes {
		id := asString(resume, "id")
		if resumeID != "" && id != resumeID {
			continue
		}
		status, _ := resume["status"].(map[string]any)
		if asString(status, "id") != "published" {
			continue
		}
		for page := 0; page < pages; page++ {
			params := url.Values{
				"page":     {fmt.Sprint(page)},
				"per_page": {fmt.Sprint(perPage)},
			}
			var raw map[string]any
			if err := a.API.Get(ctx, "/resumes/"+id+"/similar_vacancies", params, &raw); err != nil {
				return results, counts, err
			}
			items := asItems(raw)
			if len(items) == 0 {
				break
			}
			for _, vacancy := range items {
				vacancyID := int64FromAny(vacancy["id"])
				employerName := ""
				if employer, _ := vacancy["employer"].(map[string]any); employer != nil {
					employerName = asString(employer, "name")
				}
				result := map[string]any{
					"vacancy_id":    vacancyID,
					"vacancy_name":  asString(vacancy, "name"),
					"vacancy_url":   asString(vacancy, "alternate_url"),
					"employer_name": employerName,
					"status":        "skipped",
					"reason":        nil,
				}
				if shouldSkipVacancy(vacancy) {
					result["reason"] = "not applicable"
					counts.skipped++
					results = append(results, result)
					continue
				}
				if dryRun {
					result["status"] = "applied"
					result["reason"] = "dry-run"
					counts.applied++
					results = append(results, result)
					continue
				}
				applyParams := url.Values{
					"resume_id":  {id},
					"vacancy_id": {strconv.FormatInt(vacancyID, 10)},
					"message":    {message},
				}
				var out map[string]any
				if err := a.API.Post(ctx, "/negotiations", applyParams, &out); err != nil {
					result["status"] = "failed"
					result["reason"] = err.Error()
					counts.failed++
					results = append(results, result)
					continue
				}
				result["status"] = "applied"
				counts.applied++
				results = append(results, result)
			}
			if page >= asPages(raw)-1 {
				break
			}
		}
	}
	if err := a.saveTokenIfChanged(before); err != nil {
		return results, counts, err
	}
	return results, counts, nil
}

func printJSON(value any) error {
	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	return enc.Encode(value)
}
