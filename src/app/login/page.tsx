"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Phone, ArrowRight, Loader2, Delete, ChevronLeft, Lock, UserCheck, ShieldCheck, ShieldAlert } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  
  // State
  const [step, setStep] = useState<'phone' | 'pin'>('phone');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuperUserMode, setIsSuperUserMode] = useState(false); // Mode UI Superuser

  // --- LOGIC STEP 1: CEK NO HP & LOCKDOWN ---
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanPhone = phone.replace(/\D/g, '');
    const isSpecialID = cleanPhone === '01010202'; // ID The Architect

    // Validasi Format (Jika bukan Special ID)
    if (!isSpecialID && cleanPhone.length < 10) {
      toast.error("Nomor HP terlalu pendek");
      return;
    }

    setLoading(true);

    try {
      // 1. CEK STATUS LOCKDOWN ( MAINTENANCE )
      if (!isSpecialID) {
        const { data: setting } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'maintenance_mode')
            .single();

        if (setting?.value === 'true') {
            toast.error("SISTEM SEDANG MAINTENANCE/LOCKDOWN. Silakan coba lagi nanti.", {
                icon: <ShieldAlert className="text-red-500"/>,
                style: { border: '1px solid #ef4444', color: '#b91c1c' },
                duration: 5000
            });
            setLoading(false);
            return; // STOP PROSES DISINI
        }
      }

      // 2. Format ke Dummy Email
      let formattedPhone = cleanPhone;
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '62' + formattedPhone.slice(1);
      }
      const dummyEmail = `${formattedPhone}@cm.local`;

      // 3. Cek User via RPC
      const { data: isExists, error } = await supabase.rpc('check_user_exists', {
        email_check: dummyEmail
      });

      if (error) throw error;

      if (isExists) {
        // Deteksi Superuser untuk efek visual
        if (isSpecialID) {
            setIsSuperUserMode(true);
            toast.success("Identity Confirmed: The Architect", { 
                icon: '🕶️', 
                style: { background: '#0f172a', color: '#fff' } 
            });
        } else {
            toast.dismiss(); // Bersihkan toast sebelumnya
        }
        setStep('pin');
      } else {
        toast.error("Nomor ini belum terdaftar. Silakan daftar dulu.", { 
          icon: '🚫', duration: 4000 
        });
      }

    } catch (err: any) {
      console.error(err);
      toast.error("Gagal mengecek nomor. Pastikan koneksi aman.");
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIC STEP 2: NUMPAD & LOGIN ---
  const handleNumpadClick = (value: string) => {
    if (loading) return;
    if (value === 'del') {
      setPin((prev) => prev.slice(0, -1));
    } else {
      if (pin.length < 6) {
        setPin((prev) => prev + value);
      }
    }
  };

  // Auto-Login saat PIN genap 6 digit
  useEffect(() => {
    if (pin.length === 6) {
      executeLogin();
    }
  }, [pin]);

  const executeLogin = async () => {
    setLoading(true);
    // Gunakan ID agar toast tidak menumpuk
    const toastId = toast.loading(isSuperUserMode ? "Accessing Mainframe..." : "Memverifikasi PIN...", { id: 'login-process' });

    try {
      let formattedPhone = phone.replace(/\D/g, '');
      if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.slice(1);
      const dummyEmail = `${formattedPhone}@cm.local`;

      const { error } = await supabase.auth.signInWithPassword({
        email: dummyEmail,
        password: pin,
      });

      if (error) throw error;

      // Sukses
      toast.success(isSuperUserMode ? "Access Granted." : "Login Berhasil!", { id: toastId });
      
      // Routing & Refresh Cache (Fix Notif Nyangkut)
      if (isSuperUserMode) {
          router.replace('/superuser');
      } else {
          router.replace('/dashboard');
      }
      
      // PENTING: Paksa refresh agar state auth di dashboard diperbarui
      router.refresh(); 

    } catch (error: any) {
      console.error(error);
      toast.error("PIN Salah!", { id: toastId });
      setPin(''); 
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 font-sans overflow-hidden transition-colors duration-500 ${isSuperUserMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <Toaster position="top-center" />
      
      <div className={`w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden relative min-h-[600px] flex flex-col transition-all duration-500 ${isSuperUserMode ? 'bg-slate-800 border border-slate-700 shadow-blue-900/20' : 'bg-white border border-slate-100'}`}>
        
        {/* HEADER */}
        <div className={`p-8 text-center relative shrink-0 transition-colors duration-500 ${isSuperUserMode ? 'bg-red-900/20' : 'bg-blue-600'}`}>
          {!isSuperUserMode && <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-black/10"></div>}
          <div className={`w-16 h-16 backdrop-blur-md rounded-2xl mx-auto flex items-center justify-center text-3xl mb-3 shadow-lg border transition-all duration-500 ${isSuperUserMode ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-white/20 border-white/30 text-white'}`}>
            {isSuperUserMode ? <ShieldCheck size={32}/> : '📦'}
          </div>
          <h1 className={`text-xl font-black tracking-tight relative z-10 transition-colors duration-500 ${isSuperUserMode ? 'text-red-500' : 'text-white'}`}>
            {isSuperUserMode ? 'SYSTEM OVERRIDE' : 'Creative Ministry'}
          </h1>
          <p className={`text-[10px] font-medium relative z-10 mt-1 uppercase tracking-widest ${isSuperUserMode ? 'text-red-400' : 'text-blue-100'}`}>
            {isSuperUserMode ? 'Superuser Access' : 'Inventory System'}
          </p>
        </div>

        {/* CONTENT */}
        <div className="flex-1 relative">
          <AnimatePresence mode="wait">
            {step === 'phone' && (
              <motion.div key="phone-screen" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="p-8 flex flex-col justify-center h-full">
                <form onSubmit={handlePhoneSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">No. Handphone / WhatsApp</label>
                    <div className="relative group">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Contoh: 0812..." className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-300 text-lg" autoFocus />
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-600/30 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:bg-slate-300 disabled:shadow-none">
                    {loading ? <Loader2 className="animate-spin" /> : <>LANJUT <ArrowRight size={20}/></>}
                  </button>
                </form>
                <div className="mt-8 text-center pb-4">
                  <p className="text-xs text-slate-400">Belum punya akun?</p>
                  <Link href="/register" className="text-xs font-bold text-blue-600 mt-1 cursor-pointer hover:underline block p-2">Daftar Akun Baru</Link>
                </div>
              </motion.div>
            )}

            {step === 'pin' && (
              <motion.div key="pin-screen" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} className={`flex flex-col h-full ${isSuperUserMode ? 'text-white' : 'text-slate-800'}`}>
                <div className="px-6 pt-6">
                  <button onClick={() => { setStep('phone'); setIsSuperUserMode(false); }} className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"><ChevronLeft size={16}/> Kembali</button>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center mb-4">
                  <div className="flex flex-col items-center mb-6">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-colors duration-500 ${isSuperUserMode ? 'bg-red-500/10 text-red-500' : 'bg-blue-50 text-blue-600'}`}>
                        {isSuperUserMode ? <Lock size={24}/> : <UserCheck size={24}/>}
                    </div>
                    <h2 className={`text-lg font-black ${isSuperUserMode ? 'text-white' : 'text-slate-800'}`}>{isSuperUserMode ? 'Security Clearance' : 'Masukkan PIN'}</h2>
                    <p className="text-sm text-slate-400 font-medium tracking-widest">{phone}</p>
                  </div>
                  <div className="flex gap-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className={`w-4 h-4 rounded-full transition-all duration-200 ${i < pin.length ? (isSuperUserMode ? 'bg-red-500 scale-125 shadow-[0_0_10px_red]' : 'bg-blue-600 scale-125 shadow-lg') : 'bg-slate-200/50'}`}/>
                    ))}
                  </div>
                </div>
                <div className={`p-6 pb-8 rounded-t-[2.5rem] shadow-inner border-t transition-colors duration-500 ${isSuperUserMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="grid grid-cols-3 gap-4 max-w-[280px] mx-auto">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num) => (
                      <button key={num} onClick={() => handleNumpadClick(num.toString())} disabled={loading} className={`h-16 rounded-2xl shadow-sm text-2xl font-bold active:scale-95 transition-all ${num === 0 ? 'col-start-2' : ''} ${isSuperUserMode ? 'bg-slate-800 text-white border border-slate-700 hover:bg-slate-700 active:bg-red-900' : 'bg-white border-b-4 border-slate-200 text-slate-700 active:border-b-0 active:translate-y-1 hover:bg-slate-50'}`}>{num}</button>
                    ))}
                    <button onClick={() => handleNumpadClick('del')} disabled={loading} className="h-16 rounded-2xl bg-transparent text-slate-400 flex items-center justify-center active:scale-95 transition-all hover:text-red-500 col-start-3 row-start-4"><Delete size={28}/></button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}