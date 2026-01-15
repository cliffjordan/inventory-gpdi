import React from 'react';
import { ArrowRight, LogIn } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 flex flex-col">
      
      {/* 1. NAVBAR */}
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center text-white font-bold">
                CM
              </div>
              <span className="font-bold text-xl tracking-tight text-blue-900">
                Inventory GPdI
              </span>
            </div>
            
            {/* Tombol Login Admin */}
            <Link href="/login" className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-gray-600 hover:text-blue-900 hover:bg-blue-50 rounded-full transition-all">
              <LogIn size={16} />
              Login Admin
            </Link>
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <section className="flex-1 flex items-center justify-center pt-20 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          
          <span className="inline-block py-1 px-3 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold tracking-wide mb-6">
            Sistem Manajemen Aset
          </span>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 tracking-tight mb-8 leading-tight">
            Melayani Tuhan dengan <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Keteraturan
            </span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-xl text-gray-600 mb-12 leading-relaxed">
            Sistem Self-Service khusus divisi <strong>Tari & Kostum</strong>. <br/>
            Cek ketersediaan, lokasi barang, ambil, dan kembalikan dengan mudah.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/login" className="px-10 py-4 rounded-full bg-blue-600 text-white text-lg font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-xl shadow-blue-600/20 active:scale-95">
              Mulai Akses
              <ArrowRight size={20} />
            </Link>
          </div>
          
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-6 text-center text-gray-400 text-sm">
        &copy; 2026 Creative Ministry GPdI Resinda
      </footer>

    </div>
  );
}