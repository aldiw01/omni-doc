import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { LanceDB } from "@langchain/community/vectorstores/lancedb";
import { connect } from "@lancedb/lancedb";
import { Document } from "@langchain/core/documents";
import dotenv from "dotenv";

dotenv.config();

async function test() {
  const embeddings = new GoogleGenerativeAIEmbeddings({
    modelName: 'gemini-embedding-001',
    apiKey: process.env.GOOGLE_API_KEY,
  });

  const docs = [new Document({ pageContent: "Test document 1", metadata: { source: "test.txt" } })];
  
  console.log("Generating embeddings...");
  try {
    const vectors = await embeddings.embedDocuments(docs.map(d => d.pageContent));
    console.log(`Generated ${vectors.length} vectors.`);
    console.dir(vectors, { depth: null });
    
    console.log("Connecting to LanceDB...");
    const db = await connect("lancedb-test");
    try { await db.dropTable("test_table"); } catch(e) {}
    
    console.log("Inserting into LanceDB...");
    await LanceDB.fromDocuments(docs, embeddings, {
      uri: "lancedb-test",
      tableName: "test_table"
    });
    console.log("Success!");
  } catch(e) {
    console.error("Error:", e);
  }
}

test();
