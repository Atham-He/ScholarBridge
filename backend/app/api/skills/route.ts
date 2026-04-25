import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { createPersonaForMentor } from "@/lib/persona/manager";
import {
  agentBadgeVariant,
  mentorInitials,
  parseStringArrayJson,
} from "@/lib/scholarbridge";
import { skillCreateSchema } from "@/lib/validation";

type PublicationItem = {
  title: string;
  detail: string;
};

type ParsedCreateSkillRequest = {
  skill: {
    title: string;
    slug: string;
    profileMarkdown: string;
    publish?: boolean;
    tags?: string[];
    hIndex?: number;
    i10Index?: number;
    citationsDisplay?: string;
    researchSummary?: string;
    publications?: PublicationItem[];
    agentActive?: boolean;
    agentIntro?: string;
  };
  publicUrls: string[];
  aiChatShareUrls: string[];
  projectText: string;
  skipPublicSearch: boolean;
  disableOpenalex: boolean;
  mentorSpeaker: string;
  meetingSpeaker: string;
  uploads: File[];
  wechatFiles: File[];
  meetingFiles: File[];
  thinkingQuestionnaireFiles: File[];
};

class SkillRequestError extends Error {
  details: string[];
  status: number;

  constructor(message: string, details: string[] = [], status = 400) {
    super(message);
    this.details = details;
    this.status = status;
  }
}

function compactText(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join("\n\n");
}

function parseBoolean(value: unknown): boolean {
  return ["true", "1", "yes", "on"].includes(
    String(value || "").trim().toLowerCase(),
  );
}

function parseOptionalBoolean(value: unknown): boolean | undefined {
  if (value == null || String(value).trim() === "") return undefined;
  return parseBoolean(value);
}

function parseString(value: unknown): string {
  return String(value || "").trim();
}

function parseOptionalString(value: unknown): string | undefined {
  const parsed = parseString(value);
  return parsed || undefined;
}

function parseOptionalInt(value: unknown): number | undefined {
  const text = parseString(value);
  if (!text) return undefined;
  const parsed = Number.parseInt(text, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => parseString(item)).filter(Boolean);
  }
  if (value == null) return [];
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return [];
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => parseString(item)).filter(Boolean);
      }
    } catch {
      return text
        .split(/[\r\n,;；]+/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [text];
  }
  return [parseString(value)].filter(Boolean);
}

function parsePublications(value: unknown): PublicationItem[] | undefined {
  if (value == null || value === "") return undefined;
  if (Array.isArray(value)) {
    const items = value
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        return {
          title: parseString((item as PublicationItem).title),
          detail: parseString((item as PublicationItem).detail),
        };
      })
      .filter(
        (item): item is PublicationItem =>
          Boolean(item?.title) && Boolean(item?.detail),
      );
    return items.length ? items : undefined;
  }
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return undefined;
    try {
      return parsePublications(JSON.parse(text));
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function filesFromFormData(formData: FormData, key: string): File[] {
  return formData
    .getAll(key)
    .filter((item): item is File => item instanceof File && item.size >= 0);
}

function validateSkillPayload(payload: Record<string, unknown>) {
  const parsed = skillCreateSchema.safeParse(payload);
  if (!parsed.success) {
    throw new SkillRequestError(
      "Invalid request payload",
      parsed.error.issues.map((issue) => issue.message),
    );
  }
  return parsed.data;
}

async function parseCreateSkillRequest(
  request: NextRequest,
): Promise<ParsedCreateSkillRequest> {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const skill = validateSkillPayload({
      title: parseString(formData.get("title")),
      slug: parseString(formData.get("slug")),
      profileMarkdown: parseString(formData.get("profileMarkdown")),
      publish: parseBoolean(formData.get("publish")),
      tags: parseStringArray(formData.get("tags")),
      hIndex: parseOptionalInt(formData.get("hIndex")),
      citationsDisplay: parseOptionalString(formData.get("citationsDisplay")),
      researchSummary: parseOptionalString(formData.get("researchSummary")),
      publications: parsePublications(formData.get("publications")),
      agentActive: parseOptionalBoolean(formData.get("agentActive")),
      agentIntro: parseOptionalString(formData.get("agentIntro")),
    });

    return {
      skill,
      publicUrls: [
        ...parseStringArray(formData.get("publicUrls")),
        ...formData.getAll("publicUrls").map((item) => parseString(item)),
      ].filter(Boolean),
      aiChatShareUrls: [
        ...parseStringArray(formData.get("aiChatShareUrls")),
        ...formData.getAll("aiChatShareUrls").map((item) => parseString(item)),
      ].filter(Boolean),
      projectText: parseString(formData.get("projectText")),
      skipPublicSearch: parseBoolean(formData.get("skipPublicSearch")),
      disableOpenalex: parseBoolean(formData.get("disableOpenalex")),
      mentorSpeaker: parseString(
        formData.get("mentorSpeaker") || formData.get("wechatMentorSpeaker"),
      ),
      meetingSpeaker: parseString(formData.get("meetingSpeaker")),
      uploads: filesFromFormData(formData, "files"),
      wechatFiles: filesFromFormData(formData, "wechatFiles"),
      meetingFiles: filesFromFormData(formData, "meetingFiles"),
      thinkingQuestionnaireFiles: [
        ...filesFromFormData(formData, "thinkingQuestionnaireFiles"),
        ...filesFromFormData(formData, "questionnaireFiles"),
      ],
    };
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    throw new SkillRequestError("Request body must be JSON or multipart/form-data");
  }

  return {
    skill: validateSkillPayload(body),
    publicUrls: parseStringArray(body?.publicUrls),
    aiChatShareUrls: parseStringArray(body?.aiChatShareUrls),
    projectText: parseString(body?.projectText),
    skipPublicSearch: parseBoolean(body?.skipPublicSearch),
    disableOpenalex: parseBoolean(body?.disableOpenalex),
    mentorSpeaker: parseString(body?.mentorSpeaker || body?.wechatMentorSpeaker),
    meetingSpeaker: parseString(body?.meetingSpeaker),
    uploads: [],
    wechatFiles: [],
    meetingFiles: [],
    thinkingQuestionnaireFiles: [],
  };
}

export async function GET() {
  const skills = await db.skill.findMany({
    where: { status: "PUBLISHED", isPublic: true },
    orderBy: { publishedAt: "desc" },
    include: {
      owner: {
        include: { mentorProfile: true },
      },
      projects: true,
    },
  });

  const list = skills.map((skill) => {
    const displayName = skill.owner.mentorProfile?.displayName ?? skill.owner.email;
    const institution = skill.owner.mentorProfile?.institution ?? "";
    const openPositionsCount = skill.projects.filter(
      (project) => project.status === "OPEN",
    ).length;
    const tags = parseStringArrayJson(skill.tags);
    return {
      id: skill.id,
      slug: skill.slug,
      title: skill.title,
      mentorName: displayName,
      institution,
      publishedAt: skill.publishedAt,
      mentor: {
        displayName,
        institution,
        department: skill.owner.mentorProfile?.department ?? null,
        title: skill.owner.mentorProfile?.title ?? null,
        location: skill.owner.mentorProfile?.location ?? null,
        initials: mentorInitials(displayName),
      },
      tags,
      hIndex: skill.hIndex,
      i10Index: skill.i10Index,
      citationsDisplay: skill.citationsDisplay,
      openPositionsCount,
      agent: {
        active: skill.agentActive,
        badgeVariant: agentBadgeVariant(skill),
      },
    };
  });

  return NextResponse.json({
    success: true,
    data: {
      skills: list,
    },
    skills: list,
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "MENTOR" || !user.mentorProfile) {
    return NextResponse.json(
      { error: "Mentor account required" },
      { status: 403 },
    );
  }

  let payload: ParsedCreateSkillRequest;
  try {
    payload = await parseCreateSkillRequest(request);
  } catch (error) {
    if (error instanceof SkillRequestError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "Request parsing failed", details: [String(error)] },
      { status: 400 },
    );
  }

  const {
    title,
    slug,
    profileMarkdown,
    publish,
    tags,
    hIndex,
    i10Index,
    citationsDisplay,
    researchSummary,
    publications,
    agentActive,
    agentIntro,
  } = payload.skill;

  const existingSkill = await db.skill.findUnique({ where: { slug } });
  if (existingSkill) {
    return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
  }

  const mentorName = user.mentorProfile.displayName || user.email;
  const mentorAffiliation = [
    user.mentorProfile.institution,
    user.mentorProfile.department,
  ]
    .filter(Boolean)
    .join(", ");
  const shouldPublish = Boolean(publish);

  const projectText = compactText([
    `Skill title: ${title}`,
    profileMarkdown,
    researchSummary ? `Research summary:\n${researchSummary}` : "",
    tags?.length ? `Tags: ${tags.join(", ")}` : "",
    publications?.length
      ? [
          "Publications:",
          ...publications.map((item) => `- ${item.title}: ${item.detail}`),
        ].join("\n")
      : "",
    agentIntro ? `Agent intro:\n${agentIntro}` : "",
    payload.projectText,
  ]);

  let created;
  try {
    created = await createPersonaForMentor({
      ownerUserId: user.id,
      publish: shouldPublish,
      mentor: {
        name: mentorName,
        affiliation: mentorAffiliation,
        title: user.mentorProfile.title || "Professor",
        authorizedBy: user.email,
        consentNotes: "Created from ScholarBridge mentor skill form",
        publicUrls: payload.publicUrls,
      },
      publicUrls: payload.publicUrls,
      aiChatShareUrls: payload.aiChatShareUrls,
      uploads: payload.uploads,
      wechatFiles: payload.wechatFiles,
      meetingFiles: payload.meetingFiles,
      thinkingQuestionnaireFiles: payload.thinkingQuestionnaireFiles,
      projectText,
      skipPublicSearch: payload.skipPublicSearch,
      disableOpenalex: payload.disableOpenalex,
      mentorSpeaker: payload.mentorSpeaker || undefined,
      meetingSpeaker: payload.meetingSpeaker || undefined,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Persona build failed",
        details: [error instanceof Error ? error.message : String(error)],
      },
      { status: 500 },
    );
  }

  const skill = await db.skill.update({
    where: { id: created.skill.id },
    data: {
      title,
      slug,
      profileMarkdown,
      status: shouldPublish ? "PUBLISHED" : "DRAFT",
      isPublic: shouldPublish,
      publishedAt: shouldPublish ? new Date() : null,
      tags: tags ?? undefined,
      hIndex: hIndex ?? undefined,
      i10Index: i10Index ?? undefined,
      citationsDisplay: citationsDisplay ?? undefined,
      researchSummary: researchSummary ?? undefined,
      publications: publications ?? undefined,
      agentActive: agentActive ?? true,
      agentIntro: agentIntro ?? undefined,
    },
  });

  return NextResponse.json({ skill });
}
