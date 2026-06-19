package goapp

import (
	"fmt"
	"os"
	"path/filepath"
)

const sqliteSchema = `
PRAGMA foreign_keys = OFF;
BEGIN;
CREATE TABLE IF NOT EXISTS employers (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT,
    description TEXT,
    site_url TEXT,
    area_id INTEGER,
    area_name TEXT,
    alternate_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS vacancy_contacts (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
    vacancy_id INTEGER NOT NULL,
    vacancy_alternate_url TEXT,
    vacancy_name TEXT,
    vacancy_area_id INTEGER,
    vacancy_area_name TEXT,
    vacancy_salary_from INTEGER,
    vacancy_salary_to INTEGER,
    vacancy_currency VARCHAR(3),
    vacancy_gross BOOLEAN,
    employer_id INTEGER,
    employer_name TEXT,
    name TEXT,
    email TEXT,
    phone_numbers TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (vacancy_id, email)
);
CREATE TABLE IF NOT EXISTS vacancies (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    area_id INTEGER,
    area_name TEXT,
    salary_from INTEGER,
    salary_to INTEGER,
    currency VARCHAR(3),
    gross BOOLEAN,
    published_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    remote BOOLEAN,
    experience TEXT,
    professional_roles TEXT,
    alternate_url TEXT
);
CREATE TABLE IF NOT EXISTS negotiations (
    id INTEGER PRIMARY KEY,
    state TEXT NOT NULL,
    vacancy_id INTEGER NOT NULL,
    employer_id INTEGER,
    chat_id INTEGER NOT NULL,
    resume_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS resumes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT,
    alternate_url TEXT,
    status_id TEXT,
    status_name TEXT,
    can_publish_or_update BOOLEAN,
    total_views INTEGER DEFAULT 0,
    new_views INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_vac_upd ON vacancies(updated_at);
CREATE INDEX IF NOT EXISTS idx_emp_upd ON employers(updated_at);
CREATE INDEX IF NOT EXISTS idx_neg_upd ON negotiations(updated_at);
COMMIT;
`

func (a *App) commandInitStorage() error {
	if err := os.MkdirAll(a.ProfileDir, 0o700); err != nil {
		return err
	}
	schemaPath := filepath.Join(a.ProfileDir, "schema.sql")
	if err := os.WriteFile(schemaPath, []byte(sqliteSchema), 0o600); err != nil {
		return err
	}
	fmt.Println("schema written:", schemaPath)
	fmt.Println("database path:", profileDBPath(a.ProfileDir))
	fmt.Println("note: Go stdlib has no SQLite driver; wire a driver during the final storage migration.")
	return nil
}
