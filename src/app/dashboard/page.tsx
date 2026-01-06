"use client";

import React, { useState, useEffect } from 'react';
import { Search, ArrowUpRight, ArrowDownLeft, Clock, User, Package, LogOut, AlertTriangle, ChevronRight, History, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase'; // Import Supabase
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const router = useRouter();
  
  // --- STATE DATA ---
  const [profile, setProfile] = useState<any>(null); // Data User
  const [activeLoansCount, setActiveLoansCount] = useState(0); 
  const [activeLoansList, setActiveLoansList] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);

  // STATE MODAL LOGOUT
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);

  // --- 1. AMBIL DATA SAAT LOAD ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        // A. Cek User Login
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.replace('/login'); 
          return;
        }

        // B. Ambil Profil (Nama & Role)
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        setProfile(profileData);

        // C. Ambil Data Peminjaman Aktif (Status = dipinjam)
        const { data: loansData } = await supabase
          .from('loans')
          .select(`
            id, 
            status, 
            borrow_date,
            profiles:user_id ( full_name ),
            variants:variant_id ( 
              size, 
              items:item_id ( name ) 
            )
          `)
          .eq('status', 'dipinjam')
          .order('borrow_date', { ascending: false });

        if (loansData) {
          setActiveLoansList(loansData);
          setActiveLoansCount(loansData.length);
        }

      } catch (error) {
        console.error("Error fetching dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  // --- 2. FUNGSI LOGOUT ---
  const handleLogout = async () => {
    const loadingToast = toast.loading("Sedang keluar...");
    await supabase.auth.signOut();
    toast.dismiss(loadingToast);
    router.replace('/login'); 
  };

  const backdropVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0, 
      transition: { type: "spring" as const, stiffness: 300, damping: 25 } 
    },
    exit: { opacity: 0, scale: 0.95, y: 20 }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-blue-600">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      
      {/* --- HEADER --- */}
      <header className="bg-white px-6 py-5 border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 capitalize">
              Halo, {profile?.full_name?.split(' ')[0] || 'Member'}!
            </h1>
            <p className="text-gray-500 text-sm">
              ID: <span className="font-mono text-blue-600 font-bold">{profile?.no_induk || '...'}</span>
            </p>
          </div>
          
          <button 
            onClick={() => setIsLogoutOpen(true)}
            className="p-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition shadow-sm"
          >
            <LogOut size={20} />
          </button>
        </div>

        <div className="relative">
          <input 
            type="text" 
            placeholder="Cari kostum, rebana, flags..." 
            className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl border-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none text-sm"
          />
          <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
        </div>
      </header>

      <main className="p-5 space-y-6">
        
        {/* --- MENU UTAMA --- */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/items" className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/20 flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform cursor-pointer hover:bg-blue-700 h-32">
            <div className="p-3 bg-white/20 rounded-full">
              <ArrowUpRight size={28} />
            </div>
            <span className="font-semibold text-lg">Ambil</span>
          </Link>

          <Link href="/return" className="p-4 bg-white text-gray-700 border border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform hover:bg-gray-50 shadow-sm cursor-pointer h-32">
            <div className="p-3 bg-green-100 text-green-600 rounded-full">
              <ArrowDownLeft size={28} />
            </div>
            <span className="font-semibold text-lg">Kembali</span>
          </Link>
        </div>

        {/* --- MENU RIWAYAT --- */}
        <div className="grid grid-cols-1 gap-4">
            <Link href="/history" className="p-4 bg-white border border-gray-200 rounded-2xl flex items-center justify-between active:scale-95 transition-all hover:bg-gray-50 shadow-sm group">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                        <History size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800">Riwayat Pelayanan</h3>
                        <p className="text-xs text-gray-500">Cek barang yang pernah dipinjam</p>
                    </div>
                </div>
                <div className="bg-gray-50 p-2 rounded-full text-gray-400 group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
                     <ChevronRight size={20} />
                </div>
            </Link>
        </div>

        {/* --- KHUSUS ADMIN: TOMBOL TAMBAH BARANG --- */}
        {profile?.role === 'admin' && (
          <div className="mb-2">
             <Link href="/admin/add" className="w-full p-4 bg-gray-900 text-white rounded-2xl flex items-center justify-between shadow-lg shadow-gray-900/20 active:scale-95 transition-transform">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <Plus size={24} />
                   </div>
                   <div>
                      <h3 className="font-bold text-white">Input Barang Baru</h3>
                      <p className="text-xs text-gray-400">Tambahkan stok ke gudang</p>
                   </div>
                </div>
                <ChevronRight className="text-gray-500" />
             </Link>
          </div>
        )}

        {/* --- LIVE STATUS SECTION (REAL DATA) --- */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              Sedang Dipinjam
            </h2>
            <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
              {activeLoansCount} Item
            </span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[100px]">
            {activeLoansList.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {activeLoansList.map((loan) => (
                  <div key={loan.id} className="p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                    <div className="mt-1 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-blue-50 text-blue-600">
                      <Package size={20} />
                    </div>

                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="font-semibold text-gray-900 text-sm">
                          {loan.variants?.items?.name || 'Barang Tidak Dikenal'}
                          <span className='font-normal text-gray-500 ml-1'>({loan.variants?.size})</span>
                        </h3>
                      </div>
                      
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                        <User size={12} />
                        <span className="font-medium">{loan.profiles?.full_name || 'Tanpa Nama'}</span>
                      </div>
                      
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                        <Clock size={12} />
                        <span>{new Date(loan.borrow_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-gray-400">
                <Package size={40} className="mb-2 opacity-20" />
                <p className="text-sm">Semua barang aman di gudang.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* --- MODAL LOGOUT --- */}
      <AnimatePresence>
        {isLogoutOpen && (
           <motion.div 
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              initial="hidden" animate="visible" exit="hidden" variants={backdropVariants}
           >
              <motion.div 
                  className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full text-center space-y-4"
                  variants={modalVariants}
              >
                  <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
                      <AlertTriangle size={32} strokeWidth={2.5} />
                  </div>
                  <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-1">
                          Yakin mau keluar?
                      </h2>
                      <p className="text-gray-500">
                          Sesi anda akan berakhir.
                      </p>
                  </div>
                  <div className="pt-4 grid grid-cols-2 gap-3">
                      <button 
                          onClick={() => setIsLogoutOpen(false)}
                          className="py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition active:scale-95"
                      >
                          Batal
                      </button>
                      <button 
                          onClick={handleLogout}
                          className="py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition shadow-lg shadow-red-600/20 active:scale-95"
                      >
                          Ya, Keluar
                      </button>
                  </div>
              </motion.div>
           </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}