"use client";
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase'; 
import { useRouter } from 'next/navigation';
import { Lock, Mail, User, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast'; 
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true); 
  const [loading, setLoading] = useState(false);
  
  // State Form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(''); 

  const [showSuccess, setShowSuccess] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // --- LOGIKA LOGIN ---
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
            throw error; 
        }
        
        setShowSuccess(true);
      
      } else {
        // --- LOGIKA DAFTAR ---
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authError) throw authError;

        if (authData.user) {
          // Simpan Profil
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([
              { 
                id: authData.user.id,
                full_name: fullName,
                role: 'member'
              }
            ]);
            
          if (profileError) throw new Error("Gagal menyimpan profil: " + profileError.message);

          setShowSuccess(true);
        }
      }

    } catch (error: any) {
      console.error("Login Error:", error.message);
      
      let pesan = "Terjadi kesalahan sistem.";

      if (error.message.includes("Invalid login credentials")) {
        pesan = "Email atau Password salah. Silakan cek lagi.";
      } else if (error.message.includes("User already registered")) {
        pesan = "Email ini sudah terdaftar. Silakan login.";
      } else if (error.message.includes("Password should be at least")) {
        pesan = "Password minimal 6 karakter.";
      }

      toast.error(pesan, {
        duration: 4000,
        style: {
            background: '#FEF2F2',
            color: '#991B1B',
            border: '1px solid #FCA5A5',
            fontWeight: 'bold'
        }
      });

    } finally {
      setLoading(false);
    }
  };

  const handleSuccessRedirect = () => {
    router.push('/dashboard');
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-900 rounded-xl text-white font-bold text-xl mb-4">
          CM
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Portal Pelayanan</h1>
        <p className="text-gray-500 text-sm mt-1">Inventory Creative Ministry</p>
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-gray-200/50 overflow-hidden border border-gray-100">
        
        <div className="flex text-sm font-medium border-b border-gray-100">
          <button 
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-4 text-center transition ${isLogin ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Masuk
          </button>
          <button 
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-4 text-center transition ${!isLogin ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Daftar Akun
          </button>
        </div>

        <div className="p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6">
            {isLogin ? 'Selamat Datang Kembali!' : 'Gabung Tim Pelayanan'}
          </h2>

          <form onSubmit={handleAuth} className="space-y-4">
            
            {!isLogin && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 ml-1">Nama Lengkap</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 text-gray-400" size={20} />
                  <input 
                    type="text" 
                    required 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Contoh: Sarah Debora"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 text-gray-400" size={20} />
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@contoh.com"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 text-gray-400" size={20} />
                <input 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  minLength={6}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-900 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 active:scale-95 transition-transform flex items-center justify-center gap-2 mt-4 hover:bg-blue-800"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Masuk Sekarang' : 'Daftar Sekarang'}
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
      
      <p className="mt-8 text-gray-400 text-sm">
        &copy; 2026 GPdI Resinda Inventory
      </p>

      {/* MODAL SUKSES */}
      <AnimatePresence>
        {showSuccess && (
           <motion.div 
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              initial="hidden" animate="visible" exit="hidden" variants={backdropVariants}
           >
              <motion.div 
                  className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full text-center space-y-4"
                  variants={modalVariants}
              >
                  <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 animate-bounce">
                      <CheckCircle size={40} strokeWidth={3} />
                  </div>
                  <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-1">
                          {isLogin ? 'Login Berhasil!' : 'Pendaftaran Sukses!'}
                      </h2>
                      <p className="text-gray-500">
                          {isLogin 
                            ? 'Selamat melayani kembali.' 
                            : 'Nomor Induk Anda (CM-XXX) sedang digenerate oleh sistem.'}
                      </p>
                  </div>
                  <div className="pt-4">
                      <button 
                          onClick={handleSuccessRedirect}
                          className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-lg active:scale-95"
                      >
                          Masuk Dashboard
                      </button>
                  </div>
              </motion.div>
           </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}