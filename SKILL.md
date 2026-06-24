---
name: mitmproxy-mock
description: Capture and mock protobuf (Charles self-describing rule) / JSON responses via mitmproxy. The addon auto-detects protocol and decodes to dict; AI patches fields by path. Trigger when user says "抓包","mock 数据","改接口返回","看 PB/JSON 响应","mitmproxy-mock","改 protobuf","改返回数据","造测试数据".
---

# mitmproxy-mock — Agent Guide

A mitmproxy addon auto-detects the protocol (protobuf or JSON) of every captured
HTTP response and decodes it into a plain **dict/list**. You operate it via the
`mitmproxy-mock` CLI. **You never touch protobuf wire format** — you read/modify
dict fields by `path`, exactly like editing JSON. PB and JSON are identical at
the operation layer.

## 1. Prerequisites — check FIRST, every time

Run `mitmproxy-mock health` before anything else. Interpret the result:

| result | meaning | action |
|---|---|---|
| connection refused / error | mitmproxy not running | Ask user to run `~/Projects/mitmproxy-mock/start.sh`. **Stop** until they confirm. |
| `{"ok": true, "flow_count": 0}` | addon up but no traffic | Proxy/cert not ready OR app idle. Ask user to operate the app (open a page / search) to trigger traffic, then re-check. If still 0 after app activity → cert not installed or device proxy not set (guide: device visits http://mitm.it to install CA; `adb reverse tcp:8080 tcp:8080` + `adb shell settings put global http_proxy 127.0.0.1:8080`). |
| `{"ok": true, "flow_count": N>0}` | ready | proceed to workflow |

Never assume mitmproxy is running — always verify with `health` first.

## 2. Standard workflow — follow this order

**Step 1 — Find the target flow:**
```
mitmproxy-mock flows
```
Output: `<id>  METHOD STATUS [protocol] URL [ERR]`. Note the `id` (first 8 chars
accepted) and `protocol` (`protobuf`/`json`) of the flow you want to mock.
- Filter by eye: look for the URL path matching the feature you're testing.
- `[protobuf]` = PB interface (decoded via Charles desc rule); `[json]` = JSON.
- `ERR:...` = that flow failed to decode — see Troubleshooting.

**Step 2 — Inspect the decoded structure:**
```
mitmproxy-mock decode <id>
```
Returns `{protocol, messageType, desc, content_type, data: {...}}`. Read `data`
to find the exact field `path` you want to change. PB `data` may contain
`@type` (a google.protobuf.Any expanded into a concrete message) — navigate into
it like normal nested dict.

**Step 3 — Decide mock mode:**
- **One specific request, one-time change** → single-shot (`mock`).
  - But: a single-shot `mock` on an already-completed flow does NOT reach the
    client. To actually deliver it, either:
    - `intercept on` BEFORE the user triggers the request → flow pauses →
      `mock <id> ...` → `resume <id>`, OR
    - `mock <id> ...` then `replay <id>` (re-issues the request with modified response).
- **All future matching requests changed persistently** → continuous rule
  (`rules add`). This is usually what you want for building a mocked test env.

**Step 4 — Execute:**
- Single-shot (intercept path, recommended for one-time):
  ```
  mitmproxy-mock intercept on
  # ask user to trigger the request in app
  mitmproxy-mock flows          # find the new (paused) flow id
  mitmproxy-mock mock <id> <path> <value>
  mitmproxy-mock resume <id>
  mitmproxy-mock intercept off  # turn off when done
  ```
- Continuous rule:
  ```
  mitmproxy-mock rules add '<url_regex>' <path> <value> [--protocol pb|json]
  ```
  `<url_regex>` is matched with `re.search` against the full request URL. Quote
  it. Example: `'api/game'`, `'~q /search'`-style is NOT needed — just a substring/regex of the URL.

**Step 5 — Verify:**
```
mitmproxy-mock decode <id>      # shows the (mocked) decoded data
mitmproxy-mock rules list       # confirm rules active
```
Or ask user to check the app screen.

## 3. Commands reference
```
mitmproxy-mock health                             # prerequisite check (ok + flow_count)
mitmproxy-mock flows                              # list flows + protocol tag
mitmproxy-mock decode <id>                        # full decoded dict + meta
mitmproxy-mock mock <id> <path> <value>           # patch ONE flow (single-shot)
mitmproxy-mock rules add <url_regex> <path> <value> [--protocol pb|json]
mitmproxy-mock rules list
mitmproxy-mock rules del <index>
mitmproxy-mock intercept on [--filter <expr>]     # pause flows for editing
mitmproxy-mock intercept off
mitmproxy-mock resume <id>                        # release intercepted flow
mitmproxy-mock replay <id>                        # replay a flow
mitmproxy-mock agent-doc                          # print this guide
```

## 4. Path & value syntax
- **path**: dot for nested field, `[n]` for list index.
  `game.name` · `items[0].id` · `data.list[0].list[0].brand.app.title`
- **value**: parsed as JSON if possible — `int` (`100`), `bool` (`true`/`false`),
  `null`, object (`{"k":"v"}`), array (`[1,2]`). Otherwise treated as string.
  In shell, quote strings: `"hello"`. For objects/arrays use single quotes
  around the JSON: `'{"k":"v"}'`.

## 5. Troubleshooting
- **`decode` returns `error: "Couldn't find message X"`**: the .desc loaded but
  message X's file failed to add (missing google well-known dep) — this is an
  addon bug, report it. Or `desc` URL unreachable / `messageType` wrong: check
  the `content_type` and `desc` fields in the decode output.
- **`decode` returns `error` other**: response not recognized as PB/JSON, or
  body malformed. Check `content_type` — must be `application/x-protobuf` (PB)
  or contain `json` (JSON).
- **mock didn't reach the client**: single-shot `mock` only updates the stored
  flow. Use `intercept on`→`mock`→`resume`, or `mock`+`replay`. Continuous rules
  apply only to NEW matching responses (after the rule is added).
- **`flow_count` stays 0**: see Prerequisites — cert/proxy/app-idle.
- **field path wrong / IndexError**: re-run `decode <id>` and copy the exact path
  from the dict structure. Paths are case-sensitive.

## 6. Notes
- Control API default: http://127.0.0.1:9090 (override via
  `MITMPROXY_MOCK_HOST` / `MITMPROXY_MOCK_PORT` env).
- Continuous rules apply at capture time; `decode` shows the (possibly mocked)
  decoded data.
- PB `delimited=true` responses decode to a JSON array; index into them with `[n]`.
