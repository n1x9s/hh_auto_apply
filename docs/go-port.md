# Go application

This repository now uses a Go backend/runtime with the original React/Vite
frontend restored in `frontend/`. The Go binary owns CLI commands, the daemon
loop, HH API calls, and the web API. In production it serves the Vite build from
`frontend/dist` or from `HH_STATIC_DIR`.

Build:

```sh
go build ./cmd/hh-applicant-tool-go
```

Run:

```sh
go run ./cmd/hh-applicant-tool-go help
go run ./cmd/hh-applicant-tool-go serve --host 127.0.0.1 --port 8080
go run ./cmd/hh-applicant-tool-go daemon
go run ./cmd/hh-applicant-tool-go auth-url
go run ./cmd/hh-applicant-tool-go auth-code --code '<oauth-code>'
go run ./cmd/hh-applicant-tool-go whoami
go run ./cmd/hh-applicant-tool-go list-resumes
go run ./cmd/hh-applicant-tool-go update-resumes
go run ./cmd/hh-applicant-tool-go apply-similar --dry-run --search 'golang'
```

Frontend development:

```sh
go run ./cmd/hh-applicant-tool-go serve --host 127.0.0.1 --port 8080
cd frontend
npm ci
npm run dev
```

Frontend production build:

```sh
cd frontend
npm ci
npm run build
cd ..
go run ./cmd/hh-applicant-tool-go serve --host 127.0.0.1 --port 8080
```

Docker:

```sh
docker build -t hh-applicant-tool-go .
docker run --rm -it -v "$PWD/config:/app/config" hh-applicant-tool-go help
```

Current status:

- Implemented in Go: config/profile resolution, token load/save, HH API client, OAuth code exchange, token refresh, generic API calls, `whoami`, resume listing, resume update, similar-vacancy apply flow, daemon loop, web API, static frontend serving, settings/config endpoints.
- Implemented as API-backed or placeholder Go endpoints: negotiations, vacancies, resumes, auth, blacklist actions, dashboard stats. Contacts return an empty export/list until persistent contact capture is wired.
- Manual auth note: Go supports `auth-url` + `auth-code`. Browser automation can be added in Go later if needed.
