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
  
  const { addToCart, cart } = useCart(); 
  const [item, setItem] = useState<any>(null);
  const [variants, setVariants] = useState<any[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentStock, setCurrentStock] = useState(0);

  useEffect(() => {
    if (id) fetchItemDetails();
  }, [id]);

  useEffect(() => {
    if (selectedVariant) {
      const inCartItem = cart.find(c => c.variant_id === selectedVariant.id);
      const inCartQty = inCartItem ? 1 : 0; 
      const realStock = (selectedVariant.stock || 0) - inCartQty;
      setCurrentStock(realStock < 0 ? 0 : realStock);
    }
  }, [selectedVariant, cart]);

  const fetchItemDetails = async () => {
    try {
      setLoading(true);
      const { data: itemData, error: itemError } = await supabase
        .from('items')
        .select('*')
        .eq('id', id)
        .single();

      if (itemError) throw itemError;
      setItem(itemData);

      const { data: variantData, error: variantError } = await supabase
        .from('variants')
        .select('*')
        .eq('item_id', id)
        .order('stock', { ascending: false }); 

      if (variantError) throw variantError;
      setVariants(variantData || []);

      if (variantData && variantData.length > 0) {
        setSelectedVariant(variantData[0]);
      }
    } catch (error: any) {
      toast.error("Gagal memuat data: " + error.message);
      router.push('/items'); // Redirect ke items jika error
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!selectedVariant) return;
    if (currentStock <= 0) {
        toast.error("Stok varian ini habis (cek keranjang Anda).");
        return;
    }

    addToCart({
        variant_id: selectedVariant.id,
        item_id: item.id,
        name: item.name,
        color: selectedVariant.color,
        size: selectedVariant.size,
        location: selectedVariant.location,
        image_url: selectedVariant.image_url || item.base_image_url
    });
    
    toast.success("Masuk Keranjang!");
    router.push('/cart');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={40}/></div>;

  if (!item) return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400 font-bold">Barang tidak ditemukan.</p></div>;

  return (
    <div className="min-h-screen bg-white pb-32 font-sans text-slate-800">
      <Toaster position="top-center" />
      
      {/* HEADER - UPDATED LINK */}
      <header className="p-6 sticky top-0 z-20 bg-white/80 backdrop-blur-md flex items-center justify-between shadow-sm border-b border-slate-100">
        {/* [UBAH] href="/items" agar kembali ke list barang */}
        <Link href="/items" className="p-2 -ml-2 hover:bg-slate-50 rounded-full transition-colors"><ChevronLeft size={24} className="text-slate-800" /></Link>
        <h1 className="font-black text-sm uppercase tracking-widest text-slate-400">Detail Barang</h1>
        <div className="w-8"></div>
      </header>

      <main className="p-6">
        {/* IMAGE CONTAINER */}
        <div className="relative aspect-square bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-slate-100 mb-6 group">
            {(selectedVariant?.image_url || item.base_image_url) ? (
                <img 
                    src={selectedVariant?.image_url || item.base_image_url} 
                    alt={item.name} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-300">
                    <Box size={64} />
                </div>
            )}
            
            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                <span className="bg-white/90 backdrop-blur px-4 py-2 rounded-2xl text-xs font-black shadow-sm border border-white/50 text-slate-800 uppercase tracking-wide">
                    {selectedVariant?.location ? (
                        <span className="flex items-center gap-1"><MapPin size={14} className="text-red-500"/> {selectedVariant.location}</span>
                    ) : "Lokasi -"}
                </span>
            </div>
        </div>

        {/* INFO */}
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-black text-slate-900 leading-tight mb-2">{item.name}</h1>
                <p className="text-slate-500 font-medium leading-relaxed text-sm">{item.description || "Tidak ada deskripsi."}</p>
            </div>

            {/* VARIANTS */}
            <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Pilih Varian</p>
                <div className="grid grid-cols-2 gap-3">
                    {variants.map((variant) => {
                        const inCartItem = cart.find(c => c.variant_id === variant.id);
                        const inCartQty = inCartItem ? 1 : 0; 
                        const stockAvailable = (variant.stock || 0) - inCartQty;
                        const isOutOfStock = stockAvailable <= 0;

                        return (
                            <button 
                                key={variant.id} 
                                onClick={() => setSelectedVariant(variant)}
                                className={`p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden group ${selectedVariant?.id === variant.id ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 bg-white hover:border-blue-200'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div 
                                        className="w-6 h-6 rounded-full shadow-sm border border-slate-200" 
                                        style={{ backgroundColor: variant.color_hex || '#ccc' }} 
                                    />
                                    {selectedVariant?.id === variant.id && <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"/>}
                                </div>
                                <div>
                                    <p className="font-black text-slate-800 text-sm uppercase">{variant.color}</p>
                                    <p className="text-xs text-slate-400 font-bold mb-2">Size {variant.size}</p>
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded ${isOutOfStock ? 'bg-red-100 text-red-500' : 'bg-slate-200 text-slate-600'}`}>
                                        {isOutOfStock ? 'Habis' : `Sisa: ${stockAvailable}`}
                                    </span>
                                    {selectedVariant?.id === variant.id && !isOutOfStock && <CheckCircle2 size={20} className="text-blue-500 absolute top-4 right-4"/>}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
      </main>

      {/* FOOTER ACTION */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-50 z-10 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-4">
            <div className="flex-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Stok Tersedia</p>
                <p className={`text-2xl font-black ${currentStock > 0 ? 'text-slate-900' : 'text-red-500'}`}>{currentStock} <span className="text-sm font-bold text-slate-400">Unit</span></p>
            </div>
            <button 
                onClick={handleAddToCart}
                disabled={currentStock <= 0}
                className={`flex-1 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95 ${currentStock > 0 ? 'bg-slate-900 text-white shadow-slate-900/20 hover:bg-slate-800' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}
            >
                <ShoppingCart size={18} />
                {currentStock > 0 ? "Pinjam Barang" : "Stok Habis"}
            </button>
        </div>
      </div>
    </div>
  );
}