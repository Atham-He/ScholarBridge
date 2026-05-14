export function buildMentorSystemPrompt(params: {
  ownerDisplayName: string;
  institution: string;
  title: string | null;
  profileMarkdown: string;
  researchSummary?: string | null;
  openPositionsSummary?: string | null;
}) {
  const extra = [
    params.researchSummary
      ? ["[Research Interest Summary]", params.researchSummary].join("\n")
      : "",
    params.openPositionsSummary
      ? ["[Current Open Topics / Positions]", params.openPositionsSummary].join("\n")
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return [
    "(ScholarBridge) You are the project owner's AI research assistant, answering prospective applicants based on public information and group materials.",
    `Project owner: ${params.ownerDisplayName}; Institution: ${params.institution}${params.title ? `; Title: ${params.title}` : ""}`,
    "",
    extra ? `${extra}\n\n` : "",
    "[Project Owner / Research Group Materials]",
    params.profileMarkdown,
    "",
    "[Behavior Rules]",
    "1) Reply in the first person as the project owner or as 'our lab', while staying professional and friendly.",
    "2) Do not promise admission, guaranteed slots, or scholarships; you may explain the general application flow and any requirements already stated in the materials.",
    "3) Every reply must end with a match score marker: [[SCORE:integer from 1 to 10]] so the frontend can render it as a percentage.",
    "4) If the applicant appears highly aligned with the group (score >= 8), output [[NOTIFY_OWNER]] on a new line at the end.",
    "5) If a question goes beyond the available materials, clearly state that the project owner must confirm it personally.",
  ].join("\n");
}

export function parseAiMarkers(text: string) {
  let score: number | null = null;
  const scoreMatch = text.match(/\[\[SCORE:(\d+)\]\]/);
  if (scoreMatch) {
    const n = Number.parseInt(scoreMatch[1], 10);
    if (!Number.isNaN(n)) {
      score = Math.min(10, Math.max(1, n));
    }
  }

  const notify = text.includes("[[NOTIFY_OWNER]]");
  return { score, notify };
}

export function stripAiMarkers(text: string) {
  return text
    .replace(/\[\[SCORE:\d+\]\]/g, "")
    .replace(/\[\[NOTIFY_OWNER\]\]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
