FROM node:22-alpine AS frontend

WORKDIR /src/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend ./
RUN npm run build

FROM golang:1.23-alpine AS build

WORKDIR /src

COPY go.mod ./
COPY cmd ./cmd
COPY internal ./internal

RUN CGO_ENABLED=0 GOOS=linux go build \
  -trimpath \
  -ldflags="-s -w" \
  -o /out/hh-applicant-tool-go \
  ./cmd/hh-applicant-tool-go

FROM alpine:3.20

RUN addgroup -S app && adduser -S -G app app

USER app
WORKDIR /app

COPY --from=build /out/hh-applicant-tool-go /usr/local/bin/hh-applicant-tool-go
COPY --from=frontend /src/frontend/dist /app/static

ENV CONFIG_DIR=/app/config
ENV HH_STATIC_DIR=/app/static

ENTRYPOINT ["hh-applicant-tool-go"]
CMD ["help"]
