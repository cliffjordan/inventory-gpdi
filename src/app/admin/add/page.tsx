"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Save, Loader2, Camera, Package, Palette } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import imageCompression from 'browser-image-compression'; // Pastikan library ini terinstall

export default function AddItemPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // State Data Barang & Autocomplete
  const [name, setName] = useState("");
  const [existingItems, setExistingItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [category, setCategory] = useState("Kostum");
  const [baseImageUrl, setBaseImageUrl] = useState(""); 
  const [uploading, setUploading] = useState<number | string | null>(null);
  
  // State Varian
  const [variants, setVariants] = useState([{ color: "", size: "", stock: 0, location: "", image_url: "" }]);

  // Ambil data barang untuk Autocomplete
  useEffect(() => {
    const fetchItems = async () => {
      const { data } = await supabase.from('items').select('id, name, category, base_image_url');
      if (data) setExistingItems(data);
    };
    fetchItems();
  }, []);

  // Filter Autocomplete
  const handleNameChange = (val: string) => {
    setName(val);
    setSelectedItem(null);
    if (val.length > 0) {
      const filtered = existingItems.filter(item => item.name.toLowerCase().includes(val.toLowerCase()));
      setFilteredItems(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (item: any) => {
    setName(item.name);
    setCategory(item.category);
    setBaseImageUrl(item.base_image_url);
    setSelectedItem(item);
    setShowSuggestions(false);
    toast.success(`Item "${item.name}" terpilih. Foto utama otomatis digunakan.`);
  };

  // Fungsi Hapus Varian
  const handleRemoveVariant = (index: number) => {
    const newVariants = variants.filter((_, i) => i !== index);
    setVariants(newVariants);
    toast.success("Varian dihapus");
  };

  const handleAddVariant = () => {
    setVariants([...variants, { color: "", size: "", stock: 0, location: "", image_url: "" }]);
  };

  const updateVariant = (index: number, field: string, value: any) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setVariants(newVariants);
  };

  // [UBAH] FUNGSI UPLOAD FOTO DENGAN KOMPRESI 300KB
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number | 'base') => {
    try {
      setUploading(index);
      const file = e.target.files?.[0];
      if (!file) return;

      // Setting Kompresi Baru
      const options = {
        maxSizeMB: 0.3, // Target < 300KB (Hemat Storage)
        maxWidthOrHeight: 1920, // Full HD cukup tajam
        useWebWorker: true,
        fileType: 'image/jpeg',
        initialQuality: 0.8
      };

      const compressedFile = await imageCompression(file, options);
      const fileExt = "jpg"; // Paksa ekstensi jpg hasil kompresi
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `product-images/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('items').upload(filePath, compressedFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('items').getPublicUrl(filePath);

      if (index === 'base') {
        setBaseImageUrl(publicUrl);
      } else {
        const newVariants = [...variants];
        newVariants[index].image_url = publicUrl;
        setVariants(newVariants);
      }
      toast.success("Foto berhasil diunggah (Terkompresi)!");
    } catch (error: any) {
      console.error(error);
      toast.error("Gagal upload: " + error.message);
    } finally {
      setUploading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let itemId = selectedItem?.id;

      if (!itemId) {
        if (!baseImageUrl) {
          toast.error("Wajib upload foto untuk item baru!");
          setLoading(false);
          return;
        }
        const { data: newItem, error: itemError } = await supabase
          .from('items')
          .insert([{ name, category, base_image_url: baseImageUrl }])
          .select().single();

        if (itemError) throw itemError;
        itemId = newItem.id;
      }

      const variantsToInsert = variants.map(v => ({
        item_id: itemId,
        color: v.color,
        size: v.size,
        stock: v.stock,
        location: v.location,
        image_url: v.image_url 
      }));

      const { error: variantError } = await supabase.from('variants').insert(variantsToInsert);
      if (variantError) throw variantError;

      toast.success("Berhasil menyimpan data!");
      router.push('/admin'); 

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white p-4 sticky top-0 z-40 shadow-sm border-b flex items-center gap-4">
        <Link href="/admin" className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft size={24} /></Link>
        <h1 className="text-xl font-bold text-gray-800">Tambah Item & Varian</h1>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* SECTION 1: INFORMASI UTAMA */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4 relative">
            <h2 className="font-bold text-gray-800 flex items-center gap-2 text-sm uppercase tracking-wider">
              <Package size={18} className="text-blue-600" /> 1. Informasi Utama
            </h2>
            
            <div className="space-y-3 relative">
              <div className="relative">
                <input 
                  type="text" required placeholder="Nama Barang (Contoh: Kostum AA)" 
                  value={name} onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full p-4 bg-gray-50 rounded-xl border focus:border-blue-500 font-bold outline-none"
                />
                {/* DROPDOWN AUTOCOMPLETE */}
                {showSuggestions && filteredItems.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-2xl shadow-xl overflow-hidden">
                    {filteredItems.map(item => (
                      <button key={item.id} type="button" onClick={() => selectSuggestion(item)} className="w-full p-4 text-left hover:bg-blue-50 flex justify-between items-center border-b last:border-0">
                        <span className="font-bold text-gray-700">{item.name}</span>
                        <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-1 rounded-full font-black uppercase">Barang Lama</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {!selectedItem && (
                <div className="relative w-full h-40 bg-gray-100 rounded-2xl overflow-hidden border-2 border-dashed border-gray-200 flex flex-col items-center justify-center">
                   {baseImageUrl ? (
                      <img src={baseImageUrl} className="w-full h-full object-cover" />
                   ) : (
                      <label className="flex flex-col items-center cursor-pointer">
                        {uploading === 'base' ? <Loader2 className="animate-spin text-blue-600" /> : <Camera className="text-gray-400" size={32} />}
                        <span className="text-[10px] font-bold text-gray-400 uppercase mt-2">Upload Foto Utama (Wajib untuk Item Baru)</span>
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handlePhotoUpload(e, 'base')} />
                      </label>
                   )}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: DETAIL VARIAN */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
               <h2 className="font-bold text-gray-800 flex items-center gap-2 text-sm uppercase tracking-wider"><Palette size={18} className="text-blue-600" /> 2. Detail Varian & Warna</h2>
               <button type="button" onClick={handleAddVariant} className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-blue-100 transition-colors"><Plus size={14} /> TAMBAH WARIAN</button>
            </div>

            {variants.map((variant, index) => (
              <div key={index} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                
                {/* Header Varian */}
                <div className="flex justify-between items-center border-b border-gray-50 pb-2 mb-2">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md">
                     Varian #{index + 1}
                   </span>
                   {variants.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => handleRemoveVariant(index)}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold"
                      >
                        <Trash2 size={14} /> Hapus
                      </button>
                   )}
                </div>

                <div className="flex gap-4">
                  {/* FOTO PER VARIAN */}
                  <div className="w-24 h-24 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 shrink-0 overflow-hidden relative flex items-center justify-center">
                     {variant.image_url ? (
                        <img src={variant.image_url} className="w-full h-full object-cover" />
                     ) : (
                        <label className="cursor-pointer text-center flex flex-col items-center">
                          {uploading === index ? <Loader2 className="animate-spin text-blue-500" size={16} /> : <Camera size={20} className="text-gray-300" />}
                          <span className="text-[8px] font-bold text-gray-400 uppercase mt-1">Foto Warna</span>
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handlePhotoUpload(e, index)} />
                        </label>
                     )}
                  </div>

                  {/* FORM INPUTS */}
                  <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" placeholder="Warna (Misal: Merah)" value={variant.color} onChange={(e) => updateVariant(index, 'color', e.target.value)} className="w-full p-2.5 bg-gray-50 rounded-lg border text-xs font-bold outline-none" />
                      <input type="text" placeholder="Ukuran" value={variant.size} onChange={(e) => updateVariant(index, 'size', e.target.value)} className="w-full p-2.5 bg-gray-50 rounded-lg border text-xs font-bold outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" placeholder="Stok" value={variant.stock} onChange={(e) => updateVariant(index, 'stock', parseInt(e.target.value))} className="w-full p-2.5 bg-gray-50 rounded-lg border text-xs font-bold outline-none" />
                      <input type="text" placeholder="Lokasi" value={variant.location} onChange={(e) => updateVariant(index, 'location', e.target.value)} className="w-full p-2.5 bg-gray-50 rounded-lg border text-xs font-bold outline-none" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl active:scale-[0.98] transition flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Simpan Semua Data</>}
          </button>

        </form>
      </main>
    </div>
  );
}