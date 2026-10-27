import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { GuideLimits, type Catalogue, type LookupResult, type ServiceEntry } from "./contracts.js";

const fillerWords = new Set([
  "a", "an", "and", "are", "can", "do", "find", "for", "help", "i", "in",
  "information", "is", "it", "me", "my", "need", "of", "on", "please",
  "service", "services", "some", "something", "the", "to", "want", "with",
  "you", "get", "started", "what", "would", "like", "s",
]);
const officialSources = new Set([
  "https://www.alberta.ca/renew-replace-drivers-licence",
  "https://www.alberta.ca/new-drivers-licence-and-identification-cards",
  "https://www.alberta.ca/lookup/find-a-registry-agent.aspx",
]);
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return value > "0001-01-01" && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value &&
    value <= new Date().toISOString().slice(0, 10);
}
export function hasReviewedSource(value: unknown): boolean {
  return record(value) && typeof value.sourceTitle === "string" && value.sourceTitle.trim().length > 0 &&
    typeof value.sourceUrl === "string" && officialSources.has(value.sourceUrl) && validDate(value.reviewedOn);
}
function isEntry(value: unknown): value is ServiceEntry {
  return record(value) && ["id", "title", "category", "summary", "nextStep"].every(
    key => typeof value[key] === "string" && value[key].trim().length > 0,
  ) && Array.isArray(value.keywords) && value.keywords.length > 0 &&
    value.keywords.every((word: unknown) => typeof word === "string" && word.trim().length > 0) &&
    hasReviewedSource(value);
}
function load(): readonly ServiceEntry[] {
  const parsed: unknown = JSON.parse(readFileSync(new URL("../../assets/services.json", import.meta.url), "utf8"));
  if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every(isEntry) ||
      new Set(parsed.map(entry => entry.id)).size !== parsed.length) {
    throw new Error("The renewal guidance contains invalid or duplicate entries, or missing official source/review metadata.");
  }
  return Object.freeze(parsed.map(entry => Object.freeze({ ...entry, keywords: Object.freeze([...entry.keywords]) })));
}
export const all = load();
export const revision = createHash("sha256").update(JSON.stringify(all)).digest("hex");
export function matchesSnapshot(value: unknown): value is ServiceEntry {
  if (!isEntry(value)) return false;
  const current = all.find(entry => entry.id === value.id);
  const fields = ["title", "category", "summary", "nextStep", "sourceTitle", "sourceUrl", "reviewedOn"] as const;
  return current !== undefined &&
    fields.every(
      key => current[key] === value[key],
    ) && current.keywords.length === value.keywords.length &&
    current.keywords.every((word, index) => word === value.keywords[index]);
}
const noMatch = (): LookupResult => ({
  status: "not_found",
  message: "This guide only covers Alberta driver's licence renewal. I do not have reviewed guidance for that question. Check Alberta.ca or contact a registry agent.",
  services: [],
});
export class ServiceCatalogue implements Catalogue {
  static readonly all = all;
  static readonly revision = revision;
  static readonly hasReviewedSource = hasReviewedSource;
  static readonly matchesSnapshot = matchesSnapshot;
  lookup(query: string): LookupResult {
    if (typeof query !== "string" || query.length > GuideLimits.queryLength) {
      throw new RangeError(`Use a query of at most ${GuideLimits.queryLength} characters.`);
    }
    const words = new Set((query.toLowerCase().match(/[\p{L}\p{Nd}]+/gu) ?? []).filter(word => !fillerWords.has(word)));
    if (words.size === 0) return {
      status: "needs_clarification",
      message: "Would you like help with renewing your driver's licence, what to bring, or finding a registry agent? Do not share personal details.",
      services: [],
    };
    if (["business", "fishing", "hunting", "vehicle", "registration", "tax", "taxes", "benefit", "benefits"].some(word => words.has(word)) &&
        !["driver", "drivers", "driving"].some(word => words.has(word))) return noMatch();
    const scored = all.map(service => ({ service, score: service.keywords.filter(word => words.has(word)).length }))
      .filter(match => match.score > 0);
    const specific = scored.filter(match => match.service.id !== "AB-RENEW-01");
    const services = (specific.length ? specific : scored).sort((a, b) =>
      b.score - a.score || (a.service.id < b.service.id ? -1 : a.service.id > b.service.id ? 1 : 0),
    ).slice(0, 3).map(match => match.service);
    return services.length ? {
      status: "found",
      message: "These are saved summaries of Alberta.ca guidance. Use each review date and official link to check current requirements; this is not a live website lookup.",
      services,
    } : noMatch();
  }
}
