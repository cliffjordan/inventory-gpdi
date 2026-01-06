"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Plus, Package, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function AdminAddPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // STATE BARANG UTAMA
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState("Kostum"); // Default
  const [createdItemId, setCreatedItemId] = useState<string | null>(null);

  // STATE VARIAN
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [stock, setStock] = useState(1);
  const [location, setLocation] = useState("");
  const [savedVariants, setSavedVariants] = useState<any[]>([]);

  // 1. CEK APAKAH ADMIN?
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        toast.error("Akses Ditolak. Halaman ini khusus Admin.");
        router.push('/dashboard');
      } else {
        setLoading(false);
      }
    };
    checkAdmin();
  }, [router]);

  // 2. SIMPAN BARANG UTAMA
  const handleSaveItem = async () => {
    if (!itemName) return toast.error("Nama barang wajib diisi");

    const toastId = toast.loading("Menyimpan barang...");
    
    // Pilih background random untuk sementara
    const gradients = [
      'bg-gradient-to-br from-blue-100 to-cyan-100',
      'bg-gradient-to-br from-purple-100 to-pink-100',
      'bg-gradient-to-br from-yellow-100 to-orange-100',
      'bg-gradient-to-br from-green-100 to-emerald-100'
    ];
    const randomBg = gradients[Math.floor(Math.random() * gradients.length)];

    try {
      const { data, error } = await supabase
        .from('items')
        .insert([{ 
            name: itemName, 
            category, 
            base_image_url: randomBg 
        }])
        .select()
        .single();

      if (error) throw error;

      setCreatedItemId(data.id); // Simpan ID barang baru
      toast.success("Barang dibuat! Sekarang tambahkan variannya.", { id: toastId });
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    }
  };

  // 3. SIMPAN VARIAN
  const handleAddVariant = async () => {
    if (!color || !size || !location) return toast.error("Lengkapi data varian");
    if (!createdItemId) return;

    const toastId = toast.loading("Menambahkan varian...");

    try {
      const { data, error } = await supabase
        .from('variants')
        .insert([{
            item_id: createdItemId,
            color,
            size,
            stock,
            location,
            image_url: 'bg-gray-100' // Opsional
        }])
        .select()
        .single();

      if (error) throw error;

      // Update UI List Varian
      setSavedVariants([...savedVariants, data]);
      
      // Reset Form Varian
      setColor("");
      setSize("");
      setStock(1);
      setLocation("");
      
      toast.success("Varian berhasil ditambahkan!", { id: toastId });
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    }
  };

  const handleFinish = () => {
    toast.success("Selesai! Barang sudah masuk katalog.");
    router.push('/items');
  };

  if (loading) return <div className="p-10 text-center">Memeriksa akses admin...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white p-4 sticky top-0 z-10 shadow-sm border-b border-gray-100 flex items-center gap-4">
        <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-full transition">
            <ArrowLeft size={24} className="text-gray-700" />
        </Link>
        <h1 className="text-xl font-bold text-gray-800">Input Barang Baru</h1>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-6">
        
        {/* FORM 1: DATA UTAMA */}
        <div className={`bg-white p-6 rounded-2xl shadow-sm border transition-all ${createdItemId ? 'border-green-200 bg-green-50/30' : 'border-gray-100'}`}>
            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Package className="text-blue-600" /> 
                1. Informasi Dasar
                {createdItemId && <CheckCircle className="text-green-500 ml-auto" size={20}/>}
            </h2>
            
            <div className="space-y-4">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Nama Barang</label>
                    <input 
                        type="text" 
                        disabled={!!createdItemId}
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        placeholder="Contoh: Kostum Tamborine..." 
                        className="w-full mt-1 p-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Kategori</label>
                    <select 
                        disabled={!!createdItemId}
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full mt-1 p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                    >
                        <option value="Kostum">Kostum</option>
                        <option value="Alat">Alat Musik</option>
                        <option value="Properti">Properti Tari</option>
                        <option value="Lainnya">Lainnya</option>
                    </select>
                </div>

                {!createdItemId && (
                    <button 
                        onClick={handleSaveItem}
                        className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 active:scale-95 transition-transform flex items-center justify-center gap-2"
                    >
                        <Save size={18} /> Simpan & Lanjut Isi Varian
                    </button>
                )}
            </div>
        </div>

        {/* FORM 2: VARIAN (HANYA MUNCUL SETELAH ITEM DISIMPAN) */}
        {createdItemId && (
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 animate-in slide-in-from-bottom-5 fade-in">
                <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Plus className="text-blue-600" /> 
                    2. Tambah Varian (Warna/Ukuran)
                </h2>

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500">Warna</label>
                        <input type="text" placeholder="Merah / Gold" value={color} onChange={e => setColor(e.target.value)} className="w-full mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 outline-none" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500">Ukuran</label>
                        <input type="text" placeholder="S / M / L" value={size} onChange={e => setSize(e.target.value)} className="w-full mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 outline-none" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500">Stok Awal</label>
                        <input type="number" min="1" value={stock} onChange={e => setStock(parseInt(e.target.value))} className="w-full mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 outline-none" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500">Lokasi</label>
                        <input type="text" placeholder="Lemari A1" value={location} onChange={e => setLocation(e.target.value)} className="w-full mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 outline-none" />
                    </div>
                </div>

                <button 
                    onClick={handleAddVariant}
                    className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black active:scale-95 transition-transform flex items-center justify-center gap-2 mb-6"
                >
                    <Plus size={18} /> Tambahkan Varian Ini
                </button>

                {/* LIST VARIAN YANG SUDAH DITAMBAHKAN */}
                {savedVariants.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-gray-400 uppercase">Varian Tersimpan ({savedVariants.length})</p>
                        {savedVariants.map((v) => (
                            <div key={v.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                                <div>
                                    <span className="font-bold text-gray-800">{v.color} ({v.size})</span>
                                    <p className="text-xs text-gray-500">Stok: {v.stock} | Loc: {v.location}</p>
                                </div>
                                <CheckCircle className="text-green-500" size={16} />
                            </div>
                        ))}
                    </div>
                )}
             </div>
        )}

        {/* TOMBOL FINAL */}
        {savedVariants.length > 0 && (
            <button 
                onClick={handleFinish}
                className="w-full py-4 bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-600/30 hover:bg-green-700 active:scale-95 transition-transform"
            >
                Selesai & Masuk Katalog
            </button>
        )}

      </main>
    </div>
  );
}