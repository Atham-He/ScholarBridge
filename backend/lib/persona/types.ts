/**
 * Persona服务类型定义
 */

// ============= LLM提供商类型 =============

export type LLMProviderKind = 'mock' | 'openai' | 'anthropic' | 'deepseek';

export interface LLMProvider {
  kind: LLMProviderKind;
  generateText(prompts: string[]): Promise<string>;
  generateJson(prompts: string[]): Promise<any>;
  generateVision?(image: Buffer, prompt: string): Promise<string>;
}

// ============= Persona数据类型 =============

export interface MentorInput {
  name: string;
  affiliation: string;
  title?: string;
  publicUrls?: string[];
  authorizedBy: string;
  consentNotes?: string;
}

export interface PersonaData {
  version: string;
  createdAt: string;
  updatedAt: string;
  mentor: {
    name: string;
    slug: string;
    affiliation: string;
    title: string;
    homepage: string;
  };
  authorization: {
    authorized: boolean;
    authorizedBy: string;
    consentNotes: string;
  };
  overview: string;
  researchTopics: Array<{
    name: string;
    confidence: number;
    evidence: string[];
  }>;
  methods: string[];
  currentProjects: Array<{
    title: string;
    summary: string;
    requiredSkills: string[];
    fitSignals: string[];
  }>;
  communicationStyle: {
    voiceSummary: string;
    doSay: string[];
    avoid: string[];
  };
  mentorshipStyle: {
    expectations: string[];
    preferredStudents: string[];
    screeningQuestions: string[];
  };
  screeningRubric: {
    hardRequirements: string[];
    positiveSignals: string[];
    concerns: string[];
  };
  guardrails: string[];
  provenance: {
    sourceCount: number;
    publicSourceCount: number;
    uploadSourceCount: number;
    topSources: string[];
    confidenceNotes: string;
  };
}

// ============= 证据源类型 =============

export type SourceOrigin = 'public' | 'upload';
export type SourceKind = 'webpage' | 'paper' | 'upload_text' | 'upload_document' | 'upload_image';

export interface Source {
  id: string;
  origin: SourceOrigin;
  kind: SourceKind;
  title: string;
  url?: string;
  content: string;
  metadata: {
    fetchedAt?: string;
    provider?: string;
    publicationYear?: number;
    citedByCount?: number;
    summary?: string;
    [key: string]: any;
  };
}

export interface Chunk {
  id: string;
  sourceId: string;
  title: string;
  origin: SourceOrigin;
  kind: SourceKind;
  url?: string;
  chunkIndex: number;
  text: string;
}

// ============= 聊天类型 =============

export interface ChatMessage {
  role: 'user' | 'assistant' | 'mentor';
  content: string;
}

export interface ChatTurn {
  role: string;
  message: string;
  answer: string;
  citations: Array<{ sourceId: string; title: string }>;
  retrievedChunks: Chunk[];
  timestamp: string;
}

export interface ChatResponse {
  answer: string;
  citations: Array<{ sourceId: string; title: string }>;
  retrievedChunks: Chunk[];
}

export interface ChatParams {
  persona: PersonaData;
  chunks: Chunk[];
  session?: {
    turns: ChatTurn[];
  };
  message: string;
  studentProfile?: Record<string, any>;
}

// ============= 评估类型 =============

export interface EvaluationParams {
  persona: PersonaData;
  chunks: Chunk[];
  studentProfile: Record<string, any>;
  transcript?: ChatMessage[];
}

export interface EvaluationResult {
  id: string;
  createdAt: string;
  researchFit: {
    score: number;
    rationale: string;
    evidence: string[];
  };
  technicalDepth: {
    score: number;
    rationale: string;
    evidence: any[];
  };
  communication: {
    score: number;
    rationale: string;
    evidence: string[];
  };
  initiative: {
    score: number;
    rationale: string;
    evidence: any[];
  };
  overallScore: number;
  recommendation: 'do_not_progress' | 'needs_human_review' | 'recommend_interview' | 'strong_recommendation';
  summary: string;
  followUpQuestions: string[];
  evidenceQuality?: {
    evidenceBackedCount: number;
    hasStudentProfile: boolean;
    hasTranscript: boolean;
    lowEvidence: boolean;
  };
  evidenceBreakdown?: {
    evidenceBacked: Array<{
      sourceId: string;
      title: string;
      chunkIndex: number;
    }>;
    inferred: string[];
  };
}

// ============= 构建类型 =============

export interface BuildPersonaParams {
  mentor: MentorInput;
  publicUrls?: string[];
  uploads?: Array<{
    name: string;
    mimeType: string;
    buffer: Buffer;
  }>;
  projectText?: string;
  skipPublicSearch?: boolean;
  disableOpenalex?: boolean;
}

export interface BuildPersonaResult {
  slug: string;
  persona: PersonaData;
  agentCard: string;
  sources: Source[];
  chunks: Chunk[];
  sourceCount: number;
  chunkCount: number;
  publicSourceCount: number;
  uploadSourceCount: number;
}

// ============= 搜索类型 =============

export interface PublicSearchResult {
  url: string;
  title: string;
  snippet: string;
  source: 'bing' | 'google' | 'duckduckgo';
}

export interface OpenAlexAuthor {
  id: string;
  displayName: string;
  institution?: {
    name: string;
  };
  worksCount: number;
  citedByCount: number;
}

export interface OpenAlexWork {
  id: string;
  title: string;
  publicationYear: number;
  citedByCount: number;
  primaryLocation?: {
    source?: {
      displayName: string;
    };
  };
}
