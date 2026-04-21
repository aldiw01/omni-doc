import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

async function test() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_API_KEY}`);
    const data = await response.json();
    console.log(data.models.map((m: any) => m.name).filter((n: string) => n.includes('embed')));
    
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001"});
    const result = await model.embedContent("Hello world");
    console.log(result.embedding.values.slice(0, 5));
  } catch(e) {
    console.error(e);
  }
}

test();
