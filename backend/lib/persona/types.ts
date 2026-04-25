export type LLMProviderKind = 'mock' | 'openai' | 'anthropic' | 'deepseek';

export interface LLMProvider {
  kind: LLMProviderKind;
  model?: string;
  supportsVision?: boolean;
  generateText(input: any): Promise<string>;
  generateJson(input: any): Promise<any>;
  generateVision?(image: Buffer, prompt: string): Promise<string>;
  describeImage?(input: any): Promise<any>;
}

export interface MentorInput {
  name: string;
  affiliation: string;
  title?: string;
  publicUrls?: string[];
  authorizedBy: string;
  consentNotes?: string;
}

export type SourceOrigin = 'public' | 'upload' | 'private';
export type SourceKind =
  | 'webpage'
  | 'paper'
  | 'upload_text'
  | 'upload_document'
  | 'upload_image'
  | 'upload_pdf'
  | 'upload_docx'
  | 'upload_doc'
  | 'wechat_chat'
  | 'meeting_transcript'
  | 'mentor_thinking_questionnaire'
  | 'ai_chat_share';

export interface Source {
  id: string;
  origin: SourceOrigin;
  kind: SourceKind | string;
  title: string;
  url?: string | null;
  filePath?: string | null;
  content: string;
  metadata?: Record<string, any>;
}

export interface Chunk {
  id: string;
  sourceId: string;
  title: string;
  origin: SourceOrigin;
  kind: SourceKind | string;
  url?: string | null;
  chunkIndex: number;
  text: string;
  score?: number;
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
    homepage?: string;
  };
  authorization: {
    authorized: boolean;
    authorizedBy: string;
    consentNotes?: string;
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
  communicationStyle?: {
    voiceSummary?: string;
    doSay?: string[];
    avoid?: string[];
    chatStyle?: Record<string, any>;
    meetingStyle?: Record<string, any>;
    thinkingStyle?: Record<string, any>;
    styleGuide?: Record<string, any>;
  };
  mentorshipStyle?: {
    expectations?: string[];
    preferredStudents?: string[];
    screeningQuestions?: string[];
  };
  screeningRubric?: {
    hardRequirements?: string[];
    positiveSignals?: string[];
    concerns?: string[];
  };
  researchTaste?: Record<string, any>;
  thinkingProcess?: Record<string, any>;
  guardrails?: string[];
  provenance?: {
    sourceCount?: number;
    publicSourceCount?: number;
    uploadSourceCount?: number;
    privateSourceCount?: number;
    topSources?: string[];
    confidenceNotes?: string;
    llmDistillation?: Record<string, any>;
    evidencePreview?: Record<string, any>;
  };
  [key: string]: any;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'mentor' | string;
  content: string;
}

export interface ChatTurn {
  role: string;
  message: string;
  answer: string;
  citations: Array<{ sourceId: string; title: string }>;
  retrievedChunks?: Array<{
    sourceId: string;
    title: string;
    chunkIndex: number;
  }>;
  timestamp?: string;
  createdAt?: string;
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

export interface ChatResponse {
  answer: string;
  citations: Array<{ sourceId: string; title: string }>;
  retrievedChunks: Chunk[];
}

export interface EvaluationParams {
  persona: PersonaData;
  chunks: Chunk[];
  studentProfile: Record<string, any>;
  transcript?: ChatMessage[] | ChatTurn[];
}

export interface EvaluationResult {
  id: string;
  createdAt: string;
  researchFit: {
    score: number;
    rationale: string;
    evidence: any[];
  };
  technicalDepth: {
    score: number;
    rationale: string;
    evidence: any[];
  };
  communication: {
    score: number;
    rationale: string;
    evidence: any[];
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
  [key: string]: any;
}

export interface UploadedFileDescriptor {
  path: string;
  originalName: string;
  mimeType: string;
  size?: number;
  sourceType?: string;
  mentorSpeaker?: string;
  meetingSpeaker?: string;
  transcriptPath?: string;
  fileUrl?: string;
}

export interface BuildPersonaParams {
  mentor: MentorInput;
  publicUrls?: string[];
  uploads?: UploadedFileDescriptor[];
  wechatUploads?: UploadedFileDescriptor[];
  meetingUploads?: UploadedFileDescriptor[];
  thinkingQuestionnaireUploads?: UploadedFileDescriptor[];
  aiChatShareUploads?: UploadedFileDescriptor[];
  projectText?: string;
  skipPublicSearch?: boolean;
  disableOpenalex?: boolean;
  mentorSpeaker?: string;
  meetingSpeaker?: string;
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
  privateSourceCount: number;
}
