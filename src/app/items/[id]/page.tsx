"use client"; 

import React, { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, CheckCircle, AlertCircle, Package, User, Search, X, ChevronRight, Home, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// IMPORT PENTING
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function ItemDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const itemId = params.id;

  // --- STATE DATA ---
  const [item, setItem] = useState<any>(null);          
  const [variants, setVariants] = useState<any[]>([]);  
  const [members, setMembers] = useState<any[]>([]);    
  const [loading, setLoading] = useState(true);

  // --- STATE PILIHAN ---
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  
  // --- STATE TRANSAKSI ---
  const [selectedMember, setSelectedMember] = useState<any>(null); 
  const [isModalOpen, setIsModalOpen] = useState(false); 
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. AMBIL DATA DARI SUPABASE
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: itemData, error: itemError } = await supabase
          .from('items')
          .select('*')
          .eq('id', itemId)
          .single();
        
        if (itemError) throw itemError;
        setItem(itemData);

        const { data: variantData, error: variantError } = await supabase
          .from('variants')
          .select('*')
          .eq('item_id', itemId);

        if (variantError) throw variantError;
        setVariants(variantData || []);

        if (variantData && variantData.length > 0) {
            const first = variantData[0];
            setSelectedColor(first.color);
            setSelectedSize(first.size);
        }

        const { data: memberData } = await supabase
          .from('profiles')
          .select('*')
          .order('full_name');
        
        setMembers(memberData || []);

      } catch (error) {
        console.error("Gagal ambil data:", error);
        toast.error("Barang tidak ditemukan");
        router.push('/items');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [itemId, router]);

  // --- LOGIKA FILTERING ---
  const currentVariant = variants.find((v) => 
    v.color === selectedColor && v.size === selectedSize
  );

  const availableColors = Array.from(new Set(variants.map((v) => v.color)));
  const availableSizes = Array.from(new Set(variants.map((v) => v.size)));

  const currentStock = currentVariant?.stock || 0;

  // --- SEARCH MEMBER ---
  const filteredMembers = members.filter(m => 
    m.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.no_induk?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- FUNGSI PINJAM (TRANSAKSI) ---
  const handleConfirmBorrow = async () => {
    if (!selectedMember || !currentVariant) return;
    if (currentVariant.stock <= 0) return toast.error("Stok habis!");

    setIsSubmitting(true);
    const toastId = toast.loading("Memproses peminjaman...");

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error: loanError } = await supabase
        .from('loans')
        .insert([{
            user_id: selectedMember.id, 
            variant_id: currentVariant.id, 
            assigned_by: user?.id, 
            status: 'dipinjam',
            borrow_date: new Date().toISOString()
        }]);

      if (loanError) throw loanError;

      const { error: updateError } = await supabase
        .from('variants')
        .update({ stock: currentVariant.stock - 1 })
        .eq('id', currentVariant.id);
        
      if (updateError) throw updateError;

      setVariants(prev => prev.map(v => 
        v.id === currentVariant.id ? { ...v, stock: v.stock - 1 } : v
      ));

      toast.success("Berhasil diambil!", { id: toastId });
      setShowSuccess(true);
      setIsModalOpen(false);

    } catch (error: any) {
        console.error(error);
        toast.error("Gagal transaksi: " + error.message, { id: toastId });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleTakeAgain = () => {
    setShowSuccess(false);   
    setSelectedMember(null); 
  }

  // ANIMASI
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
     return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600"/></div>;
  }

  return (
    <div className="min-h-screen bg-white pb-40 overflow-hidden">
      
      {/* HERO IMAGE */}
      <motion.div 
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className={`w-full h-72 ${item?.base_image_url || 'bg-gray-200'} relative transition-colors duration-500 flex items-center justify-center`}
      >
        <Link href="/items" className="absolute top-4 left-4 z-20 p-2 bg-white/50 backdrop-blur-md rounded-full text-gray-800 hover:bg-white shadow-sm">
          <ArrowLeft size={24} />
        </Link>
         <div className="flex flex-col items-center text-gray-800/60 z-10">
            <Package size={64} />
            <span className="font-bold text-lg mt-2">{selectedColor ? `Warna ${selectedColor}` : 'Foto Barang'}</span>
        </div>
      </motion.div>

      {/* DETAIL CARD */}
      <motion.div 
        className="px-6 -mt-8 relative z-10"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.1 }}
      >
        <div className="bg-white rounded-t-3xl p-6 shadow-xl border-t border-gray-100 min-h-[500px]">
          
          <div className="mb-6">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">{item?.category}</span>
              <h1 className="text-2xl font-bold text-gray-900 leading-tight mt-1">{item?.name}</h1>
          </div>

          {/* PILIH WARNA */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Pilih Warna: <span className="text-blue-600">{selectedColor}</span></h3>
            <div className="flex gap-3 flex-wrap">
              {availableColors.map((color: any) => {
                 return (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`px-4 py-2 rounded-xl border-2 font-bold text-sm transition-all ${selectedColor === color ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-500'}`}
                  >
                    {color}
                  </button>
                );
              })}
            </div>
          </div>

          {/* PILIH UKURAN */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Pilih Ukuran:</h3>
            <div className="flex gap-3 flex-wrap">
            {availableSizes.map((size: any) => (
                <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className={`w-12 h-12 rounded-xl border-2 font-bold text-sm flex items-center justify-center transition-all ${selectedSize === size ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-400'}`}
                >
                {size}
                </button>
            ))}
            </div>
          </div>
          
          <hr className="my-6 border-gray-100"/>

          {/* STATUS STOK */}
          {currentVariant ? (
            <div className={`rounded-xl p-4 flex items-center gap-4 mb-8 transition-all ${currentStock > 0 ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100 border'}`}>
                <div className={`p-3 rounded-full ${currentStock > 0 ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                    {currentStock > 0 ? <MapPin size={24} /> : <AlertCircle size={24} />}
                </div>
                <div>
                    <p className={`text-xs font-bold uppercase mb-0.5 ${currentStock > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {currentStock > 0 ? 'Lokasi & Stok' : 'Stok Habis'}
                    </p>
                    {currentStock > 0 ? (
                        <>
                            <p className="text-gray-900 font-bold text-lg">{currentVariant.location}</p>
                            <p className="text-sm text-gray-500">Tersedia: <span className="font-bold text-gray-800">{currentStock} unit</span></p>
                        </>
                    ) : (
                        <p className="text-gray-700 font-medium">Varian ini kosong.</p>
                    )}
                </div>
            </div>
          ) : (
             <div className="p-4 bg-gray-100 rounded-xl text-center text-sm">Varian warna & ukuran ini tidak tersedia.</div>
          )}
        </div>
      </motion.div>

      {/* --- BOTTOM BAR --- */}
      <AnimatePresence>
        {currentStock > 0 && (
            <motion.div 
                initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
                className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 p-4 z-20 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] space-y-3"
            >
            <button 
                onClick={() => setIsModalOpen(true)}
                className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl flex items-center justify-between hover:bg-gray-100 transition active:scale-95"
            >
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedMember ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
                        <User size={20} />
                    </div>
                    <div className="text-left">
                        <p className="text-xs text-gray-500 font-bold uppercase">Peminjam</p>
                        <p className={`font-bold ${selectedMember ? 'text-blue-900' : 'text-gray-400'}`}>
                            {selectedMember ? `${selectedMember.full_name}` : "Pilih Anggota..."}
                        </p>
                    </div>
                </div>
                <ChevronRight className="text-gray-400" size={20} />
            </button>

            <button 
                disabled={!selectedMember || isSubmitting}
                onClick={handleConfirmBorrow}
                className={`w-full font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all ${selectedMember && !isSubmitting ? 'bg-blue-600 text-white active:scale-95' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
            >
                {isSubmitting ? <Loader2 className="animate-spin"/> : <CheckCircle size={20} />}
                {selectedMember ? "Konfirmasi Ambil Barang" : "Pilih Peminjam Dulu"}
            </button>
            </motion.div>
        )}
      </AnimatePresence>

      {/* --- MODAL POPUP SEARCH MEMBER --- */}
      <AnimatePresence>
        {isModalOpen && (
            <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4" initial="hidden" animate="visible" exit="hidden" variants={backdropVariants}>
                <motion.div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]" variants={modalVariants} onClick={(e) => e.stopPropagation()}>
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0">
                        <h3 className="font-bold text-gray-800">Cari Anggota Team</h3>
                        <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={20} className="text-gray-600"/></button>
                    </div>
                    <div className="p-4 bg-gray-50 border-b border-gray-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
                            <input type="text" placeholder="Ketik Nama atau No Induk..." autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"/>
                        </div>
                    </div>
                    <div className="overflow-y-auto p-2 space-y-1">
                        {filteredMembers.length > 0 ? (
                            filteredMembers.map(member => (
                                <button key={member.id} onClick={() => { setSelectedMember(member); setIsModalOpen(false); setSearchQuery(""); }} className={`w-full p-3 flex items-center gap-3 rounded-xl transition text-left ${selectedMember?.id === member.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'}`}>
                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">{member.no_induk?.split('-')[1] || '00'}</div>
                                    <div><p className="font-bold text-gray-800 text-sm">{member.full_name}</p><p className="text-xs text-gray-500">ID: <span className="font-mono text-blue-600">{member.no_induk}</span></p></div>
                                    {selectedMember?.id === member.id && <CheckCircle size={18} className="ml-auto text-blue-600"/>}
                                </button>
                            ))
                        ) : (<div className="p-8 text-center text-gray-400 text-sm">Member tidak ditemukan.</div>)}
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* --- MODAL POPUP SUKSES PINJAM --- */}
      <AnimatePresence>
        {showSuccess && (
            <motion.div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" initial="hidden" animate="visible" exit="hidden" variants={backdropVariants}>
                <motion.div className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full text-center space-y-4 border border-white/20" variants={modalVariants} onClick={(e) => e.stopPropagation()}>
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2 animate-bounce"><CheckCircle size={40} strokeWidth={3} /></div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-1">Berhasil Diambil!</h2>
                        <p className="text-gray-500 text-sm">Barang tercatat atas nama <strong>{selectedMember?.full_name}</strong>.</p>
                        <div className="mt-4 bg-blue-50 border border-blue-100 p-3 rounded-xl text-left flex gap-3">
                            <MapPin className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
                            <div><p className="text-xs text-blue-500 font-bold uppercase">Lokasi Pengambilan</p><p className="text-sm font-bold text-blue-900">{currentVariant?.location}</p></div>
                        </div>
                    </div>
                    <div className="pt-4 grid grid-cols-2 gap-3">
                        <button onClick={handleTakeAgain} className="py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition text-sm flex items-center justify-center active:scale-95">Ambil Lagi</button>
                        <Link href="/dashboard" className="py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition text-sm flex items-center justify-center active:scale-95">Selesai <Home size={16} className="ml-2"/></Link>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}