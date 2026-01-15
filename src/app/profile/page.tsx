"use client";

import React, { useState, useEffect } from 'react';
import { 
  User, Camera, Save, ArrowLeft, Loader2, 
  Lock, Eye, EyeOff, ShieldCheck, Phone, Hash 
} from 'lucide-react';
import Link from 'next/link'; // Import Link
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Data Profil
  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);

  // State Password Baru
  const [showPasswordMenu, setShowPasswordMenu] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordText, setShowPasswordText] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        setProfile(data);
        setFullName(data.full_name || "");
        setPhone(data.phone_number || "");
        setAvatarUrl(data.avatar_url || "");
      } catch (error: any) {
        toast.error("Gagal memuat profil");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [router]);

  // Handler Ganti Foto
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setPreviewAvatar(URL.createObjectURL(file));
  };

  // Fungsi Upload
  const uploadAvatar = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `avatar_${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('items').upload(`avatars/${fileName}`, file);
    if (error) throw error;
    const { data } = supabase.storage.from('items').getPublicUrl(`avatars/${fileName}`);
    return data.publicUrl;
  };

  // Handler Simpan
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const toastId = toast.loading("Menyimpan perubahan...");

    try {
      // 1. Cek Password (Jika diisi)
      if (showPasswordMenu && newPassword) {
        if (newPassword.length < 6) throw new Error("Password minimal 6 karakter");
        if (newPassword !== confirmPassword) throw new Error("Konfirmasi password tidak cocok");
        
        const { error: passError } = await supabase.auth.updateUser({ password: newPassword });
        if (passError) throw passError;
      }

      // 2. Upload Foto (Jika ada)
      let finalAvatarUrl = avatarUrl;
      if (avatarFile) {
        finalAvatarUrl = await uploadAvatar(avatarFile);
      }

      // 3. Update Profil
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone_number: phone,
          avatar_url: finalAvatarUrl,
        })
        .eq('id', profile.id);

      if (profileError) throw profileError;

      toast.success("Profil berhasil diperbarui!", { id: toastId });
      
      // Reset Form Password
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordMenu(false);

      // --- PERBAIKAN REDIRECT ---
      router.refresh(); // Refresh data halaman dashboard sebelum pindah
      setTimeout(() => {
        router.push('/dashboard');
      }, 500); 

    } catch (error: any) {
      toast.error(error.message || "Gagal menyimpan", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      
      {/* Header Back */}
      <div className="p-6 sticky top-0 z-20">
        {/* --- PERBAIKAN: MENGGUNAKAN LINK (PASTI BERJALAN) --- */}
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-sm transition-colors active:scale-95"
        >
           <ArrowLeft size={18} /> Kembali
        </Link>
      </div>

      <main className="max-w-md mx-auto px-6">
        <form onSubmit={handleSave} className="space-y-8">
          
          {/* --- FOTO PROFIL --- */}
          <div className="flex flex-col items-center">
            <div className="relative group">
              <div className="w-28 h-28 bg-blue-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-xl shadow-blue-500/20 overflow-hidden border-4 border-white">
                {previewAvatar || avatarUrl ? (
                  <img src={previewAvatar || avatarUrl} className="w-full h-full object-cover" alt="Avatar" />
                ) : (
                  <User size={48} strokeWidth={1.5} />
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 bg-slate-900 text-white p-2.5 rounded-xl cursor-pointer shadow-lg hover:scale-110 transition-transform active:scale-95">
                <Camera size={16} />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
            </div>

            <div className="mt-4 text-center">
              <h2 className="text-xl font-black text-slate-900">{fullName || "User"}</h2>
              <span className="inline-block mt-1 px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-lg">
                {profile?.role || "MEMBER"}
              </span>
            </div>
          </div>

          {/* --- FORM DATA --- */}
          <div className="space-y-5">
            
            {/* Nama Lengkap */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
              <div className="relative group">
                 <User className="absolute left-4 top-3.5 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                 <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
                 />
              </div>
            </div>

            {/* WhatsApp */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">No. WhatsApp</label>
              <div className="relative group">
                 <Phone className="absolute left-4 top-3.5 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                 <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
                 />
              </div>
            </div>

            {/* ID Induk (Read Only) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">No. Induk / ID</label>
              <div className="relative">
                 <Hash className="absolute left-4 top-3.5 text-slate-300" size={20} />
                 <input 
                    type="text" 
                    value={profile?.no_induk || "-"}
                    disabled
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-400 cursor-not-allowed"
                 />
              </div>
            </div>

            {/* --- MENU GANTI PASSWORD (ACCORDION) --- */}
            <div className="pt-2">
                <button 
                  type="button"
                  onClick={() => setShowPasswordMenu(!showPasswordMenu)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border ${showPasswordMenu ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50 shadow-sm'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl transition-colors ${showPasswordMenu ? 'bg-white text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                           <ShieldCheck size={20} />
                        </div>
                        <span className="font-bold text-sm">Ganti Password</span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-50">{showPasswordMenu ? 'Batal' : 'Edit'}</span>
                </button>

                <AnimatePresence>
                  {showPasswordMenu && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                          <div className="mt-3 p-5 bg-white border border-slate-200 rounded-[1.5rem] space-y-4 shadow-sm">
                               <div className="space-y-1.5">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password Baru</label>
                                  <div className="relative group">
                                      <Lock className="absolute left-4 top-3.5 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                                      <input 
                                          type={showPasswordText ? "text" : "password"}
                                          value={newPassword}
                                          onChange={(e) => setNewPassword(e.target.value)}
                                          placeholder="Min. 6 karakter"
                                          className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none transition-all text-sm focus:ring-4 focus:ring-blue-500/10"
                                      />
                                      <button 
                                          type="button" 
                                          onClick={() => setShowPasswordText(!showPasswordText)}
                                          className="absolute right-3 top-3 text-slate-400 hover:text-blue-600 transition-colors"
                                      >
                                          {showPasswordText ? <EyeOff size={18} /> : <Eye size={18} />}
                                      </button>
                                  </div>
                               </div>

                               <div className="space-y-1.5">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Konfirmasi Password</label>
                                  <div className="relative group">
                                      <Lock className="absolute left-4 top-3.5 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                                      <input 
                                          type={showPasswordText ? "text" : "password"}
                                          value={confirmPassword}
                                          onChange={(e) => setConfirmPassword(e.target.value)}
                                          placeholder="Ketik ulang password"
                                          className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none transition-all text-sm focus:ring-4 focus:ring-blue-500/10"
                                      />
                                  </div>
                               </div>
                          </div>
                      </motion.div>
                  )}
                </AnimatePresence>
            </div>

          </div>

          {/* Tombol Simpan */}
          <button 
            type="submit" 
            disabled={saving}
            className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20 active:scale-[0.98] transition-all hover:bg-slate-800"
          >
            {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
            Simpan Perubahan
          </button>
          
        </form>
      </main>
    </div>
  );
}