"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Calendar, CheckCircle, AlertTriangle, Clock, Filter, UserCog, Loader2, Package } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function HistoryPage() {
  const router = useRouter();
  
  // --- STATE ---
  const [loading, setLoading] = useState(true);
  const [loans, setLoans] = useState<any[]>([]);
  const [filter, setFilter] = useState("Semua"); // Filter: Semua, Dipinjam, Selesai

  // --- AMBIL DATA RIWAYAT ---
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return router.push('/login');

        // Query ke Table LOANS
        // Relasi: 
        // 1. variants -> items (untuk nama barang)
        // 2. profiles (assigner) -> untuk tahu siapa yang input (assigned_by)
        const { data, error } = await supabase
          .from('loans')
          .select(`
            id,
            status,
            borrow_date,
            return_date,
            variants:variant_id (
              size,
              items:item_id ( name )
            ),
            assigner:assigned_by ( full_name ) 
          `)
          .eq('user_id', user.id) // Hanya data user ini
          .order('borrow_date', { ascending: false }); // Yang terbaru diatas

        if (error) throw error;
        setLoans(data || []);

      } catch (error) {
        console.error("Gagal ambil history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [router]);

  // --- LOGIKA FILTER ---
  const filteredData = loans.filter(item => {
    if (filter === "Semua") return true;
    if (filter === "Dipinjam") return item.status === 'dipinjam';
    if (filter === "Selesai") return item.status === 'kembali';
    return true;
  });

  // ANIMASI
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-blue-600"/></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      
      {/* HEADER */}
      <header className="bg-white p-4 sticky top-0 z-10 shadow-sm border-b border-gray-100">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-full transition">
            <ArrowLeft size={24} className="text-gray-700" />
          </Link>
          <h1 className="text-xl font-bold text-gray-800">Riwayat Pelayanan</h1>
        </div>

        {/* SEARCH & FILTER */}
        <div className="flex gap-2">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
                <input type="text" placeholder="Cari barang lama..." className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl border-none focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
            </div>
            <button className="p-3 bg-gray-100 rounded-xl text-gray-600"><Filter size={20} /></button>
        </div>
      </header>

      {/* TABS FILTER */}
      <div className="px-4 mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {["Semua", "Dipinjam", "Selesai"].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
              filter === tab 
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' 
              : 'bg-white text-gray-500 border border-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* LIST RIWAYAT */}
      <main className="p-4">
        {filteredData.length > 0 ? (
          <motion.div 
              className="space-y-3"
              variants={containerVariants}
              initial="hidden"
              animate="show"
          >
            {filteredData.map((data) => (
              <motion.div 
                  key={data.id} 
                  variants={itemVariants}
                  className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between"
              >
                <div>
                  <h3 className="font-bold text-gray-800 text-sm mb-1">
                    {data.variants?.items?.name} <span className="font-normal text-gray-500">({data.variants?.size})</span>
                  </h3>
                  
                  {/* INFO ASSIGNED BY (AUDIT TRAIL) */}
                  <div className="flex items-center gap-2 text-[10px] bg-gray-50 w-fit px-2 py-1 rounded-md mb-2 border border-gray-200">
                      <UserCog size={12} className="text-gray-500" />
                      <span className="text-gray-600">
                          Diproses oleh: <span className="font-bold text-gray-800">{data.assigner?.full_name || 'System'}</span>
                      </span>
                  </div>

                  {/* INFO TANGGAL */}
                  <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Calendar size={12} />
                          <span>Pinjam: {new Date(data.borrow_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                      
                      {/* TANGGAL KEMBALI (Hanya jika sudah kembali) */}
                      {data.return_date && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <CheckCircle size={12} className="text-green-500"/>
                            <span>Kembali: {new Date(data.return_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                      )}
                  </div>
                </div>

                {/* STATUS BADGE */}
                <div className="flex flex-col items-end justify-start h-full gap-4">
                   {data.status === 'dipinjam' ? (
                       <span className="bg-orange-50 text-orange-600 text-[10px] font-bold px-2 py-1 rounded-lg border border-orange-100 flex items-center gap-1">
                          <Clock size={10} /> Dipinjam
                       </span>
                   ) : (
                       <span className="bg-green-50 text-green-600 text-[10px] font-bold px-2 py-1 rounded-lg border border-green-100 flex items-center gap-1">
                          <CheckCircle size={10} /> Selesai
                       </span>
                   )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
             <Package size={48} className="mb-2 opacity-20" />
             <p className="text-sm">Belum ada riwayat {filter !== 'Semua' ? filter.toLowerCase() : ''}.</p>
          </div>
        )}
      </main>
    </div>
  );
}