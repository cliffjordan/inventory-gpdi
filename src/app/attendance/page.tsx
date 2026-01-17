"use client";

import React, { useState, useEffect } from 'react';
import { ChevronLeft, Save, Calendar, User, FileText, CheckCircle2, AlertCircle, Plus, UserPlus, X, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function AttendancePage() {
  const router = useRouter();

  // --- STATE DATA ---
  const [profile, setProfile] = useState<any>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [activityName, setActivityName] = useState("");
  const [members, setMembers] = useState<any[]>([]);

  // State Absensi Lokal
  const [attendanceData, setAttendanceData] = useState<Record<string, { status: string, notes: string }>>({});

  // State UI
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // State Modal Tambah Anggota
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [isAddingMember, setIsAddingMember] = useState(false);

  useEffect(() => { fetchUserData(); }, []);
  useEffect(() => { if(profile) fetchData(); }, [date, profile]);

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(data);
    }
  };

const fetchData = async () => {
    setLoading(true);
    setIsLocked(false);
    try {
      // [FIX] Pastikan tidak mengambil superuser atau admin, hanya pure member
      const { data: memberData } = await supabase
    .from('profiles')
    .select('*')
    .in('role', ['member', 'admin']) // <--- UPDATE INI
    .order('full_name');  

      setMembers(memberData || []);

      const { data: existingData } = await supabase.from('attendance').select('user_id, status, notes, activity_name').eq('date', date);
      const map: Record<string, { status: string, notes: string }> = {};

      if (existingData && existingData.length > 0) {
        if (profile?.role !== 'superuser') { setIsLocked(true); }
        setActivityName(existingData[0].activity_name || "");
        existingData.forEach((record: any) => { map[record.user_id] = { status: record.status, notes: record.notes || "" }; });
      } else {
        setActivityName("");
      }
      setAttendanceData(map);
    } catch (error) { console.error(error); toast.error("Gagal memuat data"); } finally { setLoading(false); }
  };

  const handleStatusChange = (userId: string, status: string) => {
    if (isLocked) return;
    setAttendanceData(prev => ({ ...prev, [userId]: { status, notes: status === 'izin' ? (prev[userId]?.notes || "") : "" } }));
  };

  const handleNotesChange = (userId: string, text: string) => {
    if (isLocked) return;
    setAttendanceData(prev => ({ ...prev, [userId]: { ...prev[userId], notes: text } }));
  };

  // --- PERBAIKAN UTAMA DI SINI (UPSERT) ---
  const handleSubmitAll = async () => {
    if (isLocked) { toast.error("Data terkunci!"); return; }
    if (!activityName.trim()) { toast.error("Mohon isi Nama Kegiatan!"); return; }

    setIsSubmitting(true);
    const toastId = toast.loading("Menyimpan...");

    try {
      const upsertPayload = members.map(member => {
        const userData = attendanceData[member.id];
        return {
          user_id: member.id,
          date: date,
          status: userData?.status || 'alpa',
          notes: userData?.notes || '',
          activity_name: activityName,
          is_locked: true
        };
      });

      // Menggunakan upsert dengan onConflict pada kolom (user_id, date)
      // Pastikan Anda sudah menjalankan SQL constraint di Langkah 1
      const { error } = await supabase
        .from('attendance')
        .upsert(upsertPayload, { onConflict: 'user_id, date' });

      if (error) throw error;

      toast.success("Berhasil disimpan!", { id: toastId });
      fetchData();
    } catch (error: any) {
      toast.error("Gagal: " + error.message, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMemberName) { toast.error("Nama wajib diisi"); return; }
    setIsAddingMember(true);

    try {
      const { data: lastMembers } = await supabase
        .from('profiles')
        .select('no_induk')
        .ilike('no_induk', 'CM-UNR-%')
        .order('no_induk', { ascending: false })
        .limit(1);

      let nextNumber = 1;
      if (lastMembers && lastMembers.length > 0) {
        const lastId = lastMembers[0].no_induk;
        const parts = lastId.split('-');
        const lastDigits = parts[parts.length - 1];
        const num = parseInt(lastDigits);
        if (!isNaN(num)) nextNumber = num + 1;
      }

      const autoInduk = `CM-UNR-${String(nextNumber).padStart(3, '0')}`;

      const { error } = await supabase.from('profiles').insert({
        id: crypto.randomUUID(),
        full_name: newMemberName,
        no_induk: autoInduk,
        role: 'member',
        phone_number: null,
        avatar_url: null
      });

      if (error) throw error;
      toast.success(`Anggota ditambahkan! ID: ${autoInduk}`);
      setShowAddMember(false);
      setNewMemberName("");
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal: " + err.message);
    } finally {
      setIsAddingMember(false);
    }
  };

  const getStats = () => {
    let s = { hadir: 0, izin: 0, sakit: 0, alpa: 0, kosong: 0 };
    members.forEach(m => {
      const st = attendanceData[m.id]?.status;
      if (st === 'hadir') s.hadir++;
      else if (st === 'izin') s.izin++;
      else if (st === 'sakit') s.sakit++;
      else if (st === 'alpa') s.alpa++;
      else s.kosong++;
    });
    return s;
  };
  const stats = getStats();

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32 font-sans text-slate-800">
      <header className="bg-white/90 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100 px-6 py-4 shadow-sm">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="p-2 rounded-full bg-slate-50 hover:bg-slate-100 transition"><ChevronLeft size={24} className="text-slate-600"/></Link>
              <div><h1 className="text-xl font-black text-slate-900">Input Absensi</h1><p className="text-xs text-slate-400">{isLocked ? <span className="text-red-500 font-bold flex items-center gap-1"><AlertCircle size={10}/> TERKUNCI (Read Only)</span> : "Pastikan data benar sebelum simpan"}</p></div>
            </div>
            <button onClick={() => setShowAddMember(true)} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition flex items-center gap-2 text-xs font-bold border border-blue-100"><UserPlus size={18}/> <span className="hidden sm:inline">Anggota Baru</span></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="relative"><label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Tanggal</label><div className="relative mt-1"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 border border-slate-200"/><Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/></div></div>
            <div><label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nama Kegiatan</label><input type="text" placeholder="Contoh: Ibadah Raya Minggu" value={activityName} readOnly={isLocked} onChange={(e) => setActivityName(e.target.value)} className="w-full mt-1 px-4 py-2.5 bg-white rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 border border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"/></div>
          </div>
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide"><StatBadge label="Hadir" count={stats.hadir} color="bg-green-100 text-green-700" /><StatBadge label="Izin" count={stats.izin} color="bg-blue-100 text-blue-700" /><StatBadge label="Sakit" count={stats.sakit} color="bg-amber-100 text-amber-700" /><StatBadge label="Alpa" count={stats.alpa} color="bg-red-100 text-red-700" /><StatBadge label="Belum" count={stats.kosong} color="bg-slate-200 text-slate-500" /></div>
        </div>
      </header>

      <main className="p-6 max-w-3xl mx-auto space-y-4">
        {loading ? (<div className="text-center py-20"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div><p className="text-slate-400 font-bold">Memuat data...</p></div>) : (members.map((member) => {
          const currentStatus = attendanceData[member.id]?.status;
          return (
            <div key={member.id} className={`p-4 rounded-[1.5rem] border transition-all duration-300 ${currentStatus ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-80 hover:opacity-100'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-200 rounded-2xl overflow-hidden flex items-center justify-center text-slate-400 shrink-0">{member.avatar_url ? <img src={member.avatar_url} className="w-full h-full object-cover"/> : <User size={24}/>}</div>
                  <div>
                    <h3 className="font-bold text-slate-800">{member.full_name}</h3>
                    <p className="text-xs text-slate-400 font-mono flex items-center gap-2">
                      {member.no_induk}
                      {member.no_induk?.startsWith('CM-UNR') && <span className="bg-amber-100 text-amber-700 text-[9px] px-1.5 py-0.5 rounded font-bold">MANUAL</span>}
                    </p>
                  </div>
                </div>
                <div className={`flex items-center gap-2 ${isLocked ? 'pointer-events-none opacity-60' : ''}`}><ChoiceBtn label="Hadir" active={currentStatus === 'hadir'} onClick={() => handleStatusChange(member.id, 'hadir')} activeColor="bg-green-500 text-white shadow-lg shadow-green-500/30 ring-2 ring-green-500 ring-offset-2"/><ChoiceBtn label="Izin" active={currentStatus === 'izin'} onClick={() => handleStatusChange(member.id, 'izin')} activeColor="bg-blue-500 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-500 ring-offset-2"/><ChoiceBtn label="Sakit" active={currentStatus === 'sakit'} onClick={() => handleStatusChange(member.id, 'sakit')} activeColor="bg-amber-500 text-white shadow-lg shadow-amber-500/30 ring-2 ring-amber-500 ring-offset-2"/><ChoiceBtn label="Alpa" active={currentStatus === 'alpa'} onClick={() => handleStatusChange(member.id, 'alpa')} activeColor="bg-red-500 text-white shadow-lg shadow-red-500/30 ring-2 ring-red-500 ring-offset-2"/></div>
              </div>
              {currentStatus === 'izin' && (<div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300"><div className="flex items-center gap-2 bg-blue-50 p-3 rounded-xl border border-blue-100"><FileText size={18} className="text-blue-500 shrink-0"/><input type="text" placeholder="Tulis alasan izin..." value={attendanceData[member.id]?.notes || ""} readOnly={isLocked} onChange={(e) => handleNotesChange(member.id, e.target.value)} className="w-full bg-transparent text-sm font-bold text-blue-800 placeholder-blue-300 outline-none"/></div></div>)}
            </div>
          );
        }))}
      </main>

      {!isLocked ? (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-slate-100 z-40"><div className="max-w-3xl mx-auto flex items-center justify-between gap-4"><div className="hidden sm:block"><p className="text-xs font-bold text-slate-400">Total Anggota</p><p className="text-xl font-black text-slate-800">{members.length} <span className="text-sm font-medium text-slate-400">Orang</span></p></div><button onClick={handleSubmitAll} disabled={isSubmitting ||
          loading} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl shadow-slate-900/20 hover:bg-slate-800 active:scale-95 transition-all disabled:bg-slate-300 disabled:shadow-none flex items-center justify-center gap-3">{isSubmitting ?
          <Loader2 className="animate-spin" /> : <Save size={24}/>} SIMPAN & KUNCI</button></div></div>
      ) : (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-red-50 border-t border-red-100 z-40 text-center"><p className="text-xs font-bold text-red-500 flex items-center justify-center gap-2"><AlertCircle size={16}/> ABSENSI HARI INI SUDAH DIKUNCI</p></div>
      )}

      {/* MODAL TAMBAH ANGGOTA */}
      <AnimatePresence>
        {showAddMember && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl relative">
              <button onClick={() => setShowAddMember(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900"><X size={20}/></button>
              <h2 className="text-xl font-black text-slate-900 mb-2 text-center">Anggota Baru</h2>
              <p className="text-xs text-slate-400 text-center mb-6">Untuk anak-anak yang belum punya HP. No Induk akan dibuat otomatis (CM-UNR-XXX).</p>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Nama Lengkap</label>
                  <input type="text" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-blue-500" placeholder="Misal: Budi Santoso" />
                </div>
                <button onClick={handleAddMember} disabled={isAddingMember} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:bg-slate-300">
                  {isAddingMember ? <Loader2 className="animate-spin" /> : <Plus size={20} />} Buat Akun & ID
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper Components
function ChoiceBtn({ label, active, onClick, activeColor }: any) { return (<button onClick={onClick} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${active ? activeColor : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100'}`}>{label}</button>);
}
function StatBadge({ label, count, color }: any) { return <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide whitespace-nowrap ${color}`}>{label}: {count}</span>;
}