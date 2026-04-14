import type { ApplicationStatus } from "@prisma/client";

const LABELS: Record<ApplicationStatus, string> = {
  CHATTING: "对话中",
  UNDER_REVIEW: "审核中",
  INTERVIEW_SCHEDULED: "已约面试",
  ACCEPTED: "已录取",
  REJECTED: "未通过",
  WITHDRAWN: "已撤回",
};

export function applicationStatusLabelZh(status: ApplicationStatus): string {
  return LABELS[status] ?? status;
}

/** 与 ScholarBridge 英文 UI 对齐的简短标签 */
export function applicationStatusLabelEn(status: ApplicationStatus): string {
  switch (status) {
    case "CHATTING":
      return "Chatting";
    case "UNDER_REVIEW":
      return "Under Review";
    case "INTERVIEW_SCHEDULED":
      return "Interview Scheduled";
    case "ACCEPTED":
      return "Accepted";
    case "REJECTED":
      return "Not Accepted";
    case "WITHDRAWN":
      return "Withdrawn";
    default:
      return status;
  }
}
