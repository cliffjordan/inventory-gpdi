"use client";

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ArrowRightLeft, User, CheckCircle2, AlertTriangle, Loader2, Send, ShieldCheck, XCircle } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function MigrationPage() {
  const [profile, setProfile] = useState<any>(null);

  // State untuk Admin (Form)
  const [offlineMembers, setOfflineMembers] = useState<any[]>([]);
  const [onlineMembers, setOnlineMembers] = useState<any[]>([]);
  const [selectedSource, setSelectedSource] = useState("");
  const [selectedTarget, setSelectedTarget] = useState("");
  
  // State untuk Superuser (List)
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setProfile(data);
        
        if (data?.role === 'superuser') {
            fetchPendingRequests();
        } else {
            fetchMembers(); 
        }
    }
    setLoading(false);
  };

  // --- LOGIC ADMIN: LOAD MEMBER & FILTERING ---
  const fetchMembers = async () => {
    const { data } = await supabase
        .from('profiles')
        .select('id, full_name, no_induk, avatar_url')
        .eq('role', 'member')
        .order('full_name');

    if (data) {
        // FILTERING LOGIC:
        // 1. Akun Lama = Harus punya no_induk diawali 'CM-UNR'
        const offline = data.filter(m => m.no_induk && m.no_induk.startsWith('CM-UNR'));
        
        // 2. Akun Baru = Harus punya no_induk TAPI BUKAN 'CM-UNR' (Contoh: CM-001)
        const online = data.filter(m => m.no_induk && !m.no_induk.startsWith('CM-UNR'));

        setOfflineMembers(offline);
        setOnlineMembers(online);
    }
  };

  const handleSubmitRequest = async () => {
    if (!selectedSource || !selectedTarget) { toast.error("Pilih kedua akun!"); return; }
    if (selectedSource === selectedTarget) { toast.error("Akun tidak boleh sama!"); return; }

    setIsProcessing(true);
    try {
        const { error } = await supabase.from('migration_requests').insert({
            source_id: selectedSource,
            target_id: selectedTarget,
            requested_by: profile.id,
            status: 'pending'
        });
        if (error) throw error;
        toast.success("Request Migrasi Terkirim! Menunggu Superuser.");
        setSelectedSource(""); setSelectedTarget("");
    } catch (err: any) {
        toast.error("Gagal: " + err.message);
    } finally { setIsProcessing(false); }
  };

  // --- LOGIC SUPERUSER: LOAD REQUEST & EXECUTE ---
  const fetchPendingRequests = async () => {
    const { data, error } = await supabase
        .from('migration_requests')
        .select(`
            *,
            source:source_id(full_name, no_induk),
            target:target_id(full_name, no_induk),
            admin:requested_by(full_name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
    
    if (data) setPendingRequests(data);
  };

  const handleApprove = async (reqId: string, sourceId: string, targetId: string) => {
    if(!confirm("Yakin proses migrasi ini? Akun lama akan dihapus.")) return;
    setIsProcessing(true);
    const toastId = toast.loading("Memproses migrasi...");

    try {
        const { error: rpcError } = await supabase.rpc('transfer_member_data', { old_id: sourceId, new_id: targetId });
        if (rpcError) throw rpcError;

        await supabase.from('migration_requests').update({ status: 'approved' }).eq('id', reqId);

        toast.success("Migrasi Berhasil!", { id: toastId });
        fetchPendingRequests(); 
    } catch (err: any) {
        toast.error("Gagal: " + err.message, { id: toastId });
    } finally { setIsProcessing(false); }
  };

  const handleReject = async (reqId: string) => {
    if(!confirm("Tolak request ini?")) return;
    await supabase.from('migration_requests').update({ status: 'rejected' }).eq('id', reqId);
    toast.success("Request ditolak.");
    fetchPendingRequests();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin"/></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 font-sans text-slate-800">
      <header className="mb-8 flex items-center gap-4">
        <Link href="/dashboard" className="p-2 rounded-full bg-slate-200 hover:bg-slate-300 transition"><ChevronLeft size={24}/></Link>
        <div>
          <h1 className="text-2xl font-black text-slate-900">Migrasi Akun</h1>
          <p className="text-sm text-slate-400">
            {profile?.role === 'superuser' ? "Daftar Request dari Admin" : "Ajukan pemindahan data anggota"}
          </p>
        </div>
      </header>

      {/* --- TAMPILAN ADMIN (FORM REQUEST) --- */}
      {profile?.role !== 'superuser' && (
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-7 gap-6 items-start">
            
            {/* KIRI: SUMBER (HANYA CM-UNR) */}
            <div className="md:col-span-3 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center font-bold">1</div><h3 className="font-bold text-slate-800">Akun Lama (Offline)</h3></div>
              
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {offlineMembers.length > 0 ? offlineMembers.map(m => (
                  <button key={m.id} onClick={() => setSelectedSource(m.id)} className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${selectedSource === m.id ? 'bg-amber-50 border-amber-500 ring-1 ring-amber-500' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}>
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">{m.full_name.charAt(0)}</div>
                    <div className="flex-1 min-w-0"><p className="font-bold text-sm truncate">{m.full_name}</p><p className="text-[10px] text-slate-400 font-mono">{m.no_induk}</p></div>
                    {selectedSource === m.id && <CheckCircle2 size={16} className="text-amber-600"/>}
                  </button>
                )) : <div className="text-center py-8 text-slate-300 text-xs">Tidak ada akun offline</div>}
              </div>
            </div>

            <div className="hidden md:flex flex-col items-center justify-center h-full pt-20"><ArrowRightLeft size={32} className="text-slate-300 animate-pulse"/></div>

            {/* KANAN: TARGET (BUKAN CM-UNR) */}
            <div className="md:col-span-3 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-bold">2</div><h3 className="font-bold text-slate-800">Akun Baru (Resmi)</h3></div>
             

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {onlineMembers.length > 0 ? onlineMembers.map(m => (
                  <button key={m.id} disabled={m.id === selectedSource} onClick={() => setSelectedTarget(m.id)} className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${selectedTarget === m.id ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-slate-50 border-transparent hover:bg-slate-100'} ${m.id === selectedSource ? 'opacity-30 cursor-not-allowed' : ''}`}>
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 overflow-hidden">{m.avatar_url ? <img src={m.avatar_url} className="w-full h-full object-cover"/> : m.full_name.charAt(0)}</div>
                    <div className="flex-1 min-w-0"><p className="font-bold text-sm truncate">{m.full_name}</p><p className="text-[10px] text-slate-400 font-mono">{m.no_induk}</p></div>
                    {selectedTarget === m.id && <CheckCircle2 size={16} className="text-blue-600"/>}
                  </button>
                )) : <div className="text-center py-8 text-slate-300 text-xs">Tidak ada akun resmi</div>}
              </div>
            </div>

            <div className="md:col-span-7 flex justify-center mt-6">
                 <button onClick={handleSubmitRequest} disabled={!selectedSource || !selectedTarget || isProcessing} className="w-full max-w-md py-4 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl shadow-slate-900/20 hover:bg-slate-800 active:scale-95 transition-all disabled:bg-slate-300 disabled:shadow-none flex items-center justify-center gap-3">
                    {isProcessing ? <Loader2 className="animate-spin" /> : <Send size={20}/>} AJUKAN MIGRASI
                 </button>
            </div>
          </div>
      )}

      {/* --- TAMPILAN SUPERUSER (LIST REQUEST) --- */}
      {profile?.role === 'superuser' && (
          <div className="max-w-3xl mx-auto space-y-4">
            {pendingRequests.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-[2rem] border border-slate-100"><ShieldCheck size={48} className="mx-auto text-slate-200 mb-4"/><p className="text-slate-400 font-bold">Tidak ada request migrasi pending.</p></div>
            ) : (
                pendingRequests.map(req => (
                    <div key={req.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex-1 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase">Request By: {req.admin?.full_name}</div>
                                <div className="text-xs text-slate-400">{new Date(req.created_at).toLocaleDateString()}</div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div><p className="text-xs text-slate-400 font-bold uppercase">DARI (HAPUS)</p><p className="font-black text-slate-800">{req.source?.full_name}</p><p className="text-xs font-mono text-amber-600">{req.source?.no_induk}</p></div>
                                <ArrowRightLeft size={20} className="text-slate-300"/>
                                <div><p className="text-xs text-slate-400 font-bold uppercase">KE (SIMPAN)</p><p className="font-black text-slate-800">{req.target?.full_name}</p><p className="text-xs font-mono text-blue-600">{req.target?.no_induk}</p></div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                             <button onClick={() => handleReject(req.id)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition"><XCircle size={24}/></button>
                             <button onClick={() => handleApprove(req.id, req.source_id, req.target_id)} disabled={isProcessing} className="px-6 py-3 bg-green-500 text-white rounded-xl font-bold shadow-lg shadow-green-500/30 hover:bg-green-600 transition flex items-center gap-2">{isProcessing ? <Loader2 className="animate-spin" size={20}/> : <CheckCircle2 size={20}/>} PROSES</button>
                        </div>
                    </div>
                ))
            )}
          </div>
      )}
    </div>
  );
}