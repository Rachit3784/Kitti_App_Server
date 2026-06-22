import { GoogleGenAI } from "@google/genai";
import { Google_API_KEY } from "../config/ENV_variable.js";


export async function generateEmbedding(text) {
  if (!Google_API_KEY ) {
    console.error("API key not found. Please set Google_API_KEY in your .env file.");
    return { success: false, msg: "API key not found." };
  }

  const ai = new GoogleGenAI({ apiKey: Google_API_KEY });

   

  if (!text.length) {
    console.error("No text available to generate embedding.");
    return { success: false, msg: "No text available." };
  }

  try {
    const response = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents:  text,
      taskType: "SEMANTIC_SIMILARITY"
    });

    const embeddings = response.embeddings?.map(e => e.values) || [];

    if (!embeddings.length) {
      console.error("No embeddings returned from API.");
      return {
        msg: "No Embeddings returned",
        success: false
      };
    }

    const flatEmbeddings = await embeddings.flat();
    return {
      embeddings: flatEmbeddings,
      success: true,
      msg: "embeddings generated successfully"
    };



  } catch (err) {
    console.error("Error generating embedding:", err);
    return { success: false, msg: "Error generating embedding." , error: err };
  }
}
