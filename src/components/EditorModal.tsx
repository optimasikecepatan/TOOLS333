import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Article } from '../types';
import { X, Sparkles } from 'lucide-react';
import { rewriteText as rewriteTextGemini } from '../lib/gemini';
import { rewriteTextOpenAI } from '../lib/openai';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import toast from 'react-hot-toast';

const QuillEditor = ReactQuill as any;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  article: Article | null;
  onSave: (article: Article) => void;
  modelId: string;
  promptRewriteTitle: string;
  promptRewriteMeta: string;
  settings: any;
}

export function EditorModal({ isOpen, onClose, article, onSave, modelId, promptRewriteTitle, promptRewriteMeta, settings }: Props) {
  const [localArticle, setLocalArticle] = useState<Article | null>(null);
  const [isRewritingTitle, setIsRewritingTitle] = useState(false);
  const [isRewritingMeta, setIsRewritingMeta] = useState(false);
  const quillRef = useRef<ReactQuill>(null);

  useEffect(() => {
    if (article) {
      setLocalArticle({ ...article });
    }
  }, [article, isOpen]);

  const imageHandler = () => {
    // Check if ImageKit is configured
    if (!settings.ikUrl || !settings.ikPrivateKey) {
      toast.error("Silahkan aktifkan ImageKit di Pengaturan untuk upload gambar.");
      return;
    }

    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files ? input.files[0] : null;
      if (!file) return;

      const toastId = toast.loading('Uploading image...');
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileName", "editor_" + Date.now());

      try {
        const res = await fetch(settings.ikUrl, {
          method: "POST",
          headers: { "Authorization": "Basic " + btoa(settings.ikPrivateKey + ":") },
          body: formData
        });
        
        if (!res.ok) {
           throw new Error("Upload failed with status " + res.status);
        }

        const data = await res.json();
        
        if (data && data.url) {
            const quill = quillRef.current?.getEditor();
            if (quill) {
              const range = quill.getSelection(true);
              if (range) {
                  quill.insertEmbed(range.index, 'image', data.url);
                  quill.setSelection(range.index + 1);
              } else {
                  // If no selection, insert at the end
                  const length = quill.getLength();
                  quill.insertEmbed(length, 'image', data.url);
              }
            }
            toast.success('Image uploaded successfully', { id: toastId });
        } else {
            throw new Error("Invalid response from ImageKit");
        }
      } catch (e) {
        console.error(e);
        toast.error("Gagal upload gambar. Cek konfigurasi ImageKit.", { id: toastId });
      }
    };
  };

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [2, 3, false] }],
        ['bold', 'italic', 'underline'],
        ['link', 'image', 'video'],
        ['clean']
      ],
      handlers: {
        image: imageHandler
      }
    }
  }), [settings.ikUrl, settings.ikPrivateKey]);

  if (!isOpen || !localArticle) return null;

  const handleChange = (field: keyof Article, value: any) => {
    setLocalArticle(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleSave = () => {
    if (localArticle) {
      onSave(localArticle);
      toast.success("Perubahan artikel disimpan");
      onClose();
    }
  };

  const handleRewriteTitle = async () => {
    if (!localArticle.title) return;
    setIsRewritingTitle(true);
    try {
      const prompt = promptRewriteTitle
        .replace("{{original}}", localArticle.title)
        .replace("{{language}}", settings.language);
      
      let newTitle;
      if (settings.aiProvider === 'openai') {
        newTitle = await rewriteTextOpenAI(settings.openaiModel, prompt, settings);
      } else {
        newTitle = await rewriteTextGemini(modelId, prompt, settings);
      }

      if (newTitle) {
        handleChange('title', newTitle);
        toast.success("Judul berhasil di-rewrite");
      }
    } catch (e) {
      console.error(e);
      toast.error("Rewrite failed");
    } finally {
      setIsRewritingTitle(false);
    }
  };

  const handleRewriteMeta = async () => {
    if (!localArticle.meta) return;
    setIsRewritingMeta(true);
    try {
      const prompt = promptRewriteMeta
        .replace("{{original}}", localArticle.meta)
        .replace("{{language}}", settings.language);
      
      let newMeta;
      if (settings.aiProvider === 'openai') {
        newMeta = await rewriteTextOpenAI(settings.openaiModel, prompt, settings);
      } else {
        newMeta = await rewriteTextGemini(modelId, prompt, settings);
      }

      if (newMeta) {
        handleChange('meta', newMeta);
        toast.success("Meta deskripsi berhasil di-rewrite");
      }
    } catch (e) {
      console.error(e);
      toast.error("Rewrite failed");
    } finally {
      setIsRewritingMeta(false);
    }
  };

  const toDatetimeLocal = (dateStr: string) => {
    const date = new Date(dateStr);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      const d = new Date(val);
      handleChange('dateObj', d);
      const pad = (n: number) => n.toString().padStart(2, '0');
      handleChange('date', `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50">
      <div className="bg-white w-11/12 md:max-w-4xl mx-auto rounded shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-3 border-b flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-lg">Edit Artikel</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-red-500">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase">Judul</label>
            <div className="flex gap-2">
              <input type="text" value={localArticle.title} onChange={e => handleChange('title', e.target.value)} className="w-full border p-2 rounded text-sm font-medium" />
              <button onClick={handleRewriteTitle} disabled={isRewritingTitle} className="bg-purple-100 text-purple-700 px-3 rounded text-xs font-bold whitespace-nowrap hover:bg-purple-200 flex items-center gap-1">
                {isRewritingTitle ? '...' : <><Sparkles className="w-3 h-3" /> Rewrite</>}
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase">Slug</label>
              <input type="text" value={localArticle.slug} onChange={e => handleChange('slug', e.target.value)} className="w-full border p-2 rounded text-sm bg-slate-50" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase">Kategori</label>
              <input type="text" value={localArticle.category} onChange={e => handleChange('category', e.target.value)} className="w-full border p-2 rounded text-sm bg-slate-50" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase">Tanggal</label>
              <input type="datetime-local" value={toDatetimeLocal(localArticle.dateObj.toString())} onChange={handleDateChange} className="w-full border p-2 rounded text-sm" />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Body (HTML)</label>
            <div className="bg-white border rounded">
              <QuillEditor 
                ref={quillRef}
                theme="snow"
                value={localArticle.body} 
                onChange={(val: string) => handleChange('body', val)} 
                modules={modules}
                className="h-[300px] mb-12"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase">Meta Deskripsi</label>
            <div className="flex gap-2">
              <textarea value={localArticle.meta} onChange={e => handleChange('meta', e.target.value)} className="w-full border p-2 rounded text-sm h-20 resize-none"></textarea>
              <button onClick={handleRewriteMeta} disabled={isRewritingMeta} className="bg-purple-100 text-purple-700 px-3 rounded text-xs font-bold whitespace-nowrap hover:bg-purple-200 h-20 flex items-center justify-center gap-1">
                {isRewritingMeta ? '...' : <><Sparkles className="w-3 h-3" /> Rewrite</>}
              </button>
            </div>
          </div>
        </div>
        
        <div className="px-6 py-3 border-t bg-slate-50 flex justify-end gap-2">
          <button onClick={handleSave} className="px-6 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700">Simpan Perubahan</button>
        </div>
      </div>
    </div>
  );
}
