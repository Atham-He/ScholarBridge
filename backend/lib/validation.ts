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
  role: z
    .preprocess(
      (value) =>
        typeof value === "string" ? value.trim().toUpperCase() : value,
      z.enum(["MENTOR", "STUDENT"]),
    ),
});

export const sendVerificationSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  role: z.enum(["MENTOR", "STUDENT"]),
});

export const verifyEmailSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  code: z.string().regex(/^\d{6}$/, "验证码必须是6位数字"),
  role: z.enum(["MENTOR", "STUDENT"]),
  password: z.string().min(6, "密码至少 6 位"),
  displayName: z.string().min(1, "请填写姓名或昵称"),
  // Optional mentor fields
  institution: z.string().optional(),
  department: z.string().optional(),
  title: z.string().optional(),
  bioShort: z.string().optional(),
  location: z.string().optional(),
  // Optional student fields
  backgroundBrief: z.string().optional(),
});

// Project validation schemas
export const projectCreateSchema = z.object({
  title: z.string().min(1, "项目名称不能为空"),
  description: z.string().min(10, "项目简介至少10个字符"),
  researchArea: z.string().min(1, "研究方向不能为空"),
  startTime: z.string().min(1, "开始时间不能为空"),
  endTime: z.string().optional(),
  location: z.string().optional(),
  requirements: z.string().optional(),
  capacity: z.number().int().min(1, "招募人数至少为1"),
});

export const projectUpdateSchema = projectCreateSchema.partial();
