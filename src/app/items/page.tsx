"use client";

import React, { useEffect, useState } from 'react';
import { Search, ArrowLeft, Package, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import FloatingCart from '@/components/FloatingCart';

export default function ItemsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchItems = async () => {
      try {
        // [UBAH] Ambil data barang BESERTA stok variannya
        const { data, error } = await supabase
          .from('items')
          .select('*, variants(stock)') 
          .order('name', { ascending: true });
          
        if (error) throw error;
        setItems(data || []);
      } catch (error) {
        console.error("Gagal ambil barang:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } } };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white p-4 sticky top-0 z-10 shadow-sm border-b">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft size={24} /></Link>
          <h1 className="text-xl font-bold text-gray-800">Katalog Barang</h1>
        </div>
        <div className="relative">
          <input type="text" placeholder="Cari barang..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl outline-none text-sm" />
          <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
        </div>
      </header>

      <main className="p-4">
        {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-600" size={32} /></div> : (
          <motion.div className="grid grid-cols-2 gap-4" variants={containerVariants} initial="hidden" animate="show">
            {filteredItems.map((item) => {
              // [BARU] Hitung Total Stok dari semua varian
              const totalStock = item.variants?.reduce((acc: number, curr: any) => acc + curr.stock, 0) || 0;
              const isAvailable = totalStock > 0;

              return (
                <motion.div key={item.id} variants={itemVariants} className="relative bg-white p-3 rounded-2xl border shadow-sm flex flex-col h-full active:scale-95 transition-transform">
                  
                  {/* BAGIAN FOTO ASLI */}
                  <div className="w-full aspect-square rounded-xl mb-3 overflow-hidden shadow-inner bg-gray-100 relative">
                     {/* [BARU] Label Stok di Pojok Kanan Atas Foto */}
                     <div className={`absolute top-2 right-2 px-2 py-1 rounded-lg text-[10px] font-black shadow-sm z-10 backdrop-blur-sm ${isAvailable ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
                        {isAvailable ? `Sisa ${totalStock}` : 'Habis'}
                     </div>

                     {item.base_image_url ? (
                         <img src={item.base_image_url} alt={item.name} className={`w-full h-full object-cover ${!isAvailable && 'grayscale opacity-70'}`} />
                     ) : (
                         <div className="flex items-center justify-center h-full"><Package className="text-gray-300" size={40} /></div>
                     )}
                  </div>

                  <div className="flex-1 flex flex-col text-center">
                    <span className="text-[10px] font-bold text-blue-600 uppercase mb-1">{item.category}</span>
                    <h3 className="font-bold text-gray-800 text-sm leading-tight line-clamp-2">{item.name}</h3>
                  </div>
                  
                  {/* Link tetap ada, tapi visual barang habis agak redup */}
                  <Link href={`/items/${item.id}`} className="absolute inset-0" />
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </main>
    <FloatingCart />
    </div>
  );
}