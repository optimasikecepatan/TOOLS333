import React, { useState } from 'react';
import { AppSettings, Article, WpAccount, BloggerAccount } from '../types';
import { X, UploadCloud, Globe, PenTool } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  type: 'wp' | 'blogger';
  settings: AppSettings;
  onConfirm: (accountId: string, status: string) => void;
}

export function PostModal({ isOpen, onClose, type, settings, onConfirm }: Props) {
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [postStatus, setPostStatus] = useState('publish');

  if (!isOpen) return null;

  const accounts = type === 'wp' ? settings.wpAccounts : settings.bloggerAccounts;

  const handleConfirm = () => {
    if (!selectedAccountId) {
      toast.error("Pilih akun terlebih dahulu!");
      return;
    }
    onConfirm(selectedAccountId, postStatus);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50">
      <div className="bg-white w-11/12 md:max-w-md mx-auto rounded-lg shadow-lg overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-lg text-slate-700 flex items-center gap-2">
            {type === 'wp' ? <Globe className="w-5 h-5 text-blue-600" /> : <PenTool className="w-5 h-5 text-orange-600" />}
            Post to {type === 'wp' ? 'WordPress' : 'Blogger'}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-red-500">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Pilih Akun {type === 'wp' ? 'WordPress' : 'Blogger'}</label>
            {accounts.length === 0 ? (
              <p className="text-sm text-red-500 bg-red-50 p-3 rounded border border-red-100">Belum ada akun yang disimpan. Silakan tambahkan di Settings.</p>
            ) : (
              <select 
                value={selectedAccountId} 
                onChange={e => setSelectedAccountId(e.target.value)} 
                className="w-full border p-2 rounded text-sm bg-slate-50"
              >
                <option value="">-- Pilih Akun --</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name} ({type === 'wp' ? (acc as WpAccount).url : (acc as BloggerAccount).blogId})</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Status Post</label>
            <select 
              value={postStatus} 
              onChange={e => setPostStatus(e.target.value)} 
              className="w-full border p-2 rounded text-sm bg-slate-50"
            >
              <option value="publish">Publish Langsung</option>
              <option value="draft">Simpan sebagai Draft</option>
              <option value="schedule">Sesuai Jadwal Artikel (Schedule)</option>
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              *Jika memilih "Sesuai Jadwal", artikel akan diposting dengan status ter-schedule sesuai tanggal di tabel.
            </p>
          </div>
        </div>
        
        <div className="px-6 py-3 border-t bg-slate-50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded">Batal</button>
          <button 
            onClick={handleConfirm} 
            disabled={accounts.length === 0 || !selectedAccountId}
            className={`px-4 py-2 text-sm text-white rounded shadow-md font-bold flex items-center gap-2 ${accounts.length === 0 || !selectedAccountId ? 'bg-gray-400 cursor-not-allowed' : type === 'wp' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'}`}
          >
            <UploadCloud className="w-4 h-4" /> Mulai Posting
          </button>
        </div>
      </div>
    </div>
  );
}
