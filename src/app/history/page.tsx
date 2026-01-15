"use client";

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Package, Search, Loader2, X, MapPin, Calendar, UserCheck, AlertCircle, User, Tag, Clock } from 'lucide-react'; 
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

export default function HistoryPage() {
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // State Filter Status
  const [activeTab, setActiveTab] = useState<"semua" | "dipinjam" | "pending_return" | "kembali">("semua");
  
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        // Cek Role
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        const adminStatus = profile?.role === 'admin' || profile?.role === 'superuser';
        setIsAdmin(adminStatus);

        // QUERY UPDATED: Menambahkan guest_name agar support input manual
        let query = supabase
          .from('loans')
          .select(`
            id, status, borrow_date, return_date, return_proof_url, loan_category, guest_name,
            profiles:user_id ( full_name, no_induk ),
            admin:assigned_by ( full_name ),
            variants:variant_id ( color, size, location, items:item_id ( name, base_image_url ) )
          `)
          .order('borrow_date', { ascending: false });

        // Jika bukan admin, hanya lihat punya sendiri
        if (!adminStatus) {
          query = query.eq('user_id', user.id);
        }
        
        const { data } = await query;
        setLoans(data || []);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const filteredLoans = loans.filter(l => {
    // Logic Pencarian: Support Nama Member (Profile), Nama Tamu (Guest), dan Nama Barang
    const itemName = l.variants?.items?.name || "";
    const memberName = l.profiles?.full_name || "";
    const guestName = l.guest_name || "";
    
    const matchesSearch = 
        itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guestName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTab = activeTab === "semua" ? true : l.status === activeTab;
    return matchesSearch && matchesTab;
  });

  // Helper Warna Badge
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'dipinjam': return 'bg-blue-100 text-blue-600';
      case 'pending_return': return 'bg-amber-100 text-amber-600';
      case 'kembali': return 'bg-green-100 text-green-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  // Helper Icon
  const getStatusIcon = (status: string) => {
    switch (status) {
        case 'dipinjam': return 'bg-blue-50 text-blue-500';
        case 'pending_return': return 'bg-amber-50 text-amber-500';
        case 'kembali': return 'bg-green-50 text-green-500';
        default: return 'bg-slate-50 text-slate-500';
    }
  };

  // Helper Label
  const getStatusLabel = (status: string) => {
      switch (status) {
          case 'pending_return': return 'Menunggu Verifikasi';
          case 'dipinjam': return 'Sedang Dipinjam';
          case 'kembali': return 'Selesai';
          default: return status;
      }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 font-sans">
      {/* HEADER */}
      <header className="bg-white p-6 sticky top-0 z-20 shadow-sm border-b border-slate-100 space-y-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2 hover:bg-slate-50 rounded-full transition-colors"><ArrowLeft size={24} /></Link>
          <div>
            <h1 className="text-xl font-black text-slate-900 leading-tight">{isAdmin ? "Control Center" : "Riwayat Saya"}</h1>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{isAdmin ? "Aktivitas Semua Transaksi" : "Log Peminjaman Pribadi"}</p>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <input type="text" placeholder={isAdmin ? "Cari member, tamu, atau barang..." : "Cari riwayat barang..."} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-slate-100/50 rounded-2xl border border-transparent focus:border-blue-500/20 focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none text-sm font-medium" />
          <Search className="absolute left-4 top-4 text-slate-400" size={18} />
        </div>
        
        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {[ 
                { id: "semua", label: "Semua", color: "bg-slate-900", text: "text-white" }, 
                { id: "dipinjam", label: "Dipinjam", color: "bg-blue-600", text: "text-white" }, 
                { id: "pending_return", label: "Menunggu", color: "bg-amber-500", text: "text-white" }, 
                { id: "kembali", label: "Kembali", color: "bg-green-600", text: "text-white" } 
            ].map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${activeTab === tab.id ? `${tab.color} ${tab.text} shadow-lg shadow-current/20 scale-105` : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}>{tab.label}</button>
            ))}
        </div>
      </header>

      {/* LIST CONTENT */}
      <main className="p-5 space-y-4">
        {filteredLoans.length > 0 ? (
          filteredLoans.map((loan) => (
            <motion.div layoutId={loan.id} onClick={() => setSelectedLoan(loan)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={loan.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden active:scale-[0.98] transition-transform cursor-pointer">
              
              {/* Badge Status */}
              <div className={`absolute top-0 right-0 px-4 py-2 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest ${getStatusColor(loan.status)}`}>
                  {getStatusLabel(loan.status)}
              </div>

              <div className="flex gap-4">
                {/* Icon Box */}
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${getStatusIcon(loan.status)}`}>
                    <Package size={26} />
                </div>

                <div className="flex-1 pr-12">
                  <h3 className="font-black text-slate-800 tracking-tight leading-tight">{loan.variants?.items?.name}</h3>
                  <p className="text-[11px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">{loan.variants?.color} • SIZE {loan.variants?.size}</p>
                  
                  <div className="mt-4 flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <div className="flex items-center gap-1"><Calendar size={12} />{new Date(loan.borrow_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</div>
                    {isAdmin && (
                        <div className="flex items-center gap-1 text-blue-600">
                            <User size={12} />
                            {/* LOGIC INTEGRASI: Tampilkan Guest Name jika ada, jika tidak pakai Profile Name */}
                            {loan.guest_name ? `${loan.guest_name}` : loan.profiles?.full_name?.split(' ')[0]}
                        </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-20 opacity-30"><AlertCircle className="mx-auto mb-2" size={40} /><p className="font-black text-sm uppercase">Data Tidak Ditemukan</p></div>
        )}
      </main>

      {/* MODAL DETAIL */}
      <AnimatePresence>
        {selectedLoan && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-md p-4" onClick={() => setSelectedLoan(null)}>
            <motion.div layoutId={selectedLoan.id} className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="relative h-48 bg-slate-100 group">
                {/* Logic Foto Bukti */}
                {(selectedLoan.status === 'kembali' || selectedLoan.status === 'pending_return') && selectedLoan.return_proof_url ? (
                  <img src={selectedLoan.return_proof_url} className="w-full h-full object-cover cursor-zoom-in" alt="Bukti Kembali" onClick={() => setZoomedImage(selectedLoan.return_proof_url)} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-300"><Package size={64} /><p className="text-[10px] font-black uppercase mt-2 tracking-widest">Belum Ada Foto Bukti</p></div>
                )}
                <button onClick={() => setSelectedLoan(null)} className="absolute top-4 right-4 p-2 bg-black/20 backdrop-blur-md text-white rounded-full"><X size={20} /></button>
                
                <div className="absolute bottom-4 left-6 pointer-events-none">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-lg ${
                        selectedLoan.status === 'dipinjam' ? 'bg-blue-500' : 
                        selectedLoan.status === 'pending_return' ? 'bg-amber-500' : 'bg-green-500'
                    }`}>
                        {getStatusLabel(selectedLoan.status)}
                    </span>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{selectedLoan.variants?.items?.name}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                        <p className="text-sm font-bold text-blue-600 uppercase tracking-widest">{selectedLoan.variants?.color} • {selectedLoan.variants?.size}</p>
                        {selectedLoan.loan_category && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-wide rounded-md flex items-center gap-1">
                                <Tag size={10} /> {selectedLoan.loan_category}
                            </span>
                        )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Peminjam</p>
                      {/* LOGIC INTEGRASI NAMA */}
                      <p className="text-sm font-bold text-slate-800">
                          {selectedLoan.guest_name || selectedLoan.profiles?.full_name}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400 uppercase">
                          {selectedLoan.guest_name ? "(Manual/Tamu)" : selectedLoan.profiles?.no_induk}
                      </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lokasi Rak</p><div className="flex items-center gap-1 text-slate-800"><MapPin size={14} className="text-red-500" /><p className="text-sm font-bold">{selectedLoan.variants?.location}</p></div></div>
                  {selectedLoan.admin && (
                    <div className="col-span-2 p-4 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
                          <div className="flex items-center gap-2"><UserCheck size={16} className="text-blue-600" /><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Diproses Oleh</p></div>
                          <p className="text-xs font-bold text-slate-900">{selectedLoan.admin.full_name}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs"><span className="font-bold text-slate-400 uppercase tracking-widest">Waktu Pinjam</span><span className="font-black text-slate-800">{new Date(selectedLoan.borrow_date).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
                  {selectedLoan.status === 'kembali' && (
                    <div className="flex items-center justify-between text-xs border-t border-slate-50 pt-3"><span className="font-bold text-slate-400 uppercase tracking-widest">Waktu Kembali</span><span className="font-black text-green-600">{new Date(selectedLoan.return_date).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
                  )}
                  {selectedLoan.status === 'pending_return' && (
                    <div className="flex items-center gap-2 bg-amber-50 p-3 rounded-xl border border-amber-100 text-amber-700 text-xs font-bold">
                        <Clock size={16} /> Menunggu Admin menyetujui pengembalian
                    </div>
                  )}
                </div>
                <button onClick={() => setSelectedLoan(null)} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl active:scale-[0.98] transition-transform text-sm uppercase tracking-widest shadow-xl shadow-slate-900/20">Tutup Detail</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* IMAGE ZOOM MODAL */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setZoomedImage(null)}>
            <button onClick={() => setZoomedImage(null)} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"><X size={32} /></button>
            <motion.img initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} src={zoomedImage} alt="Full Preview" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}