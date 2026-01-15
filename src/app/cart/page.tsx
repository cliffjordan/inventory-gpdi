"use client";

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Trash2, Calendar, CheckCircle2, 
  Loader2, Tag, ShoppingCart, Package, User, Search, ChevronRight, UserPlus, Users, X 
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext'; 
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function CartPage() {
  const router = useRouter();
  const { cart, removeFromCart, clearCart, isLoading } = useCart();
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [borrowerType, setBorrowerType] = useState<'member' | 'guest'>('member');
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [searchMember, setSearchMember] = useState("");
  const [guestName, setGuestName] = useState("");
  const [loanCategory, setLoanCategory] = useState("Ibadah Umum");
  const [customCategory, setCustomCategory] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const categories = ["Ibadah Umum", "Ibadah SM", "Ibadah Pemberkatan", "Ibadah Event", "Disewakan", "Lain-lain"];

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (loanCategory === "Disewakan") {
      setBorrowerType('guest');
      setSelectedMember(null);
    }
  }, [loanCategory]);

  const fetchInitialData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    setCurrentUser(user);
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setCurrentProfile(profile);
    const { data: allMembers } = await supabase.from('profiles').select('*').order('full_name');
    if (allMembers) setMembers(allMembers);
  };

  const filteredMembers = members.filter(m => 
    m.full_name.toLowerCase().includes(searchMember.toLowerCase()) ||
    (m.no_induk && m.no_induk.toLowerCase().includes(searchMember.toLowerCase()))
  );

  const handleBorrowerTypeChange = (type: 'member' | 'guest') => {
    if (loanCategory === "Disewakan" && type === 'member') {
      toast.error("Kategori 'Disewakan' wajib menggunakan input Manual (Tamu)");
      return;
    }
    setBorrowerType(type);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    let finalUserId = null, finalGuestName = null;
    
    if (borrowerType === 'member') {
        if (!selectedMember) { toast.error("Pilih member dulu!"); return; }
        finalUserId = selectedMember.id;
    } else {
        if (!guestName.trim()) { toast.error("Isi nama peminjam manual!"); return; }
        finalUserId = currentUser.id;
        finalGuestName = `${guestName} (Manual)`;
    }
    
    const finalCategory = loanCategory === "Lain-lain" ? customCategory : loanCategory;
    if (loanCategory === "Lain-lain" && !customCategory.trim()) {
      toast.error("Isi detail keperluan!");
      return;
    }

    setIsCheckingOut(true);
    const toastId = toast.loading("Memproses transaksi...");
    
    try {
      // 1. Buat Header Transaksi
      const { data: transaction, error: transError } = await supabase.from('transactions').insert({
          user_id: finalUserId, 
          guest_name: finalGuestName, 
          status: 'dipinjam', 
          transaction_date: new Date().toISOString()
      }).select().single();
      
      if (transError) throw new Error(transError.message);

      // 2. Masukkan Detail Barang
      const loansData = cart.map(item => ({
        user_id: finalUserId, 
        guest_name: finalGuestName, 
        variant_id: item.variant_id, 
        item_id: item.item_id, 
        loan_category: finalCategory, 
        status: 'dipinjam', 
        borrow_date: new Date().toISOString(),
        assigned_by: currentUser.id, 
        transaction_id: transaction.id
      }));

      const { error: loansError } = await supabase.from('loans').insert(loansData);
      if (loansError) throw new Error(loansError.message);

      // 3. Log Audit
      await supabase.from('audit_logs').insert({
          admin_name: currentProfile?.full_name || 'System',
          action: 'Checkout Cart',
          details: `Transaksi ${loansData.length} item untuk ${borrowerType === 'member' ? selectedMember.full_name : finalGuestName}`
      });

      toast.success("Berhasil!", { id: toastId });
      clearCart();
      router.push('/dashboard');
      
    } catch (error: any) {
      toast.error("Gagal: " + error.message, { id: toastId });
    } finally { setIsCheckingOut(false); }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-slate-400"/></div>;

  if (cart.length === 0) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-4"><ShoppingCart size={40} className="text-slate-300" /></div>
      <h2 className="text-xl font-black text-slate-900 mb-2">Keranjang Kosong</h2>
      <Link href="/items" className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm shadow-lg shadow-slate-900/20 active:scale-95 transition-transform">Cari Barang</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-48 font-sans text-slate-800">
      <div className="bg-white p-4 sticky top-0 z-10 shadow-sm border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft size={20} className="text-slate-700" /></Link>
          <h1 className="font-bold text-lg text-slate-800">Keranjang ({cart.length})</h1>
        </div>
        <button onClick={clearCart} className="text-[10px] font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors">Hapus Semua</button>
      </div>

      <main className="p-4 space-y-6">
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-3">
            <div className="flex items-center gap-2 mb-1"><Calendar size={16} className="text-blue-600" /><p className="text-xs font-bold text-slate-900 uppercase tracking-widest">Pilih Keperluan</p></div>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                  <button key={cat} onClick={() => setLoanCategory(cat)} className={`px-3 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wide transition-all border ${loanCategory === cat ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-slate-50 text-slate-400 border-transparent hover:bg-slate-100'}`}>{cat}</button>
              ))}
            </div>
            <AnimatePresence>{loanCategory === "Lain-lain" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden pt-2"><input type="text" placeholder="Tulis detail keperluan..." value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-blue-500 transition-colors placeholder:text-slate-400" /></motion.div>
            )}</AnimatePresence>
        </div>

        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Diproses Oleh</p><p className="text-sm font-bold text-slate-800">{currentProfile?.full_name || '...'}</p></div>
                <User size={20} className="text-slate-300"/>
            </div>
            <hr className="border-slate-50" />
            <div className="bg-slate-100 p-1 rounded-xl flex">
                <button onClick={() => handleBorrowerTypeChange('member')} className={`flex-1 py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${borrowerType === 'member' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><Users size={14} /> Member</button>
                <button onClick={() => handleBorrowerTypeChange('guest')} className={`flex-1 py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${borrowerType === 'guest' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400'}`}><UserPlus size={14} /> Manual</button>
            </div>
            {borrowerType === 'member' ? (
                <button onClick={() => setShowMemberModal(true)} className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all group ${selectedMember ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-dashed border-slate-300 hover:border-blue-400'}`}>
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${selectedMember ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-400'}`}>{selectedMember ? <User size={20}/> : <Search size={20}/>}</div>
                        <div className="text-left min-w-0"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Nama Member</p><p className={`font-bold text-sm truncate ${selectedMember ? 'text-blue-700' : 'text-slate-400 italic'}`}>{selectedMember ? selectedMember.full_name : "Pilih dari database..."}</p></div>
                    </div>
                    <ChevronRight size={18} className="text-slate-400 group-hover:text-blue-500"/>
                </button>
            ) : (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="relative"><User className="absolute left-4 top-3.5 text-amber-400" size={18}/><input type="text" placeholder="Nama Peminjam (Tamu)" value={guestName} onChange={(e) => setGuestName(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-amber-50/50 border border-amber-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-amber-400 placeholder:text-slate-400/70" autoFocus /></div>
                    {loanCategory === "Disewakan" && <p className="text-[10px] text-amber-600 font-bold px-2 italic"> Wajib input nama manual untuk penyewaan.</p>}
                </div>
            )}
        </div>

        <div className="space-y-3">
          {cart.map((item) => (
            <motion.div layout key={item.variant_id} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
              <div className="w-16 h-16 bg-slate-100 rounded-xl overflow-hidden shrink-0 border border-slate-50">{item.image_url ? (<img src={item.image_url} className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center text-slate-300"><Package size={20} /></div>)}</div>
              <div className="flex-1 min-w-0"><h4 className="font-bold text-slate-800 text-sm truncate">{item.name}</h4><div className="flex items-center gap-2 mt-1"><span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md uppercase">{item.size}</span><span className="text-[10px] font-bold text-slate-400 uppercase">{item.color}</span></div><div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400"><Tag size={10} /> {item.location}</div></div>
              <button onClick={() => removeFromCart(item.variant_id)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
            </motion.div>
          ))}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-50 z-40 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between mb-4 px-1"><span className="text-xs font-bold text-slate-400">Total Item</span><span className="text-lg font-black text-slate-900">{cart.length} <span className="text-xs font-medium text-slate-400">Barang</span></span></div>
        <button disabled={isCheckingOut || (borrowerType === 'member' && !selectedMember) || (borrowerType === 'guest' && !guestName)} onClick={handleCheckout} className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 ${(borrowerType === 'member' && !selectedMember) || (borrowerType === 'guest' && !guestName) ? 'bg-slate-200 text-slate-400' : 'bg-blue-600 text-white shadow-blue-600/20'}`}>
            {isCheckingOut ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
            {isCheckingOut ? "Memproses..." : "Ajukan Peminjaman"}
        </button>
      </div>

      <AnimatePresence>{showMemberModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl max-h-[80vh]">
              <div className="p-6 border-b border-slate-50 flex items-center justify-between"><h2 className="text-lg font-black text-slate-900">Pilih Peminjam</h2><button onClick={() => setShowMemberModal(false)} className="p-2 bg-slate-50 rounded-full text-slate-400"><X size={20}/></button></div>
              <div className="p-6 bg-white border-b border-slate-50"><div className="relative group"><Search className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-600" size={20} /><input type="text" placeholder="Cari nama anggota..." value={searchMember} onChange={(e) => setSearchMember(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-medium" autoFocus /></div></div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {filteredMembers.map(member => (
                  <button key={member.id} onClick={() => { setSelectedMember(member); setShowMemberModal(false); }} className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-blue-50 transition-all text-left border border-transparent">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">{member.full_name?.charAt(0)}</div>
                    <div className="flex-1 min-w-0"><p className="font-bold text-slate-900 truncate">{member.full_name}</p><p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{member.no_induk || "MEMBER"}</p></div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
      )}</AnimatePresence>
    </div>
  );
}