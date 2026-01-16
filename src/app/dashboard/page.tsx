"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Clock, User, Package, LogOut, AlertTriangle, ChevronRight, 
  History, Loader2, Box, ArrowDownCircle, ArrowUpCircle, 
  AlertCircle, X, MapPin, UserCheck, Menu, Lock, 
  Edit3, Camera, Save, Eye, EyeOff, Phone, ZoomIn, MessageCircle, 
  ChevronLeft, ScanLine, CalendarCheck, ArrowUpRight, ArrowDownLeft, XCircle,
  Database, ListChecks, BarChart3, Users, Layers, Activity, Megaphone,
  Trash2, Archive 
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase'; 
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import imageCompression from 'browser-image-compression';
import FloatingCart from '@/components/FloatingCart';
import { useCart } from '@/context/CartContext'; 

export default function DashboardPage() {
  const router = useRouter();
  const { cart, clearCart } = useCart();
  
  const [profile, setProfile] = useState<any>(null);
  const [allLoans, setAllLoans] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]); 
  const [stats, setStats] = useState({ 
    active: 0, pending: 0, late: 0, 
    myActive: 0, myPending: 0, myLate: 0,
    totalItems: 0, todayAttendance: 0 
  });
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false); 
  const [isCartWarningOpen, setIsCartWarningOpen] = useState(false); 
  const [currentSlide, setCurrentSlide] = useState(0); 
  
  const [selectedLoan, setSelectedLoan] = useState<any>(null); 
  const [statModalType, setStatModalType] = useState<'active' | 'pending' | 'late' | null>(null);
  const [showScanOption, setShowScanOption] = useState(false); 
  const [showAttendanceOption, setShowAttendanceOption] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAvatar, setEditAvatar] = useState<File | null>(null);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (!authUser) { router.replace('/login'); return; }
  
          const { data: profileData } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
          setProfile(profileData);
          setEditName(profileData?.full_name || "");
          setEditPhone(profileData?.phone_number || "");
  
          const { data: ann } = await supabase.from('announcements').select('message').eq('is_active', true).single();
          if (ann) setAnnouncement(ann.message);
  
          const { data: loansData } = await supabase.from('loans').select(`id, status, borrow_date, loan_category, profiles:user_id(full_name, no_induk, phone_number), admin:assigned_by(full_name), variants:variant_id(color, size, location, items:item_id(name, base_image_url, category))`).in('status', ['dipinjam', 'pending_return']).order('borrow_date', { ascending: false });
          
          const { data: memberData } = await supabase.from('profiles').select('*').eq('role', 'member').order('full_name');
          setMembers(memberData || []);
  
          const { count: itemsCount } = await supabase.from('items').select('*', { count: 'exact', head: true });
  
          const today = new Date().toISOString().split('T')[0];
          const { count: attendanceCount } = await supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', today).eq('status', 'hadir');
  
          if (loansData) {
            setAllLoans(loansData);
            const active = loansData.filter(l => l.status === 'dipinjam').length;
            const pending = loansData.filter(l => l.status === 'pending_return').length;
            const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const late = loansData.filter(l => l.status === 'dipinjam' && new Date(l.borrow_date) < sevenDaysAgo).length;
  
            const myData = loansData.filter(l => (l.profiles as any)?.no_induk === profileData?.no_induk);
            
            const myActive = myData.filter(l => l.status === 'dipinjam').length;
            const myPending = myData.filter(l => l.status === 'pending_return').length;
            const myLate = myData.filter(l => l.status === 'dipinjam' && new Date(l.borrow_date) < sevenDaysAgo).length;
  
            setStats({ 
              active, pending, late, myActive, myPending, myLate,
              totalItems: itemsCount || 0,
              todayAttendance: attendanceCount || 0
            });
          }
        } catch (error) { console.error("Error:", error); } 
        finally { setLoading(false); }
      };
      fetchData();
  }, [router]);

  const getModalListData = () => {
    if (!statModalType) return [];
    let data = profile?.role === 'admin' ? allLoans : allLoans.filter(l => (l.profiles as any)?.no_induk === profile?.no_induk);
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    switch (statModalType) {
      case 'active': return data.filter(l => l.status === 'dipinjam');
      case 'pending': return data.filter(l => l.status === 'pending_return');
      case 'late': return data.filter(l => l.status === 'dipinjam' && new Date(l.borrow_date) < sevenDaysAgo);
      default: return [];
    }
  };

  const getModalTitle = () => {
    switch (statModalType) {
      case 'active': return "Sedang Dipinjam";
      case 'pending': return "Menunggu Persetujuan";
      case 'late': return "Telat Kembali";
      default: return "";
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length > 2) {
      const { data } = await supabase.from('items').select('*').ilike('name', `%${query}%`).limit(5);
      setSearchResults(data || []);
    } else { setSearchResults([]); }
  };

  const handleLogoutClick = () => {
    if (cart.length > 0) {
      setIsCartWarningOpen(true);
    } else {
      setIsLogoutConfirmOpen(true);
    }
  };

  const executeLogout = async (action: 'clear' | 'keep') => {
    const toastId = toast.loading("Sedang memproses...", { id: 'logout-process' });
    try {
        if (action === 'clear') clearCart(); 
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        toast.success("Logout berhasil", { id: toastId });
        router.replace('/login');
        router.refresh(); 
    } catch (err: any) {
        toast.error("Gagal logout: " + err.message, { id: toastId });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files[0]) { const file = e.target.files[0]; const reader = new FileReader(); reader.onload = () => { setCropImageSrc(reader.result as string); setShowCropModal(true); setZoom(1); setPan({ x: 0, y: 0 }); }; reader.readAsDataURL(file); } };
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => { e.preventDefault(); setIsDragging(true); const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX; const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY; setDragStart({ x: clientX - pan.x, y: clientY - pan.y }); };
  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => { if (!isDragging) return; const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX; const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY; setPan({ x: clientX - dragStart.x, y: clientY - dragStart.y }); };
  const handleMouseUp = () => setIsDragging(false);
  const getCroppedImg = async () => { if (!imageRef.current || !containerRef.current) return; try { const image = imageRef.current; const canvas = document.createElement('canvas'); const outputSize = 500; canvas.width = outputSize; canvas.height = outputSize; const ctx = canvas.getContext('2d'); if (!ctx) return; const visualSize = containerRef.current.offsetWidth; const scaleRatio = outputSize / visualSize; ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, outputSize, outputSize); ctx.translate(outputSize / 2, outputSize / 2); ctx.scale(zoom, zoom); ctx.translate(pan.x * scaleRatio, pan.y * scaleRatio); const drawWidth = outputSize; const drawHeight = (image.naturalHeight / image.naturalWidth) * outputSize; ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight); canvas.toBlob(async (blob) => { if (blob) { const compressedFile = await imageCompression(new File([blob], "avatar.jpg", { type: "image/jpeg" }), { maxSizeMB: 0.2, maxWidthOrHeight: 500, useWebWorker: true }); setEditAvatar(compressedFile); setPreviewAvatar(URL.createObjectURL(compressedFile)); setShowCropModal(false); toast.success("Foto berhasil diatur!"); } }, 'image/jpeg', 0.9); } catch (e) { console.error(e); toast.error("Gagal memotong gambar"); } };
  const handleUpdateProfile = async () => { setIsUpdatingProfile(true); const toastId = toast.loading("Menyimpan profil..."); try { let finalAvatarUrl = profile.avatar_url; if (editAvatar) { const fileName = `avatar_${profile.id}_${Date.now()}.jpg`; const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, editAvatar, { upsert: true }); if (uploadError) throw new Error("Gagal upload"); const { data } = supabase.storage.from('avatars').getPublicUrl(fileName); finalAvatarUrl = data.publicUrl; } const { error: updateError } = await supabase.from('profiles').update({ full_name: editName, phone_number: editPhone, avatar_url: finalAvatarUrl }).eq('id', profile.id); if (updateError) throw new Error(updateError.message); setProfile({ ...profile, full_name: editName, phone_number: editPhone, avatar_url: finalAvatarUrl }); toast.success("Berhasil disimpan!", { id: toastId }); setShowProfileModal(false); setEditAvatar(null); } catch (error: any) { toast.error(error.message, { id: toastId }); } finally { setIsUpdatingProfile(false); } };
  const handleChangePassword = async () => { if (newPassword !== confirmPassword) { toast.error("Password tidak sama!"); return; } if (newPassword.length < 6) { toast.error("Minimal 6 karakter!"); return; } setIsUpdatingPass(true); try { const { error } = await supabase.auth.updateUser({ password: newPassword }); if (error) throw error; toast.success("Password berhasil diganti!"); setShowPasswordModal(false); setNewPassword(""); setConfirmPassword(""); } catch (error: any) { toast.error("Gagal: " + error.message); } finally { setIsUpdatingPass(false); } };
  const handleWhatsAppReminder = (e: React.MouseEvent, loan: any) => { e.stopPropagation(); const phoneNumber = loan.profiles?.phone_number; if (!phoneNumber) { toast.error("Nomor HP tidak tersedia."); return; } let formattedPhone = phoneNumber.replace(/\D/g, ''); if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.slice(1); const message = `Halo Kak ${loan.profiles?.full_name?.split(' ')[0]} (Creative Ministry) 👋 %0A%0AKami ingin mengingatkan bahwa barang:%0A 📦 *${loan.variants?.items?.name}* (${loan.variants?.color}, ${loan.variants?.size})%0A%0ATelah dipinjam sejak: ${new Date(loan.borrow_date).toLocaleDateString('id-ID')}.%0A%0AMohon segera dikembalikan ke gudang ya kak. Terima kasih! 🙏`; window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank'); };


  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin" size={40} /></div>;

  return (
    // [FIX] EXTRA LARGE PADDING BOTTOM (pb-48) to clear floating elements
    <div className="min-h-[100dvh] pb-48 font-sans text-slate-800 bg-slate-50 overflow-x-hidden">
      
      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-md px-6 py-6 border-b border-slate-100 sticky top-0 z-30 shadow-sm">
        <div className="flex justify-between items-center mb-5">
           <div>
             <p className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-1">Creative Ministry</p>
             <h1 className="text-2xl font-black text-slate-900 leading-tight">Halo, {profile?.full_name?.split(' ')[0]}!</h1>
           </div>
           <button onClick={() => setIsSideMenuOpen(true)} className="h-10 w-10 flex items-center justify-center bg-slate-50 text-slate-800 rounded-2xl hover:bg-slate-100 transition border border-slate-100 shadow-sm">
             {profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover rounded-2xl" /> : <Menu size={20} />}
           </button>
        </div>
        
        {/* Search Bar */}
        <div className="relative group">
          <input type="text" placeholder="Cari barang..." value={searchQuery} onChange={(e) => handleSearch(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-slate-100/50 rounded-2xl border border-transparent focus:border-blue-500/20 focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none text-sm font-medium" />
          <Search className="absolute left-4 top-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
          <AnimatePresence>{searchResults.length > 0 && (<motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} exit={{opacity:0}} className="absolute top-full left-0 right-0 bg-white mt-2 rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">{searchResults.map(item => (<Link key={item.id} href={`/items/${item.id}`} className="flex items-center gap-3 p-4 hover:bg-blue-50 transition-colors"><div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden"><img src={item.base_image_url} className="w-full h-full object-cover" /></div><span className="font-bold text-slate-800 text-sm">{item.name}</span></Link>))}</motion.div>)}</AnimatePresence>
        </div>
      </header>

      {/* ANNOUNCEMENT BANNER */}
      <AnimatePresence>
        {announcement && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-6 pt-6 relative z-10">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 text-white shadow-lg shadow-blue-500/20 flex items-start gap-4 relative overflow-hidden">
                    <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm shrink-0 animate-pulse relative z-10"><Megaphone size={20} className="text-white"/></div>
                    <div className="flex-1 pr-8 relative z-10">
                        <h4 className="text-[10px] font-bold uppercase text-blue-100 tracking-widest mb-1">PENGUMUMAN</h4>
                        <p className="text-sm font-medium leading-relaxed">{announcement}</p>
                    </div>
                    {/* [FIX] Close Button: High Z-Index, Bigger Hit Area */}
                    <button onClick={() => setAnnouncement(null)} className="absolute top-0 right-0 p-4 text-blue-200 hover:text-white z-50 transition">
                        <X size={18}/>
                    </button>
                    {/* [FIX] Decoration: pointer-events-none to click-through */}
                    <Megaphone size={80} className="absolute -bottom-4 -right-4 text-white opacity-10 -rotate-12 pointer-events-none z-0"/>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* DASHBOARD CONTENT */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-end px-1">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">{currentSlide === 0 ? "Aksi Cepat" : "Ringkasan Data"}</h3>
                <div className="flex gap-2">
                    <button onClick={() => setCurrentSlide(0)} className={`w-2 h-2 rounded-full transition-all ${currentSlide === 0 ? 'bg-blue-600 w-4' : 'bg-slate-300'}`}/>
                    <button onClick={() => setCurrentSlide(1)} className={`w-2 h-2 rounded-full transition-all ${currentSlide === 1 ? 'bg-blue-600 w-4' : 'bg-slate-300'}`}/>
                </div>
            </div>
            <div className="overflow-hidden relative min-h-[320px]">
                <motion.div animate={{ x: currentSlide === 0 ? 0 : "-100%" }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="flex w-full absolute top-0 left-0 h-full">
                    {/* SLIDE 1 */}
                    <div className="w-full shrink-0 pr-4"> 
                        <div className="grid grid-cols-2 gap-4 h-full content-start">
                            <button onClick={() => setShowScanOption(true)} className="group bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-center items-center gap-3 text-center h-40">
                                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform"><ScanLine size={24} strokeWidth={2.5}/></div>
                                <div><h4 className="font-bold text-lg text-slate-800">Transaksi</h4><p className="text-xs text-slate-400">Pinjam / Kembali</p></div>
                            </button>
                            <button onClick={() => setShowAttendanceOption(true)} className="group bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-center items-center gap-3 text-center h-40">
                                <div className="w-14 h-14 bg-violet-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-violet-200 group-hover:scale-110 transition-transform"><CalendarCheck size={24} strokeWidth={2.5}/></div>
                                <div><h4 className="font-bold text-lg text-slate-800">Kehadiran</h4><p className="text-xs text-slate-400">Absensi & History</p></div>
                            </button>
                            {profile?.role === 'admin' && (
                                <Link href="/admin" className="group bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-center items-center gap-3 text-center h-40">
                                    <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-300 group-hover:scale-110 transition-transform"><Database size={24} strokeWidth={2.5}/></div>
                                    <div><h4 className="font-bold text-lg text-slate-800">Master Data</h4><p className="text-xs text-slate-400">Kelola Barang</p></div>
                                </Link>
                            )}
                            {profile?.role === 'admin' && (
                                <Link href="/reports" className="group bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-center items-center gap-3 text-center h-40">
                                    <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform"><BarChart3 size={24} strokeWidth={2.5}/></div>
                                    <div><h4 className="font-bold text-lg text-slate-800">Laporan</h4><p className="text-xs text-slate-400">Statistik & Excel</p></div>
                                </Link>
                            )}
                        </div>
                    </div>
                    {/* SLIDE 2 */}
                    <div className="w-full shrink-0 pl-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 h-full content-start">
                            <StatCardSmall label="Dipinjam" value={profile?.role === 'admin' ? stats.active : stats.myActive} icon={<ArrowUpRight size={16}/>} color="bg-blue-50 text-blue-600" onClick={() => setStatModalType('active')} />
                            <StatCardSmall label="Menunggu" value={profile?.role === 'admin' ? stats.pending : stats.myPending} icon={<Clock size={16}/>} color="bg-amber-50 text-amber-600" onClick={() => setStatModalType('pending')} />
                            <StatCardSmall label="Telat" value={profile?.role === 'admin' ? stats.late : stats.myLate} icon={<AlertCircle size={16}/>} color="bg-red-50 text-red-600" isDanger onClick={() => setStatModalType('late')} />
                            <div className="bg-white p-4 rounded-[1.5rem] border border-slate-100 flex flex-col justify-center items-center text-center gap-1 shadow-sm"><div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mb-1"><Layers size={16}/></div><h3 className="text-xl font-black text-slate-800">{stats.totalItems}</h3><p className="text-[9px] font-bold text-slate-400 uppercase">Total Aset</p></div>
                            <div className="bg-white p-4 rounded-[1.5rem] border border-slate-100 flex flex-col justify-center items-center text-center gap-1 shadow-sm"><div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mb-1"><Users size={16}/></div><h3 className="text-xl font-black text-slate-800">{members.length}</h3><p className="text-[9px] font-bold text-slate-400 uppercase">Anggota</p></div>
                            <div className="bg-white p-4 rounded-[1.5rem] border border-slate-100 flex flex-col justify-center items-center text-center gap-1 shadow-sm"><div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1"><Activity size={16}/></div><h3 className="text-xl font-black text-emerald-600">{stats.todayAttendance}</h3><p className="text-[9px] font-bold text-slate-400 uppercase">Hadir Hari Ini</p></div>
                        </div>
                    </div>
                </motion.div>
            </div>
            {/* RECENT LOANS (MEMBER) */}
            {profile?.role !== 'admin' && (
            <section className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-slate-800 flex items-center gap-2"><span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>Barang Dipinjam</h3><Link href="/return" className="text-xs text-blue-600 font-bold hover:underline">Lihat Semua</Link></div>
                <div className="space-y-4">
                  {allLoans.filter(l => (l.profiles as any)?.no_induk === profile?.no_induk && l.status === 'dipinjam').slice(0, 5).length > 0 ? (
                      allLoans.filter(l => (l.profiles as any)?.no_induk === profile?.no_induk && l.status === 'dipinjam').slice(0, 5).map((loan) => (
                           <div key={loan.id} onClick={() => setSelectedLoan(loan)} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-2xl transition-colors group cursor-pointer border border-transparent hover:border-slate-100">
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden bg-slate-100`}>{loan.variants?.items?.base_image_url ? <img src={loan.variants.items.base_image_url} className="w-full h-full object-cover"/> : <Box size={18} className="text-slate-400"/>}</div>
                                <div><p className="font-bold text-slate-800 text-sm truncate w-32 sm:w-auto">{loan.variants?.items?.name}</p><div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium"><span>{new Date(loan.borrow_date).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'})}</span>{(new Date(loan.borrow_date) < new Date(new Date().setDate(new Date().getDate() - 7))) && <span className="text-red-500 font-bold bg-red-50 px-1.5 py-0.5 rounded">TELAT</span>}</div></div>
                              </div>
                              <ArrowUpRight size={18} className="text-slate-300 group-hover:text-blue-500"/>
                           </div>
                      ))
                  ) : (<div className="text-center py-10 text-slate-400 text-sm flex flex-col items-center"><Package size={24} className="mb-2 opacity-50"/>Tidak ada barang yang sedang dipinjam.</div>)}
                </div>
            </section>
            )}
        </div>
        {/* SIDEBAR WIDGET */}
        <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-6 text-white shadow-xl shadow-blue-200 relative overflow-hidden">
                <div className="relative z-10"><h3 className="font-bold text-lg mb-1">{profile?.role === 'admin' ? 'Halo Admin!' : 'Butuh Bantuan?'}</h3><p className="text-blue-100 text-xs mb-4">{profile?.role === 'admin' ? 'Semua sistem berjalan normal.' : 'Hubungi admin jika ada kendala.'}</p>{profile?.role !== 'admin' && (<button className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-bold hover:bg-white/30 transition">Kontak Admin</button>)}</div><Package size={120} className="absolute -bottom-6 -right-6 opacity-10 rotate-12"/>
            </div>
            {profile?.role === 'admin' && (
                <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4">Anggota Baru</h3>
                    <div className="flex -space-x-2 overflow-hidden mb-4">{members.slice(0, 5).map((m, i) => (<div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase overflow-hidden">{m.avatar_url ? <img src={m.avatar_url} className="w-full h-full object-cover"/> : m.full_name.charAt(0)}</div>))}{members.length > 5 && <div className="h-8 w-8 rounded-full ring-2 ring-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">+{members.length - 5}</div>}</div>
                    <Link href="/admin/members" className="block w-full py-3 bg-slate-50 text-slate-600 text-sm font-bold rounded-xl text-center hover:bg-slate-100 transition">Kelola Anggota</Link>
                </div>
            )}
        </div>
      </div>

      {/* --- SIDE MENU --- */}
      <AnimatePresence>
        {isSideMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]" onClick={() => setIsSideMenuOpen(false)}/>
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="fixed top-0 right-0 h-full w-[85%] max-w-xs bg-white shadow-2xl z-[90] flex flex-col">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50"><h2 className="text-lg font-black text-slate-900">Pengaturan</h2><button onClick={() => setIsSideMenuOpen(false)} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-900 shadow-sm border border-slate-100"><X size={20} /></button></div>
              <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                <div className="flex flex-col items-center text-center space-y-3 pb-6 border-b border-slate-100">
                  <div className="w-20 h-20 bg-blue-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-blue-500/20 overflow-hidden text-2xl font-black">{profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : profile?.full_name?.charAt(0)}</div>
                  <div><h3 className="text-xl font-black text-slate-900">{profile?.full_name}</h3><p className="text-xs font-bold text-slate-400 font-mono bg-slate-100 px-3 py-1 rounded-full inline-block mt-1">{profile?.no_induk}</p></div>
                </div>
                <div className="space-y-3">
                  <button onClick={() => setShowProfileModal(true)} className="w-full flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl hover:bg-blue-50 transition-all group"><div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><Edit3 size={20} /></div><div className="text-left flex-1"><h4 className="font-bold text-slate-800 text-sm">Edit Profil</h4></div></button>
                  <button onClick={() => setShowPasswordModal(true)} className="w-full flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl hover:bg-amber-50 transition-all group"><div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center"><Lock size={20} /></div><div className="text-left flex-1"><h4 className="font-bold text-slate-800 text-sm">Ganti Password</h4></div></button>
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                <button onClick={handleLogoutClick} className="w-full flex items-center justify-center gap-2 p-4 bg-white border border-red-100 text-red-500 rounded-2xl font-black text-sm hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95"><LogOut size={18} /> Keluar Aplikasi</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- MODALS LOGOUT & CART WARNING --- */}
      <AnimatePresence>
        {isLogoutConfirmOpen && (
          <motion.div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm" initial="hidden" animate="visible" exit="hidden" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}>
            <motion.div className="bg-white rounded-[2.5rem] p-8 shadow-2xl max-w-sm w-full text-center space-y-6" variants={{ hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1 } }}>
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner shadow-red-100"><AlertTriangle size={36} strokeWidth={2.5} /></div>
              <div><h2 className="text-2xl font-black text-slate-900 mb-2">Yakin Ingin Keluar?</h2><p className="text-sm text-slate-400 font-medium px-4 leading-relaxed">Sesi Anda akan berakhir.</p></div>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setIsLogoutConfirmOpen(false)} className="py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition active:scale-95 text-sm">Batal</button>
                <button onClick={() => executeLogout('clear')} className="py-4 bg-red-500 text-white font-black rounded-2xl hover:bg-red-600 transition shadow-lg shadow-red-500/20 active:scale-95 text-sm">Ya, Keluar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCartWarningOpen && (
          <motion.div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm" initial="hidden" animate="visible" exit="hidden" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}>
            <motion.div className="bg-white rounded-[2.5rem] p-8 shadow-2xl max-w-sm w-full text-center space-y-6" variants={{ hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1 } }}>
              <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner shadow-amber-100"><AlertCircle size={36} strokeWidth={2.5} /></div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Barang Tertinggal!</h2>
                <p className="text-sm text-slate-400 font-medium px-4 leading-relaxed">
                  Ada <span className="text-blue-600 font-bold">{cart.length} barang</span> di keranjang Anda. Apa yang ingin dilakukan?
                </p>
              </div>
              <div className="space-y-3">
                <button onClick={() => executeLogout('keep')} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 active:scale-95 text-sm flex items-center justify-center gap-2">
                    <Archive size={18}/> Simpan & Keluar
                </button>
                <button onClick={() => executeLogout('clear')} className="w-full py-4 bg-white border-2 border-red-100 text-red-500 font-black rounded-2xl hover:bg-red-50 transition active:scale-95 text-sm flex items-center justify-center gap-2">
                    <Trash2 size={18}/> Hapus & Keluar
                </button>
                <button onClick={() => setIsCartWarningOpen(false)} className="w-full py-3 text-slate-400 font-bold text-xs hover:text-slate-600">Batal</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{showProfileModal && (<div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm"><motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl p-6 relative"><button onClick={() => setShowProfileModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900"><X size={20}/></button><h2 className="text-xl font-black text-slate-900 mb-6 text-center">Edit Profil</h2><div className="flex flex-col items-center space-y-4"><div className="relative group"><div className="w-28 h-28 bg-blue-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-xl shadow-blue-500/20 overflow-hidden border-4 border-white">{previewAvatar || profile?.avatar_url ? (<img src={previewAvatar || profile?.avatar_url} className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center text-slate-400"><User size={48} strokeWidth={1.5}/></div>)}</div><label className="absolute -bottom-1 -right-1 bg-slate-900 text-white p-2.5 rounded-xl cursor-pointer shadow-lg hover:scale-110 transition-transform active:scale-95"><Camera size={16} /><input type="file" className="hidden" accept="image/*" onChange={handleFileSelect} /></label></div><div className="w-full space-y-1"><label className="text-xs font-bold text-slate-400 uppercase ml-1">Nama Lengkap</label><input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-blue-500" /></div><div className="w-full space-y-1"><label className="text-xs font-bold text-slate-400 uppercase ml-1 flex items-center gap-1"><Phone size={12}/> WhatsApp</label><input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value.replace(/\D/g,''))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-blue-500" placeholder="08..." /></div><button onClick={handleUpdateProfile} disabled={isUpdatingProfile} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:bg-slate-300">{isUpdatingProfile ? <Loader2 className="animate-spin" /> : <Save size={20} />} Simpan Profil</button></div></motion.div></div>)}</AnimatePresence>
      <AnimatePresence>{showPasswordModal && (<div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm"><motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl p-6 relative"><button onClick={() => setShowPasswordModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900"><X size={20}/></button><h2 className="text-xl font-black text-slate-900 mb-6 text-center">Ganti Password</h2><div className="space-y-4"><div className="space-y-1 relative"><label className="text-xs font-bold text-slate-400 uppercase ml-1">Password Baru</label><input type={showPass ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-amber-500" /><button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-8 text-slate-400 hover:text-slate-600">{showPass ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div><div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase ml-1">Konfirmasi Password</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-amber-500" /></div><button onClick={handleChangePassword} disabled={isUpdatingPass} className="w-full py-4 bg-amber-500 text-white font-black rounded-2xl shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:bg-slate-300">{isUpdatingPass ? <Loader2 className="animate-spin" /> : <Lock size={20} />} Update Password</button></div></motion.div></div>)}</AnimatePresence>
      <AnimatePresence>{showCropModal && cropImageSrc && (<div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md"><motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col relative"><div className="relative w-full aspect-square bg-slate-900 overflow-hidden cursor-move touch-none" ref={containerRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onTouchStart={handleMouseDown} onTouchMove={handleMouseMove} onTouchEnd={handleMouseUp}><img ref={imageRef} src={cropImageSrc} className="absolute origin-center select-none" style={{ width: '100%', height: 'auto', top: '50%', left: '50%', transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }} draggable={false}/></div><div className="p-6 space-y-4 bg-white"><div className="flex items-center gap-3"><ZoomIn size={18} className="text-slate-400"/><input type="range" min="1" max="3" step="0.1" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"/></div><div className="grid grid-cols-2 gap-3"><button onClick={() => setShowCropModal(false)} className="py-3 bg-slate-100 text-slate-500 font-bold rounded-2xl">Batal</button><button onClick={getCroppedImg} className="py-3 bg-blue-600 text-white font-bold rounded-2xl">Gunakan</button></div></div></motion.div></div>)}</AnimatePresence>
      {/* ... (Modal Logout dan lainnya sudah dihandle di atas) ... */}
      
      {/* Modal Aksi Cepat & Kehadiran & Detail Loan (Paste juga di sini jika belum ada, sesuai file asli) */}
      <AnimatePresence>{showScanOption && (<div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"><motion.div initial={{scale: 0.9, opacity: 0}} animate={{scale: 1, opacity: 1}} exit={{scale: 0.9, opacity: 0}} className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl relative"><button onClick={() => setShowScanOption(false)} className="absolute top-5 right-5 text-slate-300 hover:text-slate-500"><XCircle size={24}/></button><h3 className="text-xl font-black text-slate-900 text-center mb-6">Menu Transaksi</h3><div className="space-y-3"><Link href="/items" className="block group"><div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-center gap-4 hover:bg-blue-100 transition-colors"><div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white"><ArrowUpRight size={20}/></div><div><h4 className="font-bold text-slate-800">Meminjam</h4><p className="text-xs text-slate-500">Barang Keluar</p></div></div></Link><Link href="/return" className="block group"><div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center gap-4 hover:bg-emerald-100 transition-colors"><div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white"><ArrowDownLeft size={20}/></div><div><h4 className="font-bold text-slate-800">Mengembalikan</h4><p className="text-xs text-slate-500">Barang Masuk</p></div></div></Link><Link href="/history" className="block group"><div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center gap-4 hover:bg-indigo-100 transition-colors"><div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white"><History size={20}/></div><div><h4 className="font-bold text-slate-800">Riwayat Transaksi</h4><p className="text-xs text-slate-500">Log Peminjaman</p></div></div></Link></div></motion.div></div>)}</AnimatePresence>
      <AnimatePresence>{showAttendanceOption && (<div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"><motion.div initial={{scale: 0.9, opacity: 0}} animate={{scale: 1, opacity: 1}} exit={{scale: 0.9, opacity: 0}} className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl relative"><button onClick={() => setShowAttendanceOption(false)} className="absolute top-5 right-5 text-slate-300 hover:text-slate-500"><XCircle size={24}/></button><h3 className="text-xl font-black text-slate-900 text-center mb-6">Menu Kehadiran</h3><div className="space-y-3">{profile?.role === 'admin' && (<Link href="/attendance" className="block group"><div className="p-4 rounded-2xl bg-violet-50 border border-violet-100 flex items-center gap-4 hover:bg-violet-100 transition-colors"><div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center text-white"><CalendarCheck size={20}/></div><div><h4 className="font-bold text-slate-800">Input Kehadiran</h4><p className="text-xs text-slate-500">Catat Absensi Baru</p></div></div></Link>)}<Link href="/attendance/history" className="block group"><div className="p-4 rounded-2xl bg-fuchsia-50 border border-fuchsia-100 flex items-center gap-4 hover:bg-fuchsia-100 transition-colors"><div className="w-10 h-10 bg-fuchsia-600 rounded-xl flex items-center justify-center text-white"><ListChecks size={20}/></div><div><h4 className="font-bold text-slate-800">Riwayat Kehadiran</h4><p className="text-xs text-slate-500">Log Absensi</p></div></div></Link></div></motion.div></div>)}</AnimatePresence>
      <AnimatePresence>{statModalType && (<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"><div className="absolute inset-0" onClick={() => setStatModalType(null)}></div><motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[85vh]"><div className="p-6 border-b border-slate-100 bg-white flex justify-between items-center sticky top-0 z-20"><div><h2 className="text-lg font-black text-slate-900">{getModalTitle()}</h2><p className="text-xs text-slate-400 font-medium">Daftar item dalam kategori ini</p></div><button onClick={() => setStatModalType(null)} className="p-2 bg-slate-50 rounded-full hover:bg-slate-100 text-slate-400"><X size={20}/></button></div><div className="flex-1 overflow-y-auto p-2">{getModalListData().length > 0 ? (<div className="space-y-1">{getModalListData().map((loan: any) => (<button key={loan.id} onClick={() => setSelectedLoan(loan)} className="w-full p-4 flex items-center gap-4 bg-white hover:bg-blue-50 transition-colors rounded-2xl group border border-transparent hover:border-blue-100 text-left"><div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-blue-600 shadow-sm shrink-0 overflow-hidden">{loan.variants?.items?.base_image_url ? <img src={loan.variants.items.base_image_url} className="w-full h-full object-cover"/> : <Box size={20}/>}</div><div className="flex-1 min-w-0"><h4 className="font-bold text-slate-800 text-sm truncate">{loan.variants?.items?.name}</h4><p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{loan.variants?.size} • {loan.variants?.color}</p></div><ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500" /></button>))}</div>) : (<div className="text-center py-10"><Package size={24} className="mx-auto mb-3 text-slate-200"/><p className="text-xs font-bold text-slate-400">Tidak ada data.</p></div>)}</div></motion.div></div>)}</AnimatePresence>
      <AnimatePresence>{selectedLoan && (<div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"><div className="absolute inset-0" onClick={() => setSelectedLoan(null)}></div><motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl relative z-10"><div className="h-56 bg-slate-100 relative">{selectedLoan.variants?.items?.base_image_url ? (<img src={selectedLoan.variants.items.base_image_url} className="w-full h-full object-cover"/>) : (<div className="w-full h-full flex flex-col items-center justify-center text-slate-300"><Package size={48} /><p className="text-[10px] font-black uppercase mt-2">No Image</p></div>)}<button onClick={() => setSelectedLoan(null)} className="absolute top-4 left-4 p-2 bg-black/20 backdrop-blur text-white rounded-full hover:bg-black/40 transition-colors"><ChevronLeft size={20} /></button>{profile?.role === 'admin' && (new Date(selectedLoan.borrow_date) < new Date(new Date().setDate(new Date().getDate() - 7))) && (<button onClick={(e) => handleWhatsAppReminder(e, selectedLoan)} className="absolute top-4 right-4 p-2 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 transition-colors animate-bounce"><MessageCircle size={20} /></button>)}</div><div className="p-6 space-y-4"><div><h2 className="text-2xl font-black text-slate-900 leading-tight">{selectedLoan.variants?.items?.name}</h2><div className="flex flex-wrap items-center gap-2 mt-2"><p className="text-sm font-bold text-blue-600 uppercase tracking-widest">{selectedLoan.variants?.color} • {selectedLoan.variants?.size}</p></div></div><div className="grid grid-cols-2 gap-3"><div className="bg-slate-50 p-4 rounded-2xl"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Peminjam</p><p className="font-bold text-slate-800 text-sm leading-tight">{selectedLoan.profiles?.full_name}</p></div><div className="bg-slate-50 p-4 rounded-2xl"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lokasi</p><div className="flex items-center gap-1.5"><MapPin size={14} className="text-red-500" /><p className="font-bold text-slate-800 text-sm">{selectedLoan.variants?.location || "-"}</p></div></div></div><div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between"><div className="flex items-center gap-2"><UserCheck size={16} className="text-blue-600" /><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Diproses Oleh</p></div><p className="font-bold text-slate-900 text-sm">{selectedLoan.admin?.full_name || "-"}</p></div><div className="flex items-center justify-between py-3 border-t border-slate-100"><span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Waktu Pinjam</span><span className="text-sm font-black text-slate-800">{new Date(selectedLoan.borrow_date).toLocaleString('id-ID', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'})}</span></div></div></motion.div></div>)}</AnimatePresence>

      <FloatingCart />
    </div>
  );
}

function StatCardSmall({ label, value, icon, color, isDanger, onClick }: any) {
  return (
    <button onClick={onClick} className={`bg-white p-4 rounded-[1.5rem] border transition-all flex flex-col justify-center items-center text-center gap-1 hover:shadow-md shadow-sm h-32 w-full ${isDanger ? 'border-red-100 hover:bg-red-50' : 'border-slate-100 hover:bg-slate-50'}`}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-1 ${color}`}>
        {icon}
      </div>
      <h3 className={`text-xl font-black ${isDanger ? 'text-red-600' : 'text-slate-800'}`}>{value}</h3>
      <p className={`text-[9px] font-bold uppercase tracking-wide ${isDanger ? 'text-red-400' : 'text-slate-400'}`}>{label}</p>
    </button>
  );
}