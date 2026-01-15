"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, Package, CheckCircle, Calendar, ShieldCheck, 
  Clock, Camera, X, Loader2, MousePointer2, ChevronRight, ChevronDown, Tag, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import imageCompression from 'browser-image-compression';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

export default function ReturnPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [expandedTrans, setExpandedTrans] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [arrowPos, setArrowPos] = useState({ x: 50, y: 50 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchData(); }, [router]);

  const fetchData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return router.push('/login');

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
      setProfile(profileData);

      const { data: transData, error } = await supabase
        .from('transactions')
        .select(`
          id, transaction_date, guest_name, user_id, 
          loans (
            id, status, borrowed_at, loan_category, reject_reason, 
            variants:variant_id (id, size, color, items:item_id ( name, base_image_url ))
          )
        `)
        .or(`user_id.eq.${authUser.id}`);

      if (error) throw error;

      if (transData) {
        // FILTER: Hanya ambil transaksi yang memiliki item yang belum 'Selesai'
        const filteredTransactions = transData
          .map(trans => ({
            ...trans,
            loans: trans.loans.filter((l: any) => 
              l.status === 'dipinjam' || 
              l.status === 'pending_return' || 
              l.status === 'perlu_perbaikan'
            )
          }))
          .filter(trans => trans.loans.length > 0); 

        setTransactions(filteredTransactions);
      }
    } catch (error) { console.error("Gagal load data:", error); } 
    finally { setLoading(false); }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const imageFile = event.target.files?.[0];
    if (!imageFile) return;
    setIsProcessing(true);
    try {
      const compressedFile = await imageCompression(imageFile, { maxSizeMB: 0.05, maxWidthOrHeight: 1024, useWebWorker: true });
      setPreviewUrl(URL.createObjectURL(compressedFile)); 
      setArrowPos({ x: 50, y: 50 });
      toast.success('Foto siap! Tandai lokasi.');
    } catch (error) { toast.error("Gagal proses gambar."); } 
    finally { setIsProcessing(false); }
  };

  const handleImageClick = (e: any) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setArrowPos({ x: ((clientX - rect.left) / rect.width) * 100, y: ((clientY - rect.top) / rect.height) * 100 });
  };

  const handleConfirmReturn = async () => {
    if (!selectedLoan) return;
    setIsProcessing(true);
    const toastId = toast.loading('Mengupload bukti...');
    
    try {
        // 1. Proses Gambar (Canvas)
        const finalBlob = await new Promise<Blob | null>((resolve) => {
            const img = new Image(); img.src = previewUrl!;
            img.onload = () => {
                const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
                if (!ctx) return resolve(null);
                canvas.width = img.width; canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                const arrowX = (arrowPos.x / 100) * canvas.width, arrowY = (arrowPos.y / 100) * canvas.height;
                ctx.fillStyle = "red"; ctx.strokeStyle = "white"; ctx.lineWidth = 5;
                ctx.beginPath(); ctx.moveTo(arrowX, arrowY); ctx.lineTo(arrowX - 20, arrowY + 40); ctx.lineTo(arrowX + 20, arrowY + 40); ctx.closePath(); ctx.fill(); ctx.stroke();
                ctx.font = "bold 24px Arial"; ctx.fillStyle = "white"; ctx.fillText("Lokasi", arrowX - 35, arrowY + 70);
                canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.7);
            };
        });

        if (!finalBlob) throw new Error("Gagal proses gambar.");
        
        // 2. Upload ke Storage
        const fileName = `proof-${selectedLoan.id}-${Date.now()}.jpg`;
        await supabase.storage.from('inventory-proofs').upload(fileName, finalBlob, { contentType: 'image/jpeg' });
        const { data: { publicUrl } } = supabase.storage.from('inventory-proofs').getPublicUrl(fileName);

        // 3. Update Data Loan
        const { error: updateError } = await supabase.from('loans').update({ 
          status: 'pending_return', 
          returned_at: new Date().toISOString(), 
          return_proof_url: publicUrl, 
          reject_reason: null 
        }).eq('id', selectedLoan.id);

        if (updateError) throw updateError;

        // 4. [BARU] CATAT KE AUDIT LOG (CCTV)
        await supabase.from('audit_logs').insert({
            admin_name: profile?.full_name || 'System',
            action: 'Pengajuan Pengembalian',
            details: `Mengupload bukti pengembalian untuk: ${selectedLoan.variants?.items?.name} (${selectedLoan.variants?.color})`
        });

        toast.success("Berhasil dikirim ulang!", { id: toastId });
        setSelectedLoan(null); setPreviewUrl(null); setShowSuccess(true);
        fetchData(); 

    } catch (error: any) { 
        toast.error("Gagal: " + error.message, { id: toastId }); 
    } finally { 
        setIsProcessing(false); 
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-blue-600"/></div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Toaster position="top-center"/> {/* Pastikan Toaster ada */}
      
      <header className="bg-white p-4 sticky top-0 z-10 shadow-sm border-b border-gray-100 flex items-center gap-4 text-left">
        <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-full transition"><ArrowLeft size={24} className="text-gray-700" /></Link>
        <h1 className="text-xl font-bold text-gray-800">Pengembalian Saya</h1>
      </header>

      <main className="p-4 space-y-6">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between text-left">
          <div className="min-w-0"><p className="text-[10px] font-black text-gray-400 uppercase">Pelapor</p><h2 className="text-lg font-bold text-gray-800 truncate">{profile?.full_name}</h2></div>
          <ShieldCheck className="text-blue-600" size={24} />
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-gray-700 flex items-center gap-2 text-left"><Clock size={16} className="text-blue-600"/> Daftar Pinjaman Aktif</h3>
          {transactions.map((trans) => (
            <div key={trans.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden text-left">
              <button onClick={() => setExpandedTrans(expandedTrans === trans.id ? null : trans.id)} className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-xs shrink-0">ID-{trans.id.slice(0, 4).toUpperCase()}</div>
                  <div>
                    <p className="font-black text-slate-800 text-sm leading-tight">{trans.guest_name || "Pribadi / Member"}</p>
                    <p className="text-[11px] text-slate-400 mt-1 font-medium"><Calendar size={12} className="inline mr-1"/> {new Date(trans.transaction_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} • {trans.loans.length} Item</p>
                  </div>
                </div>
                {expandedTrans === trans.id ? <ChevronDown size={20} className="text-slate-300"/> : <ChevronRight size={20} className="text-slate-300"/>}
              </button>
              <AnimatePresence>{expandedTrans === trans.id && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-slate-50/50 border-t border-slate-50">
                  <div className="p-3 space-y-2">
                    {trans.loans.map((loan: any) => (
                      <div key={loan.id} className={`bg-white p-4 rounded-2xl border flex flex-col gap-3 ${loan.status === 'perlu_perbaikan' ? 'border-red-500 bg-red-50/20' : 'border-slate-100'}`}>
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-slate-50">
                            <img src={loan.variants?.items?.base_image_url} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 text-sm truncate">{loan.variants?.items?.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{loan.variants?.size} • {loan.variants?.color}</p>
                          </div>
                          {loan.status === 'pending_return' ? (
                            <div className="px-3 py-1 bg-amber-50 text-amber-600 text-[9px] font-black rounded-full border border-amber-100">VERIFIKASI...</div>
                          ) : (
                            <button onClick={() => setSelectedLoan(loan)} className={`w-10 h-10 text-white rounded-xl flex items-center justify-center shadow-lg transition-all ${loan.status === 'perlu_perbaikan' ? 'bg-red-500 animate-bounce' : 'bg-blue-600'}`}>
                              <Camera size={18}/>
                            </button>
                          )}
                        </div>
                        {loan.status === 'perlu_perbaikan' && (
                          <div className="bg-white p-3 rounded-xl border border-red-200 flex items-start gap-2">
                            <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                            <div><p className="text-[10px] font-black text-red-600 uppercase">Perlu Perbaikan</p><p className="text-xs text-red-700 font-bold mt-1">{loan.reject_reason}</p></div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}</AnimatePresence>
            </div>
          ))}
        </div>
      </main>

      <AnimatePresence>{selectedLoan && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 text-left">
          <div className="absolute inset-0" onClick={() => !isProcessing && setSelectedLoan(null)}></div>
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[90vh]">
             <div className="p-5 border-b border-slate-100 flex justify-between items-center"><h3 className="font-black text-slate-800">Bukti Kembali</h3><button onClick={() => setSelectedLoan(null)} className="p-2 bg-slate-50 rounded-full text-slate-400"><X size={20}/></button></div>
             <div className="p-6 overflow-y-auto">{previewUrl ? (
                   <div className="space-y-4">
                      <div className="bg-blue-50 p-3 rounded-xl flex items-start gap-2 border border-blue-100"><MousePointer2 size={16} className="text-blue-600 mt-0.5" /><p className="text-[11px] text-blue-700 font-medium">Klik pada foto untuk menandai lokasi barang.</p></div>
                      <div ref={imageContainerRef} onClick={handleImageClick} className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 aspect-square flex items-center justify-center cursor-crosshair"><img src={previewUrl} className="max-w-full max-h-full object-contain" /><div className="absolute transform -translate-x-1/2 -translate-y-full pointer-events-none" style={{ left: `${arrowPos.x}%`, top: `${arrowPos.y}%` }}><svg width="50" height="50" viewBox="0 0 24 24" fill="red" stroke="white" strokeWidth="2"><path d="M12 19V5" /><path d="M5 12l7 7 7-7" /></svg></div></div>
                      <button onClick={handleConfirmReturn} disabled={isProcessing} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all">{isProcessing ? <Loader2 className="animate-spin mx-auto"/> : "Konfirmasi & Kirim"}</button>
                   </div>
                ) : (
                  <div className="text-center space-y-6"><div><h4 className="text-lg font-black text-slate-900 leading-tight">{selectedLoan.variants?.items?.name}</h4><p className="text-xs font-bold text-blue-600 mt-1 uppercase">{selectedLoan.variants?.size} • {selectedLoan.variants?.color}</p></div>
                      <label className="flex flex-col items-center justify-center w-full h-56 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer bg-slate-50 hover:bg-blue-50 transition-all group"><div className="flex flex-col items-center justify-center p-5"><Camera className="text-slate-300 group-hover:text-blue-500 mb-3" size={40} /><p className="text-sm text-slate-500 font-bold">Ambil Foto Bukti</p></div><input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} /></label>
                  </div>
                )}</div>
          </motion.div>
        </div>
      )}</AnimatePresence>

      <AnimatePresence>{showSuccess && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2.5rem] p-8 shadow-2xl max-w-sm w-full text-center space-y-4">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2 animate-bounce"><CheckCircle size={40} strokeWidth={3} /></div>
            <h2 className="text-2xl font-black text-slate-900">Terkirim!</h2><p className="text-slate-500 text-sm font-medium">Laporan sudah masuk. Tunggu verifikasi admin.</p>
            <button onClick={() => {setShowSuccess(false); fetchData();}} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all">Oke, Mengerti</button>
          </motion.div>
        </div>
      )}</AnimatePresence>
    </div>
  );
}