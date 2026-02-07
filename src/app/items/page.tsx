"use client";

import React, { useEffect, useState } from 'react';
import { Search, ArrowLeft, Package, Loader2, Filter } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import FloatingCart from '@/components/FloatingCart';

export default function ItemsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // [BARU] State untuk Kategori
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [categories, setCategories] = useState<string[]>(["Semua"]);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        // Ambil data barang BESERTA stok variannya
        const { data, error } = await supabase
          .from('items')
          .select('*, variants(stock)') 
          .order('name', { ascending: true });
          
        if (error) throw error;
        
        const fetchedItems = data || [];
        setItems(fetchedItems);

        // [BARU] Ambil unik kategori dari data barang
        // Filter(Boolean) membuang kategori yang kosong/null
        const uniqueCategories = ["Semua", ...Array.from(new Set(fetchedItems.map(i => i.category).filter(Boolean)))];
        setCategories(uniqueCategories as string[]);

      } catch (error) {
        console.error("Gagal ambil barang:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  // [BARU] Logic Filter Ganda (Search + Category)
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "Semua" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32 font-sans text-slate-800">
      
      {/* HEADER FIX */}
      <header className="bg-white p-6 sticky top-0 z-30 shadow-sm border-b border-slate-100">
        <div className="flex items-center gap-4 mb-4">
           <Link href="/dashboard" className="p-2 -ml-2 hover:bg-slate-50 rounded-full transition-colors"><ArrowLeft size={24} className="text-slate-700"/></Link>
           <div>
             <h1 className="text-xl font-black text-slate-900 leading-tight">Daftar Aset</h1>
             <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Cari & Pinjam Barang</p>
           </div>
        </div>

        {/* SEARCH BAR */}
        <div className="relative group mb-4">
          <input 
            type="text" 
            placeholder="Cari nama barang..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full pl-11 pr-4 py-3.5 bg-slate-100 rounded-2xl border border-transparent focus:border-blue-500/20 focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none text-sm font-medium" 
          />
          <Search className="absolute left-4 top-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
        </div>

        {/* [BARU] CATEGORY TABS (Scrollable) */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-2 px-2">
            {categories.map((cat) => (
                <button 
                    key={cat} 
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide whitespace-nowrap transition-all border ${
                        selectedCategory === cat 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20 scale-105' 
                        : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300 hover:text-slate-600'
                    }`}
                >
                    {cat}
                </button>
            ))}
        </div>
      </header>

      {/* ITEMS GRID */}
      <main className="p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-blue-600 mb-2" size={32}/>
            <p className="text-xs font-bold text-slate-400">Memuat Aset...</p>
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {filteredItems.map((item) => {
               // Hitung Total Stok dari Varian
               const totalStock = item.variants?.reduce((sum: number, v: any) => sum + (v.stock || 0), 0) || 0;
               const isAvailable = totalStock > 0;

               return (
                 <Link href={`/items/${item.id}`} key={item.id} className="block group">
                   <motion.div 
                     initial={{ opacity: 0, scale: 0.9 }}
                     animate={{ opacity: 1, scale: 1 }}
                     className="bg-white p-3 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all h-full flex flex-col"
                   >
                      {/* IMAGE */}
                      <div className="aspect-square rounded-2xl overflow-hidden shadow-inner bg-slate-50 relative mb-3">
                          {/* Label Stok */}
                          <div className={`absolute top-2 right-2 px-2 py-1 rounded-lg text-[9px] font-black shadow-sm z-10 backdrop-blur-md border border-white/20 ${isAvailable ? 'bg-black/60 text-white' : 'bg-red-500/90 text-white'}`}>
                             {isAvailable ? `${totalStock} Unit` : 'Habis'}
                          </div>
                          
                          {item.base_image_url ? (
                              <img 
                                src={item.base_image_url} 
                                alt={item.name} 
                                className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${!isAvailable && 'grayscale opacity-70'}`}
                              />
                          ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <Package size={32} strokeWidth={1.5} />
                              </div>
                          )}
                      </div>

                      {/* TEXT */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="font-black text-slate-800 text-sm leading-tight line-clamp-2">{item.name}</h3>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.category || "Umum"}</p>
                      </div>
                   </motion.div>
                 </Link>
               );
            })}
          </div>
        ) : (
          <div className="text-center py-20 opacity-50">
            <Package className="mx-auto mb-3 text-slate-300" size={48} />
            <p className="font-bold text-slate-400 text-sm">Barang tidak ditemukan.</p>
          </div>
        )}
      </main>

      <FloatingCart />
    </div>
  );
}