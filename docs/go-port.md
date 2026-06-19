# Go application

This repository is now a Go application. The Go binary owns CLI commands, the
daemon loop, HH API calls, the web API, and the built-in HTML UI.

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

Docker:

```sh
docker build -t hh-applicant-tool-go .
docker run --rm -it -v "$PWD/config:/app/config" hh-applicant-tool-go help
```

Current status:

- Implemented in Go: config/profile resolution, token load/save, HH API client, OAuth code exchange, token refresh, generic API calls, `whoami`, resume listing, resume update, similar-vacancy apply flow, daemon loop, web API, built-in HTML UI, settings/config endpoints.
- Implemented as API-backed or placeholder Go endpoints: negotiations, vacancies, resumes, auth, blacklist actions, dashboard stats. Contacts return an empty export/list until persistent contact capture is wired.
- Manual auth note: Go supports `auth-url` + `auth-code`. Browser automation can be added in Go later if needed.
