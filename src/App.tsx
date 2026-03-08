import React, { useState, useEffect } from 'react';
import { Article, AppSettings, DEFAULT_SETTINGS } from './types';
import { SettingsModal } from './components/SettingsModal';
import { EditorModal } from './components/EditorModal';
import { ImageModal } from './components/ImageModal';
import { PostModal } from './components/PostModal';
import { GEMINI_MODELS, checkGeminiStatus, generateArticle, generateImage } from './lib/gemini';
import { generateArticleOpenAI, generateImageOpenAI, OPENAI_MODELS, checkOpenAIStatus } from './lib/openai';
import { uploadImage } from './lib/imageUtils';
import { postToWP } from './lib/wordpress';
import { postToBlogger } from './lib/blogger';
import { Settings, FileText, Rss, Trash2, Calendar, Copy, Download, UploadCloud, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const RSS_PRESETS = [
  { name: "Detik News", url: "https://news.detik.com/rss" },
  { name: "Kompas News", url: "https://news.kompas.com/feed" },
  { name: "CNN Nasional", url: "https://www.cnnindonesia.com/nasional/rss" },
  { name: "Antara News", url: "https://www.antaranews.com/rss/terkini.xml" },
  { name: "CNBC Indonesia", url: "https://www.cnbcindonesia.com/news/rss" },
  { name: "Tempo", url: "https://rss.tempo.co/nasional" },
  { name: "Liputan6", url: "https://feed.liputan6.com/rss/news" },
  { name: "Viva.co.id", url: "https://www.viva.co.id/feed" },
  { name: "Suara.com", url: "https://www.suara.com/rss/news" },
  { name: "Merdeka", url: "https://www.merdeka.com/feed/" }
];

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('app_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_SETTINGS, ...parsed, wpAccounts: parsed.wpAccounts || [], bloggerAccounts: parsed.bloggerAccounts || [] };
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  const [articles, setArticles] = useState<Article[]>([]);
  const [activeTab, setActiveTab] = useState<'keyword' | 'rss'>('keyword');
  const [keywords, setKeywords] = useState('');
  const [rssUrl, setRssUrl] = useState('');
  const [rssItems, setRssItems] = useState<any[]>([]);
  const [lineCount, setLineCount] = useState(0);
  
  const [selectedModel, setSelectedModel] = useState(GEMINI_MODELS[1].id);
  const [apiStatus, setApiStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<{current: number, total: number} | null>(null);
  const [generatingItems, setGeneratingItems] = useState<{id: string, title: string, status: string}[]>([]);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [postModalType, setPostModalType] = useState<'wp' | 'blogger'>('wp');

  // Global Settings State
  const [useSchedule, setUseSchedule] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [postsPerDay, setPostsPerDay] = useState(3);
  const [articleLength, setArticleLength] = useState('500');
  const [customLength, setCustomLength] = useState('');
  const [genAiImage, setGenAiImage] = useState(true);

  const [bulkDate, setBulkDate] = useState(new Date().toISOString().split('T')[0]);
  const [bulkPostsPerDay, setBulkPostsPerDay] = useState(3);

  const formatDateForSheets = (date: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(date.getMonth()+1)}/${pad(date.getDate())}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };

  const toDatetimeLocal = (date: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const handleArticleDateChange = (id: string, newDateStr: string) => {
    const newDate = new Date(newDateStr);
    if (isNaN(newDate.getTime())) return;

    const now = new Date();
    const status = newDate > now ? 'Scheduled' : 'Publish';

    setArticles(prev => prev.map(a => {
      if (a.id === id) {
        return {
          ...a,
          dateObj: newDate,
          date: formatDateForSheets(newDate),
          status: status
        };
      }
      return a;
    }));
  };

  useEffect(() => {
    localStorage.setItem('app_settings', JSON.stringify(settings));
  }, [settings]);

  const handleKeywordsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setKeywords(val);
    const lines = val.split('\n').filter(line => line.trim() !== '').length;
    setLineCount(lines);
  };

  const handleClearKeywords = () => {
    setKeywords('');
    setLineCount(0);
  };

  const handleCheckApi = async () => {
    setApiStatus('checking');
    let isOk = false;
    if (settings.aiProvider === 'openai') {
      isOk = await checkOpenAIStatus(settings.openaiApiKey);
    } else {
      isOk = await checkGeminiStatus(selectedModel);
    }
    setApiStatus(isOk ? 'ok' : 'error');
  };

  const handleLoadRssUrl = async (url: string) => {
    if (!url) return;
    try {
      const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (data.status === 'ok') {
        setRssItems(data.items.map((item: any) => ({ ...item, selected: false })));
        toast.success("RSS feed loaded successfully");
      } else {
        toast.error("Failed to load RSS");
      }
    } catch (e) {
      toast.error("Error loading RSS");
    }
  };

  const handleLoadRss = () => handleLoadRssUrl(rssUrl);

  const handleGenerate = async () => {
    let targets: any[] = [];
    if (activeTab === 'keyword') {
      const lines = keywords.split('\n').filter(l => l.trim());
      if (!lines.length) return toast.error("Keyword kosong!");
      targets = lines.map(t => ({ type: 'keyword', topic: t }));
    } else {
      const selectedRss = rssItems.filter(i => i.selected);
      if (!selectedRss.length) return toast.error("Pilih berita dulu!");
      targets = selectedRss.map(i => ({ type: 'rss', data: i }));
    }

    setIsGenerating(true);
    if (useSchedule && !startDate) {
      setIsGenerating(false);
      return toast.error("Pilih tanggal mulai untuk jadwal otomatis!");
    }

    const [year, month, day] = (useSchedule && startDate ? startDate : new Date().toISOString().split('T')[0]).split('-').map(Number);
    let baseDate = new Date(year, month - 1, day);
    if (isNaN(baseDate.getTime())) {
      baseDate = new Date();
    }
    baseDate.setHours(8, 0, 0, 0);

    const lengthVal = articleLength === 'custom' ? customLength : articleLength;

    const newGeneratingItems = targets.map((t, i) => ({
      id: `gen-${Date.now()}-${i}`,
      title: t.type === 'keyword' ? t.topic : t.data.title,
      status: t.type === 'rss' ? "Rewriting Title..." : "Generating..."
    }));
    setGeneratingItems(newGeneratingItems);
    setGenerationProgress({ current: 0, total: targets.length });

    for (let i = 0; i < targets.length; i++) {
      setGenerationProgress({ current: i + 1, total: targets.length });
      const target = targets[i];
      let prompt = "";
      
      if (target.type === 'keyword') {
        prompt = settings.promptKeyword
          .replace("{{topic}}", target.topic)
          .replace("{{length}}", lengthVal)
          .replace("{{language}}", settings.language);
      } else {
        const cleanContent = target.data.description.replace(/<[^>]*>?/gm, '');
        const context = `Judul: ${target.data.title}\nKonten: ${cleanContent}\nLink: ${target.data.link}`;
        prompt = settings.promptRss
          .replace("{{data}}", context)
          .replace("{{length}}", lengthVal)
          .replace("{{language}}", settings.language);
      }

      try {
        let content;
        if (settings.aiProvider === 'openai') {
          content = await generateArticleOpenAI(settings.openaiModel, prompt, settings);
        } else {
          content = await generateArticle(selectedModel, prompt, settings);
        }
        
        let imgUrl = `https://tse2.mm.bing.net/th?q=${encodeURIComponent(content.title)}`;
        if (genAiImage) {
          try {
            const imagePrompt = target.type === 'keyword' ? target.topic : content.title;
            let base64Img = "";
            if (settings.aiProvider === 'openai') {
              base64Img = await generateImageOpenAI(imagePrompt, settings);
            } else {
              base64Img = await generateImage(imagePrompt);
            }
            
            // Upload image to avoid base64
            const uploadedUrl = await uploadImage(base64Img, settings, `img_${Date.now()}_${i}.png`);
            if (uploadedUrl && !uploadedUrl.includes('via.placeholder.com')) {
               imgUrl = uploadedUrl;
            }
            
          } catch (e) {
            console.error("Image generation failed", e);
            if (target.type === 'rss' && target.data.thumbnail) {
              imgUrl = target.data.thumbnail;
            } else {
              imgUrl = `https://tse2.mm.bing.net/th?q=${encodeURIComponent(content.title)}`;
            }
          }
        }

        let postDate = new Date(baseDate);
        if (useSchedule) {
          const safePostsPerDay = Math.max(1, postsPerDay);
          const dayOffset = Math.floor((articles.length + i) / safePostsPerDay);
          postDate.setDate(baseDate.getDate() + dayOffset);
          postDate.setMinutes(Math.floor(Math.random() * 60));
        }

        const now = new Date();
        const status = useSchedule ? (postDate > now ? 'Scheduled' : 'Publish') : 'Draft';

        const newArticle: Article = {
          id: Date.now().toString() + i,
          title: content.title,
          body: content.body,
          meta: content.meta,
          slug: content.slug,
          image: imgUrl,
          dateObj: postDate,
          date: formatDateForSheets(postDate),
          status: status,
          type: 'Post',
          category: content.category || 'General',
          selected: false
        };

        setArticles(prev => [...prev, newArticle]);
        setGeneratingItems(prev => prev.filter(item => item.id !== newGeneratingItems[i].id));
      } catch (e: any) {
        console.error("Failed to generate article", e);
        const errorArticle: Article = {
          id: Date.now().toString() + i,
          title: target.type === 'keyword' ? target.topic : target.data.title,
          body: '',
          meta: '',
          slug: '',
          image: '',
          dateObj: new Date(),
          date: '',
          status: `Error: ${e.message}`,
          type: 'Post',
          category: 'General',
          selected: false
        };
        setArticles(prev => [...prev, errorArticle]);
        setGeneratingItems(prev => prev.filter(item => item.id !== newGeneratingItems[i].id));
      }
    }
    setIsGenerating(false);
    setGeneratingItems([]);
    setGenerationProgress(null);
    toast.success("Generate artikel selesai!");
  };

  const handleBulkDelete = () => {
    setArticles(prev => prev.filter(a => !a.selected));
    toast.success("Artikel terpilih berhasil dihapus");
  };

  const handleBulkSchedule = () => {
    const selectedIndices = articles.reduce((acc, a, idx) => {
      if (a.selected) acc.push(idx);
      return acc;
    }, [] as number[]);

    if (!selectedIndices.length) return toast.error("Pilih artikel untuk di-schedule.");
    if (!bulkDate) return toast.error("Pilih tanggal mulai!");

    const [year, month, day] = bulkDate.split('-').map(Number);
    let baseDate = new Date(year, month - 1, day);
    if (isNaN(baseDate.getTime())) return toast.error("Tanggal tidak valid!");
    baseDate.setHours(8, 0, 0, 0);

    setArticles(prev => {
      const newArticles = [...prev];
      const now = new Date();
      selectedIndices.forEach((arrIndex, i) => {
        let postDate = new Date(baseDate);
        const safeBulkPostsPerDay = Math.max(1, bulkPostsPerDay);
        const dayOffset = Math.floor(i / safeBulkPostsPerDay);
        postDate.setDate(baseDate.getDate() + dayOffset);
        postDate.setMinutes(Math.floor(Math.random() * 60)); 
        
        const status = postDate > now ? 'Scheduled' : 'Publish';

        newArticles[arrIndex] = {
          ...newArticles[arrIndex],
          dateObj: postDate,
          date: formatDateForSheets(postDate),
          status: status
        };
      });
      return newArticles;
    });
    toast.success("Jadwal berhasil diperbarui");
  };

  const handleBulkPostWP = () => {
    if (settings.wpAccounts.length === 0) {
      return toast.error("Silakan tambahkan akun WordPress di Settings terlebih dahulu.");
    }
    const selected = articles.filter(a => a.selected);
    if (!selected.length) return toast.error("Pilih artikel untuk diposting.");
    
    setPostModalType('wp');
    setIsPostModalOpen(true);
  };

  const handleBulkPostBlogger = () => {
    if (settings.bloggerAccounts.length === 0) {
      return toast.error("Silakan tambahkan akun Blogger di Settings terlebih dahulu.");
    }
    const selected = articles.filter(a => a.selected);
    if (!selected.length) return toast.error("Pilih artikel untuk diposting.");
    
    setPostModalType('blogger');
    setIsPostModalOpen(true);
  };

  const handleConfirmPost = async (accountId: string, status: string) => {
    const selected = articles.filter(a => a.selected);
    
    if (postModalType === 'wp') {
      const account = settings.wpAccounts.find(a => a.id === accountId);
      if (!account) return;
      
      for (const article of selected) {
        try {
          setArticles(prev => prev.map(a => a.id === article.id ? { ...a, status: 'Posting WP...' } : a));
          const finalStatus = status === 'schedule' ? `Scheduled WP (${account.name})` : `Published WP (${account.name})`;
          const articleToPost = { ...article, status: status === 'schedule' ? 'future' : status };
          await postToWP(articleToPost, account, settings.uploadImageToWp);
          setArticles(prev => prev.map(a => a.id === article.id ? { ...a, status: finalStatus, selected: false } : a));
          toast.success(`Berhasil post ${article.title}`);
        } catch (e: any) {
          toast.error(`Gagal post ${article.title}: ${e.message}`);
          setArticles(prev => prev.map(a => a.id === article.id ? { ...a, status: 'Error WP' } : a));
        }
      }
    } else {
      const account = settings.bloggerAccounts.find(a => a.id === accountId);
      if (!account) return;
      
      for (const article of selected) {
        try {
          setArticles(prev => prev.map(a => a.id === article.id ? { ...a, status: 'Posting Blogger...' } : a));
          const finalStatusBlogger = status === 'schedule' ? `Scheduled Blogger (${account.name})` : `Published Blogger (${account.name})`;
          await postToBlogger(article, account, status);
          setArticles(prev => prev.map(a => a.id === article.id ? { ...a, status: finalStatusBlogger, selected: false } : a));
          toast.success(`Berhasil post ${article.title}`);
        } catch (e: any) {
          toast.error(`Gagal post ${article.title}: ${e.message}`);
          setArticles(prev => prev.map(a => a.id === article.id ? { ...a, status: 'Error Blogger' } : a));
        }
      }
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    setArticles(prev => prev.map(a => ({ ...a, selected: checked })));
  };

  const toggleArticleSelect = (id: string, checked: boolean) => {
    setArticles(prev => prev.map(a => a.id === id ? { ...a, selected: checked } : a));
  };

  const handleCopyData = () => {
    if (!articles.length) return;
    const rows = articles.map(a => [
      a.title,
      a.category,
      a.image,
      a.body,
      a.slug,
      a.meta,
      a.status,
      a.date,
      a.type
    ]);
    const tsv = rows.map(r => r.map(v => {
      const s = String(v || '');
      return (s.includes('\t') || s.includes('\n')) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join('\t')).join('\n');
    
    navigator.clipboard.writeText(tsv).then(() => {
      toast.success("Data berhasil disalin (tanpa header & slug bersih)! Siap paste ke Google Sheets.");
    }).catch(err => {
      console.error('Failed to copy: ', err);
      toast.error("Gagal menyalin data");
    });
  };

  const handleDownloadCSV = () => {
    if (!articles.length) return;
    const header = ['Judul', 'Gambar', 'Body', 'Slug', 'Meta', 'Status', 'Tanggal'];
    const rows = articles.map(a => [
      `"${a.title.replace(/"/g, '""')}"`,
      `"${a.image}"`,
      `"${a.body.replace(/"/g, '""')}"`,
      `"${a.slug}"`,
      `"${a.meta.replace(/"/g, '""')}"`,
      `"${a.status}"`,
      `"${a.date}"`
    ]);
    const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\\n');
    const blob = new Blob(['\\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'articles.csv';
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 md:p-6">
      <Toaster position="bottom-right" />
      {/* Header */}
      <header className="bg-gradient-to-r from-green-700 to-emerald-800 text-white p-5 rounded-xl shadow-lg mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">SheetsPost AI WGS V2.0</h1>
          <p className="text-green-100 text-xs md:text-sm">Bulk Instant Artikel Generator with Gemini API</p>
        </div>
        <button onClick={() => setIsSettingsOpen(true)} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition">
          <Settings className="w-5 h-5" />
          <span className="hidden md:inline">Settings</span>
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          
          {/* Tabs */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex">
            <button onClick={() => setActiveTab('keyword')} className={`flex-1 py-3 text-sm font-medium ${activeTab === 'keyword' ? 'bg-green-50 text-green-700 border-b-2 border-green-600' : 'text-slate-500 hover:bg-slate-50'}`}>
              📝 By Keyword
            </button>
            <button onClick={() => setActiveTab('rss')} className={`flex-1 py-3 text-sm font-medium ${activeTab === 'rss' ? 'bg-green-50 text-green-700 border-b-2 border-green-600' : 'text-slate-500 hover:bg-slate-50'}`}>
              📡 Scrape RSS
            </button>
          </div>

          {/* Input Area */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            {activeTab === 'keyword' ? (
              <div>
                <label className="block font-semibold text-slate-700 mb-2 text-sm">List Judul / Keyword (Per Baris)</label>
                <textarea 
                  value={keywords}
                  onChange={handleKeywordsChange}
                  className="w-full h-48 p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none" 
                  placeholder="Manfaat Minum Air Putih\nCara Merawat Kucing"
                />
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                  <span>{lineCount} Baris</span>
                  <button onClick={handleClearKeywords} className="text-red-500 hover:underline">Bersihkan</button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block font-semibold text-slate-700 mb-2 text-sm">URL RSS Feed</label>
                <div className="flex gap-2 mb-2">
                  <select 
                    onChange={e => {
                      if (e.target.value) {
                        setRssUrl(e.target.value);
                        handleLoadRssUrl(e.target.value);
                      }
                    }} 
                    className="flex-1 p-2 border border-slate-300 rounded text-sm bg-slate-50"
                  >
                    <option value="">-- Pilih Preset Berita --</option>
                    {RSS_PRESETS.map((preset, idx) => (
                      <option key={idx} value={preset.url}>{preset.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <input type="text" value={rssUrl} onChange={e => setRssUrl(e.target.value)} placeholder="https://news.detik.com/rss" className="flex-1 p-2 border border-slate-300 rounded text-sm" />
                  <button onClick={handleLoadRss} className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 text-sm">Load</button>
                </div>
                <div className="h-40 overflow-y-auto border rounded p-2 bg-slate-50 space-y-2">
                  {rssItems.length === 0 ? <p className="text-center text-slate-400 text-xs mt-10">Belum ada feed</p> : 
                    rssItems.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded hover:bg-slate-50 transition group">
                        <label className="flex-1 flex items-start gap-3 cursor-pointer select-none">
                          <input type="checkbox" checked={item.selected} onChange={e => {
                            const newItems = [...rssItems];
                            newItems[idx].selected = e.target.checked;
                            setRssItems(newItems);
                          }} className="mt-1 flex-shrink-0" />
                          <img src={item.thumbnail || item.enclosure?.link || "https://via.placeholder.com/80?text=News"} className="w-20 h-16 object-cover rounded bg-slate-100 border border-slate-200 flex-shrink-0" alt="thumb" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm text-slate-800 line-clamp-2 leading-snug mb-1" title={item.title}>{item.title}</h4>
                            <p className="text-[10px] text-slate-500 truncate">{new Date(item.pubDate).toLocaleDateString()} &bull; {new URL(item.link).hostname}</p>
                          </div>
                        </label>
                        <a href={item.link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="mt-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 font-bold whitespace-nowrap">Baca</a>
                      </div>
                    ))
                  }
                </div>
                {rssItems.length > 0 && (
                  <div className="mt-3 pt-3 border-t flex flex-col gap-3">
                    <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded border border-slate-200">
                      <span className="text-xs font-bold text-slate-600">{rssItems.filter(i => i.selected).length} Dipilih</span>
                      <div className="flex gap-3 text-xs">
                        <button onClick={() => setRssItems(prev => prev.map(i => ({ ...i, selected: true })))} className="text-blue-600 hover:text-blue-800 font-bold hover:underline flex items-center gap-1">Select All</button>
                        <span className="text-slate-300">|</span>
                        <button onClick={() => setRssItems(prev => prev.map(i => ({ ...i, selected: false })))} className="text-slate-500 hover:text-slate-700 hover:underline">Unselect</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Model & API Status */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-2 text-sm">Pilih Provider AI</label>
              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="aiProvider" 
                    value="gemini" 
                    checked={settings.aiProvider === 'gemini'} 
                    onChange={() => setSettings(prev => ({ ...prev, aiProvider: 'gemini' }))}
                    className="text-blue-600"
                  />
                  <span className="text-sm font-medium">Google Gemini</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="aiProvider" 
                    value="openai" 
                    checked={settings.aiProvider === 'openai'} 
                    onChange={() => setSettings(prev => ({ ...prev, aiProvider: 'openai' }))}
                    className="text-green-600"
                  />
                  <span className="text-sm font-medium">OpenAI (GPT)</span>
                </label>
              </div>

              {settings.aiProvider === 'gemini' ? (
                <div>
                  <label className="block font-semibold text-slate-700 mb-2 text-sm">Model Gemini API</label>
                  <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} className="w-full p-2 border border-slate-300 rounded text-sm bg-slate-50">
                    {GEMINI_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-2 text-sm">OpenAI API Key</label>
                    <input 
                      type="password" 
                      value={settings.openaiApiKey} 
                      onChange={e => setSettings(prev => ({ ...prev, openaiApiKey: e.target.value }))}
                      className="w-full p-2 border border-slate-300 rounded text-sm bg-slate-50"
                      placeholder="sk-..."
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-2 text-sm">Model OpenAI</label>
                    <select 
                      value={settings.openaiModel} 
                      onChange={e => setSettings(prev => ({ ...prev, openaiModel: e.target.value }))}
                      className="w-full p-2 border border-slate-300 rounded text-sm bg-slate-50"
                    >
                      {OPENAI_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <button onClick={handleCheckApi} disabled={apiStatus === 'checking'} className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded font-semibold hover:bg-blue-200 flex items-center gap-1">
                {apiStatus === 'checking' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Cek Status API'}
              </button>
              {apiStatus === 'ok' && <span className="text-xs text-green-600 font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3"/> API Aktif</span>}
              {apiStatus === 'error' && <span className="text-xs text-red-600 font-bold flex items-center gap-1"><XCircle className="w-3 h-3"/> API Error</span>}
            </div>
          </div>

          {/* Settings & Generate */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 text-sm">Jadwal Otomatis</span>
              <input type="checkbox" checked={useSchedule} onChange={e => setUseSchedule(e.target.checked)} className="w-4 h-4 text-green-600" />
            </div>
            {useSchedule && (
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded border">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Mulai Tgl</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-1.5 border rounded text-xs" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Post/Hari</label>
                  <input type="number" value={postsPerDay} onChange={e => setPostsPerDay(Number(e.target.value))} className="w-full p-1.5 border rounded text-xs" />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Panjang Artikel (Kata)</label>
              <select value={articleLength} onChange={e => setArticleLength(e.target.value)} className="w-full p-2 border border-slate-300 rounded text-sm mb-2">
                <option value="500">500 Kata (Standar)</option>
                <option value="1000">1000 Kata (SEO)</option>
                <option value="custom">Custom...</option>
              </select>
              {articleLength === 'custom' && (
                <input type="number" value={customLength} onChange={e => setCustomLength(e.target.value)} placeholder="Misal: 1500" className="w-full p-2 border rounded text-sm" />
              )}
            </div>

            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input type="checkbox" checked={genAiImage} onChange={e => setGenAiImage(e.target.checked)} className="rounded text-green-600" /> 
              Generate AI Image
            </label>

            <button onClick={handleGenerate} disabled={isGenerating} className="w-full py-3 bg-green-700 hover:bg-green-800 text-white rounded-lg font-bold shadow-md transition flex justify-center items-center gap-2">
              {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Generate Artikel'}
            </button>
          </div>
        </div>

        {/* Main Content (Table) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[800px]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
              <h2 className="font-bold text-slate-700">Hasil Artikel CSV</h2>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-bold">
                {generationProgress ? `${generationProgress.current}/${generationProgress.total} Artikel` : `${articles.length} Artikel`}
              </span>
            </div>

            <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex flex-col md:flex-row gap-3 justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-blue-800 bg-blue-200 px-2 py-1 rounded">{articles.filter(a => a.selected).length} Selected</span>
                <div className="flex text-xs gap-2 text-blue-700">
                  <button onClick={() => toggleSelectAll(true)} className="hover:underline font-bold">All</button> | 
                  <button onClick={() => toggleSelectAll(false)} className="hover:underline">None</button>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <button 
                  onClick={handleBulkPostWP} 
                  disabled={settings.wpAccounts.length === 0 || !articles.some(a => a.selected)}
                  className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 ${settings.wpAccounts.length === 0 || !articles.some(a => a.selected) ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                  <UploadCloud className="w-4 h-4" /> Post to WP
                </button>
                <button 
                  onClick={handleBulkPostBlogger} 
                  disabled={settings.bloggerAccounts.length === 0 || !articles.some(a => a.selected)}
                  className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 ${settings.bloggerAccounts.length === 0 || !articles.some(a => a.selected) ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-orange-600 text-white hover:bg-orange-700'}`}
                >
                  <UploadCloud className="w-4 h-4" /> Post to Blogger
                </button>

                <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-slate-500 ml-1">Mulai:</span>
                    <input type="date" value={bulkDate} onChange={e => setBulkDate(e.target.value)} className="p-1 border border-slate-300 rounded text-xs w-28 bg-slate-50 focus:ring-1 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-slate-500">Post/Hari:</span>
                    <input type="number" min="1" value={bulkPostsPerDay} onChange={e => setBulkPostsPerDay(Number(e.target.value))} className="p-1 border border-slate-300 rounded text-xs w-14 text-center bg-slate-50 focus:ring-1 focus:ring-blue-500 outline-none" title="Posts Per Day" />
                  </div>
                  <button onClick={handleBulkSchedule} disabled={!articles.some(a => a.selected)} className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 shadow-sm" title="Apply Schedule">
                    📅 Set Schedule
                  </button>
                </div>
                
                <button onClick={handleBulkDelete} disabled={!articles.some(a => a.selected)} className="bg-red-100 text-red-600 px-3 py-1.5 rounded text-xs font-bold hover:bg-red-200 border border-red-200 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed">
                  <Trash2 className="w-4 h-4" /> Hapus
                </button>
              </div>
            </div>

            <div className="overflow-x-auto flex-grow">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="text-xs text-slate-500 uppercase bg-slate-100 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="w-10 px-4 py-3 text-center">
                      <input type="checkbox" onChange={e => toggleSelectAll(e.target.checked)} className="rounded text-green-600" />
                    </th>
                    <th className="px-4 py-3 min-w-[200px]">Judul</th>
                    <th className="px-4 py-3 min-w-[80px]">Img</th>
                    <th className="px-4 py-3 min-w-[200px]">Body</th>
                    <th className="px-4 py-3 min-w-[120px]">Jadwal</th>
                    <th className="px-4 py-3 min-w-[100px]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {articles.length === 0 && generatingItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-20 text-center text-slate-400">
                        Belum ada artikel di-generate.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {articles.map(article => (
                        <tr key={article.id} className="hover:bg-green-50 transition">
                          <td className="px-4 py-3 text-center">
                            <input type="checkbox" checked={article.selected} onChange={e => toggleArticleSelect(article.id, e.target.checked)} className="rounded text-green-600" />
                          </td>
                          <td className="px-4 py-3 font-medium cursor-pointer hover:text-green-600" onClick={() => { setEditingArticle(article); setIsEditorOpen(true); }}>
                            {article.title}
                          </td>
                          <td className="px-4 py-3 cursor-pointer" onClick={() => { setEditingArticle(article); setIsImageOpen(true); }}>
                            {article.image ? <img src={article.image} alt="thumb" className="w-10 h-10 object-cover rounded shadow-sm" /> : <div className="w-10 h-10 bg-slate-200 rounded"></div>}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500 truncate max-w-[200px] cursor-pointer" onClick={() => { setEditingArticle(article); setIsEditorOpen(true); }}>
                            {article.body ? article.body.replace(/<[^>]*>?/gm, '').substring(0, 50) + '...' : ''}
                          </td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap">
                            <input 
                              type="datetime-local" 
                              value={toDatetimeLocal(new Date(article.dateObj))} 
                              onChange={(e) => handleArticleDateChange(article.id, e.target.value)}
                              className="bg-transparent border-none focus:ring-0 p-0 text-xs w-full cursor-pointer hover:bg-slate-100 rounded px-1"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${article.status.includes('Error') ? 'bg-red-100 text-red-700' : article.status.includes('Publish') ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                              {article.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {generatingItems.map(item => (
                        <tr key={item.id} className="border-b border-slate-100 bg-slate-50">
                          <td className="px-4 py-3"></td>
                          <td className="px-4 py-3 font-medium text-slate-500">{item.title}</td>
                          <td className="px-4 py-3"><div className="h-10 w-10 rounded bg-slate-200 animate-pulse"></div></td>
                          <td className="px-4 py-3"><div className="h-4 w-32 rounded bg-slate-200 animate-pulse"></div></td>
                          <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-slate-200 animate-pulse"></div></td>
                          <td className="px-4 py-3"><span className="text-xs text-blue-500 font-bold animate-pulse">{item.status}</span></td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleCopyData} className="flex-1 py-3 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-bold transition hover:shadow-md flex justify-center items-center gap-2">
              <Copy className="w-5 h-5" /> Copy Data
            </button>
            <button onClick={handleDownloadCSV} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition flex justify-center items-center gap-2">
              <Download className="w-5 h-5" /> Download CSV
            </button>
          </div>
        </div>
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings} 
        onSave={setSettings} 
      />
      
      <EditorModal 
        isOpen={isEditorOpen} 
        onClose={() => setIsEditorOpen(false)} 
        article={editingArticle} 
        onSave={(updated) => setArticles(prev => prev.map(a => a.id === updated.id ? updated : a))} 
        modelId={selectedModel}
        promptRewriteTitle={settings.promptRewriteTitle}
        promptRewriteMeta={settings.promptRewriteMeta}
        settings={settings}
      />

      <ImageModal 
        isOpen={isImageOpen} 
        onClose={() => setIsImageOpen(false)} 
        article={editingArticle} 
        onSave={(updated) => setArticles(prev => prev.map(a => a.id === updated.id ? updated : a))} 
      />

      <PostModal 
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
        type={postModalType}
        settings={settings}
        onConfirm={handleConfirmPost}
      />
    </div>
  );
}
