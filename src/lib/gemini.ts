import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const GEMINI_MODELS = [
  { id: 'gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite (Fastest)' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Balanced)' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (Best Quality)' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
];

export async function checkGeminiStatus(modelId: string) {
  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: "Test connection. Reply 'OK' if you receive this.",
    });
    return response.text ? true : false;
  } catch (error) {
    console.error("Gemini API Status Check Failed:", error);
    return false;
  }
}

function getSafetySettings(safetyLevel: string) {
  const threshold = safetyLevel === 'BLOCK_NONE' ? HarmBlockThreshold.BLOCK_NONE :
                    safetyLevel === 'BLOCK_ONLY_HIGH' ? HarmBlockThreshold.BLOCK_ONLY_HIGH :
                    HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE;
                    
  return [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold },
  ];
}

export async function generateArticle(modelId: string, prompt: string, settings: any) {
  const response = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
    config: {
      temperature: settings.aiTemperature,
      maxOutputTokens: settings.aiMaxTokens,
      safetySettings: getSafetySettings(settings.aiSafety),
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          body: { type: Type.STRING, description: "HTML content with h2, h3, p, ul, li" },
          meta: { type: Type.STRING, description: "Meta description max 160 chars" },
          slug: { type: Type.STRING, description: "URL friendly slug without leading slash" },
          category: { type: Type.STRING, description: "One word category for the article" }
        },
        required: ["title", "body", "meta", "slug", "category"]
      }
    }
  });
  
  if (response.text) {
    return JSON.parse(response.text);
  }
  throw new Error("Failed to generate article");
}

export async function generateImage(prompt: string) {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: prompt,
    config: {
      imageConfig: {
        aspectRatio: "16:9"
      }
    }
  });
  
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Failed to generate image");
}

export async function rewriteText(modelId: string, prompt: string, settings: any) {
  const response = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
    config: {
      temperature: settings.aiTemperature,
      safetySettings: getSafetySettings(settings.aiSafety),
    }
  });
  return response.text?.trim() || "";
}
