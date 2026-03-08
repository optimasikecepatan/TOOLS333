import React, { useState, useEffect } from 'react';
import { Article } from '../types';
import { X, Sparkles, Search, Upload } from 'lucide-react';
import { generateImage } from '../lib/gemini';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  article: Article | null;
  onSave: (article: Article) => void;
}

export function ImageModal({ isOpen, onClose, article, onSave }: Props) {
  const [localImage, setLocalImage] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (article) {
      setLocalImage(article.image);
      setPrompt(article.title);
      setManualUrl(article.image);
    }
  }, [article, isOpen]);

  if (!isOpen || !article) return null;

  const handleSave = () => {
    onSave({ ...article, image: localImage });
    toast.success("Gambar berhasil disimpan");
    onClose();
  };

  const handleGenerateAI = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    const toastId = toast.loading('Generating image...');
    try {
      const url = await generateImage(prompt);
      setLocalImage(url);
      setManualUrl(url);
      toast.success("Gambar berhasil digenerate", { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error("Gagal generate image", { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyManualUrl = () => {
    if (manualUrl) setLocalImage(manualUrl);
  };

  const handleUseBingCDN = () => {
    const url = `https://tse2.mm.bing.net/th?q=${encodeURIComponent(prompt)}&w=800&h=450&c=7&rs=1&p=0`;
    setLocalImage(url);
    setManualUrl(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setLocalImage(base64);
      setManualUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50">
      <div className="bg-white w-11/12 md:max-w-lg mx-auto rounded shadow-lg flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50 rounded-t">
          <h3 className="font-bold text-lg text-slate-700">Edit Gambar</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-red-500">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <img src={localImage} alt="Preview" className="w-full h-56 object-cover rounded bg-slate-100 mb-6 border shadow-sm" />
          
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded border">
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Opsi 1: Generate AI</label>
              <div className="flex gap-2">
                <input type="text" value={prompt} onChange={e => setPrompt(e.target.value)} className="flex-1 border p-2 rounded text-sm" placeholder="Prompt gambar..." />
                <button onClick={handleGenerateAI} disabled={isGenerating} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold whitespace-nowrap hover:bg-blue-700 transition flex items-center gap-1">
                  {isGenerating ? '...' : <><Sparkles className="w-4 h-4" /> Gen AI</>}
                </button>
              </div>
            </div>
            
            <div className="bg-slate-50 p-4 rounded border">
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Opsi 2: Link / CDN</label>
              <div className="flex gap-2">
                <input type="text" value={manualUrl} onChange={e => setManualUrl(e.target.value)} className="flex-1 border p-2 rounded text-sm" placeholder="Paste URL Gambar..." />
                <button onClick={handleApplyManualUrl} className="bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm font-bold hover:bg-gray-300 transition">Set</button>
                <button onClick={handleUseBingCDN} className="bg-orange-500 text-white px-3 py-2 rounded text-sm font-bold hover:bg-orange-600 whitespace-nowrap transition flex items-center gap-1">
                  <Search className="w-4 h-4" /> CDN
                </button>
              </div>
            </div>
            
            <div className="bg-slate-50 p-4 rounded border">
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Opsi 3: Upload File</label>
              <label className="flex items-center justify-center bg-white text-slate-600 py-4 rounded border border-dashed border-slate-300 cursor-pointer hover:bg-green-50 hover:border-green-400 hover:text-green-600 transition">
                <span className="text-sm font-bold flex items-center gap-2">
                  <Upload className="w-5 h-5" /> Klik untuk Upload
                </span>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>
        </div>
        
        <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3 rounded-b">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition">Batal</button>
          <button onClick={handleSave} className="px-6 py-2 bg-green-600 text-white rounded text-sm font-bold hover:bg-green-700 shadow-md transition flex items-center gap-2">
            Simpan Gambar
          </button>
        </div>
      </div>
    </div>
  );
}
