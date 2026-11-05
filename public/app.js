const byId = (id) => document.getElementById(id);
const messageInput = byId("message");
const sendButton = byId("send");
let configured = false;
let initialized = false;
let resetting = false;
let activeRequest = null;
let requestGeneration = 0;
let sourceGeneration = 0;
let sourceText = "";
let composing = false;
const officialSources = new Set([
  "https://www.alberta.ca/renew-replace-drivers-licence",
  "https://www.alberta.ca/new-drivers-licence-and-identification-cards",
  "https://www.alberta.ca/lookup/find-a-registry-agent.aspx",
]);

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (response.status === 204) return null;
  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("json") ? await response.json() : null;
  if (!response.ok) {
    throw new Error(data?.detail ?? data?.title ?? `The request failed (HTTP ${response.status}). Try again.`);
  }
  if (data === null) throw new Error("The server returned an unexpected response.");
  return data;
}

function showError(message) {
  byId("error").textContent = message;
  byId("error").hidden = !message;
}

function sourceReference(service) {
  if (!service || !officialSources.has(service.sourceUrl) ||
      typeof service.sourceTitle !== "string" || !service.sourceTitle.trim() ||
      !/^\d{4}-\d{2}-\d{2}$/.test(service.reviewedOn)) {
    throw new Error("The guidance is missing a reviewed official source. Check the app and agent versions.");
  }
  const reviewed = new Date(`${service.reviewedOn}T00:00:00Z`);
  if (!Number.isFinite(reviewed.getTime()) || reviewed.toISOString().slice(0, 10) !== service.reviewedOn) {
    throw new Error("The guidance has an invalid review date.");
  }
  const reference = element("p", undefined, "source-reference");
  const link = element("a", `${service.sourceTitle} (Alberta.ca)`);
  link.href = service.sourceUrl;
  const time = element("time", `Source reviewed ${service.reviewedOn}`);
  time.dateTime = service.reviewedOn;
  reference.append(link, time);
  return reference;
}

function scrollConversation(force = false) {
  const body = document.querySelector(".conversation-body");
  if (force || body.scrollHeight - body.scrollTop - body.clientHeight < 100) {
    body.scrollTop = body.scrollHeight;
  }
}

function resizeComposer() {
  messageInput.style.height = "auto";
  messageInput.style.height = `${Math.min(messageInput.scrollHeight, 144)}px`;
}

function appendMessage(role, text, services = []) {
  const body = document.querySelector(".conversation-body");
  const follow = role === "user" || body.scrollHeight - body.scrollTop - body.clientHeight < 100;
  byId("welcome").hidden = true;
  const item = element("div", undefined, `message ${role}`);
  item.append(element("div", role === "user" ? "You" : "Renewal guide", "message-label"));
  item.append(element("div", text, "message-body"));
  if (services.length) {
    const citations = element("div", undefined, "message-sources");
    for (const service of services) {
      sourceReference(service);
      const link = element("a", `${service.id} / ${service.sourceTitle}`);
      link.href = service.sourceUrl;
      link.title = `Source reviewed ${service.reviewedOn}`;
      citations.append(link);
    }
    item.append(citations);
  }
  byId("messages").append(item);
  if (follow) scrollConversation(true);
}

function renderTurn(turn) {
  if (!turn || !turn.agent || typeof turn.answer !== "string" ||
      !Array.isArray(turn.services) || !Array.isArray(turn.toolActivity)) {
    throw new Error("The server returned an incomplete agent response.");
  }
  const serviceRows = turn.services.map((service) => {
    const reference = sourceReference(service);
    const item = element("li", undefined, "service");
    const heading = element("div", undefined, "service-head");
    heading.append(element("h4", service.title), element("span", service.id, "source-id"));
    item.append(heading, element("p", service.summary),
      element("p", `Next step: ${service.nextStep}`, "next-step"), reference);
    return item;
  });
  const labels = { foundry: "Foundry SDK", offline: "Offline rehearsal" };
  byId("run-implementation").textContent = labels[turn.agent.implementation] ?? turn.agent.implementation;
  byId("run-agent").textContent = turn.agent.name;
  byId("run-version").textContent = turn.agent.version;
  const badge = byId("mode-badge");
  badge.textContent = turn.agent.isLive ? "Live Foundry response" : "Offline rehearsal";
  badge.className = `mode-badge ${turn.agent.isLive ? "live" : "offline"}`;
  if (turn.agent.isLive) {
    byId("connection-notice").textContent = "Live agent response using saved Alberta.ca guidance. The website was not checked live.";
    byId("connection-notice").className = "notice";
  }

  byId("service-results").replaceChildren(...serviceRows);
  byId("results").hidden = turn.services.length === 0;

  byId("tool-activity").replaceChildren();
  byId("empty-evidence").hidden = turn.toolActivity.length > 0;
  byId("empty-evidence").textContent = "No lookup was needed for this reply.";
  for (const call of turn.toolActivity) {
    const item = element("li");
    const warning = ["unavailable", "invalid_input"].includes(call.status);
    item.append(element("code", call.name));
    item.append(element("p", `Query: ${call.query || "(invalid arguments)"}`));
    item.append(element("span", call.status.replaceAll("_", " "), `tool-state${warning ? " warning" : ""}`));
    item.append(element("p", call.sourceIds.length ? `Sources: ${call.sourceIds.join(", ")}` : call.message));
    byId("tool-activity").append(item);
  }
}

async function refreshConversation() {
  const history = await api("/api/conversation");
  byId("messages").replaceChildren();
  byId("welcome").hidden = history.messages.length > 0;
  for (const [index, message] of history.messages.entries()) {
    appendMessage(message.role, message.text,
      index === history.messages.length - 1 && message.role === "assistant"
        ? history.lastTurn?.services ?? [] : []);
  }
  if (history.lastTurn) renderTurn(history.lastTurn);
  else {
    byId("results").hidden = true;
    byId("tool-activity").replaceChildren();
    byId("empty-evidence").hidden = false;
    byId("empty-evidence").textContent = "Send a request to see the actual lookup and source IDs here.";
    byId("run-implementation").textContent = "Not called yet";
    byId("run-agent").textContent = "Not called yet";
    byId("run-version").textContent = "Not verified";
  }
}

function setPending(pending) {
  sendButton.disabled = pending || resetting || !initialized || !configured;
  byId("stop").hidden = !pending;
  sendButton.hidden = pending;
  byId("reset").disabled = pending || resetting || !initialized;
  byId("request-status").hidden = !pending;
  byId("messages").setAttribute("aria-busy", String(pending));
  document.querySelectorAll("[data-prompt]").forEach(button => {
    button.disabled = pending || resetting || !initialized || !configured;
  });
}

async function loadStatus() {
  const status = await api("/api/status");
  configured = status.configured;
  byId("connection-notice").textContent = status.notice;
  byId("connection-notice").className = `notice${status.mode === "offline" || !configured ? " warning" : ""}`;
  byId("mode-badge").textContent = status.mode === "offline" ? "Offline rehearsal" : configured ? "Ready to connect" : "Setup needed";
  byId("mode-badge").className = `mode-badge${status.mode === "offline" ? " offline" : ""}`;
  if (status.mode === "offline") {
    byId("flow-agent").textContent = "Local rehearsal code";
    byId("flow-agent-detail").textContent = "Deterministic responses. No model calls.";
  }
}

document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    messageInput.value = button.dataset.prompt;
    resizeComposer();
    messageInput.focus();
  });
});

messageInput.addEventListener("input", resizeComposer);
messageInput.addEventListener("compositionstart", () => { composing = true; });
messageInput.addEventListener("compositionend", () => { composing = false; resizeComposer(); });
messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing && !composing && event.keyCode !== 229) {
    event.preventDefault();
    if (!activeRequest && configured && initialized && !resetting) byId("chat-form").requestSubmit();
  }
});

byId("chat-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (activeRequest || !configured || !initialized || resetting) return;
  if (!text) {
    showError("Enter a message before sending.");
    messageInput.focus();
    return;
  }
  const generation = ++requestGeneration;
  activeRequest = new AbortController();
  const controller = activeRequest;
  showError("");
  setPending(true);
  appendMessage("user", text);
  messageInput.value = "";
  resizeComposer();
  try {
    const turn = await api("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: text }),
      signal: controller.signal,
    });
    if (generation !== requestGeneration) return;
    renderTurn(turn);
    appendMessage("assistant", turn.answer, turn.services);
  } catch (error) {
    if (generation !== requestGeneration) return;
    showError(error.name === "AbortError"
      ? "Request stopped. Your message is ready to try again; the thread shows the last saved reply."
      : error.message);
    if (!messageInput.value) messageInput.value = text;
    resizeComposer();
    try { await refreshConversation(); }
    catch (refreshError) { showError(`${error.message} The saved conversation could not be refreshed: ${refreshError.message}`); }
  } finally {
    if (generation === requestGeneration) {
      activeRequest = null;
      setPending(false);
      messageInput.focus();
    }
  }
});

byId("stop").addEventListener("click", () => activeRequest?.abort());
byId("reset").addEventListener("click", async () => {
  if (activeRequest || resetting || !initialized) return;
  resetting = true;
  setPending(false);
  try {
    await api("/api/conversation/reset", { method: "POST" });
    await loadStatus();
    await refreshConversation();
    showError("");
    messageInput.value = "";
    resizeComposer();
    messageInput.focus();
  } catch (error) {
    showError(error.message);
  } finally {
    resetting = false;
    setPending(false);
  }
});

async function loadSource(example) {
  const generation = ++sourceGeneration;
  byId("code-status").textContent = "";
  try {
    const result = await api(`/api/examples/${encodeURIComponent(example)}`);
    if (generation !== sourceGeneration) return;
    sourceText = result.source;
    byId("copy-code").disabled = false;
    byId("source-code").textContent = result.source;
    byId("code-file").textContent = result.file;
    document.querySelectorAll("[data-example]").forEach((button) =>
      button.setAttribute("aria-pressed", String(button.dataset.example === example)));
  } catch (error) {
    if (generation === sourceGeneration) byId("code-status").textContent = error.message;
  }
}
document.querySelectorAll("[data-example]").forEach((button) =>
  button.addEventListener("click", () => loadSource(button.dataset.example)));
document.querySelector(".code-link").addEventListener("click", () => { byId("code-lab").open = true; });
byId("copy-code").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(sourceText);
    byId("code-status").textContent = "Code copied.";
  } catch {
    byId("code-status").textContent = "Clipboard access was blocked. Select the code and copy it manually.";
  }
});

async function start() {
  try {
    await loadStatus();
    await refreshConversation();
    initialized = true;
    setPending(false);
    const catalogue = await api("/api/catalogue");
    for (const service of catalogue) {
      const item = element("li", service.title);
      item.append(element("span", `${service.id} / ${service.category}`));
      item.append(sourceReference(service));
      byId("catalogue").append(item);
    }
    const reviewDates = [...new Set(catalogue.map((service) => service.reviewedOn))];
    byId("guidance-note").textContent = reviewDates.length === 1
      ? `Guidance reviewed ${reviewDates[0]} (UTC). Saved Alberta.ca summaries, not a live website check. Check the official pages before you act.`
      : "Review dates are shown with each topic. Saved Alberta.ca summaries, not a live website check. Check the official pages before you act.";
    await loadSource("native");
  } catch (error) {
    showError(`The app could not finish loading: ${error.message}`);
  }
}
start();
