"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, MapPin, Box, CheckCircle2, ShoppingCart, Loader2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';
import { useCart } from '@/context/CartContext'; 

export default function ItemDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  
  // 1. Ambil 'cart' juga selain 'addToCart' untuk pengecekan
  const { addToCart, cart } = useCart(); 

  const [item, setItem] = useState<any>(null);
  const [variants, setVariants] = useState<any[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // State baru untuk menyimpan stok yang tampil (dinamis)
  const [currentStock, setCurrentStock] = useState(0);

  useEffect(() => {
    if (id) fetchItemDetails();
  }, [id]);

  // 2. Setiap kali Cart atau SelectedVariant berubah, hitung ulang sisa stok
  useEffect(() => {
    if (selectedVariant) {
      // Hitung berapa biji varian ini yang SUDAH ada di keranjang
      const inCartCount = cart.filter(c => c.variant_id === selectedLoanVariantId(selectedVariant)).length;
      
      // Stok Tampil = Stok Database - Jumlah di Keranjang
      const realStock = (selectedVariant.stock || 0) - inCartCount;
      setCurrentStock(realStock > 0 ? realStock : 0);
    }
  }, [cart, selectedVariant]);

  // Helper aman untuk ambil ID varian (antisipasi tipe data)
  const selectedLoanVariantId = (variant: any) => variant.id;

  const fetchItemDetails = async () => {
    try {
      const { data: itemData, error } = await supabase.from('items').select('*').eq('id', id).single();
      if (error) throw error;
      setItem(itemData);

      // Pastikan ambil kolom 'stock' dari database
      const { data: varData } = await supabase.from('variants').select('*, stock').eq('item_id', id).order('id');
      setVariants(varData || []);
      
      if (varData && varData.length > 0) {
        setSelectedVariant(varData[0]);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal memuat barang.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!selectedVariant) {
        toast.error("Pilih varian barang terlebih dahulu!");
        return;
    }

    // Cek Stok lagi sebelum tambah (Double Protection)
    if (currentStock <= 0) {
        toast.error("Stok habis! Anda sudah mengambil semua stok yang tersedia.");
        return;
    }

    addToCart({
        item_id: item.id,
        variant_id: selectedVariant.id,
        name: item.name,
        image_url: selectedVariant.image_url || item.base_image_url,
        color: selectedVariant.color,
        size: selectedVariant.size,
        location: selectedVariant.location || 'Gudang Utama'
    });
  };

  // Helper function untuk menampilkan stok per tombol varian
  const getVariantStock = (variant: any) => {
      const inCart = cart.filter(c => c.variant_id === variant.id).length;
      const available = (variant.stock || 0) - inCart;
      return available > 0 ? available : 0;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-slate-400" size={32}/></div>;

  if (!item) return <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-400"><Box size={48} className="mb-2"/><p>Barang tidak ditemukan.</p><Link href="/dashboard" className="mt-4 text-blue-600 font-bold hover:underline">Kembali ke Dashboard</Link></div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-800">
      <Toaster position="top-center" />

      {/* HEADER IMAGE */}
      <div className="relative h-72 bg-slate-200">
        {item.base_image_url ? (
            <img src={item.base_image_url} alt={item.name} className="w-full h-full object-cover" />
        ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
                <Box size={64} strokeWidth={1}/>
            </div>
        )}
        <button onClick={() => router.back()} className="absolute top-6 left-6 p-3 bg-white/30 backdrop-blur-md rounded-full text-white hover:bg-white/50 transition shadow-sm">
            <ChevronLeft size={24}/>
        </button>
        <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-slate-50 to-transparent"></div>
      </div>

      {/* CONTENT */}
      <div className="px-6 -mt-10 relative z-10">
        <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-slate-100">
            <div className="mb-6">
                <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase tracking-wider">{item.category}</span>
                <h1 className="text-2xl font-black text-slate-900 mt-3 leading-tight">{item.name}</h1>
            </div>

            {/* VARIANT SELECTOR */}
            <div className="mb-8">
                <label className="text-xs font-bold text-slate-400 uppercase mb-3 block ml-1">Pilih Varian</label>
                <div className="space-y-3">
                    {variants.map((variant) => {
                        const stockAvailable = getVariantStock(variant);
                        const isOutOfStock = stockAvailable === 0;

                        return (
                            <button 
                                key={variant.id}
                                onClick={() => !isOutOfStock && setSelectedVariant(variant)}
                                disabled={isOutOfStock}
                                className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all ${
                                    isOutOfStock ? 'opacity-50 cursor-not-allowed bg-slate-100 border-slate-100 grayscale' :
                                    selectedVariant?.id === variant.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500/20' : 'border-slate-100 bg-slate-50 hover:bg-white'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-4 h-4 rounded-full border border-slate-200 shadow-sm`} style={{ backgroundColor: variant.color?.toLowerCase() }}></div>
                                    <div className="text-left">
                                        <p className={`text-sm font-bold ${selectedVariant?.id === variant.id ? 'text-blue-700' : 'text-slate-700'}`}>
                                            {variant.size} - {variant.color}
                                        </p>
                                        <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5"><MapPin size={10}/> {variant.location || 'Gudang Utama'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${isOutOfStock ? 'bg-red-100 text-red-500' : 'bg-slate-200 text-slate-600'}`}>
                                        {isOutOfStock ? 'Habis' : `Sisa: ${stockAvailable}`}
                                    </span>
                                    {selectedVariant?.id === variant.id && !isOutOfStock && <CheckCircle2 size={20} className="text-blue-500"/>}
                                </div>
                            </button>
                        )
                    })}
                    {variants.length === 0 && <p className="text-sm text-slate-400 italic">Stok habis atau belum diinput.</p>}
                </div>
            </div>

            {/* ACTION BUTTON */}
            <button 
                onClick={handleAddToCart}
                disabled={!selectedVariant || currentStock === 0}
                className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed"
            >
                <ShoppingCart size={20}/>
                {currentStock === 0 ? "STOK HABIS" : "TAMBAH KE KERANJANG"}
            </button>

            <p className="text-center text-[10px] text-slate-400 mt-4 px-4 leading-relaxed">
                Stok akan berkurang otomatis saat Anda menambahkan barang ke keranjang.
            </p>
        </div>
      </div>
    </div>
  );
}