/** ScholarBridge 风格 API 映射（与 frontend-example 字段对齐） */

export function mentorInitials(displayName: string): string {
  const parts = displayName
    .replace(/^Prof\.|^Dr\.|^Mr\.|^Ms\.|^Mrs\./gi, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function parseStringArrayJson(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.filter((x): x is string => typeof x === "string");
  }
  return [];
}

export type PublicationItem = { title: string; detail: string };

export function parsePublicationsJson(value: unknown): PublicationItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      if (row && typeof row === "object" && "title" in row) {
        const o = row as { title?: unknown; detail?: unknown };
        const title = typeof o.title === "string" ? o.title : "";
        const detail = typeof o.detail === "string" ? o.detail : "";
        if (title) return { title, detail };
      }
      return null;
    })
    .filter((x): x is PublicationItem => x !== null);
}

/** 数据库存 1–10 分，前端展示为 /100 */
export function aiScoreToPercent(score: number | null | undefined): number | null {
  if (score == null || Number.isNaN(score)) return null;
  return Math.round(Math.min(10, Math.max(1, score)) * 10);
}

export function agentBadgeVariant(skill: {
  agentActive: boolean;
}): "green" | "gold" | "blue" | "learning" {
  if (!skill.agentActive) return "learning";
  return "green";
}
