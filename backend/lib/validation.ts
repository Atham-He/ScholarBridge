import { z } from "zod";

export const registerSchema = z
  .object({
    email: z.string().email("邮箱格式不正确"),
    password: z.string().min(6, "密码至少 6 位"),
    role: z.enum(["MENTOR", "STUDENT"]),
    displayName: z.string().min(1, "请填写姓名或昵称"),
    institution: z.string().optional(),
    department: z.string().optional(),
    title: z.string().optional(),
    bioShort: z.string().optional(),
    location: z.string().optional(),
    backgroundBrief: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === "MENTOR") {
      if (!data.institution?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "导师需填写院校/机构",
          path: ["institution"],
        });
      }
    }
  });

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const publicationItemSchema = z.object({
  title: z.string().min(1),
  detail: z.string().min(1),
});

export const skillCreateSchema = z.object({
  title: z.string().min(1),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "slug 仅允许小写字母、数字与连字符"),
  profileMarkdown: z.string().min(10, "资料内容过短"),
  publish: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  hIndex: z.number().int().min(0).optional(),
  citationsDisplay: z.string().optional(),
  researchSummary: z.string().optional(),
  publications: z.array(publicationItemSchema).optional(),
  agentActive: z.boolean().optional(),
  agentIntro: z.string().optional(),
});

export const skillUpdateSchema = skillCreateSchema
  .omit({ slug: true, publish: true })
  .partial()
  .extend({
    profileMarkdown: z.string().min(10).optional(),
    publish: z.boolean().optional(),
    scholarSyncedAt: z.union([z.string().datetime(), z.null()]).optional(),
  });

export const skillProjectCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  status: z.enum(["OPEN", "CLOSED"]).optional(),
  metaTags: z.array(z.string()).optional(),
  sortOrder: z.number().int().optional(),
});

export const skillProjectPatchSchema = skillProjectCreateSchema.partial();

export const applicationMentorPatchSchema = z.object({
  status: z.enum([
    "CHATTING",
    "UNDER_REVIEW",
    "INTERVIEW_SCHEDULED",
    "ACCEPTED",
    "REJECTED",
    "WITHDRAWN",
  ]),
  interviewAt: z.string().datetime().optional().nullable(),
});

export const applicationCreateSchema = z.object({
  skillId: z.string().min(1),
});

export const chatSendSchema = z.object({
  conversationId: z.string().min(1),
  content: z.string().min(1).max(8000),
});

export const sendVerificationSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  role: z.enum(["MENTOR", "STUDENT"]),
});
