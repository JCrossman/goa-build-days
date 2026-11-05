# Renewal guide interface

The app is a workshop workbench, not a government portal or a marketing page.
Keep the Alberta driver's licence renewal purpose clear in a familiar,
message-first interface inspired by everyday messaging apps, without copying
Apple branding or assets.

- Use the system UI font, a light cool-grey background, white work surfaces,
  navy text, and blue actions. Right-align outgoing messages in blue bubbles;
  left-align guide replies in cool-grey bubbles. Keep the typography at a
  readable system UI scale.
- Show renewal guidance as readable rows with official links, source review
  dates, and explicit next steps. Keep renewal and registry links visible even
  without an agent connection.
- Keep configuration, live responses, and offline rehearsal visibly distinct.
- A live agent response is not a live website check; label saved guidance honestly.
- Show actual tool activity, never simulated progress or hidden model reasoning.
- Keep a scrollable thread above a compact, growing bottom composer and circular
  send/stop controls. Enter sends, Shift+Enter adds a line, and IME composition
  never submits. Do not pull readers away from earlier messages while they scroll.
- Put source citations beside replies and detailed latest sources, real agent/tool
  evidence, and code examples in accessible disclosures below or within the chat.
  Preserve the visible workshop disclaimer, official links, and synthetic-data notice.
- Keep the evidence below the conversation on all screens. Preserve keyboard
  navigation, visible focus, readable contrast, and reduced-motion support.
- Keep code inspection in the page. Avoid extra dialogs, dashboards, and decoration.

The implementation's design tokens live in `public/app.css`.
