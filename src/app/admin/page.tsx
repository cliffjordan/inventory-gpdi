"use client";

import React from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Edit3, 
  Trash2, 
  ChevronRight, 
  Database,
  ClipboardCheck,
  ArrowRightLeft // [BARU] Import Icon untuk Migrasi
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-10">
      {/* Header Utama */}
      <header className="bg-white p-6 sticky top-0 z-10 shadow-sm border-b border-slate-100 flex items-center gap-4">
        <Link href="/dashboard" className="p-2 hover:bg-slate-50 rounded-full transition-colors">
          <ArrowLeft size={24} className="text-slate-600" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-slate-900 leading-tight">Manajemen Inventaris</h1>
          <p className="text-xs text-slate-400 font-medium">Pusat kendali database & member</p>
        </div>
      </header>

      <main className="p-6 max-w-lg mx-auto space-y-4">
        
        {/* Menu 0: Verifikasi Pengembalian */}
        <Link 
          href="/admin/approvals" 
          className="p-6 bg-white rounded-[2.5rem] border border-emerald-100 flex items-center gap-5 hover:bg-emerald-50 transition-all shadow-sm group"
        >
          <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-inner">
            <ClipboardCheck size={28} strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <h3 className="font-black text-slate-900 text-lg leading-tight">Verifikasi Pengembalian</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-1">Cek bukti foto & setujui pengembalian</p>
          </div>
          <ChevronRight size={20} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
        </Link>

        {/* Menu 1: Tambah Item Baru */}
        <Link 
          href="/admin/add" 
          className="p-6 bg-white rounded-[2.5rem] border border-blue-100 flex items-center gap-5 hover:bg-blue-50 transition-all shadow-sm group"
        >
          <div className="p-4 bg-blue-50 rounded-2xl text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all shadow-inner">
            <Plus size={28} strokeWidth={3} />
          </div>
          <div className="flex-1">
            <h3 className="font-black text-slate-900 text-lg leading-tight">Tambah Item Baru</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-1">Input stok, warna, dan ukuran baru</p>
          </div>
          <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
        </Link>

        {/* Menu 2: Edit / Update Aset */}
        <Link 
          href="/admin/edit" 
          className="p-6 bg-white rounded-[2.5rem] border border-amber-100 flex items-center gap-5 hover:bg-amber-50 transition-all shadow-sm group"
        >
          <div className="p-4 bg-amber-50 rounded-2xl text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all shadow-inner">
            <Edit3 size={28} />
          </div>
          <div className="flex-1">
            <h3 className="font-black text-slate-900 text-lg leading-tight">Edit / Update Aset</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-1">Ubah nama, kategori, atau lokasi barang</p>
          </div>
          <ChevronRight size={20} className="text-slate-300 group-hover:text-amber-500 transition-colors" />
        </Link>

        {/* Menu 3: Hapus / Musnahkan Item */}
        <Link 
          href="/admin/delete" 
          className="p-6 bg-white rounded-[2.5rem] border border-red-100 flex items-center gap-5 hover:bg-red-50 transition-all shadow-sm group"
        >
          <div className="p-4 bg-red-50 rounded-2xl text-red-500 group-hover:bg-red-500 group-hover:text-white transition-all shadow-inner">
            <Trash2 size={28} />
          </div>
          <div className="flex-1">
            <h3 className="font-black text-slate-900 text-lg leading-tight">Hapus / Musnahkan Item</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-1">Hapus permanen aset yang rusak</p>
          </div>
          <ChevronRight size={20} className="text-slate-300 group-hover:text-red-500 transition-colors" />
        </Link>

        {/* [BARU] Menu 4: Migrasi Akun (Fitur Spesial) */}
        <Link 
          href="/admin/migration" 
          className="p-6 bg-white rounded-[2.5rem] border border-violet-100 flex items-center gap-5 hover:bg-violet-50 transition-all shadow-sm group"
        >
          <div className="p-4 bg-violet-50 rounded-2xl text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-all shadow-inner">
            <ArrowRightLeft size={28} strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
                <h3 className="font-black text-slate-900 text-lg leading-tight">Migrasi Akun</h3>
                <span className="bg-violet-100 text-violet-700 text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wide">Baru</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Pindahkan history member offline ke online</p>
          </div>
          <ChevronRight size={20} className="text-slate-300 group-hover:text-violet-600 transition-colors" />
        </Link>

        {/* Info Statistik Singkat */}
        <div className="mt-8 p-6 bg-slate-900 rounded-[2.5rem] text-white flex items-center justify-between overflow-hidden relative shadow-xl shadow-slate-200">
          <div className="relative z-10">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Database Status</p>
            <h4 className="text-2xl font-black mt-1 tracking-tighter">Sistem Aktif</h4>
            <div className="flex items-center gap-2 mt-2">
               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
               <span className="text-[10px] font-bold text-slate-300">Tersinkronisasi dengan Supabase</span>
            </div>
          </div>
          <Database size={80} className="absolute -right-4 -bottom-4 text-white/5 rotate-12" />
        </div>
      </main>
    </div>
  );  
}