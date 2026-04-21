# Omni-Doc

Omni-Doc is a powerful, local-first Retrieval-Augmented Generation (RAG) platform. It allows you to chat with your own knowledge base using advanced LLMs. You can use Google's Gemini models for cloud-powered processing or Ollama for entirely local, privacy-first inference.

## Features
- 🚀 **Local Vector Database**: Powered by LanceDB for fast, massive-scale semantic search without relying on external cloud databases.
- 📁 **Rich Document Support**: Automatically extracts and embeds data from `.txt`, `.md`, `.csv`, `.docx`, `.doc`, `.pdf`, and even images (`.png`, `.jpg` via OCR).
- 🧠 **Dual AI Support**: Switch seamlessly between Google Gemini and local Ollama models.
- 📂 **Recursive Folder Support**: Just drop your files into nested folders—Omni-Doc tracks where every chunk of data originated.

---

## Getting Started

### 1. Installation
This project requires Node.js v24.15.0 (LTS).

```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory (or use the one already provided) and configure your LLM settings. 

The application is fully controlled via the `.env` file:

```env
# Choose your provider: 'google' or 'ollama'
LLM_PROVIDER=google

# If using Google, provide your API key
GOOGLE_API_KEY=your_google_api_key_here

# --- Optional Model Configuration ---
# Uncomment to override the default models

# GOOGLE_CHAT_MODEL=gemini-1.5-pro
# GOOGLE_EMBEDDING_MODEL=gemini-embedding-001

# OLLAMA_BASE_URL=http://localhost:11434
# OLLAMA_CHAT_MODEL=qwen3.5:4b
# OLLAMA_EMBEDDING_MODEL=nomic-embed-text
```

### 3. Running with Google Gemini
To use Google Gemini, ensure `LLM_PROVIDER=google` and `GOOGLE_API_KEY` are set in your `.env` file. The application will automatically use `gemini-1.5-pro` for chat and `gemini-embedding-001` for vector embeddings.

### 4. Running Locally with Ollama
If you want to run everything 100% locally with zero data leaving your machine:

1. Install [Ollama](https://ollama.com/).
2. Set `LLM_PROVIDER=ollama` in your `.env` file.
3. Download the necessary models via your terminal:
   ```bash
   # Download the embedding model (Required for ingestion)
   ollama pull nomic-embed-text
   
   # Download the chat model (Required for querying)
   ollama pull qwen3.5:4b
   ```
*(Note: `qwen3.5:4b` is highly recommended for standard laptops, but you can also use `llama3` by changing the `OLLAMA_CHAT_MODEL` variable in your `.env`)*

---

## Usage

### Document Ingestion
Before you can chat with your documents, you need to ingest them.

1. Create a folder named `knowledge-base` in the root of the project.
2. Drop your files (PDFs, Word Docs, CSVs, Images, etc.) into the folder. You can organize them into subfolders.
3. Run the ingestion pipeline:
   ```bash
   npm run ingest
   ```
This will extract the text, split it into optimized chunks, generate embeddings via your configured provider, and store them locally in LanceDB.

### Starting the Chat Interface
Once your documents are ingested, start the Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You can now chat with your knowledge base!

---

## Troubleshooting

- **LanceDB Error (NaN / Schema Inference):** If ingestion fails with a NaN or schema error, it typically means your API key is invalid/rate-limited (if using Google) or you haven't pulled the embedding model (if using Ollama). Ensure the embedding provider is working correctly.
- **Missing d3-dsv:** If you get an error reading CSVs, ensure you ran `npm install` to grab all dependencies. 
