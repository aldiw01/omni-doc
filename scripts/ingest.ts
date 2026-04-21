import { ingestDocuments } from "../src/lib/rag/ingestion";
import dotenv from "dotenv";

dotenv.config();

const provider = (process.env.LLM_PROVIDER as 'google' | 'ollama') || 'ollama';

async function main() {
  console.log(`Starting ingestion using provider: ${provider}`);
  try {
    const result = await ingestDocuments(provider);
    console.log(result.message);
  } catch (error) {
    console.error("Ingestion failed:", error);
  }
}

main();
