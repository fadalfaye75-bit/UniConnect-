import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const generateAIResponse = async (prompt: string, context?: string): Promise<string> => {
  if (!apiKey) return "Clé API manquante. Veuillez configurer l'API Key.";

  try {
    const fullPrompt = `
      Tu es un assistant universitaire intelligent intégré à la plateforme 'UniConnect'.
      Ton rôle est d'aider les étudiants à s'organiser et à comprendre leurs cours.
      Réponds de manière concise, polie et utile en français.
      
      Contexte actuel de l'utilisateur (si disponible): ${context || 'Aucun'}

      Question de l'utilisateur: ${prompt}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
    });

    return response.text || "Désolé, je n'ai pas pu générer une réponse.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Une erreur est survenue lors de la communication avec l'assistant.";
  }
};