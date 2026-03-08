export interface Article {
  id: string;
  title: string;
  body: string;
  meta: string;
  slug: string;
  image: string;
  date: string;
  dateObj: Date;
  status: string;
  type: string;
  category: string;
  selected?: boolean;
}

export interface WpAccount {
  id: string;
  name: string;
  url: string;
  user: string;
  pass: string;
}

export interface BloggerAccount {
  id: string;
  name: string;
  blogId: string;
  token: string;
}

export interface AppSettings {
  ikUrl: string;
  ikPrivateKey: string;
  wpUrl: string; // Keep for backward compatibility
  wpUser: string;
  wpPass: string;
  bloggerId: string;
  bloggerToken: string;
  wpAccounts: WpAccount[];
  bloggerAccounts: BloggerAccount[];
  language: string;
  promptKeyword: string;
  promptRss: string;
  promptRewriteTitle: string;
  promptRewriteMeta: string;
  uploadImageToWp: boolean;
  aiTemperature: number;
  aiMaxTokens: number;
  aiSafety: string;
  openaiApiKey: string;
  openaiModel: string;
  aiProvider: 'gemini' | 'openai';
}

export const DEFAULT_SETTINGS: AppSettings = {
  ikUrl: "https://upload.imagekit.io/api/v1/files/upload",
  ikPrivateKey: "",
  wpUrl: "",
  wpUser: "",
  wpPass: "",
  bloggerId: "",
  bloggerToken: "",
  wpAccounts: [],
  bloggerAccounts: [],
  language: "Indonesian",
  promptKeyword: `Write a SEO-friendly blog post about "{{topic}}" in {{language}}. 
IMPORTANT: The article MUST be approximately {{length}} words long.
Return ONLY a JSON object: {"title": "Title", "body": "<p>HTML Content...</p>", "meta": "160 chars meta", "slug": "/slug", "category": "Category"}`,
  promptRss: `Act as a SEO Expert Content Writer. Your task is to rewrite the following news to be 100% unique, plagiarism-free, and have a fresh perspective.

VERY IMPORTANT:
1. The title MUST be completely changed from the original, make it clickworthy but relevant for SEO.
2. The article structure must be SEO friendly with H2 and H3.
3. Use fluent and standard {{language}}.
4. The article length must be approximately {{length}} words.

Original Data: 
{{data}}

Return ONLY a raw JSON object (no markdown): {"title": "New Unique Title", "body": "<p>HTML News Content...</p>", "meta": "SEO Description max 150 char", "slug": "/new-seo-slug", "category": "Category"}`,
  promptRewriteTitle: `Rewrite this title to be catchy & SEO friendly (Language: {{language}}): "{{original}}". Return ONLY text.`,
  promptRewriteMeta: `Rewrite this meta description to be SEO friendly (Language: {{language}}, max 160 chars): "{{original}}". Return ONLY text.`,
  uploadImageToWp: true,
  aiTemperature: 0.7,
  aiMaxTokens: 8192,
  aiSafety: "BLOCK_NONE",
  openaiApiKey: "",
  openaiModel: "gpt-4o-mini",
  aiProvider: "gemini",
};
