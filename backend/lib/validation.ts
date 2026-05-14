import { z } from "zod";

export const registerSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    displayName: z.string().min(1, "Please enter your name or nickname"),
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
  email: z.string().email("Please enter a valid email address"),
});

export const verifyEmailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  code: z.string().regex(/^\d{6}$/, "Verification code must be 6 digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  displayName: z.string().min(1, "Please enter your name or nickname"),
  institution: z.string().optional(),
  department: z.string().optional(),
  title: z.string().optional(),
  bioShort: z.string().optional(),
  location: z.string().optional(),
  backgroundBrief: z.string().optional(),
});

// Project validation schemas
export const projectCreateSchema = z.object({
  title: z.string().min(1, "Project title is required"),
  description: z.string().min(10, "Project description must be at least 10 characters"),
  researchArea: z.string().min(1, "Research area is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().optional(),
  location: z.string().optional(),
  requirements: z.string().optional(),
  capacity: z.number().int().min(1, "Capacity must be at least 1"),
});

export const projectUpdateSchema = projectCreateSchema.partial();
