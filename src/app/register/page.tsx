"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Phone, User, Lock, ArrowRight, Loader2, ChevronLeft, CheckCircle2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    pin: '',
    confirmPin: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // --- 1. VALIDASI INPUT ---
    if (!formData.fullName || !formData.phone || !formData.pin) {
      toast.error("Semua kolom wajib diisi!");
      return;
    }
    if (formData.pin.length !== 6) {
      toast.error("PIN harus 6 digit angka!");
      return;
    }
    if (formData.pin !== formData.confirmPin) {
      toast.error("Konfirmasi PIN tidak cocok!");
      return;
    }

    setLoading(true);

    try {
      // --- 2. FORMAT DATA ---
      // Format No HP (08xx -> 628xx)
      let cleanPhone = formData.phone.replace(/\D/g, '');
      if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
      
      const dummyEmail = `${cleanPhone}@cm.local`;

      // --- 3. CEK APAKAH SUDAH ADA (Pakai RPC yang kemarin kita buat) ---
      const { data: isExists } = await supabase.rpc('check_user_exists', { email_check: dummyEmail });
      if (isExists) {
        toast.error("Nomor HP ini sudah terdaftar!");
        setLoading(false);
        return;
      }

      // --- 4. SIGN UP KE SUPABASE ---
      // Kita kirim metadata (nama & hp) agar Trigger SQL bisa menangkapnya
      const { error } = await supabase.auth.signUp({
        email: dummyEmail,
        password: formData.pin,
        options: {
          data: {
            full_name: formData.fullName,
            phone_number: cleanPhone
          }
        }
      });

      if (error) throw error;

      // --- 5. SUKSES ---
      toast.success("Pendaftaran Berhasil! Silakan Login.");
      
      // Delay sedikit agar user baca notifikasi
      setTimeout(() => {
        router.push('/login');
      }, 1500);

    } catch (error: any) {
      console.error(error);
      toast.error("Gagal mendaftar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <Toaster position="top-center" />
      
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden relative">
        
        {/* HEADER */}
        <div className="bg-blue-600 p-8 pt-10 pb-6 relative text-white">
           <Link href="/login" className="absolute top-6 left-6 p-2 bg-white/20 rounded-full hover:bg-white/30 transition">
             <ChevronLeft size={20}/>
           </Link>
           <h1 className="text-2xl font-black mb-1">Daftar Akun</h1>
           <p className="text-blue-100 text-xs">Bergabung dengan Creative Ministry</p>
        </div>

        {/* FORM */}
        <div className="p-8">
          <form onSubmit={handleRegister} className="space-y-4">
            
            {/* Nama Lengkap */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nama Lengkap</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  name="fullName"
                  type="text" 
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Misal: Jordan S" 
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm"
                />
              </div>
            </div>

            {/* No HP */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">No. WhatsApp</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  name="phone"
                  type="tel" 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\D/g,'')})}
                  placeholder="0812..." 
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* PIN */}
                <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Buat PIN (6 Angka)</label>
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                    name="pin"
                    type="password" 
                    maxLength={6}
                    value={formData.pin}
                    onChange={(e) => setFormData({...formData, pin: e.target.value.replace(/\D/g,'')})}
                    placeholder="******" 
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm tracking-widest"
                    />
                </div>
                </div>

                {/* Confirm PIN */}
                <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Ulangi PIN</label>
                <div className="relative">
                    <CheckCircle2 className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${formData.confirmPin && formData.pin === formData.confirmPin ? 'text-green-500' : 'text-slate-400'}`} size={18} />
                    <input 
                    name="confirmPin"
                    type="password" 
                    maxLength={6}
                    value={formData.confirmPin}
                    onChange={(e) => setFormData({...formData, confirmPin: e.target.value.replace(/\D/g,'')})}
                    placeholder="******" 
                    className={`w-full pl-11 pr-4 py-3.5 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none focus:ring-4 transition-all text-sm tracking-widest ${formData.confirmPin && formData.pin !== formData.confirmPin ? 'border-red-200 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'}`}
                    />
                </div>
                </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-blue-600 text-white font-black rounded-xl shadow-xl shadow-blue-600/30 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : <>DAFTAR SEKARANG <ArrowRight size={18}/></>}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}