#!/usr/bin/env node
/**
 * Writes payload.json (dashboard ingest body) from Playwright results.json.
 * Used by CI before: zip + curl multipart to .../run-with-report
 *
 * Usage: node scripts/build-dashboard-payload.mjs <playwright-report/results.json> [payload.json]
 */
import { writeFileSync } from 'node:fs'
import { buildDashboardPayload } from './dashboard-ingest-common.mjs'

const inPath = process.argv[2]
const outPath = process.argv[3] || 'payload.json'

if (!inPath) {
  console.error('Usage: node scripts/build-dashboard-payload.mjs <results.json> [payload.json]')
  process.exit(1)
}

const body = buildDashboardPayload(inPath)
writeFileSync(outPath, JSON.stringify(body, null, 2), 'utf8')
console.log(`[dashboard] Wrote ${outPath} (${body.test_cases.length} test case(s))`)
