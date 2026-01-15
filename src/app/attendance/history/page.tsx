"use client";

import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, Calendar, Search, User, FileText, Filter, X, 
  ChevronDown, ChevronUp, Users, Trash2, Edit3, AlertCircle, CheckCircle2, Save, Loader2, AlertTriangle 
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function AttendanceHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  
  // Data
  const [groupedLogs, setGroupedLogs] = useState<any[]>([]);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  // Filter
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [searchName, setSearchName] = useState("");

  // State Modal Edit (Request Change)
  const [editingLog, setEditingLog] = useState<any>(null);
  const [newStatus, setNewStatus] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- STATE BARU: MODAL DELETE ---
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, date: string | null }>({ isOpen: false, date: null });

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (profile) fetchLogs();
  }, [profile, selectedMonth]); 

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(data);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('attendance')
        .select(`
          id, date, status, notes, activity_name,
          profiles (full_name, no_induk, avatar_url)
        `)
        .order('date', { ascending: false });

      // Filter Bulan
      const startOfMonth = `${selectedMonth}-01`;
      const endOfMonth = `${selectedMonth}-31`; 
      query = query.gte('date', startOfMonth).lte('date', endOfMonth);

      // Filter Role
      if (profile.role === 'member') {
        query = query.eq('user_id', profile.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      // --- LOGIKA GROUPING ---
      const groups: Record<string, any> = {};
      
      data?.forEach((log: any) => {
        const dateKey = log.date;
        
        if (!groups[dateKey]) {
          groups[dateKey] = {
            date: dateKey,
            activity: log.activity_name || "Kegiatan Rutin",
            total: 0,
            stats: { hadir: 0, izin: 0, sakit: 0, alpa: 0 },
            records: [] 
          };
        }

        groups[dateKey].records.push(log);
        groups[dateKey].total++;
        
        if (log.status === 'hadir') groups[dateKey].stats.hadir++;
        else if (log.status === 'izin') groups[dateKey].stats.izin++;
        else if (log.status === 'sakit') groups[dateKey].stats.sakit++;
        else if (log.status === 'alpa') groups[dateKey].stats.alpa++;
      });

      const sortedGroups = Object.values(groups).sort((a: any, b: any) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setGroupedLogs(sortedGroups);

    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  // --- LOGIC DELETE (MEMBUKA MODAL) ---
  const openDeleteModal = (date: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    setDeleteModal({ isOpen: true, date: date });
  };

  // --- LOGIC EKSEKUSI HAPUS (SETELAH KLIK YA) ---
  const executeDeleteSession = async () => {
    if (!deleteModal.date) return;

    setIsSubmitting(true);
    const toastId = toast.loading("Menghapus sesi...");
    try {
        const { error } = await supabase.from('attendance').delete().eq('date', deleteModal.date);
        if (error) throw error;
        
        toast.success("Sesi berhasil dihapus", { id: toastId });
        setDeleteModal({ isOpen: false, date: null }); // Tutup modal
        fetchLogs(); // Refresh data
    } catch (err: any) {
        toast.error("Gagal: " + err.message, { id: toastId });
    } finally {
        setIsSubmitting(false);
    }
  };

  // --- FITUR 1: EDIT STATUS (REQUEST/DIRECT) ---
  const handleEditClick = (log: any) => {
    setEditingLog(log);
    setNewStatus(log.status);
    setChangeReason("");
  };

  const submitStatusChange = async () => {
    if (!newStatus) return;
    setIsSubmitting(true);
    const toastId = toast.loading("Memproses...");

    try {
        if (profile?.role === 'superuser') {
            const { error } = await supabase.from('attendance')
                .update({ status: newStatus, notes: changeReason ? changeReason : undefined })
                .eq('id', editingLog.id);
            if (error) throw error;
            toast.success("Status berhasil diubah (Superuser)", { id: toastId });
        } else {
            if (!changeReason) {
                toast.error("Admin wajib mengisi alasan perubahan!", { id: toastId });
                setIsSubmitting(false);
                return;
            }
            const { error } = await supabase.from('attendance_change_requests').insert({
                attendance_id: editingLog.id,
                old_status: editingLog.status,
                new_status: newStatus,
                reason: changeReason,
                requested_by: profile.id,
                status: 'pending'
            });
            if (error) throw error;
            toast.success("Request dikirim ke Superuser!", { id: toastId });
        }
        
        setEditingLog(null);
        fetchLogs();
    } catch (err: any) {
        toast.error("Gagal: " + err.message, { id: toastId });
    } finally {
        setIsSubmitting(false);
    }
  };

  const toggleDate = (date: string) => {
    if (expandedDate === date) setExpandedDate(null);
    else setExpandedDate(date);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'hadir': return 'bg-green-100 text-green-700';
      case 'izin': return 'bg-blue-100 text-blue-700';
      case 'sakit': return 'bg-amber-100 text-amber-700';
      case 'alpa': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-500';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans text-slate-800">
      
      {/* HEADER */}
      <div className="bg-white sticky top-0 z-30 border-b border-slate-100 shadow-sm px-6 py-4">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/dashboard" className="p-2 rounded-full bg-slate-50 hover:bg-slate-100 transition">
            <ChevronLeft size={24} className="text-slate-600"/>
          </Link>
          <div>
            <h1 className="text-xl font-black text-slate-900">Riwayat Kehadiran</h1>
            <p className="text-xs text-slate-400">Pilih tanggal untuk melihat detail</p>
          </div>
        </div>
        <div className="relative">
            <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500"/>
            <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
        </div>
      </div>

      {/* CONTENT LIST */}
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        {loading ? (
          <div className="text-center py-20 text-slate-400 text-sm">Memuat data...</div>
        ) : groupedLogs.length > 0 ? (
          groupedLogs.map((group) => (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={group.date} className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden">
              
              {/* HEADER KARTU */}
              <button onClick={() => toggleDate(group.date)} className="w-full p-5 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors text-left group">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center w-14 h-14 bg-blue-50 rounded-2xl text-blue-600 shrink-0">
                        <span className="text-[10px] font-bold uppercase">{new Date(group.date).toLocaleString('id-ID', { month: 'short' })}</span>
                        <span className="text-xl font-black leading-none">{new Date(group.date).getDate()}</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 text-sm">{group.activity}</h3>
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                            <span className="flex items-center gap-1"><Users size={10}/> {group.total} Orang</span>
                            <span className="text-green-600 font-bold bg-green-50 px-1.5 rounded">H:{group.stats.hadir}</span>
                            <span className="text-red-500 font-bold bg-red-50 px-1.5 rounded">A:{group.stats.alpa}</span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* TOMBOL DELETE (MEMBUKA MODAL CUSTOM) */}
                    {(profile?.role === 'admin' || profile?.role === 'superuser') && (
                        <div onClick={(e) => openDeleteModal(group.date, e)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition cursor-pointer">
                            <Trash2 size={18}/>
                        </div>
                    )}
                    {expandedDate === group.date ? <ChevronUp size={20} className="text-slate-300"/> : <ChevronDown size={20} className="text-slate-300"/>}
                </div>
              </button>

              {/* BODY KARTU */}
              <AnimatePresence>
                {expandedDate === group.date && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-slate-50 border-t border-slate-100">
                        <div className="p-2 space-y-1">
                            {/* Search bar dalam detail */}
                            {group.records.length > 5 && profile?.role !== 'member' && (
                                <div className="px-2 mb-2 relative">
                                    <Search size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"/>
                                    <input type="text" placeholder="Cari nama..." onChange={(e) => setSearchName(e.target.value)} className="w-full pl-9 py-2 bg-white rounded-lg text-xs border border-slate-200 outline-none"/>
                                </div>
                            )}

                            {group.records
                                .filter((rec: any) => !searchName || rec.profiles.full_name.toLowerCase().includes(searchName.toLowerCase()))
                                .map((record: any) => (
                                    <div key={record.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 ml-2 mr-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 overflow-hidden">
                                                {record.profiles?.avatar_url ? <img src={record.profiles.avatar_url} className="w-full h-full object-cover"/> : record.profiles?.full_name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-xs">{record.profiles?.full_name}</p>
                                                {record.notes ? (
                                                    <p className="text-[10px] text-slate-400 italic">"{record.notes}"</p>
                                                ) : (
                                                    <p className="text-[9px] text-slate-300 font-medium">
                                                        {record.status === 'hadir' ? 'Rajin ✨' : 'Absen'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase ${getStatusColor(record.status)}`}>
                                                {record.status}
                                            </span>
                                            {(profile?.role === 'admin' || profile?.role === 'superuser') && (
                                                <button onClick={() => handleEditClick(record)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                                                    <Edit3 size={14}/>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-20 text-slate-300 text-sm">Tidak ada riwayat bulan ini.</div>
        )}
      </div>

      {/* --- MODAL KONFIRMASI HAPUS (CUSTOM UI) --- */}
      <AnimatePresence>
        {deleteModal.isOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative text-center"
                >
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100 shadow-inner">
                        <AlertTriangle size={32} strokeWidth={2}/>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">Hapus Sesi Absensi?</h3>
                    <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                        Anda akan menghapus seluruh data absensi pada tanggal <span className="font-bold text-slate-800">{deleteModal.date}</span>. Tindakan ini <span className="text-red-500 font-bold">tidak bisa dibatalkan</span>.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => setDeleteModal({ isOpen: false, date: null })} 
                            className="py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition"
                        >
                            Batal
                        </button>
                        <button 
                            onClick={executeDeleteSession} 
                            disabled={isSubmitting}
                            className="py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition shadow-lg shadow-red-500/30 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" size={18}/> : <Trash2 size={18}/>}
                            Ya, Hapus
                        </button>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* --- MODAL EDIT STATUS --- */}
      <AnimatePresence>
        {editingLog && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-black text-slate-900 text-lg">Ubah Status Absensi</h3>
                        <button onClick={() => setEditingLog(null)} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:bg-slate-100"><X size={20}/></button>
                    </div>
                    
                    <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-xs font-bold text-slate-500 shadow-sm">
                            {editingLog.profiles?.full_name.charAt(0)}
                        </div>
                        <div>
                            <p className="font-bold text-slate-800 text-sm">{editingLog.profiles?.full_name}</p>
                            <p className="text-xs text-slate-400">{new Date(editingLog.date).toLocaleDateString('id-ID', { dateStyle: 'full' })}</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Status Baru</label>
                            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="w-full mt-1 p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500">
                                <option value="hadir">Hadir ✅</option>
                                <option value="izin">Izin 📩</option>
                                <option value="sakit">Sakit 💊</option>
                                <option value="alpa">Alpa ❌</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Alasan Perubahan {profile?.role !== 'superuser' && <span className="text-red-500">*</span>}</label>
                            <textarea 
                                value={changeReason} 
                                onChange={(e) => setChangeReason(e.target.value)}
                                placeholder={profile?.role === 'superuser' ? "Catatan opsional..." : "Wajib diisi untuk approval Superuser..."}
                                className="w-full mt-1 p-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-blue-500 h-24 resize-none"
                            />
                        </div>

                        {profile?.role !== 'superuser' && (
                            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex gap-2 text-amber-700 text-xs font-medium">
                                <AlertCircle size={16} className="shrink-0 mt-0.5"/>
                                <p>Perubahan ini akan berstatus <b>Pending</b> sampai disetujui Superuser.</p>
                            </div>
                        )}

                        <button onClick={submitStatusChange} disabled={isSubmitting} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:bg-slate-300">
                            {isSubmitting ? <Loader2 className="animate-spin"/> : <Save size={18}/>}
                            {profile?.role === 'superuser' ? "Simpan Perubahan" : "Ajukan Perubahan"}
                        </button>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

    </div>
  );
}