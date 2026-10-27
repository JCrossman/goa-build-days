import { randomBytes } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { AgentTurn, DialogueMessage } from "../shared/contracts.js";

export class Gate {
  private held = false;
  private readonly waiters: Array<() => void> = [];
  tryAcquire(): boolean {
    if (this.held) return false;
    this.held = true;
    return true;
  }
  async acquire(signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();
    if (this.tryAcquire()) return;
    await new Promise<void>((resolve, reject) => {
      const ready = (): void => {
        signal.removeEventListener("abort", aborted);
        resolve();
      };
      const aborted = (): void => {
        const index = this.waiters.indexOf(ready);
        if (index >= 0) this.waiters.splice(index, 1);
        reject(signal.reason);
      };
      this.waiters.push(ready);
      signal.addEventListener("abort", aborted, { once: true });
    });
  }
  release(): void {
    const next = this.waiters.shift();
    if (next) next();
    else this.held = false;
  }
}
export class Conversation {
  readonly gate = new Gate();
  readonly messages: DialogueMessage[] = [];
  lastTurn: AgentTurn | null = null;
}
export class ConversationStore {
  static readonly cookieName = "service-guide-session";
  private readonly entries = new Map<string, { conversation: Conversation; touched: number }>();
  constructor(private readonly now: () => number = Date.now) {}
  get(request: FastifyRequest, reply: FastifyReply): Conversation {
    const now = this.now();
    for (const [key, entry] of this.entries) {
      if (now - entry.touched >= 20 * 60_000) this.entries.delete(key);
    }
    const key = request.cookies[ConversationStore.cookieName];
    const found = key && /^[0-9a-f]{32}$/i.test(key) ? this.entries.get(key) : undefined;
    if (found && key) {
      found.touched = now;
      this.entries.delete(key);
      this.entries.set(key, found);
      return found.conversation;
    }
    while (this.entries.size >= 100) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    const conversation = new Conversation();
    const newKey = randomBytes(16).toString("hex");
    this.entries.set(newKey, { conversation, touched: now });
    reply.setCookie(ConversationStore.cookieName, newKey, {
      httpOnly: true, secure: request.protocol === "https", sameSite: "strict", path: "/",
    });
    return conversation;
  }
  reset(request: FastifyRequest, reply: FastifyReply): void {
    const key = request.cookies[ConversationStore.cookieName];
    if (key && /^[0-9a-f]{32}$/i.test(key)) this.entries.delete(key);
    reply.clearCookie(ConversationStore.cookieName, { path: "/", sameSite: "strict" });
  }
}
