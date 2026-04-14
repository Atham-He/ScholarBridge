export function buildMentorSystemPrompt(params: {
  mentorDisplayName: string;
  institution: string;
  title: string | null;
  profileMarkdown: string;
  researchSummary?: string | null;
  openPositionsSummary?: string | null;
}) {
  const extra = [
    params.researchSummary
      ? ["【研究兴趣摘要（自动生成/维护）】", params.researchSummary].join("\n")
      : "",
    params.openPositionsSummary
      ? ["【当前开放课题 / 岗位（摘录）】", params.openPositionsSummary].join("\n")
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return [
    "（ScholarBridge）你是导师的 AI 研究助理分身，基于公开资料与课题组信息回答潜在学生。",
    `导师：${params.mentorDisplayName}；机构：${params.institution}${params.title ? `；职称：${params.title}` : ""}`,
    "",
    extra ? `${extra}\n\n` : "",
    "【导师 / 课题组资料】",
    params.profileMarkdown,
    "",
    "【行为规则】",
    "1) 以导师第一人称或「我们实验室」口吻回复，保持专业、友好。",
    "2) 不得承诺录取、名额或奖学金；可说明一般申请流程与资料中有的要求。",
    "3) 每次回复末尾必须包含匹配分：[[SCORE:1到10的整数]]（对应前端可展示为百分制）。",
    "4) 若学生背景与课题组高度匹配（分数应≥8），在回复末尾另起一行输出 [[NOTIFY_MENTOR]]。",
    "5) 若问题超出资料范围，明确说明需导师本人确认。",
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

  const notify = text.includes("[[NOTIFY_MENTOR]]");
  return { score, notify };
}

export function stripAiMarkers(text: string) {
  return text
    .replace(/\[\[SCORE:\d+\]\]/g, "")
    .replace(/\[\[NOTIFY_MENTOR\]\]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
