# OpenCode Usage Monitor - Project Scope

## Vision

opencode/터미널에서 Claude 사용량을 **지속적으로** 모니터링하는 위젯.
LLM 요청 없이 백그라운드에서 자동 갱신되며, 두 가지 데이터를 통합 표시.

## Target Metrics

### 1. Claude.ai Rate Limits (소비자 플랜)

이미지 참조: Claude.ai 설정 > 사용량 페이지

```
┌─────────────────────────────────────────┐
│  📊 Claude.ai Limits                    │
│  ─────────────────────────────────────  │
│  Session:  ━━━━░░░░░░ 16%  (3h 58m)    │
│  Weekly:   ━░░░░░░░░░  2%  (Wed 11:59) │
│  Sonnet:   ░░░░░░░░░░  0%  (Wed 11:59) │
└─────────────────────────────────────────┘
```

- **Session Limit**: 현재 세션 사용량 % (몇 시간마다 리셋)
- **Weekly All Models**: 주간 전체 모델 사용량 %
- **Weekly Sonnet**: Sonnet 전용 주간 사용량 %
- **Reset Timer**: 리셋까지 남은 시간

### 2. API Usage (Anthropic Admin API)

```
┌─────────────────────────────────────────┐
│  📈 API Usage (This Month)              │
│  ─────────────────────────────────────  │
│  Tokens:  1.2M input / 450K output      │
│  Cost:    $47.25 USD                    │
│  Claude Code: 2,341 requests            │
└─────────────────────────────────────────┘
```

- **Token Usage**: 입력/출력 토큰
- **Cost**: 월간 API 비용
- **Claude Code Metrics**: 요청 수, 사용자별 통계

## Data Sources

### Official: Anthropic Admin API

```bash
# Cost Report
GET https://api.anthropic.com/v1/organizations/cost_report
Authorization: x-api-key {ADMIN_API_KEY}

# Claude Code Usage
GET https://api.anthropic.com/v1/organizations/usage_report/claude_code
```

**Requirements:**

- Admin API Key (Console > API Keys > Admin)
- Organization 레벨 권한

### Unofficial: Claude.ai Rate Limits

Claude.ai는 rate limit 데이터 API를 제공하지 않음. 옵션:

1. **Browser Session 방식**
   - Claude.ai 로그인 후 쿠키 추출
   - 내부 API 엔드포인트 호출 (리버스 엔지니어링 필요)
   - 불안정, 언제든 변경 가능

2. **Manual Input 방식**
   - 사용자가 직접 limit 정보 입력
   - 안정적이지만 자동화 불가

3. **추후 공식 API 대기**
   - Anthropic이 rate limit API 제공 시 전환

## Architecture

### Display: tmux Split + Standalone CLI

```
┌─────────────────────────────────────────────────────────┐
│  Terminal (tmux)                                        │
│  ┌─────────────────────┬───────────────────────────────┐│
│  │ usage-monitor       │ opencode                      ││
│  │ (standalone)        │ (main TUI)                    ││
│  │                     │                               ││
│  │ ╭─ Claude Limits ─╮ │                               ││
│  │ │ Session: 16%    │ │                               ││
│  │ │ Weekly:  2%     │ │                               ││
│  │ ╰─────────────────╯ │                               ││
│  │                     │                               ││
│  │ ╭─ API Usage ─────╮ │                               ││
│  │ │ Cost: $47.25    │ │                               ││
│  │ │ Tokens: 1.2M    │ │                               ││
│  │ ╰─────────────────╯ │                               ││
│  └─────────────────────┴───────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Components

```
opencode-usage-monitor/
├── src/
│   ├── cli/              # Standalone CLI entry point
│   │   ├── index.ts      # Main CLI command
│   │   └── commands/     # Subcommands
│   ├── data/             # Data fetching layer
│   │   ├── admin-api.ts  # Anthropic Admin API client
│   │   ├── claude-ai.ts  # Claude.ai rate limit (unofficial)
│   │   └── cache.ts      # Data caching
│   ├── tui/              # TUI rendering (existing)
│   │   ├── widget.ts     # Usage widget
│   │   ├── progress.ts   # Progress bar component
│   │   └── ...
│   ├── config/           # Configuration
│   │   └── schema.ts     # Config validation
│   └── plugin/           # OpenCode plugin (optional)
│       └── index.ts      # Plugin entry point
├── bin/
│   └── usage-monitor     # CLI binary
└── ...
```

## Implementation Phases

### Phase 1: Anthropic Admin API Integration

- [ ] Admin API client 구현
- [ ] Cost report fetching
- [ ] Claude Code usage report
- [ ] CLI 표시

### Phase 2: TUI Widget Enhancement

- [ ] Progress bar 컴포넌트
- [ ] 다중 데이터 소스 통합 표시
- [ ] Auto-refresh 구현
- [ ] 설정 파일 지원

### Phase 3: Claude.ai Rate Limits (Optional)

- [ ] 내부 API 리버스 엔지니어링 조사
- [ ] Browser session 기반 구현 (가능 시)
- [ ] 또는 manual input fallback

### Phase 4: Integration

- [ ] tmux 통합 스크립트
- [ ] opencode plugin hook (가능 시)
- [ ] 문서화

## Configuration

```yaml
# ~/.config/usage-monitor/config.yaml
anthropic:
  admin_api_key: ${ANTHROPIC_ADMIN_API_KEY}

display:
  refresh_interval: 30 # seconds
  show_api_usage: true
  show_rate_limits: true # requires unofficial method

widget:
  width: 40
  style: rounded
  position: left # for tmux split
```

## CLI Usage

```bash
# Install globally
npm install -g opencode-usage-monitor

# Run standalone monitor
usage-monitor

# Run with specific config
usage-monitor --config ~/.config/usage-monitor/config.yaml

# One-shot display (no auto-refresh)
usage-monitor --once

# API usage only (skip rate limits)
usage-monitor --api-only
```

## Current Status

### ✅ Completed

- TUI widget rendering (ANSI, box drawing)
- Position/toggle/style configuration
- Interactive demo
- Basic provider structure

### 🔄 In Progress

- Project scope clarification (this document)

### ⏳ TODO

- Anthropic Admin API client
- Progress bar component
- Auto-refresh mechanism
- CLI binary setup
- tmux integration
- Configuration file support

## References

- Anthropic Admin API: https://docs.anthropic.com/en/api/admin-api
- Claude.ai Settings: https://claude.ai/settings/usage
- opencode: https://github.com/opencode-ai/opencode
