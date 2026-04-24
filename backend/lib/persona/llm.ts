import type { LLMProvider, LLMProviderKind } from './types';
import { createRuntimeProviders } from './engine.mjs';

export type { LLMProvider } from './types';

export interface LLMProviderConfig {
  provider?: LLMProviderKind;
}

export async function createLLMProvider(_config: LLMProviderConfig = {}): Promise<LLMProvider> {
  const runtime = await createRuntimeProviders();
  return runtime.llmProvider as LLMProvider;
}

export async function createLLMProviderFromEnv(): Promise<LLMProvider> {
  return createLLMProvider();
}
