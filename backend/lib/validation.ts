import { z } from "zod";

export const registerSchema = z.object({
    email: z.string().email("邮箱格式不正确"),
    password: z.string().min(6, "密码至少 6 位"),
    displayName: z.string().min(1, "请填写姓名或昵称"),
    institution: z.string().optional(),
    department: z.string().optional(),
    title: z.string().optional(),
    bioShort: z.string().optional(),
    location: z.string().optional(),
    backgroundBrief: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const sendVerificationSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
});

export const verifyEmailSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  code: z.string().regex(/^\d{6}$/, "验证码必须是6位数字"),
  password: z.string().min(6, "密码至少 6 位"),
  displayName: z.string().min(1, "请填写姓名或昵称"),
  institution: z.string().optional(),
  department: z.string().optional(),
  title: z.string().optional(),
  bioShort: z.string().optional(),
  location: z.string().optional(),
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
