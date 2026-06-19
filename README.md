# HH Applicant Tool

Go application for automating applicant workflows with HeadHunter/hh.ru.

The project is Go-only: CLI commands, daemon scheduling, HH API access, web API,
and the built-in HTML UI are handled by `hh-applicant-tool-go`.

## Build

```sh
go build ./cmd/hh-applicant-tool-go
```

## Run

```sh
go run ./cmd/hh-applicant-tool-go help
go run ./cmd/hh-applicant-tool-go serve --host 127.0.0.1 --port 8080
go run ./cmd/hh-applicant-tool-go daemon
```

## Auth

```sh
go run ./cmd/hh-applicant-tool-go auth-url
go run ./cmd/hh-applicant-tool-go auth-code --code '<oauth-code>'
go run ./cmd/hh-applicant-tool-go whoami
```

## Common Commands

```sh
go run ./cmd/hh-applicant-tool-go list-resumes
go run ./cmd/hh-applicant-tool-go update-resumes
go run ./cmd/hh-applicant-tool-go apply-similar --dry-run --search 'golang'
go run ./cmd/hh-applicant-tool-go call-api GET /me
```

## Docker

```sh
docker compose up -d --build
```

The web UI is published on `127.0.0.1:8080`.

The web UI is served by Go directly. More details: [docs/go-port.md](docs/go-port.md).
