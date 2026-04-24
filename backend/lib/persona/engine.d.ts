import type {
  ChatResponse,
  Chunk,
  EvaluationResult,
  LLMProvider,
  MentorInput,
  PersonaData,
  Source,
  UploadedFileDescriptor
} from './types';

export interface EngineBuildResult {
  persona: PersonaData;
  agentCard: string;
  sources: Source[];
  chunks: Chunk[];
  sourceCount: number;
  publicSourceCount: number;
  uploadSourceCount: number;
  privateSourceCount: number;
  chunkCount: number;
  llmProviderKind: string;
  llmModel: string | null;
}

export interface EngineUpdateResult extends EngineBuildResult {
  addedSourceCount: number;
}

export function buildPersonaArtifacts(input: {
  mentor: MentorInput & { slug?: string };
  publicUrls?: string[];
  uploads?: UploadedFileDescriptor[];
  wechatUploads?: UploadedFileDescriptor[];
  meetingUploads?: UploadedFileDescriptor[];
  thinkingQuestionnaireUploads?: UploadedFileDescriptor[];
  skipPublicSearch?: boolean;
  disableOpenalex?: boolean;
  mentorSpeaker?: string;
  meetingSpeaker?: string;
  configOverrides?: Record<string, any>;
}): Promise<EngineBuildResult>;

export function updatePersonaArtifacts(input: {
  mentor: MentorInput & { slug?: string };
  existingSources?: Source[];
  publicUrls?: string[];
  uploads?: UploadedFileDescriptor[];
  wechatUploads?: UploadedFileDescriptor[];
  meetingUploads?: UploadedFileDescriptor[];
  thinkingQuestionnaireUploads?: UploadedFileDescriptor[];
  skipPublicSearch?: boolean;
  disableOpenalex?: boolean;
  mentorSpeaker?: string;
  meetingSpeaker?: string;
  configOverrides?: Record<string, any>;
}): Promise<EngineUpdateResult>;

export function chatWithPersona(input: {
  persona: PersonaData;
  chunks: Chunk[];
  session?: { turns: any[] };
  message: string;
  studentProfile?: Record<string, any>;
  llmProvider?: LLMProvider | null;
  configOverrides?: Record<string, any>;
}): Promise<ChatResponse>;

export function evaluateWithPersona(input: {
  persona: PersonaData;
  chunks: Chunk[];
  studentProfile: Record<string, any>;
  transcript?: any[];
  llmProvider?: LLMProvider | null;
  configOverrides?: Record<string, any>;
}): Promise<EvaluationResult>;

export function createRuntimeProviders(configOverrides?: Record<string, any>): Promise<{
  config: Record<string, any>;
  llmProvider: LLMProvider;
  asrProvider: any;
}>;
