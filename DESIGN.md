# Renewal guide interface

The app is a workshop workbench, not a government portal or a marketing page.
Keep the Alberta driver's licence renewal purpose clear, with the conversation
prominent and its evidence alongside it.

- Use the system UI font, a light cool-grey background, white work surfaces,
  navy text, and blue actions.
- Show renewal guidance as readable rows with official links, source review
  dates, and explicit next steps. Keep renewal and registry links visible even
  without an agent connection.
- Keep configuration, live responses, and offline rehearsal visibly distinct.
- A live agent response is not a live website check; label saved guidance honestly.
- Show actual tool activity, never simulated progress or hidden model reasoning.
- Stack the evidence below the conversation on narrow screens. Preserve keyboard
  navigation, visible focus, readable contrast, and reduced-motion support.
- Keep code inspection in the page. Avoid extra dialogs, dashboards, and decoration.

The implementation's design tokens live in `src/ServiceGuide.Web/wwwroot/app.css`.
