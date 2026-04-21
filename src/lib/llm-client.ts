import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama';
import { Embeddings } from '@langchain/core/embeddings';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';

export type LLMProvider = 'google' | 'ollama';

export interface LLMConfig {
  provider?: LLMProvider;
  modelName?: string;
  temperature?: number;
  baseUrl?: string; // For Ollama
}

export function getLLM(config?: LLMConfig): BaseChatModel {
  const provider = config?.provider || process.env.LLM_PROVIDER || 'ollama';
  if (provider === 'google') {
    return new ChatGoogleGenerativeAI({
      model: config?.modelName || process.env.GOOGLE_CHAT_MODEL || 'gemini-1.5-pro',
      temperature: config?.temperature ?? 0.7,
      apiKey: process.env.GOOGLE_API_KEY,
    });
  } else if (provider === 'ollama') {
    return new ChatOllama({
      baseUrl: config?.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: config?.modelName || process.env.OLLAMA_CHAT_MODEL || 'qwen3.5:4b',
      temperature: config?.temperature ?? 0.7,
    });
  }
  throw new Error(`Unsupported LLM provider: ${provider}`);
}

export function getEmbeddings(config?: LLMConfig): Embeddings {
  const provider = config?.provider || process.env.LLM_PROVIDER || 'ollama';
  if (provider === 'google') {
    return new GoogleGenerativeAIEmbeddings({
      modelName: process.env.GOOGLE_EMBEDDING_MODEL || 'gemini-embedding-001',
      apiKey: process.env.GOOGLE_API_KEY,
    });
  } else if (provider === 'ollama') {
    return new OllamaEmbeddings({
      baseUrl: config?.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text',
    });
  }
  throw new Error(`Unsupported Embeddings provider: ${provider}`);
}
