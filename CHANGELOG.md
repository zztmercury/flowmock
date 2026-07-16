# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-07-16

### Added
- Charles-style mock rules: map local / map remote / breakpoint / patch
- PB (protobuf) auto-detection via Charles self-describing Content-Type rule
- PB + JSON unified dict decoding — AI agent patches fields by path, never touches wire format
- Dict-to-PB auto-encode for map-local (provide JSON dict, auto-encode to PB)
- One-line installer: `curl | sh` (cross-platform Python 3.10+ detection, PATH auto-config)
- CLI tool maintenance: `skill install`, `update`, `version`, `doctor`, `start/stop/restart`
- Persistent `rules.yaml` with real-time writeback (survives restart)
- LRU flow_store (500 cap) + path validation (400 + hint on invalid path)
- `patch_error` exposed in `decode` output — Agent can see why encode failed
- `decode --original` to compare pre-patch vs post-patch data
- `flows --filter <regex>` / `--paused` / `clear`
- `breakpoint` per-URL pause (verified end-to-end: pause → mock → resume → client receives mocked response)
- E2E tests: breakpoint pause/mock/resume/abort, PB patch rule
- Version checking via GitHub Releases API (1h cache, non-blocking)
- SKILL.md: PB type gotchas (int64 as string, enum as string name, Any @type metadata)

### Fixed
- `echo -e` → `printf` for sh compatibility (curl | sh mode)
- `find_prefix` skips hidden tool dirs (`.bun/bin`, `.cargo/bin`, etc.)
- `original_data` deepcopy (was shallow reference — `--original` showed patched data)
- Patch encode failure no longer corrupts decoded view (work on deepcopy, update only on success)
- `start.sh`: `mitmweb` → `mitmdump` (no web UI needed)
- `cmd_start`: `os.execv` (blocking) → `subprocess.Popen` (background daemon, non-blocking)
- `cmd_stop`: match `flowmock_addon` in command line (not `mitmdump` process name)
- Install URL branch `master` → `main`
- `--prefix` mkdir before symlink
