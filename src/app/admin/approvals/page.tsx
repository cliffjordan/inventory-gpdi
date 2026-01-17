"use client";

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, CheckCircle2, XCircle, Loader2,
  ChevronDown, ChevronRight, LayoutGrid, X, Send, Camera, Package
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function AdminApprovalsPage() {
  const [loading, setLoading] = useState(true);
  const [pendingTransactions, setPendingTransactions] = useState<any[]>([]);
  const [expandedTrans, setExpandedTrans] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{show: boolean, loanId: string | null}>({
    show: false, loanId: null
  });
  const [reasonInput, setReasonInput] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  useEffect(() => { fetchPendingApprovals(); }, []);

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);

      // Ambil data item yang berstatus pending_return
      const { data: loansData, error: loansError } = await supabase
        .from('loans')
        .select(`
          id, status, return_proof_url, loan_category, variant_id, transaction_id,
          variants:variant_id (
            id, color, size,
            items:item_id (name, base_image_url)
          )
        `)
        .eq('status', 'pending_return');

      if (loansError) throw loansError;

      if (!loansData || loansData.length === 0) {
        setPendingTransactions([]);
        return;
      }

      // Ambil ID transaksi yang unik
      const transactionIds = Array.from(new Set(loansData.map(l => l.transaction_id)));

      // Ambil data header transaksi
      const { data: transData, error: transError } = await supabase
        .from('transactions')
        .select(`id, transaction_date, guest_name, profiles:user_id (full_name)`)
        .in('id', transactionIds)
        .order('transaction_date', { ascending: true });

      if (transError) throw transError;

      // Grouping data secara manual
      const formattedData = transData.map(trans => ({
        ...trans,
        loans: loansData.filter(l => l.transaction_id === trans.id)
      }));

      setPendingTransactions(formattedData);
    } catch (error: any) {
      toast.error("Gagal memuat data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (loanId: string, variantId: string) => {
    const toastId = toast.loading("Menyetujui...");
    try {
      // 1. Update status pinjaman
      const { error } = await supabase
        .from('loans')
        .update({ status: 'selesai', reject_reason: null })
        .eq('id', loanId);

      if (error) throw error;

      // 2. Kembalikan stok barang (Memanggil fungsi RPC yang sudah dibuat di SQL)
      if (variantId) {
        const { error: rpcError } = await supabase.rpc('increment_stock', { x: 1, row_id: variantId });
        if (rpcError) console.error("Gagal update stok:", rpcError);
      }

      toast.success("Berhasil disetujui", { id: toastId });
      fetchPendingApprovals();
    } catch (error: any) {
      toast.error("Gagal: " + error.message, { id: toastId });
    }
  };

  const submitReject = async () => {
    if (!reasonInput.trim()) return toast.error("Alasan wajib diisi!");
    setIsRejecting(true);
    const toastId = toast.loading("Mengirim alasan penolakan...");

    try {
      // Mengubah status menjadi 'perlu_perbaikan' (atau status lain sesuai alur)
      const { error } = await supabase
        .from('loans')
        .update({
          status: 'dipinjam', // Kembalikan ke status dipinjam agar user bisa request ulang
          return_proof_url: null, // Reset bukti foto
          reject_reason: reasonInput
        })
        .eq('id', rejectModal.loanId);

      if (error) throw error;

      toast.success("Item ditolak, user diminta upload ulang", { id: toastId });
      setRejectModal({ show: false, loanId: null });
      setReasonInput("");
      fetchPendingApprovals();
    } catch (error: any) {
      toast.error("Gagal simpan: " + error.message, { id: toastId });
    } finally {
      setIsRejecting(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-blue-600"/></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 text-left">
      <header className="bg-white p-4 sticky top-0 z-30 shadow-sm border-b border-slate-100 flex items-center gap-4">
        <Link href="/dashboard" className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft size={24} className="text-slate-700" /></Link>
        <h1 className="text-xl font-black text-slate-900">Verifikasi Paket</h1>
      </header>

      <main className="p-4 space-y-4">
        {pendingTransactions.length > 0 ? pendingTransactions.map((trans) => (
          <div key={trans.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 bg-slate-50/50 flex items-center justify-between border-b border-slate-50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 border border-slate-100 shadow-sm"><LayoutGrid size={24} /></div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm">{trans.guest_name || trans.profiles?.full_name}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">ID: #{trans.id.slice(0,5).toUpperCase()}</p>
                </div>
              </div>
              <button onClick={() => setExpandedTrans(expandedTrans === trans.id ? null : trans.id)} className="p-2 bg-white rounded-xl shadow-sm text-slate-400">
                {expandedTrans === trans.id ? <ChevronDown size={20}/> : <ChevronRight size={20}/>}
              </button>
            </div>

            <AnimatePresence>
              {expandedTrans === trans.id && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-white">
                  <div className="p-4 space-y-4">
                    {trans.loans.map((loan: any) => (
                      <div key={loan.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/30 space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex gap-3 min-w-0">
                            <div className="w-10 h-10 bg-white rounded-lg border border-slate-100 overflow-hidden shrink-0">
                              {loan.variants?.items?.base_image_url ? (
                                <img src={loan.variants.items.base_image_url} className="w-full h-full object-cover" />
                              ) : <Package size={20} className="m-2 text-slate-300"/>}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-800 text-xs truncate">{loan.variants?.items?.name}</h4>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">{loan.variants?.color} • {loan.variants?.size}</p>
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => setRejectModal({show: true, loanId: loan.id})} className="p-2 text-red-500 bg-white border border-red-100 rounded-lg shadow-sm hover:bg-red-50"><XCircle size={16} /></button>
                            <button onClick={() => handleApprove(loan.id, loan.variants?.id)} className="p-2 text-green-600 bg-white border border-green-100 rounded-lg shadow-sm hover:bg-green-50"><CheckCircle2 size={16} /></button>
                          </div>
                        </div>
                        {loan.return_proof_url && (
                          <div className="relative group">
                             <img src={loan.return_proof_url} onClick={() => setZoomedImage(loan.return_proof_url)} className="w-full aspect-video object-cover rounded-xl border border-slate-100 cursor-zoom-in" />
                             <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded-md backdrop-blur-sm pointer-events-none">Bukti Pengembalian</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )) : (
          <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-200">
            <CheckCircle2 size={48} className="mx-auto text-green-500 mb-4 opacity-20" />
            <p className="text-slate-400 font-bold">Semua pengembalian sudah diverifikasi.</p>
          </div>
        )}
      </main>

      <AnimatePresence>
        {rejectModal.show && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative">
              <button onClick={() => setRejectModal({show: false, loanId: null})} className="absolute top-5 right-5 text-slate-400"><X size={20}/></button>
              <h3 className="text-lg font-black text-slate-900 text-center mb-4">Alasan Penolakan</h3>
              <textarea
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder="Kenapa ditolak? (Misal: Foto buram, barang rusak)"
                className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none resize-none focus:border-red-400 transition-colors"
                autoFocus
              />
              <button
                onClick={submitReject}
                disabled={isRejecting || !reasonInput.trim()}
                className="w-full mt-4 py-4 bg-red-500 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-red-500/20 active:scale-95 disabled:bg-slate-200"
              >
                {isRejecting ? <Loader2 className="animate-spin" size={18}/> : <><Send size={18}/> Kirim Penolakan</>}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {zoomedImage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[120] bg-black/90 flex items-center justify-center p-4" onClick={() => setZoomedImage(null)}>
            <img src={zoomedImage} className="max-w-full max-h-full object-contain rounded-lg" alt="Zoomed Proof" />
            <button className="absolute top-6 right-6 text-white bg-white/10 p-2 rounded-full backdrop-blur-md hover:bg-white/20"><XCircle size={32}/></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}