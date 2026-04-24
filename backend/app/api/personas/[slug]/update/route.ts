import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { updatePersonaForMentor } from '@/lib/persona/manager';

function parseBoolean(value: unknown): boolean {
  return ['true', '1', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
}

function parseString(value: unknown): string {
  return String(value || '').trim();
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => parseString(item)).filter(Boolean);
  }
  if (value == null) return [];
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return [];
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed.map((item) => parseString(item)).filter(Boolean) : [text];
    } catch {
      return text.split(/[\r\n,;；]+/).map((item) => item.trim()).filter(Boolean);
    }
  }
  return [parseString(value)].filter(Boolean);
}

async function parseUpdateRequest(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const filesFor = (key: string) => formData.getAll(key).filter((item): item is File => item instanceof File);
    return {
      name: parseString(formData.get('name')),
      affiliation: parseString(formData.get('affiliation')),
      title: parseString(formData.get('title')),
      authorizedBy: parseString(formData.get('authorizedBy')),
      consentNotes: parseString(formData.get('consentNotes')),
      projectText: parseString(formData.get('projectText')),
      skipPublicSearch: parseBoolean(formData.get('skipPublicSearch')),
      disableOpenalex: parseBoolean(formData.get('disableOpenalex')),
      mentorSpeaker: parseString(formData.get('mentorSpeaker') || formData.get('wechatMentorSpeaker')),
      meetingSpeaker: parseString(formData.get('meetingSpeaker')),
      publicUrls: [
        ...parseStringArray(formData.get('publicUrls')),
        ...formData.getAll('publicUrls').map((item) => parseString(item)).filter(Boolean)
      ],
      aiChatShareUrls: [
        ...parseStringArray(formData.get('aiChatShareUrls')),
        ...formData.getAll('aiChatShareUrls').map((item) => parseString(item)).filter(Boolean)
      ],
      uploads: filesFor('files'),
      wechatFiles: filesFor('wechatFiles'),
      meetingFiles: filesFor('meetingFiles'),
      thinkingQuestionnaireFiles: [
        ...filesFor('thinkingQuestionnaireFiles'),
        ...filesFor('questionnaireFiles')
      ]
    };
  }

  const body = await request.json();
  return {
    name: parseString(body?.name),
    affiliation: parseString(body?.affiliation),
    title: parseString(body?.title),
    authorizedBy: parseString(body?.authorizedBy),
    consentNotes: parseString(body?.consentNotes),
    projectText: parseString(body?.projectText),
    skipPublicSearch: parseBoolean(body?.skipPublicSearch),
    disableOpenalex: parseBoolean(body?.disableOpenalex),
    mentorSpeaker: parseString(body?.mentorSpeaker || body?.wechatMentorSpeaker),
    meetingSpeaker: parseString(body?.meetingSpeaker),
    publicUrls: parseStringArray(body?.publicUrls),
    aiChatShareUrls: parseStringArray(body?.aiChatShareUrls),
    uploads: [],
    wechatFiles: [],
    meetingFiles: [],
    thinkingQuestionnaireFiles: []
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'MENTOR') {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '需要导师权限' } },
        { status: 401 }
      );
    }

    const { slug } = await params;
    const payload = await parseUpdateRequest(request);
    const updated = await updatePersonaForMentor({
      slug,
      ownerUserId: user.id,
      name: payload.name || undefined,
      affiliation: payload.affiliation || undefined,
      title: payload.title || undefined,
      authorizedBy: payload.authorizedBy || undefined,
      consentNotes: payload.consentNotes || undefined,
      publicUrls: payload.publicUrls,
      aiChatShareUrls: payload.aiChatShareUrls,
      uploads: payload.uploads,
      wechatFiles: payload.wechatFiles,
      meetingFiles: payload.meetingFiles,
      thinkingQuestionnaireFiles: payload.thinkingQuestionnaireFiles,
      projectText: payload.projectText || undefined,
      skipPublicSearch: payload.skipPublicSearch,
      disableOpenalex: payload.disableOpenalex,
      mentorSpeaker: payload.mentorSpeaker || undefined,
      meetingSpeaker: payload.meetingSpeaker || undefined
    });

    return NextResponse.json({
      success: true,
      data: {
        personaId: updated.persona.id,
        skillId: updated.skill.id,
        slug: updated.persona.slug,
        sourceCount: updated.built.sourceCount,
        chunkCount: updated.built.chunkCount,
        publicSourceCount: updated.built.publicSourceCount,
        uploadSourceCount: updated.built.uploadSourceCount,
        privateSourceCount: updated.built.privateSourceCount,
        addedSourceCount: updated.built.addedSourceCount
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === 'Forbidden' ? 403 : message.includes('not found') ? 404 : 500;
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: '更新 Persona 失败',
          details: message
        }
      },
      { status }
    );
  }
}
