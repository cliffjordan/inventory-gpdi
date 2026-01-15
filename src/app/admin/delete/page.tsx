"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, Search, Package, Loader2, AlertTriangle, ChevronDown, CheckSquare, Square, Lock, User } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function DeleteInventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [openItems, setOpenItems] = useState<string[]>([]);
  const [selectedVariants, setSelectedVariants] = useState<string[]>([]);
  const [selectedMainItems, setSelectedMainItems] = useState<string[]>([]); 
  const [activeLoans, setActiveLoans] = useState<any[]>([]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => { fetchInventory(); fetchActiveLoans(); }, []);

  const fetchInventory = async () => {
    setLoading(true);
    const { data } = await supabase.from('items').select(`*, variants(*)`).order('name');
    if (data) setItems(data);
    setLoading(false);
  };

  const fetchActiveLoans = async () => {
    const { data } = await supabase.from('loans').select('variant_id').eq('status', 'dipinjam');
    if (data) setActiveLoans(data.map(l => l.variant_id));
  };

  const toggleDropdown = (itemId: string) => {
    setOpenItems(prev => prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]);
  };

  const toggleSelectItem = (item: any) => {
    const isSelected = selectedMainItems.includes(item.id);
    const availableVariantIds = item.variants.filter((v: any) => !activeLoans.includes(v.id)).map((v: any) => v.id);
    if (isSelected) {
      setSelectedMainItems(prev => prev.filter(id => id !== item.id));
      setSelectedVariants(prev => prev.filter(id => !availableVariantIds.includes(id)));
    } else {
      setSelectedMainItems(prev => [...prev, item.id]);
      setSelectedVariants(prev => Array.from(new Set([...prev, ...availableVariantIds])));
    }
  };

  const toggleVariant = (id: string, itemId: string) => {
    setSelectedVariants(prev => {
      const next = prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id];
      if (prev.includes(id)) setSelectedMainItems(curr => curr.filter(i => i !== itemId));
      return next;
    });
  };

  const handleFinalDelete = async () => {
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user?.email || "", password: confirmPassword
      });
      if (authError) throw new Error("Password salah. Verifikasi 2FA gagal.");

      // 1. Kumpulkan file storage untuk dihapus
      const filesToDelete: string[] = [];
      items.forEach(it => {
        if (selectedMainItems.includes(it.id)) {
          if (it.base_image_url) filesToDelete.push(`product-images/${it.base_image_url.split('/').pop()}`);
          it.variants.forEach((v: any) => { if (v.image_url) filesToDelete.push(`product-images/${v.image_url.split('/').pop()}`); });
        } else {
          it.variants.forEach((v: any) => { if (selectedVariants.includes(v.id) && v.image_url) filesToDelete.push(`product-images/${v.image_url.split('/').pop()}`); });
        }
      });

      // 2. Eksekusi Hapus di Database
      if (selectedMainItems.length > 0) {
        const { error: itemErr } = await supabase.from('items').delete().in('id', selectedMainItems);
        if (itemErr) throw itemErr;
      }
      const vToDelete = selectedVariants.filter(id => !selectedMainItems.includes(items.find(it => it.variants.some((v: any) => v.id === id))?.id));
      if (vToDelete.length > 0) {
        const { error: varErr } = await supabase.from('variants').delete().in('id', vToDelete);
        if (varErr) throw varErr;
      }

      // 3. Hapus File Storage
      if (filesToDelete.length > 0) await supabase.storage.from('items').remove(filesToDelete);

      toast.success("Data & File berhasil dimusnahkan!");
      
      // 4. Reset & Tarik Ulang dari Database (Anti-Refresh Issue)
      setSelectedVariants([]);
      setSelectedMainItems([]);
      setShowPasswordModal(false);
      setConfirmPassword("");
      await fetchInventory(); 

    } catch (error: any) {
      toast.error("Gagal total: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-32">
      <header className="bg-white p-6 sticky top-0 z-40 shadow-sm border-b flex items-center gap-4">
        <Link href="/admin" className="p-2 hover:bg-slate-50 rounded-full transition-colors"><ArrowLeft size={24} /></Link>
        <h1 className="text-xl font-black text-slate-900 leading-tight">Pusat Pemusnahan Aset</h1>
      </header>
      <main className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="relative"><Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
          <input type="text" placeholder="Cari aset..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl outline-none focus:border-red-500 font-medium transition-all" />
        </div>
        <div className="space-y-4">
          {items.filter(it => it.name.toLowerCase().includes(searchQuery.toLowerCase())).map(item => {
            const isMainSelected = selectedMainItems.includes(item.id);
            const isOpen = openItems.includes(item.id);
            const hasLoan = item.variants.some((v: any) => activeLoans.includes(v.id));
            return (
              <div key={item.id} className={`bg-white border rounded-[2rem] overflow-hidden transition-all ${isMainSelected ? 'border-red-500 bg-red-50/20' : isOpen ? 'border-red-100 shadow-md' : 'border-slate-100 shadow-sm'}`}>
                <div className="p-4 flex items-center gap-3">
                  <button disabled={hasLoan} onClick={() => toggleSelectItem(item)} className={`p-2 transition-transform active:scale-90 ${hasLoan ? 'opacity-20 cursor-not-allowed' : 'text-red-500'}`}>{isMainSelected ? <CheckSquare size={24} /> : <Square size={24} className="text-slate-200" />}</button>
                  <div className="flex-1 flex items-center gap-4 cursor-pointer" onClick={() => toggleDropdown(item.id)}>
                    <div className="w-12 h-12 rounded-xl bg-slate-50 overflow-hidden shrink-0 border border-slate-100"><img src={item.base_image_url} className={`w-full h-full object-cover transition-all ${isMainSelected ? 'grayscale-0' : 'grayscale opacity-80'}`} alt={item.name} /></div>
                    <div className="flex-1"><h3 className={`font-bold text-sm leading-tight ${isMainSelected ? 'text-red-600' : 'text-slate-900'}`}>{item.name}</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{item.variants.length} Varian</p></div>
                    <ChevronDown size={20} className={`text-slate-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>
                <AnimatePresence>{isOpen && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="bg-slate-50/50 border-t border-slate-50">
                    <div className="p-4 space-y-2">
                      {item.variants.map((v: any) => {
                        const isBorrowed = activeLoans.includes(v.id);
                        const isSelected = selectedVariants.includes(v.id) || isMainSelected;
                        return (
                          <div key={v.id} onClick={() => !isBorrowed && !isMainSelected && toggleVariant(v.id, item.id)} className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${isBorrowed ? 'bg-white opacity-40 cursor-not-allowed' : isSelected ? 'bg-red-50 border-red-500' : 'bg-white border-transparent'}`}>
                            <div className="flex items-center gap-3">{isBorrowed ? <AlertTriangle size={18} className="text-red-500" /> : isSelected ? <CheckSquare size={18} className="text-red-500" /> : <Square size={18} className="text-slate-200" />}<span className={`font-bold text-xs ${isSelected ? 'text-red-600' : 'text-slate-600'}`}>{v.color} - {v.size}</span></div>
                            {isBorrowed && <span className="text-[9px] font-black text-red-500 bg-red-50 px-2 py-1 rounded-md">DIPINJAM</span>}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}</AnimatePresence>
              </div>
            );
          })}
        </div>
      </main>
      <AnimatePresence>{(selectedVariants.length > 0 || selectedMainItems.length > 0) && (
        <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-8 left-0 right-0 px-6 z-50">
          <button onClick={() => setShowPasswordModal(true)} className="w-full max-w-md mx-auto bg-red-600 text-white p-5 rounded-[2rem] font-black shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all"><Trash2 size={20} /> Musnahkan Aset</button>
        </motion.div>
      )}</AnimatePresence>
      <AnimatePresence>{showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 space-y-6 text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner"><Lock size={32}/></div>
            <div><h2 className="text-xl font-black text-slate-900 leading-tight">Verifikasi Password</h2><p className="text-xs text-slate-400 font-medium mt-1">Konfirmasi password untuk menghapus data permanen.</p></div>
            <input type="password" placeholder="Password Admin" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-red-500 font-bold text-center" />
            <div className="flex gap-3"><button onClick={() => {setShowPasswordModal(false); setConfirmPassword("");}} className="flex-1 py-4 font-bold text-slate-400">Batal</button>
              <button onClick={handleFinalDelete} disabled={isProcessing || !confirmPassword} className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-red-200">{isProcessing ? <Loader2 className="animate-spin mx-auto"/> : "Musnahkan"}</button>
            </div>
          </motion.div>
        </div>
      )}</AnimatePresence>
    </div>
  );
}