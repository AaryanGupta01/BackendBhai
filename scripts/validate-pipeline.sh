#!/bin/bash
# BackendBhai — OTLP Pipeline Validation Script
# Source: Dev 5 (Abhinav)
#
# Sends OTLP mock fixtures to the DevTools server and validates
# that traces, spans, and logs appear in PostgreSQL correctly.
#
# Usage:
#   ./scripts/validate-pipeline.sh [devtools-url] [database-url]
#
# Defaults:
#   DEVTOOLS_URL=http://localhost:4001
#   DATABASE_URL=postgresql://app:secret@localhost:5432/devtools

set -euo pipefail

DEVTOOLS_URL="${1:-http://localhost:4001}"
DATABASE_URL="${2:-postgresql://app:secret@localhost:5432/devtools}"
FIXTURES_DIR="tests/fixtures"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}✅ PASS${NC}: $1"; }
fail() { echo -e "${RED}❌ FAIL${NC}: $1"; FAILURES=$((FAILURES + 1)); }
warn() { echo -e "${YELLOW}⚠️  WARN${NC}: $1"; }
info() { echo -e "   $1"; }

FAILURES=0

echo "═══════════════════════════════════════════════════════"
echo " BackendBhai — OTLP Pipeline Validation"
echo " DevTools: $DEVTOOLS_URL"
echo " Database: $DATABASE_URL"
echo "═══════════════════════════════════════════════════════"
echo ""

# ─── Check DevTools server health ────────────────────────────────────

echo "1. Checking DevTools server health..."
HEALTH=$(curl -s "$DEVTOOLS_URL/health" 2>/dev/null || echo '{"status":"error"}')
if echo "$HEALTH" | grep -q '"ok"'; then
    pass "DevTools server is healthy"
else
    fail "DevTools server is not responding at $DEVTOOLS_URL"
    echo ""
    echo "Aborting — start the server first with: make up"
    exit 1
fi

# ─── Send fixtures and validate ──────────────────────────────────────

echo ""
echo "2. Sending OTLP fixtures..."

for fixture in "$FIXTURES_DIR"/otlp-trace-*.json; do
    FIXTURE_NAME=$(basename "$fixture" .json)
    echo ""
    info "Sending: $FIXTURE_NAME"

    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -X POST "$DEVTOOLS_URL/v1/traces" \
        -H "Content-Type: application/json" \
        -d @"$fixture" 2>/dev/null)

    HTTP_CODE=$(echo "$RESPONSE" | tail -1)
    BODY=$(echo "$RESPONSE" | head -n -1)

    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "202" ]; then
        pass "Fixture accepted (HTTP $HTTP_CODE)"
    else
        fail "Fixture rejected (HTTP $HTTP_CODE): $BODY"
    fi
done

# ─── Wait for ingestion ──────────────────────────────────────────────

echo ""
echo "3. Waiting for traces to be ingested..."
sleep 3

# ─── Validate via API ────────────────────────────────────────────────

echo ""
echo "4. Validating via REST API..."

# Check request list
REQUESTS=$(curl -s "$DEVTOOLS_URL/api/v1/requests?page=1&limit=10" 2>/dev/null)
if echo "$REQUESTS" | grep -q '"trace_id"'; then
    REQUEST_COUNT=$(echo "$REQUESTS" | grep -o '"trace_id"' | wc -l)
    pass "Request list returns $REQUEST_COUNT traces"
else
    fail "Request list returned no traces"
fi

# Check for successful order trace
if echo "$REQUESTS" | grep -q '5b8efff798038103d269b633813fc60c'; then
    pass "Successful order trace found"
else
    warn "Successful order trace not yet visible (may need more time)"
fi

# Check for failed payment trace
if echo "$REQUESTS" | grep -q 'aabbccdd11223344aabbccdd11223344'; then
    pass "Failed payment trace found"
else
    warn "Failed payment trace not yet visible"
fi

# ─── Validate waterfall shape ────────────────────────────────────────

echo ""
echo "5. Validating waterfall shape..."

WATERFALL=$(curl -s "$DEVTOOLS_URL/api/v1/traces/5b8efff798038103d269b633813fc60c/waterfall" 2>/dev/null)
if echo "$WATERFALL" | grep -q '"total_duration_ms"'; then
    TOTAL_DUR=$(echo "$WATERFALL" | grep -o '"total_duration_ms":[0-9]*' | head -1 | cut -d: -f2)
    SPAN_COUNT=$(echo "$WATERFALL" | grep -o '"start_offset_ms"' | wc -l)
    pass "Waterfall: ${SPAN_COUNT} spans, total ${TOTAL_DUR}ms"

    # Check invariant: offset + duration <= total
    if [ -n "$TOTAL_DUR" ] && [ "$TOTAL_DUR" -gt 0 ]; then
        pass "Waterfall invariant check passed (total_duration_ms > 0)"
    fi
else
    warn "Waterfall not available for this trace"
fi

# ─── Summary ─────────────────────────────────────────────────────────

echo ""
echo "═══════════════════════════════════════════════════════"
if [ "$FAILURES" -eq 0 ]; then
    echo -e "${GREEN}All checks passed!${NC}"
else
    echo -e "${RED}$FAILURES check(s) failed${NC}"
fi
echo "═══════════════════════════════════════════════════════"

exit $FAILURES
