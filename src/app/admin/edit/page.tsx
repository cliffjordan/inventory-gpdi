"use client";

import React, { useEffect, useState } from 'react';
import { Search, ArrowLeft, Edit3, Loader2, ChevronRight, X, Save, Upload, Plus, Trash2, Camera, Package, Palette } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import imageCompression from 'browser-image-compression';

export default function AdminEditListPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isFetchingVariants, setIsFetchingVariants] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [compressing, setCompressing] = useState(false);
  
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [variants, setVariants] = useState<any[]>([]);
  const [deletedVariantIds, setDeletedVariantIds] = useState<string[]>([]);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const { data } = await supabase.from('items').select('*').order('name');
    if (data) setItems(data);
    setLoading(false);
  };

  const handleSelect = async (item: any) => {
    setSelectedItem(item);
    setEditName(item.name);
    setEditCategory(item.category);
    setPreviewUrl(item.base_image_url);
    setEditImageFile(null);
    setDeletedVariantIds([]);
    
    setIsFetchingVariants(true);
    const { data } = await supabase.from('variants').select('*').eq('item_id', item.id).order('id');
    const formattedVariants = (data || []).map(v => ({
      ...v, file: null, preview: null
    }));
    setVariants(formattedVariants);
    setIsFetchingVariants(false);
  };

  const handleMainImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCompressing(true);
      try {
        const options = { maxSizeMB: 0.3, maxWidthOrHeight: 1920, useWebWorker: true, fileType: 'image/jpeg', initialQuality: 0.8 };
        const compressedFile = await imageCompression(file, options);
        setEditImageFile(compressedFile);
        setPreviewUrl(URL.createObjectURL(compressedFile));
        toast.success("Foto Sampul Siap");
      } catch (error) { toast.error("Gagal kompres foto"); }
      finally { setCompressing(false); }
    }
  };

  const handleAddVariant = () => {
    setVariants([...variants, { id: `new_${Date.now()}`, color: "", size: "", stock: 0, location: "", image_url: "", file: null, preview: null }]);
  };

  const handleRemoveVariant = (index: number) => {
    const variantToRemove = variants[index];
    if (!variantToRemove.id.toString().startsWith('new_')) {
        setDeletedVariantIds([...deletedVariantIds, variantToRemove.id]);
    }
    setVariants(variants.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: string, value: any) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setVariants(newVariants);
  };

  const handleVariantImageChange = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setCompressing(true);
        try {
            const options = { maxSizeMB: 0.3, maxWidthOrHeight: 1920, useWebWorker: true, fileType: 'image/jpeg', initialQuality: 0.8 };
            const compressedFile = await imageCompression(file, options);
            const newVariants = [...variants];
            newVariants[index].file = compressedFile;
            newVariants[index].preview = URL.createObjectURL(compressedFile);
            setVariants(newVariants);
            toast.success("Foto Varian Siap");
        } catch (error) { toast.error("Gagal kompres"); }
        finally { setCompressing(false); }
    }
  };

  const handleSave = async () => {
    if (!selectedItem) return;
    setIsSaving(true);
    const toastId = toast.loading("Menyimpan perubahan...");

    try {
        let mainUrl = previewUrl;
        if (editImageFile) {
            const fileName = `item-${Date.now()}.jpg`;
            const { error } = await supabase.storage.from('items').upload(`items/${fileName}`, editImageFile);
            if (error) throw error;
            const { data } = supabase.storage.from('items').getPublicUrl(`items/${fileName}`);
            mainUrl = data.publicUrl;
        }

        const { error: itemError } = await supabase.from('items').update({ name: editName, category: editCategory, base_image_url: mainUrl }).eq('id', selectedItem.id);
        if (itemError) throw itemError;

        if (deletedVariantIds.length > 0) {
            await supabase.from('variants').delete().in('id', deletedVariantIds);
        }

        for (const v of variants) {
            let variantUrl = v.image_url;
            if (v.file) {
                const vFileName = `variant-${Date.now()}-${Math.random()}.jpg`;
                const { error: upErr } = await supabase.storage.from('items').upload(`product-images/${vFileName}`, v.file);
                if (!upErr) {
                    const { data } = supabase.storage.from('items').getPublicUrl(`product-images/${vFileName}`);
                    variantUrl = data.publicUrl;
                }
            }
            const variantData = {
                item_id: selectedItem.id, color: v.color, size: v.size, stock: parseInt(v.stock), location: v.location, image_url: variantUrl
            };
            if (v.id.toString().startsWith('new_')) await supabase.from('variants').insert(variantData);
            else await supabase.from('variants').update(variantData).eq('id', v.id);
        }

        toast.success("Berhasil disimpan!", { id: toastId });
        setSelectedItem(null);
        fetchItems();
    } catch (error: any) {
        toast.error("Gagal: " + error.message, { id: toastId });
    } finally {
        setIsSaving(false);
    }
  };

  const filteredItems = items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <header className="bg-white p-4 sticky top-0 z-10 shadow-sm border-b">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/admin" className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft size={24} /></Link>
          <h1 className="text-xl font-bold text-amber-600">Pilih Barang untuk Diedit</h1>
        </div>
        <div className="relative">
          <input type="text" placeholder="Cari barang..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl outline-none text-sm" />
          <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
        </div>
      </header>

      <main className="p-4 space-y-2">
        {loading ? <div className="text-center p-10"><Loader2 className="animate-spin mx-auto text-amber-600"/></div> : (
          filteredItems.map(item => (
            <button key={item.id} onClick={() => handleSelect(item)} className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-amber-200 transition-all text-left group active:scale-[0.98]">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center shrink-0"><Edit3 size={20}/></div>
                    <div><h3 className="font-bold text-gray-700 leading-tight">{item.name}</h3><p className="text-xs text-gray-400 uppercase font-bold mt-0.5">{item.category}</p></div>
                </div>
                <ChevronRight className="text-gray-300 group-hover:text-amber-500" />
            </button>
          ))
        )}
      </main>

      <AnimatePresence>
        {selectedItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white z-10">
                        <div><h2 className="text-lg font-black text-slate-900">Edit Data</h2><p className="text-xs text-slate-400">Ubah info & varian barang</p></div>
                        <button onClick={() => setSelectedItem(null)} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50"><X size={20}/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50">
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Package size={14}/> Info Utama</h3>
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex gap-4">
                                <div className="relative w-20 h-20 bg-slate-100 rounded-xl overflow-hidden shrink-0 border border-slate-100 group cursor-pointer">
                                    <img src={previewUrl || "https://placehold.co/100"} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Upload className="text-white w-6 h-6"/></div>
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleMainImageChange} accept="image/*" disabled={compressing} />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800" placeholder="Nama Barang" />
                                    <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600">
                                        {["Kostum", "Rebana", "Flags", "Alat Musik", "Lainnya"].map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Palette size={14}/> Varian Stok</h3>
                                <button type="button" onClick={handleAddVariant} className="text-[10px] font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-lg flex items-center gap-1 hover:bg-blue-100"><Plus size={12}/> Tambah</button>
                            </div>
                            {isFetchingVariants ? <div className="text-center py-4"><Loader2 className="animate-spin mx-auto text-slate-400"/></div> : (
                                <div className="space-y-3">
                                    {variants.map((v, idx) => (
                                        <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative group">
                                            {/* [PERBAIKAN] Header Bar untuk Varian */}
                                            <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md">Varian #{idx + 1}</span>
                                                {variants.length > 1 && (
                                                    <button onClick={() => handleRemoveVariant(idx)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold"><Trash2 size={14}/> Hapus</button>
                                                )}
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="relative w-16 h-16 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 shrink-0 cursor-pointer group/img">
                                                    <img src={v.preview || v.image_url || previewUrl || "https://placehold.co/100"} className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"><Camera className="text-white w-4 h-4"/></div>
                                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleVariantImageChange(e, idx)} accept="image/*" disabled={compressing} />
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex gap-2">
                                                        <input type="text" placeholder="Warna" value={v.color} onChange={(e) => updateVariant(idx, 'color', e.target.value)} className="w-1/2 p-2 bg-slate-50 rounded-lg text-xs font-bold border border-slate-100" />
                                                        <input type="text" placeholder="Ukuran" value={v.size} onChange={(e) => updateVariant(idx, 'size', e.target.value)} className="w-1/2 p-2 bg-slate-50 rounded-lg text-xs font-bold border border-slate-100" />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <input type="number" placeholder="Stok" value={v.stock} onChange={(e) => updateVariant(idx, 'stock', e.target.value)} className="w-1/2 p-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-black border border-blue-100" />
                                                        <input type="text" placeholder="Lokasi" value={v.location} onChange={(e) => updateVariant(idx, 'location', e.target.value)} className="w-1/2 p-2 bg-slate-50 rounded-lg text-xs font-bold border border-slate-100" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-white z-10">
                        <button onClick={handleSave} disabled={isSaving || compressing} className="w-full py-4 bg-amber-500 text-white font-black rounded-2xl shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:bg-slate-300">
                            {isSaving || compressing ? <Loader2 className="animate-spin" /> : <Save size={20} />} {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
                        </button>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
}