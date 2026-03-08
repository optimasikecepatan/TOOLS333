import { AppSettings } from '../types';

export const OPENAI_MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
];

export async function checkOpenAIStatus(apiKey: string): Promise<boolean> {
  if (!apiKey) return false;
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    return res.ok;
  } catch (e) {
    console.error("OpenAI Check Failed", e);
    return false;
  }
}

export async function generateArticleOpenAI(model: string, prompt: string, settings: AppSettings) {
  if (!settings.openaiApiKey) throw new Error("OpenAI API Key is missing");

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.openaiApiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: "You are a helpful assistant that outputs JSON." },
        { role: "user", content: prompt }
      ],
      temperature: settings.aiTemperature,
      max_tokens: settings.aiMaxTokens,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`OpenAI Error: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    return JSON.parse(content);
  } catch (e) {
    console.error("Failed to parse OpenAI JSON", content);
    throw new Error("Failed to parse JSON response from OpenAI");
  }
}

export async function rewriteTextOpenAI(model: string, prompt: string, settings: AppSettings) {
  if (!settings.openaiApiKey) throw new Error("OpenAI API Key is missing");

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.openaiApiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: prompt }
      ],
      temperature: settings.aiTemperature,
      max_tokens: settings.aiMaxTokens,
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`OpenAI Error: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content?.trim() || "";
}

export async function generateImageOpenAI(prompt: string, settings: AppSettings) {
  if (!settings.openaiApiKey) throw new Error("OpenAI API Key is missing");

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.openaiApiKey}`
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json"
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`OpenAI Image Error: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return `data:image/png;base64,${data.data[0].b64_json}`;
}
