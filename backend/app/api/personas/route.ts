import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { createPersonaForMentor } from '@/lib/persona/manager';

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
      return text.split('\n').map((item) => item.trim()).filter(Boolean);
    }
  }
  return [parseString(value)].filter(Boolean);
}

async function parseCreateRequest(request: NextRequest) {
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
      publish: parseBoolean(formData.get('publish')),
      skipPublicSearch: parseBoolean(formData.get('skipPublicSearch')),
      disableOpenalex: parseBoolean(formData.get('disableOpenalex')),
      mentorSpeaker: parseString(formData.get('mentorSpeaker') || formData.get('wechatMentorSpeaker')),
      meetingSpeaker: parseString(formData.get('meetingSpeaker')),
      publicUrls: [
        ...parseStringArray(formData.get('publicUrls')),
        ...formData.getAll('publicUrls').map((item) => parseString(item)).filter(Boolean)
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
    publish: parseBoolean(body?.publish),
    skipPublicSearch: parseBoolean(body?.skipPublicSearch),
    disableOpenalex: parseBoolean(body?.disableOpenalex),
    mentorSpeaker: parseString(body?.mentorSpeaker || body?.wechatMentorSpeaker),
    meetingSpeaker: parseString(body?.meetingSpeaker),
    publicUrls: parseStringArray(body?.publicUrls),
    uploads: [],
    wechatFiles: [],
    meetingFiles: [],
    thinkingQuestionnaireFiles: []
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const onlyMyPersonas = searchParams.get('onlyMyPersonas') === 'true';

    const where: any = { buildStatus: 'completed' };
    if (!onlyMyPersonas) {
      where.skill = {
        OR: [
          { isPublic: true, status: 'PUBLISHED' },
          { ownerUserId: user.id }
        ]
      };
    } else {
      where.skill = { ownerUserId: user.id };
    }

    const personas = await db.persona.findMany({
      where,
      include: {
        skill: {
          include: {
            owner: {
              include: {
                mentorProfile: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const list = personas.map((persona) => {
      const mentorName = persona.skill.owner.mentorProfile?.displayName || persona.skill.owner.email;
      const institution = persona.skill.owner.mentorProfile?.institution || '';

      return {
        id: persona.id,
        slug: persona.slug,
        version: persona.version,
        buildStatus: persona.buildStatus,
        mentor: {
          name: (persona.personaJson as any).mentor.name,
          displayName: mentorName,
          institution: institution || (persona.personaJson as any).mentor.affiliation,
          title: (persona.personaJson as any).mentor.title
        },
        overview: (persona.personaJson as any).overview,
        researchTopics: (persona.personaJson as any).researchTopics || [],
        methods: (persona.personaJson as any).methods || [],
        skill: {
          id: persona.skill.id,
          slug: persona.skill.slug,
          title: persona.skill.title,
          status: persona.skill.status,
          isPublic: persona.skill.isPublic,
          agentActive: persona.skill.agentActive
        },
        stats: {
          sourceCount: persona.sourceCount,
          chunkCount: persona.chunkCount,
          publicSourceCount: persona.publicSourceCount,
          uploadSourceCount: persona.uploadSourceCount,
          privateSourceCount: (persona as any).privateSourceCount || 0
        },
        metadata: {
          authorizedBy: persona.authorizedBy,
          llmProvider: persona.llmProvider,
          createdAt: persona.createdAt,
          updatedAt: persona.updatedAt,
          builtAt: persona.builtAt
        }
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        personas: list,
        count: list.length
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'LIST_ERROR',
          message: '获取 Persona 列表失败',
          details: error instanceof Error ? error.message : String(error)
        }
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'MENTOR' || !user.mentorProfile) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '需要导师账号' } },
        { status: 403 }
      );
    }

    const payload = await parseCreateRequest(request);
    if (!payload.name || !payload.affiliation) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'name 和 affiliation 不能为空' } },
        { status: 400 }
      );
    }

    const created = await createPersonaForMentor({
      ownerUserId: user.id,
      mentor: {
        name: payload.name,
        affiliation: payload.affiliation,
        title: payload.title || user.mentorProfile.title || 'Professor',
        authorizedBy: payload.authorizedBy || user.email,
        consentNotes: payload.consentNotes || '',
        publicUrls: payload.publicUrls
      },
      publish: payload.publish,
      publicUrls: payload.publicUrls,
      uploads: payload.uploads,
      wechatFiles: payload.wechatFiles,
      meetingFiles: payload.meetingFiles,
      thinkingQuestionnaireFiles: payload.thinkingQuestionnaireFiles,
      projectText: payload.projectText,
      skipPublicSearch: payload.skipPublicSearch,
      disableOpenalex: payload.disableOpenalex,
      mentorSpeaker: payload.mentorSpeaker,
      meetingSpeaker: payload.meetingSpeaker
    });

    return NextResponse.json({
      success: true,
      data: {
        personaId: created.persona.id,
        skillId: created.skill.id,
        slug: created.persona.slug,
        buildStatus: created.persona.buildStatus,
        sourceCount: created.built.sourceCount,
        chunkCount: created.built.chunkCount,
        publicSourceCount: created.built.publicSourceCount,
        uploadSourceCount: created.built.uploadSourceCount,
        privateSourceCount: created.built.privateSourceCount
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'BUILD_ERROR',
          message: '创建 Persona 失败',
          details: error instanceof Error ? error.message : String(error)
        }
      },
      { status: 500 }
    );
  }
}
