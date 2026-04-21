import { NextRequest, NextResponse } from "next/server";
import { getLLM, getEmbeddings } from "@/lib/llm-client";
import { connect } from "@lancedb/lancedb";
import { LanceDB } from "@langchain/community/vectorstores/lancedb";
import path from "path";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";

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
        const results = await vectorStore.maxMarginalRelevanceSearch(currentMessage, { k: 15, fetchK: 50 });

        if (results.length > 0) {
          context = results.map(r => `[Source: ${r.metadata.folderPath}${r.metadata.relativePath}]:\n${r.pageContent}`).join("\n\n---\n\n");
        }
      } catch (e) {
        console.error("Vector search failed:", e);
      }
    } else {
      console.log(`Table ${tableName} not found. Proceeding without context.`);
    }

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", "You are Omni-Doc, an advanced AI capable of analyzing and synthesizing information across thousands of documents.\n\nCRITICAL INSTRUCTIONS:\n- You must synthesize a comprehensive answer using ONLY the provided Context.\n- The context is drawn from multiple diverse sources. Identify broad themes if applicable.\n- If the answer is not in the Context, state clearly that you do not have enough information.\n- Be helpful, structured, and format your output beautifully in Markdown."],
      ["human", "Context:\n{context}\n\nQuestion: {question}"]
    ]);

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
