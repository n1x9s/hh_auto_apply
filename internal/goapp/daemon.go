package goapp

import (
	"context"
	"flag"
	"fmt"
	"os"
	"time"
)

func (a *App) commandDaemon(ctx context.Context, args []string) error {
	fs := flag.NewFlagSet("daemon", flag.ContinueOnError)
	fs.SetOutput(os.Stderr)
	applySearch := fs.String("search", "", "search text for apply-similar")
	applyPages := fs.Int("apply-pages", 20, "pages for apply-similar")
	perPage := fs.Int("per-page", 100, "items per page")
	if err := fs.Parse(args); err != nil {
		return err
	}

	fmt.Println("Go daemon started")
	a.runStartupTasks(ctx, *applySearch, *applyPages, *perPage)

	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			fmt.Println("Go daemon stopped")
			return nil
		case now := <-ticker.C:
			if err := a.commandRefreshToken(ctx); err != nil {
				fmt.Fprintln(os.Stderr, "refresh-token:", err)
			}
			if now.Minute() == 0 && now.Hour()%4 == 0 {
				if err := a.commandUpdateResumes(ctx); err != nil {
					fmt.Fprintln(os.Stderr, "update-resumes:", err)
				}
			}
			if now.Minute() == 0 && now.Hour() >= 8 && now.Hour() <= 21 {
				if err := a.applySimilarOnce(ctx, "", *applySearch, *applyPages, *perPage, false, false, ""); err != nil {
					fmt.Fprintln(os.Stderr, "apply-similar:", err)
				}
			}
		}
	}
}

func (a *App) runStartupTasks(ctx context.Context, applySearch string, applyPages, perPage int) {
	if err := a.commandRefreshToken(ctx); err != nil {
		fmt.Fprintln(os.Stderr, "startup refresh-token:", err)
	}
	if err := a.commandUpdateResumes(ctx); err != nil {
		fmt.Fprintln(os.Stderr, "startup update-resumes:", err)
	}
	if err := a.applySimilarOnce(ctx, "", applySearch, applyPages, perPage, false, false, ""); err != nil {
		fmt.Fprintln(os.Stderr, "startup apply-similar:", err)
	}
}
