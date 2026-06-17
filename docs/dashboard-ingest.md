# Real-Time Testing Dashboard — CI ingest integration

This repo posts Playwright JSON results to your dashboard over HTTP. For that to **work reliably**, both the **API contract** and **hosting (Render)** must be right.

## 1. What the Playwright repo sends

### A) HTML report + metrics (multipart) — **what CI uses**

**Endpoint:**

`POST {DASHBOARD_URL}/api/ingest/github-actions/run-with-report`

**Headers:**

| Header | Value |
|--------|--------|
| `X-Ingest-Token` | Same value as GitHub secret `DASHBOARD_INGEST_TOKEN` |
| `Content-Type` | *(omit — `multipart/form-data` with boundary)* |

**Body:** `multipart/form-data` with exactly two parts:

| Part name | Content |
|-----------|--------|
| `payload` | Same JSON as before (written to **`payload.json`** in CI via `node scripts/build-dashboard-payload.mjs`). Use **`-F "payload=@payload.json;type=application/json"`** in curl. |
| `report_zip` | Zip of the **`playwright-report/`** directory (not the JSON file). CI runs `( cd playwright-report && zip -qr ../report.zip . )` then **`-F "report_zip=@report.zip;type=application/zip"`**. |

**GitHub Actions** uses **plain curl** (no Node fetch, **no fallback** to JSON-only `/run`):

```bash
node scripts/build-dashboard-payload.mjs playwright-report/results.json payload.json
( cd playwright-report && zip -qr ../report.zip . )
curl -f -sS -X POST "${DASHBOARD_URL}/api/ingest/github-actions/run-with-report" \
  -H "X-Ingest-Token: ${DASHBOARD_INGEST_TOKEN}" \
  -F "payload=@payload.json;type=application/json" \
  -F "report_zip=@report.zip;type=application/zip"
```

After a successful upload, the response body should include **`"has_html_report_zip": true`**, and response headers may include **`X-Ingest-Report-Zip-Bytes`** with a positive value.

**Local:** you can run the same commands, or **`node scripts/playwright-report-to-dashboard.mjs playwright-report/results.json`** (fetch multipart, same fields).

**Dashboard verification:** `GET {DASHBOARD_URL}/api/summary` → `latest_runs` should show `has_html_report_zip: true` when ingest succeeded. If it stays `false`, confirm the workflow log shows the **`run-with-report`** URL and multipart **curl**, not only `/run`.

### B) Optional: metrics only (JSON) — legacy / other clients

**Endpoint:**

`POST {DASHBOARD_URL}/api/ingest/github-actions/run`

**Headers:**

| Header | Value |
|--------|--------|
| `Content-Type` | `application/json` |
| `X-Ingest-Token` | Same value as GitHub secret `DASHBOARD_INGEST_TOKEN` |

**JSON body:**

```json
{
  "suite_name": "SelfHealing Playwright",
  "environment": "CI",
  "build_version": "<github.sha>",
  "test_cases": [
    {
      "name": "Retail login (self-healing) › customer demo login succeeds",
      "module": "login",
      "status": "PASSED",
      "duration_ms": 1234
    }
  ]
}
```

`status` is one of: `PASSED`, `FAILED`, `SKIPPED`.

**Your API should:**

1. Validate `X-Ingest-Token` against a server-side secret (do not accept requests without a valid token).
2. Parse JSON, persist the run + `test_cases` (or push to your real-time layer).
3. For multipart ingest, also store/extract `report_zip` and set `has_html_report_zip` (or equivalent) for the UI.
4. Respond with **`2xx` and a small body** as soon as persistence is done (aim for **&lt; 5–10 seconds** under normal load).

If the handler is slow (heavy DB work on the request thread), GitHub Actions will hit the client timeout even though the server is “up.”

## 2. Why CI saw timeouts and “0 bytes”

- **Render free tier** often **spins the service down** after idle time. The first request can take **minutes** or **never complete** if the app crashes during boot.
- **`curl` with 0 bytes** means no HTTP response body was received before the client gave up — often **cold start** or **app not listening** on `PORT` yet.

So: **making ingest “work” is mostly making the API process reachable and responsive from the public internet**, not only changing Playwright timeouts.

## 3. What to do on Render (pick one path)

### Path A — Keep free tier (expect flaky cold starts)

- Accept that **first request after idle may be very slow**.
- In GitHub: set repository variable **`DASHBOARD_INGEST_IN_CI=true`** and secret **`DASHBOARD_INGEST_TOKEN`**.
- Optionally add a **cron job** (Render Cron Jobs or external ping) every **10–14 minutes** to `GET https://your-api.onrender.com/health` so the instance stays warmer (still not guaranteed on free tier).

### Path B — Reliable CI (recommended for a “real-time” product)

- Use Render **paid** instance or a tier that **does not sleep**, **or** host the API on something that stays up (Fly.io, Railway, a small VPS, etc.).
- Ensure the service **binds to `process.env.PORT`** and starts listening **before** heavy migrations (or run migrations in a release phase).

### Path C — Split “wake” from “ingest” (advanced)

- Expose **`GET /health`** that returns `200` with minimal work as soon as the server is listening.
- Use a **separate short job** or step that only checks health; only then POST ingest. You still need the instance awake — paid/always-on is the real fix.

## 4. GitHub repository settings

1. **Secrets → Actions:** `DASHBOARD_INGEST_TOKEN` = same string your API checks in `X-Ingest-Token`.
2. **Variables → Actions:** `DASHBOARD_INGEST_IN_CI` = `true` (enables warm + publish steps in `.github/workflows/playwright.yml`).
3. Confirm **`DASHBOARD_URL`** in the workflow matches your deployed API base URL (no trailing slash required; the script strips it).

## 5. What to check in the Playwright repo (CI “Publish results” log)

After a run, open the **Publish results to dashboard** step and confirm:

| Check | What you should see |
|--------|---------------------|
| **URL** | A line with the full URL ending in **`/api/ingest/github-actions/run-with-report`** (not only `/run`). |
| **Multipart** | Log lines mention form fields **`payload`** + **`report_zip`** and a **curl** example with **`-F "report_zip=@...`** (field name **`report_zip`** exactly). |
| **Response body** | JSON that includes **`"has_html_report_zip": true`** after a successful zip upload (script prints a ✓ or ⚠ line). |
| **Optional header** | **`X-Ingest-Report-Zip-Bytes`** &gt; 0 when the API stores the zip (script logs the header value if present). |

If you only see **metrics** and no zip in the dashboard, confirm the log shows **`run-with-report`** and **`report_zip=@report.zip`** (not a JSON-only path).

## 6. Local smoke test (before relying on CI)

```bash
export DASHBOARD_URL=https://realtime-testing-dashboard-api.onrender.com
export DASHBOARD_INGEST_TOKEN=your-token
npm test   # playwright-report/results.json + HTML report

# Same as CI: payload file + zip + curl
node scripts/build-dashboard-payload.mjs playwright-report/results.json payload.json
( cd playwright-report && zip -qr ../report.zip . )
curl -f -sS -X POST "${DASHBOARD_URL}/api/ingest/github-actions/run-with-report" \
  -H "X-Ingest-Token: ${DASHBOARD_INGEST_TOKEN}" \
  -F "payload=@payload.json;type=application/json" \
  -F "report_zip=@report.zip;type=application/zip"

# Or: Node helper (multipart fetch, same contract)
# node scripts/playwright-report-to-dashboard.mjs playwright-report/results.json
```

If this fails locally, fix the API first; CI will not behave better.

## 7. Dashboard product checklist

- [ ] `POST /api/ingest/github-actions/run-with-report` accepts **multipart** (`payload` JSON + `report_zip` file), stores the zip, and exposes `has_html_report_zip` (or equivalent) in **`GET /api/summary`** / `latest_runs`.
- [ ] `POST /api/ingest/github-actions/run` (JSON-only) implemented for fallback and returns 2xx on success.
- [ ] Token validated via `X-Ingest-Token`.
- [ ] Handler finishes quickly; async work queued if needed.
- [ ] `GET /health` (or `/`) returns 200 when the process is ready.
- [ ] Render logs show **no crash loop**; service listens on `PORT`.
- [ ] For production CI: instance **does not sleep indefinitely** on first request, or you accept occasional ingest failures.
