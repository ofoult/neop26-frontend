#!/usr/bin/env bash
# Summarizes the structured JSON access logs written by
# server/request-logger.js (one `{"type":"http_request",...}` object per
# line to stdout) into the bot-vs-human traffic breakdown described in
# CLAUDE.md's Logging section.
#
# Usage:
#   ./scripts/traffic-report.sh access.log
#   docker logs <container> --since 24h 2>&1 | ./scripts/traffic-report.sh
#   docker logs <container> --since 24h 2>&1 \
#     | jq -c 'select(.timestamp | startswith("2026-09-14"))' \
#     | ./scripts/traffic-report.sh          # a single calendar day
#
# Requires: jq, column (both standard on any normal Linux host, including
# the Coolify VM this deploys to — no new dependency for the app itself).
set -euo pipefail

INPUT="${1:-/dev/stdin}"

jq -s -r '
  def gb: (. / 1000000000 * 100 | round) / 100;

  [.[] | select(.type == "http_request")] as $logs
  | ($logs | length) as $total_requests
  | ($logs | map(.response_bytes) | add // 0) as $total_bytes
  | ($logs | map(select(.is_bot))) as $bot_logs
  | ($logs | map(select(.is_bot | not))) as $human_logs
  | ($bot_logs
      | group_by(.bot_name)
      | map({
          name: .[0].bot_name,
          requests: length,
          bytes: (map(.response_bytes) | add // 0),
        })
      | sort_by(-.bytes)
    ) as $by_bot
  | ($logs
      | group_by(.path)
      | map({ path: .[0].path, requests: length, bytes: (map(.response_bytes) | add // 0) })
      | sort_by(-.bytes)
      | .[0:20]
    ) as $top_urls
  | ($logs
      | group_by(.client_ip)
      | map({ ip: .[0].client_ip, requests: length, bytes: (map(.response_bytes) | add // 0) })
      | sort_by(-.bytes)
      | .[0:20]
    ) as $top_ips
  | ($logs
      | group_by(.path)
      | map({ path: .[0].path, requests: length, bytes: (map(.response_bytes) | add // 0) })
      | sort_by(-.requests)
      | length
    ) as $route_count

  | "=== Traffic report ===",
    "Requests: \($total_requests)    Data out: \($total_bytes | gb) GB    Distinct routes: \($route_count)",
    "",
    "BOT\tREQUESTS\tDATA OUT\tAVG RESPONSE",
    ($by_bot[] | "\(.name)\t\(.requests)\t\(.bytes | gb) GB\t\((.bytes / .requests) | round) bytes"),
    "All bots (total)\t\($bot_logs | length)\t\($bot_logs | map(.response_bytes) | add // 0 | gb) GB\t-",
    "Real users\t\($human_logs | length)\t\($human_logs | map(.response_bytes) | add // 0 | gb) GB\t-",
    "",
    "TOP 20 URLS BY DATA OUT\tREQUESTS\tDATA OUT",
    ($top_urls[] | "\(.path)\t\(.requests)\t\(.bytes | gb) GB"),
    "",
    "TOP 20 CLIENT IPs BY DATA OUT\tREQUESTS\tDATA OUT",
    ($top_ips[] | "\(.ip)\t\(.requests)\t\(.bytes | gb) GB")
' "$INPUT" | column -t -s $'\t'
