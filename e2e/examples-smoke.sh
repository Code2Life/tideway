#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GATEWAY_URL="${GATEWAY_URL:-http://127.0.0.1:8787}"
API_KEY="${API_KEY:-dev-key}"
RESULT_DIR="${ROOT_DIR}/test-results/examples-smoke"
mkdir -p "${RESULT_DIR}"

WRANGLER_LOG="${RESULT_DIR}/gateway.log"
SUMMARY_LOG="${RESULT_DIR}/summary.txt"

wait_for_health() {
  local attempts=0
  until curl -fsS "${GATEWAY_URL}/healthz" >/dev/null 2>&1; do
    attempts=$((attempts + 1))
    if [[ ${attempts} -gt 50 ]]; then
      echo "gateway health check failed" >&2
      return 1
    fi
    sleep 0.2
  done
}

wait_for_topic_active() {
  local topic="$1"
  local attempts=0

  until curl -fsS -H "Authorization: Bearer ${API_KEY}" \
    "${GATEWAY_URL}/v1/admin/topics?page=1&pageSize=500" | grep -q "\"topic\":\"${topic}\""; do
    attempts=$((attempts + 1))
    if [[ ${attempts} -gt 180 ]]; then
      return 1
    fi
    sleep 1
  done
}

wait_with_timeout() {
  local pid="$1"
  local timeout_seconds="$2"
  local elapsed=0

  while kill -0 "${pid}" >/dev/null 2>&1; do
    if [[ ${elapsed} -ge ${timeout_seconds} ]]; then
      return 1
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done

  wait "${pid}"
}

run_case() {
  local language="$1"
  local subscriber_cmd="$2"
  local publisher_cmd="$3"
  local timeout_seconds="${4:-60}"

  local topic="alerts-${language}"
  local event_id="${language}-event-1"
  local payload="hello-from-${language}"
  local subscriber_log="${RESULT_DIR}/${language}-subscriber.log"
  local publisher_log="${RESULT_DIR}/${language}-publisher.log"

  echo "[${language}] subscribing on ${topic}" | tee -a "${SUMMARY_LOG}"

  (
    cd "${ROOT_DIR}"
    GATEWAY_URL="${GATEWAY_URL}" TOPIC="${topic}" SUBSCRIBER_ID="${language}-sub-1" \
      bash -lc "${subscriber_cmd}" >"${subscriber_log}" 2>&1
  ) &
  local subscriber_pid=$!

  if ! wait_for_topic_active "${topic}"; then
    echo "[${language}] topic did not become active" | tee -a "${SUMMARY_LOG}"
    kill "${subscriber_pid}" >/dev/null 2>&1 || true
    return 1
  fi

  (
    cd "${ROOT_DIR}"
    GATEWAY_URL="${GATEWAY_URL}" TOPIC="${topic}" EVENT_ID="${event_id}" API_KEY="${API_KEY}" PAYLOAD="${payload}" \
      bash -lc "${publisher_cmd}" >"${publisher_log}" 2>&1
  )

  if ! wait_with_timeout "${subscriber_pid}" "${timeout_seconds}"; then
    echo "[${language}] subscriber timed out" | tee -a "${SUMMARY_LOG}"
    kill "${subscriber_pid}" >/dev/null 2>&1 || true
    return 1
  fi

  grep -q "${event_id}" "${subscriber_log}"
  grep -q "${payload}" "${subscriber_log}"

  echo "[${language}] ok" | tee -a "${SUMMARY_LOG}"
}

cleanup() {
  if [[ -n "${WRANGLER_PID:-}" ]]; then
    kill "${WRANGLER_PID}" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

: >"${SUMMARY_LOG}"
echo "started: $(date -u +%Y-%m-%dT%H:%M:%SZ)" | tee -a "${SUMMARY_LOG}"

(
  cd "${ROOT_DIR}"
  pnpm --filter @tideway/gateway dev --ip 127.0.0.1 --port 8787 >"${WRANGLER_LOG}" 2>&1
) &
WRANGLER_PID=$!

wait_for_health

echo "gateway ready at ${GATEWAY_URL}" | tee -a "${SUMMARY_LOG}"

run_case "typescript" "pnpm exec tsx examples/typescript/subscriber.ts" "pnpm exec tsx examples/typescript/publisher.ts" 60
run_case "python" "python3 examples/python/subscriber.py" "python3 examples/python/publisher.py" 60
run_case "go" "go run ./examples/go/subscriber" "go run ./examples/go/publisher" 60
run_case "rust" "cargo run --quiet --manifest-path examples/rust/Cargo.toml --bin subscriber" "cargo run --quiet --manifest-path examples/rust/Cargo.toml --bin publisher" 180

echo "completed: $(date -u +%Y-%m-%dT%H:%M:%SZ)" | tee -a "${SUMMARY_LOG}"
