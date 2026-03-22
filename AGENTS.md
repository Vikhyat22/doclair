<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Doclair Conventions
- Domain: doclair.in — never use doclair.com anywhere
- AI API: OpenCode Go (MiniMax M2.7) via Anthropic-compatible SDK.
  Base URL: https://opencode.ai/zen/go/v1
  Switch to direct Anthropic API for production by changing
  AI_BASE_URL and AI_API_KEY env vars.
