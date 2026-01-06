"use client";

import React, { useEffect, useState } from 'react';
import { Search, ArrowLeft, Filter, Package, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase'; // Import Supabase

export default function ItemsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // FETCH DATA DARI SUPABASE
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const { data, error } = await supabase
          .from('items')
          .select('*')
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

  // FITUR PENCARIAN
  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ANIMASI
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: { 
        opacity: 1, 
        y: 0, 
        scale: 1, 
        // PERBAIKAN: Tambahkan 'as const' disini
        transition: { type: "spring" as const, stiffness: 300, damping: 24 } 
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      
      {/* HEADER */}
      <header className="bg-white p-4 sticky top-0 z-10 shadow-sm border-b border-gray-100">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-full transition">
            <ArrowLeft size={24} className="text-gray-700" />
          </Link>
          <h1 className="text-xl font-bold text-gray-800">Katalog Barang</h1>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Cari nama barang..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl border-none focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
            />
            <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
          </div>
          <button className="p-3 bg-gray-100 rounded-xl text-gray-600"><Filter size={20} /></button>
        </div>
      </header>

      {/* LIST BARANG */}
      <main className="p-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        ) : (
          <motion.div 
              className="grid grid-cols-2 gap-4"
              variants={containerVariants}
              initial="hidden"
              animate="show"
          >
            {filteredItems.map((item) => (
              <motion.div 
                  key={item.id} 
                  variants={itemVariants}
                  className="relative bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full overflow-hidden group active:scale-95 transition-transform"
              >
                {/* Gambar Background Dinamis */}
                <div className={`w-full aspect-square ${item.base_image_url || 'bg-gray-100'} rounded-xl mb-3 flex items-center justify-center shadow-inner`}>
                   <Package className="text-white/50" size={40} />
                </div>

                <div className="flex-1 flex flex-col text-center">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">{item.category}</span>
                  <h3 className="font-bold text-gray-800 text-sm leading-tight mb-1">
                    {item.name}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">Klik untuk stok</p>
                </div>

                <Link href={`/items/${item.id}`} className="absolute inset-0" />
              </motion.div>
            ))}

            {filteredItems.length === 0 && (
              <div className="col-span-2 text-center py-10 text-gray-400 text-sm">
                Barang tidak ditemukan.
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}