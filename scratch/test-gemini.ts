import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valParts] = trimmed.split('=');
          const value = valParts.join('=');
          process.env[key.trim()] = value.trim();
        }
      }
    }
  } catch (e) {
    console.error("Failed to load .env.local", e);
  }
}

async function main() {
  loadEnv();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No API key found in env!");
    return;
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  
  const models = ['gemini-3.6-flash', 'gemini-3.1-pro-preview'];
  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Hello, respond with 'OK' and the model name.");
      console.log(`✅ Success with ${modelName}:`, result.response.text().trim());
    } catch (e: any) {
      console.log(`❌ Fail with ${modelName}:`, e.message);
    }
  }
}

main().catch(console.error);
