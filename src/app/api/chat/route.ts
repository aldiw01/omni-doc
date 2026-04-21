import { NextRequest, NextResponse } from "next/server";
import { getLLM, getEmbeddings } from "@/lib/llm-client";
import { connect } from "@lancedb/lancedb";
import { LanceDB } from "@langchain/community/vectorstores/lancedb";
import path from "path";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages } = body;
    
    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "Messages are required" }, { status: 400 });
    }

    const currentMessage = messages[messages.length - 1].content;
    const llmProvider = (process.env.LLM_PROVIDER as 'google' | 'ollama') || 'ollama';
    
    const embeddings = getEmbeddings({ provider: llmProvider });
    const dbDir = path.resolve(process.cwd(), "lancedb");
    const db = await connect(dbDir);
    
    const tableName = `omni_docs_${llmProvider}`;
    
    // Check if table exists before searching
    let tableNames = await db.tableNames();
    let context = "No relevant context found. (Have you ingested any documents yet?)";
    
    if (tableNames.includes(tableName)) {
      try {
        const table = await db.openTable(tableName);
        const vectorStore = new LanceDB(embeddings, { table });
        const results = await vectorStore.similaritySearch(currentMessage, 4);
        
        if (results.length > 0) {
          context = results.map(r => `[Source: ${r.metadata.folderPath}${r.metadata.relativePath}]:\n${r.pageContent}`).join("\n\n---\n\n");
        }
      } catch (e) {
        console.error("Vector search failed:", e);
      }
    } else {
       console.log(`Table ${tableName} not found. Proceeding without context.`);
    }
    
    const prompt = PromptTemplate.fromTemplate(`You are Omni-Doc, an AI assistant capable of summarizing and providing recommendations based on the user's provided knowledge base.
Answer the user's question using ONLY the following context. If the answer is not in the context, clearly state that you don't have enough information.
Be helpful, concise, and format your output beautifully in Markdown.

Context:
{context}

Question: {question}
Answer:`);
    
    const llm = getLLM({ provider: llmProvider });
    const chain = prompt.pipe(llm).pipe(new StringOutputParser());
    
    const stream = await chain.stream({
      context: context,
      question: currentMessage,
    });
    
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (e) {
          console.error("Streaming error:", e);
          controller.error(e);
        }
      }
    });
    
    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
