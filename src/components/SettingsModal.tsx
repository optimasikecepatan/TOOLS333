import React from 'react';
import { AppSettings, DEFAULT_SETTINGS } from '../types';
import { X, Settings, Image as ImageIcon, FileText, Globe, PenTool, ShieldAlert, CheckCircle, XCircle, Loader2, Plus, Trash2, Bot, Sparkles } from 'lucide-react';
import { testWPConnection } from '../lib/wordpress';
import { testBloggerConnection } from '../lib/blogger';
import toast from 'react-hot-toast';

const LANGUAGES = [
  "Indonesian", "English", "Spanish", "French", "German", "Italian", "Portuguese", "Dutch", "Russian", "Japanese", "Korean", "Chinese (Simplified)", "Arabic", "Hindi", "Bengali", "Turkish", "Vietnamese", "Thai"
];

const PROMPT_PRESETS = [
  {
    name: "Standard Blog Post",
    prompt: `Write a SEO-friendly blog post about "{{topic}}" in {{language}}. 
IMPORTANT: The article MUST be approximately {{length}} words long.
Return ONLY a JSON object: {"title": "Title", "body": "<p>HTML Content...</p>", "meta": "160 chars meta", "slug": "/slug", "category": "Category"}`
  },
  {
    name: "Standard + Table",
    prompt: `Write a SEO-friendly blog post about "{{topic}}" in {{language}}.
Include a relevant HTML Table comparing key points or data.
Structure: Introduction, Key Points (H2), Comparison Table (HTML Table), Detailed Analysis (H2), Conclusion.
IMPORTANT: The article MUST be approximately {{length}} words long.
Return ONLY a JSON object: {"title": "Title", "body": "<p>HTML Content...</p>", "meta": "160 chars meta", "slug": "/slug", "category": "Category"}`
  },
  {
    name: "Listicle / Top 10",
    prompt: `Write a "Listicle" or "Top X" style blog post about "{{topic}}" in {{language}}.
Structure: Introduction, List of Items (H2), Detailed Description for each (H3), Conclusion.
IMPORTANT: The article MUST be approximately {{length}} words long.
Return ONLY a JSON object: {"title": "Title", "body": "<p>HTML Content...</p>", "meta": "160 chars meta", "slug": "/slug", "category": "Category"}`
  },
  {
    name: "Product Review",
    prompt: `Write a comprehensive Product Review about "{{topic}}" in {{language}}.
Structure: Introduction, Features (H2), Pros & Cons (H2 + List), User Experience (H2), Verdict/Conclusion (H2).
IMPORTANT: The article MUST be approximately {{length}} words long.
Return ONLY a JSON object: {"title": "Title", "body": "<p>HTML Content...</p>", "meta": "160 chars meta", "slug": "/slug", "category": "Category"}`
  },
  {
    name: "How-To Guide",
    prompt: `Write a Step-by-Step How-To Guide about "{{topic}}" in {{language}}.
Structure: Introduction, Prerequisites (H2), Step-by-Step Instructions (H2 + H3 for steps), Tips (H2), Conclusion.
IMPORTANT: The article MUST be approximately {{length}} words long.
Return ONLY a JSON object: {"title": "Title", "body": "<p>HTML Content...</p>", "meta": "160 chars meta", "slug": "/slug", "category": "Category"}`
  },
  {
    name: "Comparison (Vs)",
    prompt: `Write a Comparison article about "{{topic}}" in {{language}}.
Structure: Introduction, Overview of Item A (H2), Overview of Item B (H2), Key Differences (H2), Comparison Table (HTML Table), Conclusion/Winner.
IMPORTANT: The article MUST be approximately {{length}} words long.
Return ONLY a JSON object: {"title": "Title", "body": "<p>HTML Content...</p>", "meta": "160 chars meta", "slug": "/slug", "category": "Category"}`
  },
  {
    name: "News / Update",
    prompt: `Write a News Update article about "{{topic}}" in {{language}}.
Tone: Professional, Objective, Journalistic.
Structure: Headline, Lead Paragraph (Who, what, when, where, why), Key Details (H2), Background/Context (H2), Quotes/Reactions (if applicable), Conclusion.
IMPORTANT: The article MUST be approximately {{length}} words long.
Return ONLY a JSON object: {"title": "Title", "body": "<p>HTML Content...</p>", "meta": "160 chars meta", "slug": "/slug", "category": "Category"}`
  },
  {
    name: "FAQ / Q&A",
    prompt: `Write a FAQ (Frequently Asked Questions) style article about "{{topic}}" in {{language}}.
Structure: Introduction, Question 1 (H2), Answer 1, Question 2 (H2), Answer 2, ... Conclusion.
IMPORTANT: The article MUST be approximately {{length}} words long.
Return ONLY a JSON object: {"title": "Title", "body": "<p>HTML Content...</p>", "meta": "160 chars meta", "slug": "/slug", "category": "Category"}`
  },
  {
    name: "Opinion / Editorial",
    prompt: `Write an Opinion/Editorial piece about "{{topic}}" in {{language}}.
Tone: Persuasive, Strong Voice, Thought-Provoking.
Structure: Introduction (Hook + Thesis), Argument 1 (H2), Argument 2 (H2), Counter-Argument & Rebuttal (H2), Conclusion (Call to Action).
IMPORTANT: The article MUST be approximately {{length}} words long.
Return ONLY a JSON object: {"title": "Title", "body": "<p>HTML Content...</p>", "meta": "160 chars meta", "slug": "/slug", "category": "Category"}`
  }
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

export function SettingsModal({ isOpen, onClose, settings, onSave }: Props) {
  const [localSettings, setLocalSettings] = React.useState<AppSettings>(settings);
  const [wpTestStatus, setWpTestStatus] = React.useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [wpTestMsg, setWpTestMsg] = React.useState('');
  const [bloggerTestStatus, setBloggerTestStatus] = React.useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [bloggerTestMsg, setBloggerTestMsg] = React.useState('');

  React.useEffect(() => {
    setLocalSettings(settings);
    setWpTestStatus('idle');
    setBloggerTestStatus('idle');
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: keyof AppSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleApplyPreset = (presetName: string) => {
    const preset = PROMPT_PRESETS.find(p => p.name === presetName);
    if (preset) {
      setLocalSettings(prev => ({ ...prev, promptKeyword: preset.prompt }));
      toast.success(`Preset "${presetName}" applied!`);
    }
  };

  const handleSave = () => {
    onSave(localSettings);
    toast.success("Pengaturan berhasil disimpan");
    onClose();
  };

  const handleReset = () => {
    setLocalSettings(DEFAULT_SETTINGS);
    toast.success("Pengaturan direset ke default");
  };

  const handleTestWP = async () => {
    if (!localSettings.wpUrl || !localSettings.wpUser || !localSettings.wpPass) {
      setWpTestStatus('error');
      setWpTestMsg('Harap isi semua kolom WP');
      return;
    }
    setWpTestStatus('testing');
    try {
      const name = await testWPConnection(localSettings.wpUrl, localSettings.wpUser, localSettings.wpPass);
      setWpTestStatus('ok');
      setWpTestMsg(`Sukses! Halo, ${name}`);
    } catch (e: any) {
      setWpTestStatus('error');
      setWpTestMsg(e.message || 'Koneksi gagal');
    }
  };

  const handleSaveWPAccount = () => {
    if (!localSettings.wpUrl || !localSettings.wpUser || !localSettings.wpPass) {
      toast.error('Harap isi URL, Username, dan Password');
      return;
    }
    const newAccount = {
      id: Date.now().toString(),
      name: `WP - ${localSettings.wpUser}`,
      url: localSettings.wpUrl,
      user: localSettings.wpUser,
      pass: localSettings.wpPass
    };
    setLocalSettings(prev => ({
      ...prev,
      wpAccounts: [...prev.wpAccounts, newAccount],
      wpUrl: '', wpUser: '', wpPass: ''
    }));
    setWpTestStatus('idle');
  };

  const handleDeleteWPAccount = (id: string) => {
    setLocalSettings(prev => ({
      ...prev,
      wpAccounts: prev.wpAccounts.filter(a => a.id !== id)
    }));
  };

  const handleTestBlogger = async () => {
    if (!localSettings.bloggerId || !localSettings.bloggerToken) {
      setBloggerTestStatus('error');
      setBloggerTestMsg('Harap isi semua kolom Blogger');
      return;
    }
    setBloggerTestStatus('testing');
    try {
      const name = await testBloggerConnection(localSettings.bloggerId, localSettings.bloggerToken);
      setBloggerTestStatus('ok');
      setBloggerTestMsg(`Sukses! Blog: ${name}`);
    } catch (e: any) {
      setBloggerTestStatus('error');
      setBloggerTestMsg(e.message || 'Koneksi gagal');
    }
  };

  const handleSaveBloggerAccount = () => {
    if (!localSettings.bloggerId || !localSettings.bloggerToken) {
      toast.error('Harap isi Blog ID dan Token');
      return;
    }
    const newAccount = {
      id: Date.now().toString(),
      name: `Blogger - ${localSettings.bloggerId}`,
      blogId: localSettings.bloggerId,
      token: localSettings.bloggerToken
    };
    setLocalSettings(prev => ({
      ...prev,
      bloggerAccounts: [...prev.bloggerAccounts, newAccount],
      bloggerId: '', bloggerToken: ''
    }));
    setBloggerTestStatus('idle');
  };

  const handleDeleteBloggerAccount = (id: string) => {
    setLocalSettings(prev => ({
      ...prev,
      bloggerAccounts: prev.bloggerAccounts.filter(a => a.id !== id)
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50">
      <div className="bg-white w-11/12 md:max-w-2xl mx-auto rounded-lg shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-lg text-slate-700 flex items-center gap-2">
            <Settings className="w-5 h-5" /> Pengaturan Global
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-red-500">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* WordPress Config */}
          <div>
            <h4 className="font-bold text-slate-800 border-b pb-2 mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-600" /> Konfigurasi WordPress API
            </h4>
            <div className="grid gap-3">
              {localSettings.wpAccounts.length > 0 && (
                <div className="mb-2 space-y-2">
                  <label className="block text-xs font-bold text-slate-500">Akun Tersimpan:</label>
                  {localSettings.wpAccounts.map(acc => (
                    <div key={acc.id} className="flex justify-between items-center bg-blue-50 p-2 rounded border border-blue-100">
                      <div>
                        <p className="text-sm font-bold text-blue-800">{acc.name}</p>
                        <p className="text-xs text-blue-600">{acc.url}</p>
                      </div>
                      <button onClick={() => handleDeleteWPAccount(acc.id)} className="text-red-500 hover:bg-red-100 p-1 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-700">Tambah Akun Baru</label>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">WordPress URL (contoh: https://domain.com)</label>
                  <input type="text" value={localSettings.wpUrl} onChange={e => handleChange('wpUrl', e.target.value)} className="w-full border p-2 rounded text-sm bg-white" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Username / Email</label>
                    <input type="text" value={localSettings.wpUser} onChange={e => handleChange('wpUser', e.target.value)} className="w-full border p-2 rounded text-sm bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Application Password</label>
                    <input type="password" value={localSettings.wpPass} onChange={e => handleChange('wpPass', e.target.value)} className="w-full border p-2 rounded text-sm bg-white" />
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <button onClick={handleTestWP} disabled={wpTestStatus === 'testing'} className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded font-semibold hover:bg-blue-200 flex items-center gap-1">
                    {wpTestStatus === 'testing' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Test Koneksi WP'}
                  </button>
                  <button onClick={handleSaveWPAccount} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded font-semibold hover:bg-green-700 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Simpan Akun
                  </button>
                  {wpTestStatus === 'ok' && <span className="text-xs text-green-600 font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3"/> {wpTestMsg}</span>}
                  {wpTestStatus === 'error' && <span className="text-xs text-red-600 font-bold flex items-center gap-1"><XCircle className="w-3 h-3"/> {wpTestMsg}</span>}
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer mt-2">
                <input type="checkbox" checked={localSettings.uploadImageToWp} onChange={e => handleChange('uploadImageToWp', e.target.checked)} className="rounded text-green-600 focus:ring-green-500" /> 
                Upload Gambar ke WordPress (Media Library)
              </label>
            </div>
          </div>

          {/* Blogger Config */}
          <div>
            <h4 className="font-bold text-slate-800 border-b pb-2 mb-3 flex items-center gap-2">
              <PenTool className="w-4 h-4 text-orange-600" /> Konfigurasi Blogger API
            </h4>
            <div className="grid gap-3">
              {localSettings.bloggerAccounts.length > 0 && (
                <div className="mb-2 space-y-2">
                  <label className="block text-xs font-bold text-slate-500">Akun Tersimpan:</label>
                  {localSettings.bloggerAccounts.map(acc => (
                    <div key={acc.id} className="flex justify-between items-center bg-orange-50 p-2 rounded border border-orange-100">
                      <div>
                        <p className="text-sm font-bold text-orange-800">{acc.name}</p>
                        <p className="text-xs text-orange-600">ID: {acc.blogId}</p>
                      </div>
                      <button onClick={() => handleDeleteBloggerAccount(acc.id)} className="text-red-500 hover:bg-red-100 p-1 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-700">Tambah Akun Baru</label>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Blog ID</label>
                  <input type="text" value={localSettings.bloggerId} onChange={e => handleChange('bloggerId', e.target.value)} className="w-full border p-2 rounded text-sm bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Access Token (OAuth2)</label>
                  <input type="password" value={localSettings.bloggerToken} onChange={e => handleChange('bloggerToken', e.target.value)} className="w-full border p-2 rounded text-sm bg-white" />
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <button onClick={handleTestBlogger} disabled={bloggerTestStatus === 'testing'} className="text-xs bg-orange-100 text-orange-700 px-3 py-1.5 rounded font-semibold hover:bg-orange-200 flex items-center gap-1">
                    {bloggerTestStatus === 'testing' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Test Koneksi Blogger'}
                  </button>
                  <button onClick={handleSaveBloggerAccount} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded font-semibold hover:bg-green-700 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Simpan Akun
                  </button>
                  {bloggerTestStatus === 'ok' && <span className="text-xs text-green-600 font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3"/> {bloggerTestMsg}</span>}
                  {bloggerTestStatus === 'error' && <span className="text-xs text-red-600 font-bold flex items-center gap-1"><XCircle className="w-3 h-3"/> {bloggerTestMsg}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* AI Settings Config */}
          <div>
            <h4 className="font-bold text-slate-800 border-b pb-2 mb-3 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600" /> Konfigurasi AI & Keamanan
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Temperature ({localSettings.aiTemperature})</label>
                <input 
                  type="range" 
                  min="0" max="2" step="0.1" 
                  value={localSettings.aiTemperature} 
                  onChange={e => handleChange('aiTemperature', parseFloat(e.target.value))} 
                  className="w-full" 
                />
                <p className="text-[10px] text-slate-400 mt-1">0 = Kaku/Faktual, 2 = Sangat Kreatif/Halu</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Max Output Tokens</label>
                <input 
                  type="number" 
                  value={localSettings.aiMaxTokens} 
                  onChange={e => handleChange('aiMaxTokens', parseInt(e.target.value))} 
                  className="w-full border p-2 rounded text-sm bg-slate-50" 
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1">Safety Filter Level (Gemini Only)</label>
                <select 
                  value={localSettings.aiSafety} 
                  onChange={e => handleChange('aiSafety', e.target.value)} 
                  className="w-full border p-2 rounded text-sm bg-slate-50"
                >
                  <option value="BLOCK_NONE">Block None (Paling Bebas - Direkomendasikan)</option>
                  <option value="BLOCK_ONLY_HIGH">Block Only High (Menengah)</option>
                  <option value="BLOCK_MEDIUM_AND_ABOVE">Block Medium & Above (Ketat)</option>
                </select>
              </div>
            </div>
          </div>

          {/* ImageKit Config */}
          <div>
            <h4 className="font-bold text-slate-800 border-b pb-2 mb-3 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-green-600" /> Konfigurasi ImageKit API (Opsional)
            </h4>
            <div className="grid gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">ImageKit URL Endpoint</label>
                <input type="text" value={localSettings.ikUrl} onChange={e => handleChange('ikUrl', e.target.value)} className="w-full border p-2 rounded text-sm bg-slate-50 font-mono" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">ImageKit Private Key</label>
                <input type="password" value={localSettings.ikPrivateKey} onChange={e => handleChange('ikPrivateKey', e.target.value)} className="w-full border p-2 rounded text-sm bg-slate-50 font-mono" />
              </div>
            </div>
          </div>

          {/* Prompts Config */}
          <div>
            <h4 className="font-bold text-slate-800 border-b pb-2 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600" /> Konfigurasi Prompt AI
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Bahasa Artikel</label>
                <select 
                  value={localSettings.language} 
                  onChange={e => handleChange('language', e.target.value)} 
                  className="w-full border p-2 rounded text-sm bg-slate-50"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>

              <div className="bg-purple-50 p-3 rounded border border-purple-100">
                <label className="block text-xs font-bold text-purple-800 mb-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Quick Presets (Klik untuk menerapkan)
                </label>
                <div className="flex flex-wrap gap-2">
                  {PROMPT_PRESETS.map(preset => (
                    <button 
                      key={preset.name}
                      onClick={() => handleApplyPreset(preset.name)}
                      className="text-xs bg-white border border-purple-200 text-purple-700 px-2 py-1 rounded hover:bg-purple-100 transition shadow-sm"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Prompt Artikel (Keyword)</label>
                <textarea value={localSettings.promptKeyword} onChange={e => handleChange('promptKeyword', e.target.value)} className="w-full h-24 p-2 border rounded text-xs font-mono bg-slate-50"></textarea>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Prompt RSS (Berita)</label>
                <textarea value={localSettings.promptRss} onChange={e => handleChange('promptRss', e.target.value)} className="w-full h-24 p-2 border rounded text-xs font-mono bg-slate-50"></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Prompt Rewrite Judul</label>
                  <textarea value={localSettings.promptRewriteTitle} onChange={e => handleChange('promptRewriteTitle', e.target.value)} className="w-full h-24 p-2 border rounded text-xs font-mono bg-slate-50"></textarea>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Prompt Rewrite Meta</label>
                  <textarea value={localSettings.promptRewriteMeta} onChange={e => handleChange('promptRewriteMeta', e.target.value)} className="w-full h-24 p-2 border rounded text-xs font-mono bg-slate-50"></textarea>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="px-6 py-3 border-t bg-slate-50 flex justify-end gap-2">
          <button onClick={handleReset} className="text-xs text-slate-500 hover:text-slate-800 underline mr-auto">Reset Default</button>
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded">Batal</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 shadow-md font-bold">Simpan Pengaturan</button>
        </div>
      </div>
    </div>
  );
}
