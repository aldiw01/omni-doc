import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { LanceDB } from "@langchain/community/vectorstores/lancedb";
import { getEmbeddings } from "../llm-client";
import { connect } from "@lancedb/lancedb";
import * as fs from "fs/promises";
import * as path from "path";
import Tesseract from "tesseract.js";
import { Document } from "@langchain/core/documents";

// Custom File Loader that walks the directory recursively
async function processFiles(directoryPath: string): Promise<Document[]> {
  const documents: Document[] = [];
  
  async function walk(dir: string) {
    const files = await fs.readdir(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        await walk(fullPath);
      } else {
        const ext = path.extname(fullPath).toLowerCase();
        try {
          if (ext === '.txt' || ext === '.md') {
            const text = await fs.readFile(fullPath, 'utf-8');
            documents.push(new Document({ pageContent: text, metadata: { source: fullPath } }));
          } else if (ext === '.csv') {
            const loader = new CSVLoader(fullPath);
            documents.push(...await loader.load());
          } else if (ext === '.pdf') {
            const loader = new PDFLoader(fullPath);
            documents.push(...await loader.load());
          } else if (ext === '.docx' || ext === '.doc') {
            const loader = new DocxLoader(fullPath);
            documents.push(...await loader.load());
          } else if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
            console.log(`Processing image: ${fullPath}`);
            const { data: { text } } = await Tesseract.recognize(fullPath, 'eng');
            if (text.trim()) {
              documents.push(new Document({ pageContent: text, metadata: { source: fullPath } }));
            }
          }
        } catch (error) {
          console.error(`Failed to process file ${fullPath}:`, error);
        }
      }
    }
  }
  
  await walk(directoryPath);
  return documents;
}

export async function ingestDocuments(provider: 'google' | 'ollama') {
  const knowledgeBasePath = path.resolve(process.cwd(), "knowledge-base");
  
  try {
    await fs.access(knowledgeBasePath);
  } catch {
    console.log("knowledge-base folder not found. Creating it...");
    await fs.mkdir(knowledgeBasePath, { recursive: true });
    return { success: false, message: "Created knowledge-base folder. Please add files to it and run again." };
  }

  console.log("Loading documents...");
  
  const allDocs = await processFiles(knowledgeBasePath);

  if (allDocs.length === 0) {
    return { success: false, message: "No documents found in knowledge-base folder." };
  }

  const docsWithRelativePaths = allDocs.map(doc => {
    const relativePath = path.relative(knowledgeBasePath, doc.metadata.source as string);
    const folderPath = path.dirname(relativePath);
    return new Document({
      ...doc,
      metadata: {
        ...doc.metadata,
        relativePath,
        folderPath: folderPath === '.' ? '/' : `/${folderPath}`,
      }
    });
  });

  console.log(`Loaded ${docsWithRelativePaths.length} documents. Splitting text...`);
  
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const splitDocs = await splitter.splitDocuments(docsWithRelativePaths);

  // Sanitize metadata to ensure a uniform schema across all chunks.
  // LanceDB will crash if different chunks have different metadata keys (like pdf.version vs loc.lines).
  // Also filter out empty chunks which cause NaN embedding errors.
  const sanitizedDocs = splitDocs
    .filter(doc => doc.pageContent && doc.pageContent.trim().length > 0)
    .map(doc => new Document({
    pageContent: doc.pageContent,
    metadata: {
      source: String(doc.metadata.source || 'unknown'),
      relativePath: String(doc.metadata.relativePath || 'unknown'),
      folderPath: String(doc.metadata.folderPath || '/'),
    }
  }));

  console.log(`Split into ${sanitizedDocs.length} chunks. Connecting to LanceDB...`);

  const embeddings = getEmbeddings({ provider });
  const dbDir = path.resolve(process.cwd(), "lancedb");
  const db = await connect(dbDir);
  
  const tableName = `omni_docs_${provider}`; 

  try {
    await db.dropTable(tableName);
  } catch (e) {
    // Ignore error if table doesn't exist
  }

  console.log("Generating embeddings and inserting into LanceDB in batches...");
  
  const batchSize = 20; // Lowered from 100 to prevent Ollama memory crashes
  let vectorStore: LanceDB | null = null;
  
  for (let i = 0; i < sanitizedDocs.length; i += batchSize) {
    const batch = sanitizedDocs.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(sanitizedDocs.length / batchSize)}...`);
    
    if (!vectorStore) {
      vectorStore = await LanceDB.fromDocuments(batch, embeddings, {
        uri: dbDir,
        tableName: tableName,
      });
    } else {
      await vectorStore.addDocuments(batch);
    }
    
    if (provider === 'google') {
      // 2 second delay between batches to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return { success: true, message: `Successfully ingested ${sanitizedDocs.length} chunks.` };
}
