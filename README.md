# OpenCode Usage Monitor

Monitor Claude rate limits and API usage directly in your terminal.

![Demo](https://via.placeholder.com/600x300?text=Usage+Monitor+Demo)

## Features

- **Rate Limits**: Track 5-hour and 7-day Claude usage windows
- **Profile Info**: Display user, organization, and plan details
- **Auto-refresh**: Continuously update usage data
- **tmux Integration**: Run alongside OpenCode in split panes
- **Multiple Auth Sources**: Supports OpenCode and Claude Code credentials

## Quick Start

```bash
# Install
bun install

# Show rate limits (one-shot)
bun run cli --once

# Auto-refresh mode
bun run cli
```

## Authentication

The monitor automatically loads credentials from:

1. **OpenCode** (preferred): `~/.local/share/opencode/auth.json`
2. **Claude Code**: `~/.claude/.credentials.json`

To authenticate:

```bash
# Using OpenCode
opencode auth login

# Or using Claude Code
claude
```

## Usage

### Standalone CLI

```bash
# Show rate limits with auto-refresh
usage-monitor

# One-shot display
usage-monitor --once

# Show only rate limits (OAuth)
usage-monitor --oauth-only

# Show only API usage (requires Admin API key)
usage-monitor --api-only

# Custom config file
usage-monitor --config ~/.config/usage-monitor/config.yaml
```

### With tmux

```bash
# Start OpenCode with monitor in side pane
./bin/opencode-with-monitor

# With custom width (percentage)
./bin/opencode-with-monitor -w 30

# Custom session name
./bin/opencode-with-monitor -s myproject

# Generic: run any command with monitor
./bin/with-monitor -- opencode
./bin/with-monitor -- nvim .
./bin/with-monitor -l -- zsh  # monitor on left
```

### As OpenCode Plugin

Add to your `opencode.json`:

```json
{
  "plugins": ["opencode-usage-monitor"]
}
```

Then use the `/rate_limits` tool in chat.

## Configuration

Create `~/.config/usage-monitor/config.yaml`:

```yaml
anthropic:
  admin_api_key: ${ANTHROPIC_ADMIN_API_KEY}
  enabled: true

oauth:
  enabled: true
  show_profile: true

display:
  refresh_interval: 30

widget:
  width: 52
  style: rounded
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_ADMIN_API_KEY` | Admin API key for organization usage |
| `USAGE_MONITOR_REFRESH_INTERVAL` | Auto-refresh interval (seconds) |
| `USAGE_MONITOR_WIDTH` | tmux pane width percentage |
| `USAGE_MONITOR_SESSION` | Default tmux session name |

## Display

```
╭──────────── Claude Rate Limits ────────────╮
│ User: Duchang                              │
│ Org:  duchang.dev@gmail.com's Organization │
│ Plan: MAX                                  │
├────────────────────────────────────────────┤
│ 5-Hour:  ━━━━━━━━░░░░░░░░░░  44% (3h 1m)   │
│ 7-Day:   ━░░░░░░░░░░░░░░░░░   4% (166h 1m) │
├────────────────────────────────────────────┤
│ Updated: 1:58:04 AM                        │
╰────────────────────────────────────────────╯
```

## Development

```bash
# Install dependencies
bun install

# Type check
bun run typecheck

# Build
bun run build

# Run demo
bun run demo

# Lint
bun run lint
```

## Data Sources

### OAuth API (Default)

Uses Claude OAuth credentials to fetch:
- 5-hour rate limit window
- 7-day rate limit window
- User profile and organization info

### Admin API (Optional)

Requires `ANTHROPIC_ADMIN_API_KEY` for:
- Token usage (input/output)
- Cost tracking
- Claude Code usage metrics

Get your Admin API key from [Anthropic Console](https://console.anthropic.com) > Settings > Admin API Keys.

## License

MIT
