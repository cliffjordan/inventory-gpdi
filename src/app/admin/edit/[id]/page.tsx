"use client";

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Save, Loader2, Package, MapPin, Tag, Layers, 
  Camera, UploadCloud 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function EditItemPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // --- STATE ID ---
  const [variantId, setVariantId] = useState("");
  const [itemId, setItemId] = useState("");
  
  // --- STATE FORM ---
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Kostum");
  const [stock, setStock] = useState(0);
  const [location, setLocation] = useState("");
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");

  // --- STATE GAMBAR ---
  const [mainImageUrl, setMainImageUrl] = useState(""); 
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [mainPreview, setMainPreview] = useState<string | null>(null);

  const [variantImageUrl, setVariantImageUrl] = useState(""); 
  const [variantImageFile, setVariantImageFile] = useState<File | null>(null);
  const [variantPreview, setVariantPreview] = useState<string | null>(null);

  // 1. FETCH DATA
  useEffect(() => {
    const fetchData = async () => {
      try {
        // TAHAP A: Cari di tabel VARIANTS
        let { data: variant, error: varError } = await supabase
          .from('variants')
          .select('*')
          .eq('id', params.id)
          .maybeSingle();

        if (varError) throw varError;

        // TAHAP B: Fallback cari via item_id
        if (!variant) {
           const { data: variantByItem } = await supabase
             .from('variants')
             .select('*')
             .eq('item_id', params.id)
             .limit(1)
             .maybeSingle();
           if (variantByItem) variant = variantByItem;
           else throw new Error("Data barang tidak ditemukan.");
        }

        setVariantId(variant.id);
        setItemId(variant.item_id);
        setStock(variant.stock);
        setLocation(variant.location);
        setColor(variant.color);
        setSize(variant.size);
        setVariantImageUrl(variant.image_url || "");

        // TAHAP C: Ambil Parent ITEM
        if (variant.item_id) {
          const { data: parentItem, error: itemError } = await supabase
            .from('items')
            .select('*')
            .eq('id', variant.item_id)
            .single();

          if (itemError) throw itemError;
          if (parentItem) {
            setName(parentItem.name);
            setCategory(parentItem.category);
            setMainImageUrl(parentItem.base_image_url || "");
          }
        }
      } catch (error: any) {
        console.error("Fetch Error:", error);
        toast.error("Gagal memuat: " + error.message);
      } finally {
        setLoading(false);
      }
    };
    if (params.id) fetchData();
  }, [params.id]);

  // 2. HANDLER FILE
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'main' | 'variant') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    if (type === 'main') { setMainImageFile(file); setMainPreview(preview); } 
    else { setVariantImageFile(file); setVariantPreview(preview); }
  };

  // 3. UPLOAD FUNCTION
  const uploadImage = async (file: File, pathFolder: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${pathFolder}/${Date.now()}_${Math.random()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('items').upload(fileName, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('items').getPublicUrl(fileName);
    return data.publicUrl;
  };

  // 4. SAVE FUNCTION
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const toastId = toast.loading("Menyimpan perubahan...");

    try {
      let finalMainUrl = mainImageUrl;
      let finalVariantUrl = variantImageUrl;

      if (mainImageFile) finalMainUrl = await uploadImage(mainImageFile, 'product-images');
      if (variantImageFile) finalVariantUrl = await uploadImage(variantImageFile, 'variant-images');

      const { error: itemError } = await supabase
        .from('items')
        .update({ name, category, base_image_url: finalMainUrl })
        .eq('id', itemId);
      if (itemError) throw itemError;

      const { error: variantError } = await supabase
        .from('variants')
        .update({ stock, location, color, size, image_url: finalVariantUrl })
        .eq('id', variantId);
      if (variantError) throw variantError;

      toast.success("Berhasil diupdate!", { id: toastId });
      router.push('/dashboard');
    } catch (error: any) {
      toast.error("Gagal: " + error.message, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white p-6 sticky top-0 z-20 shadow-sm border-b border-slate-100 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
          <ArrowLeft size={24} className="text-slate-700" />
        </button>
        <h1 className="text-xl font-black text-slate-900 leading-tight">Edit Barang</h1>
      </header>

      <main className="p-6 max-w-lg mx-auto space-y-6">
        <form onSubmit={handleSave} className="space-y-6">
          
          {/* --- SECTION 1: INFO PRODUK (Parent Item) --- */}
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
             <div className="flex items-center gap-2 mb-2 text-slate-900 border-b border-slate-100 pb-3">
                <Package size={20} className="text-blue-600"/>
                <h3 className="font-black text-sm uppercase tracking-wide">Info Produk Utama</h3>
             </div>

             {/* FOTO UTAMA */}
             <div className="w-full">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Foto Sampul</label>
                <div className="relative w-full aspect-video bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 overflow-hidden group hover:border-blue-500 transition-colors">
                    <img 
                      src={mainPreview || mainImageUrl || "https://placehold.co/600x400?text=No+Image"} 
                      className="w-full h-full object-cover"
                      alt="Foto Utama"
                    />
                    <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                      <UploadCloud className="text-white mb-1" size={28} />
                      <span className="text-white text-xs font-bold">Ganti Foto</span>
                      <input type="file" className="hidden" onChange={(e) => handleFileChange(e, 'main')} />
                    </label>
                </div>
             </div>

             {/* INPUTS PRODUK */}
             <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Nama Barang</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
             </div>
             <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Kategori</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="Kostum">Kostum</option>
                  <option value="Alat">Alat</option>
                  <option value="Aksesoris">Aksesoris</option>
                  <option value="Properti">Properti</option>
                </select>
             </div>
          </div>

          {/* --- SECTION 2: DETAIL VARIAN (Split Layout) --- */}
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
             <div className="flex items-center gap-2 mb-4 text-slate-900 border-b border-slate-100 pb-3">
                <Layers size={20} className="text-blue-600"/>
                <h3 className="font-black text-sm uppercase tracking-wide">Detail Varian</h3>
             </div>

             {/* Flex Container: Kiri (Foto) - Kanan (Input) */}
             <div className="flex flex-col sm:flex-row gap-6">
                
                {/* KIRI: FOTO VARIAN */}
                <div className="shrink-0 w-full sm:w-32">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Foto Varian</label>
                   <div className="relative aspect-[3/4] bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 overflow-hidden group hover:border-blue-500 transition-colors shadow-sm">
                      <img 
                        src={variantPreview || variantImageUrl || mainPreview || mainImageUrl || "https://placehold.co/300x400?text=No+Image"} 
                        className="w-full h-full object-cover"
                        alt="Foto Varian"
                      />
                      <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity z-20">
                        <Camera className="text-white mb-1" size={20} />
                        <span className="text-white text-[10px] font-bold text-center">Ubah</span>
                        <input type="file" className="hidden" onChange={(e) => handleFileChange(e, 'variant')} />
                      </label>
                   </div>
                </div>

                {/* KANAN: INPUT FIELDS */}
                <div className="grow space-y-3">
                   <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                         <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Warna</label>
                         <input type="text" value={color} onChange={(e) => setColor(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm" />
                      </div>
                      <div className="space-y-1">
                         <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Ukuran</label>
                         <input type="text" value={size} onChange={(e) => setSize(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm" />
                      </div>
                   </div>

                   <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Stok</label>
                      <input type="number" value={stock} onChange={(e) => setStock(Number(e.target.value))} className="w-full p-3 bg-blue-50 border border-blue-200 rounded-xl font-black text-blue-600 text-lg" />
                   </div>

                   <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Lokasi</label>
                      <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm" />
                   </div>
                </div>

             </div>
          </div>

          <button type="submit" disabled={saving} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl active:scale-[0.98] transition-all">
             {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />} Simpan Perubahan
          </button>
        </form>
      </main>
    </div>
  );
}