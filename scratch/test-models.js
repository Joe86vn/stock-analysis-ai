const { GoogleGenerativeAI } = require('@google/generative-ai');

async function main() {
  const apiKey = process.env.GEMINI_API_KEY || 'your_gemini_api_key_here';
  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    console.log("Testing gemini-3.1-pro-preview...");
    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-pro-preview' });
    const result = await model.generateContent('Hello');
    console.log("Gemini 3.1 Pro Preview works:", result.response.text());
  } catch (err) {
    console.error("Gemini 3.1 Pro Preview failed:", err.message);
  }
}

main();
