package goapp

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

const (
	hhAPIURL    = "https://api.hh.ru/"
	hhOAuthURL  = "https://hh.ru/oauth/"
	defaultWait = 345 * time.Millisecond

	androidClientID = "HIOMIAS39CA9DICTA7JIO64LQKQJF5AGIK74G9ITJKLNEDAOH5FHS5G1JI7FOEGD"
	androidSecret   = "V9M870DE342BGHFRUJ5FTCGCUA1482AN0DI8C5TFI9ULMA89H10N60NOP8I4JMVS"
)

type APIError struct {
	StatusCode int
	Message    string
	Body       any
}

func (e *APIError) Error() string {
	if e.Message != "" {
		return fmt.Sprintf("hh api status %d: %s", e.StatusCode, e.Message)
	}
	return fmt.Sprintf("hh api status %d", e.StatusCode)
}

type APIClient struct {
	apiBaseURL   string
	oauthBaseURL string
	clientID     string
	clientSecret string
	userAgent    string
	accessToken  string
	refreshToken string
	expiresAt    int64
	delay        time.Duration
	httpClient   *http.Client

	mu       sync.Mutex
	lastCall time.Time
}

type ClientOptions struct {
	ClientID              string
	ClientSecret          string
	UserAgent             string
	AccessToken           string
	RefreshToken          string
	AccessExpiresAt       int64
	Delay                 time.Duration
	ProxyURL              string
	InsecureSkipTLSVerify bool
}

func NewAPIClient(opts ClientOptions) (*APIClient, error) {
	clientID := opts.ClientID
	if clientID == "" {
		clientID = androidClientID
	}
	clientSecret := opts.ClientSecret
	if clientSecret == "" {
		clientSecret = androidSecret
	}
	userAgent := opts.UserAgent
	if userAgent == "" {
		userAgent = GenerateAndroidUserAgent()
	}
	delay := opts.Delay
	if delay <= 0 {
		delay = defaultWait
	}

	transport := http.DefaultTransport.(*http.Transport).Clone()
	if opts.ProxyURL != "" {
		parsed, err := url.Parse(opts.ProxyURL)
		if err != nil {
			return nil, fmt.Errorf("parse proxy URL: %w", err)
		}
		transport.Proxy = http.ProxyURL(parsed)
	} else {
		transport.Proxy = http.ProxyFromEnvironment
	}
	if opts.InsecureSkipTLSVerify {
		transport.TLSClientConfig = &tls.Config{InsecureSkipVerify: true} //nolint:gosec
	}

	return &APIClient{
		apiBaseURL:   hhAPIURL,
		oauthBaseURL: hhOAuthURL,
		clientID:     clientID,
		clientSecret: clientSecret,
		userAgent:    userAgent,
		accessToken:  opts.AccessToken,
		refreshToken: opts.RefreshToken,
		expiresAt:    opts.AccessExpiresAt,
		delay:        delay,
		httpClient: &http.Client{
			Transport: transport,
			CheckRedirect: func(req *http.Request, via []*http.Request) error {
				return http.ErrUseLastResponse
			},
		},
	}, nil
}

func (c *APIClient) Token() Token {
	return Token{
		AccessToken:     c.accessToken,
		RefreshToken:    c.refreshToken,
		AccessExpiresAt: c.expiresAt,
	}
}

func (c *APIClient) IsAccessExpired() bool {
	return time.Now().Unix() >= c.expiresAt
}

func (c *APIClient) AuthorizeURL() string {
	u, _ := url.Parse(c.oauthBaseURL)
	u = u.JoinPath("authorize")
	q := u.Query()
	q.Set("client_id", c.clientID)
	q.Set("response_type", "code")
	u.RawQuery = q.Encode()
	return u.String()
}

func (c *APIClient) Authenticate(ctx context.Context, code string) error {
	token, err := c.requestAccessToken(ctx, url.Values{
		"client_id":     {c.clientID},
		"client_secret": {c.clientSecret},
		"code":          {code},
		"grant_type":    {"authorization_code"},
	})
	if err != nil {
		return err
	}
	c.applyToken(token)
	return nil
}

func (c *APIClient) RefreshAccessToken(ctx context.Context) error {
	if c.refreshToken == "" {
		return fmt.Errorf("refresh token is empty")
	}
	token, err := c.requestAccessToken(ctx, url.Values{
		"grant_type":    {"refresh_token"},
		"refresh_token": {c.refreshToken},
	})
	if err != nil {
		return err
	}
	c.applyToken(token)
	return nil
}

func (c *APIClient) Get(ctx context.Context, endpoint string, params url.Values, out any) error {
	return c.Request(ctx, http.MethodGet, endpoint, params, out)
}

func (c *APIClient) Post(ctx context.Context, endpoint string, params url.Values, out any) error {
	return c.Request(ctx, http.MethodPost, endpoint, params, out)
}

func (c *APIClient) Put(ctx context.Context, endpoint string, params url.Values, out any) error {
	return c.Request(ctx, http.MethodPut, endpoint, params, out)
}

func (c *APIClient) Delete(ctx context.Context, endpoint string, params url.Values, out any) error {
	return c.Request(ctx, http.MethodDelete, endpoint, params, out)
}

func (c *APIClient) Request(ctx context.Context, method, endpoint string, params url.Values, out any) error {
	err := c.doRequest(ctx, method, c.resolve(c.apiBaseURL, endpoint), params, out)
	if apiErr, ok := err.(*APIError); ok && apiErr.StatusCode == http.StatusForbidden && c.IsAccessExpired() && c.refreshToken != "" {
		if refreshErr := c.RefreshAccessToken(ctx); refreshErr != nil {
			return err
		}
		return c.doRequest(ctx, method, c.resolve(c.apiBaseURL, endpoint), params, out)
	}
	return err
}

func (c *APIClient) requestAccessToken(ctx context.Context, params url.Values) (Token, error) {
	var raw map[string]any
	if err := c.doRequest(ctx, http.MethodPost, c.resolve(c.oauthBaseURL, "token"), params, &raw); err != nil {
		return Token{}, err
	}
	return Token{
		AccessToken:     stringFromAny(raw["access_token"]),
		RefreshToken:    stringFromAny(raw["refresh_token"]),
		AccessExpiresAt: time.Now().Unix() + int64FromAny(raw["expires_in"]),
	}, nil
}

func (c *APIClient) applyToken(token Token) {
	c.accessToken = token.AccessToken
	c.refreshToken = token.RefreshToken
	c.expiresAt = token.AccessExpiresAt
}

func (c *APIClient) doRequest(ctx context.Context, method, rawURL string, params url.Values, out any) error {
	if params == nil {
		params = url.Values{}
	}

	var body io.Reader
	reqURL := rawURL
	if method == http.MethodGet || method == http.MethodDelete {
		if encoded := params.Encode(); encoded != "" {
			sep := "?"
			if strings.Contains(reqURL, "?") {
				sep = "&"
			}
			reqURL += sep + encoded
		}
	} else {
		body = bytes.NewBufferString(params.Encode())
	}

	req, err := http.NewRequestWithContext(ctx, method, reqURL, body)
	if err != nil {
		return err
	}
	req.Header.Set("user-agent", c.userAgent)
	req.Header.Set("x-hh-app-active", "true")
	if body != nil {
		req.Header.Set("content-type", "application/x-www-form-urlencoded")
	}
	if c.accessToken != "" {
		req.Header.Set("authorization", "Bearer "+c.accessToken)
	}

	c.mu.Lock()
	if !c.lastCall.IsZero() {
		if wait := c.delay - time.Since(c.lastCall); wait > 0 {
			timer := time.NewTimer(wait)
			select {
			case <-ctx.Done():
				timer.Stop()
				c.mu.Unlock()
				return ctx.Err()
			case <-timer.C:
			}
		}
	}
	resp, err := c.httpClient.Do(req)
	c.lastCall = time.Now()
	c.mu.Unlock()
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	var decoded any
	if len(bytes.TrimSpace(responseBody)) > 0 {
		if err := json.Unmarshal(responseBody, &decoded); err != nil {
			return fmt.Errorf("decode response JSON for %s %s: %w", method, reqURL, err)
		}
	} else {
		decoded = map[string]any{}
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return &APIError{
			StatusCode: resp.StatusCode,
			Message:    apiErrorMessage(decoded),
			Body:       decoded,
		}
	}
	if out == nil {
		return nil
	}
	raw, err := json.Marshal(decoded)
	if err != nil {
		return err
	}
	return json.Unmarshal(raw, out)
}

func (c *APIClient) resolve(base, endpoint string) string {
	u, _ := url.Parse(base)
	return u.JoinPath(strings.TrimLeft(endpoint, "/")).String()
}

func apiErrorMessage(decoded any) string {
	obj, ok := decoded.(map[string]any)
	if !ok {
		return ""
	}
	for _, key := range []string{"description", "error", "message"} {
		if s := stringFromAny(obj[key]); s != "" {
			return s
		}
	}
	return ""
}
