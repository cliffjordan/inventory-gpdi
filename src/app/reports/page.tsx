"use client";

import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, Calendar, FileSpreadsheet, Loader2, PieChart, BarChart3, TrendingUp, Users, Filter, Download, Trophy, X, Medal, Crown
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart as RePieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'attendance'>('inventory');
  
  // Data State
  const [inventoryStats, setInventoryStats] = useState<any[]>([]);
  const [topItems, setTopItems] = useState<any[]>([]);
  
  const [attendanceTrends, setAttendanceTrends] = useState<any[]>([]);
  const [topAttendees, setTopAttendees] = useState<any[]>([]); // Data Chart (Top 5)
  const [fullRankings, setFullRankings] = useState<any[]>([]); // [BARU] Data Lengkap (Semua)

  const [loading, setLoading] = useState(true);

  // Modal State
  const [showRankingModal, setShowRankingModal] = useState(false); // [BARU] Control Modal

  // Date Filter State
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const defaultEnd = now.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. INVENTORY STATS
      let loanQuery = supabase.from('loans').select('status, variants(items(name))');
      if (startDate) loanQuery = loanQuery.gte('borrow_date', startDate);
      if (endDate) loanQuery = loanQuery.lte('borrow_date', endDate);
      
      const { data: loans } = await loanQuery;
      
      const statusCounts = { dipinjam: 0, kembali: 0, pending: 0 };
      const itemCounts: Record<string, number> = {};

      loans?.forEach((l: any) => {
        if(l.status === 'dipinjam') statusCounts.dipinjam++;
        else if(l.status === 'dikembalikan') statusCounts.kembali++;
        else statusCounts.pending++;

        const name = l.variants?.items?.name;
        if(name) itemCounts[name] = (itemCounts[name] || 0) + 1;
      });

      setInventoryStats([
        { name: 'Dipinjam', value: statusCounts.dipinjam, color: '#3B82F6' },
        { name: 'Kembali', value: statusCounts.kembali, color: '#10B981' },
        { name: 'Pending', value: statusCounts.pending, color: '#F59E0B' },
      ]);

      const sortedItems = Object.entries(itemCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      setTopItems(sortedItems);

      // 2. ATTENDANCE DATA
      let attQuery = supabase
        .from('attendance')
        .select('date, status, profiles(full_name)') 
        .order('date', { ascending: true });
      
      if (startDate) attQuery = attQuery.gte('date', startDate);
      if (endDate) attQuery = attQuery.lte('date', endDate);

      const { data: attendance } = await attQuery;
      
      const trends: Record<string, any> = {};
      const attendeeCounts: Record<string, number> = {};

      attendance?.forEach((a: any) => {
        // Tren
        const dateStr = new Date(a.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        if(!trends[dateStr]) trends[dateStr] = { date: dateStr, hadir: 0, izin: 0, sakit: 0, alpa: 0 };
        
        if(a.status === 'hadir') {
            trends[dateStr].hadir++;
            
            // Hitung Rajin
            const name = a.profiles?.full_name;
            if (name) {
                // Gunakan nama pendek agar rapi di chart
                const shortName = name.split(' ')[0] + ' ' + (name.split(' ')[1]?.[0] || '') + '.';
                attendeeCounts[shortName] = (attendeeCounts[shortName] || 0) + 1;
            }
        }
        else if(a.status === 'izin') trends[dateStr].izin++;
        else if(a.status === 'sakit') trends[dateStr].sakit++;
        else trends[dateStr].alpa++;
      });

      setAttendanceTrends(Object.values(trends));

      // [BARU] Sort & Simpan Data Lengkap
      const allAttendees = Object.entries(attendeeCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count); // Urutkan dari terbanyak
      
      setFullRankings(allAttendees); // Simpan semua untuk modal
      setTopAttendees(allAttendees.slice(0, 5)); // Simpan 5 teratas untuk chart

    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  const handleDownload = async () => {
    if (!startDate || !endDate) { toast.error("Pastikan tanggal sudah dipilih!"); return; }
    setIsExporting(true);
    const toastId = toast.loading("Sedang membuat file Excel...");
    try {
      let csvContent = "";
      let fileName = "";
      if (activeTab === 'inventory') {
        const { data } = await supabase.from('loans').select(`borrow_date, return_date, status, profiles(full_name), variants(items(name))`).gte('borrow_date', startDate).lte('borrow_date', endDate).order('borrow_date', { ascending: false });
        csvContent = "Tgl Pinjam,Tgl Kembali,Peminjam,Barang,Status\n";
        data?.forEach((row: any) => { csvContent += `"${row.borrow_date}","${row.return_date || '-'}","${row.profiles?.full_name}","${row.variants?.items?.name}","${row.status}"\n`; });
        fileName = `Laporan_Inventory_${startDate}_sd_${endDate}.csv`;
      } else {
        const { data } = await supabase.from('attendance').select(`date, status, activity_name, notes, profiles(full_name, no_induk)`).gte('date', startDate).lte('date', endDate).order('date', { ascending: false });
        csvContent = "Tanggal,Kegiatan,No Induk,Nama,Status,Catatan\n";
        data?.forEach((row: any) => { csvContent += `"${row.date}","${row.activity_name || '-'}","${row.profiles?.no_induk}","${row.profiles?.full_name}","${row.status}","${row.notes || '-'}"\n`; });
        fileName = `Laporan_Absensi_${startDate}_sd_${endDate}.csv`;
      }
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Berhasil diunduh!", { id: toastId });
    } catch (e: any) { toast.error("Gagal: " + e.message, { id: toastId }); } finally { setIsExporting(false); }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 pb-12 font-sans text-slate-800">
      
      {/* HEADER & GLOBAL FILTER */}
      <header className="mb-8">
        <div className="flex items-center gap-4 mb-6">
            <Link href="/dashboard" className="p-2 rounded-full bg-slate-200 hover:bg-slate-300 transition">
            <ChevronLeft size={24}/>
            </Link>
            <div>
            <h1 className="text-2xl font-black text-slate-900">Laporan & Statistik</h1>
            <p className="text-sm text-slate-400">Analisa data real-time berdasarkan periode.</p>
            </div>
        </div>

        <div className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-end md:items-center gap-4">
            <div className="flex-1 w-full grid grid-cols-2 gap-3">
                <div className="relative">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Dari Tanggal</label>
                    <div className="relative">
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
                        <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                    </div>
                </div>
                <div className="relative">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Sampai Tanggal</label>
                    <div className="relative">
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
                        <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                    </div>
                </div>
            </div>
            <button onClick={handleDownload} disabled={isExporting || loading} className={`w-full md:w-auto px-6 py-3 rounded-xl font-black text-white flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 whitespace-nowrap h-[46px] ${activeTab === 'inventory' ? 'bg-blue-600 shadow-blue-500/30 hover:bg-blue-700' : 'bg-violet-600 shadow-violet-500/30 hover:bg-violet-700'}`}>
                {isExporting ? <Loader2 className="animate-spin" size={20}/> : <Download size={20}/>} <span className="text-sm">Download Excel</span>
            </button>
        </div>
      </header>

      {/* TABS */}
      <div className="flex p-1 bg-slate-200 rounded-2xl mb-8 max-w-md mx-auto">
        <button onClick={() => setActiveTab('inventory')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'inventory' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}><BarChart3 size={16}/> Inventory</button>
        <button onClick={() => setActiveTab('attendance')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'attendance' ? 'bg-white shadow-sm text-violet-600' : 'text-slate-500 hover:text-slate-700'}`}><Users size={16}/> Kehadiran</button>
      </div>

      <div className="space-y-6">
        {loading ? ( <div className="py-20 flex flex-col items-center justify-center text-slate-300"><Loader2 className="animate-spin mb-2" size={32}/><p className="text-xs font-bold">Memuat data...</p></div> ) : activeTab === 'inventory' ? (
          <>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm"><h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><PieChart size={20} className="text-blue-500"/> Status Transaksi (Periode Ini)</h3><div className="h-64 w-full">{inventoryStats.reduce((acc, curr) => acc + curr.value, 0) > 0 ? (<ResponsiveContainer width="100%" height="100%"><RePieChart><Pie data={inventoryStats} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{inventoryStats.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}</Pie><Tooltip /><Legend verticalAlign="bottom" height={36}/></RePieChart></ResponsiveContainer>) : (<div className="h-full flex items-center justify-center text-slate-300 text-xs font-bold">Tidak ada data transaksi.</div>)}</div></div>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm"><h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><TrendingUp size={20} className="text-emerald-500"/> Barang Paling Sering Dipinjam</h3><div className="h-64 w-full">{topItems.length > 0 ? (<ResponsiveContainer width="100%" height="100%"><BarChart data={topItems} layout="vertical" margin={{ left: 20 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={100} style={{ fontSize: '10px', fontWeight: 'bold' }} /><Tooltip cursor={{ fill: 'transparent' }} /><Bar dataKey="count" fill="#10B981" radius={[0, 10, 10, 0]} barSize={20} /></BarChart></ResponsiveContainer>) : (<div className="h-full flex items-center justify-center text-slate-300 text-xs font-bold">Belum ada barang dipinjam.</div>)}</div></div>
          </>
        ) : (
          <>
            {/* GRAFIK TREN */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><TrendingUp size={20} className="text-violet-500"/> Grafik Kehadiran</h3>
              <div className="h-64 w-full">
                {attendanceTrends.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={attendanceTrends}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" style={{ fontSize: '10px', fontWeight: 'bold' }} tick={{fill: '#94a3b8'}} />
                        <YAxis style={{ fontSize: '10px' }} tick={{fill: '#94a3b8'}} />
                        <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} />
                        <Legend />
                        <Line type="monotone" name="Hadir" dataKey="hadir" stroke="#10B981" strokeWidth={3} dot={{r: 4}} />
                        <Line type="monotone" name="Izin" dataKey="izin" stroke="#3B82F6" strokeWidth={2} dot={false} />
                        <Line type="monotone" name="Sakit" dataKey="sakit" stroke="#F59E0B" strokeWidth={2} dot={false} />
                        <Line type="monotone" name="Alpa" dataKey="alpa" stroke="#EF4444" strokeWidth={2} dot={false} />
                    </LineChart>
                    </ResponsiveContainer>
                ) : ( <div className="h-full flex items-center justify-center text-slate-300 text-xs font-bold">Tidak ada data absensi.</div> )}
              </div>
            </div>

            {/* CHART TOP 5 (CLICKABLE) */}
            <div 
                onClick={() => setShowRankingModal(true)}
                className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm cursor-pointer group hover:border-amber-200 hover:shadow-md transition-all relative overflow-hidden"
            >
              <div className="flex justify-between items-center mb-6 relative z-10">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Trophy size={20} className="text-amber-500"/> Top 5 Paling Rajin
                </h3>
                <span className="text-[10px] text-blue-600 bg-blue-50 px-3 py-1 rounded-full font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    Lihat Semua
                </span>
              </div>
              <div className="h-64 w-full relative z-10">
                {topAttendees.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topAttendees} layout="vertical" margin={{ left: 0, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={100} style={{ fontSize: '11px', fontWeight: 'bold', fill:'#475569' }} tickLine={false}/>
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} cursor={{fill: 'transparent'}}/>
                        <Bar dataKey="count" radius={[0, 10, 10, 0]} barSize={24}>
                            {topAttendees.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === 0 ? '#F59E0B' : '#3B82F6'} />
                            ))}
                        </Bar>
                    </BarChart>
                    </ResponsiveContainer>
                ) : ( <div className="h-full flex items-center justify-center text-slate-300 text-xs font-bold">Belum ada data kehadiran.</div> )}
              </div>
              {/* Background Decoration */}
              <Trophy size={120} className="absolute -bottom-6 -right-6 text-amber-500/5 rotate-12 group-hover:scale-110 transition-transform"/>
            </div>
          </>
        )}
      </div>

      {/* --- MODAL PERINGKAT LENGKAP --- */}
      <AnimatePresence>
        {showRankingModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl relative flex flex-col max-h-[85vh]"
                >
                    {/* Modal Header */}
                    <div className="p-6 pb-4 border-b border-slate-100 bg-white sticky top-0 z-10 flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                <Trophy size={24} className="text-amber-500"/> Leaderboard
                            </h3>
                            <p className="text-xs text-slate-400 font-medium mt-1">
                                Peringkat kehadiran periode ini.
                            </p>
                        </div>
                        <button onClick={() => setShowRankingModal(false)} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition">
                            <X size={20}/>
                        </button>
                    </div>

                    {/* Modal Body (Scrollable List) */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50">
                        {fullRankings.map((person, index) => {
                            let rankIcon;
                            let bgColor = "bg-white";
                            let textColor = "text-slate-600";
                            
                            if (index === 0) {
                                rankIcon = <Crown size={18} className="text-yellow-500 fill-yellow-500"/>;
                                bgColor = "bg-yellow-50 border-yellow-200";
                                textColor = "text-yellow-700";
                            } else if (index === 1) {
                                rankIcon = <Medal size={18} className="text-slate-400 fill-slate-400"/>;
                                bgColor = "bg-slate-100 border-slate-200";
                                textColor = "text-slate-700";
                            } else if (index === 2) {
                                rankIcon = <Medal size={18} className="text-amber-700 fill-amber-700"/>;
                                bgColor = "bg-orange-50 border-orange-200";
                                textColor = "text-orange-800";
                            } else {
                                rankIcon = <span className="text-xs font-bold text-slate-400">#{index + 1}</span>;
                            }

                            return (
                                <div key={index} className={`flex items-center justify-between p-4 rounded-2xl border shadow-sm ${bgColor}`}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 flex items-center justify-center shrink-0">
                                            {rankIcon}
                                        </div>
                                        <p className={`font-bold text-sm ${textColor}`}>{person.name}</p>
                                    </div>
                                    <div className="px-3 py-1 bg-white rounded-lg text-xs font-black shadow-sm border border-slate-100">
                                        {person.count} <span className="text-[9px] text-slate-400 font-normal">Hadir</span>
                                    </div>
                                </div>
                            );
                        })}
                        {fullRankings.length === 0 && (
                            <div className="text-center py-10 text-slate-400 text-xs">Belum ada data.</div>
                        )}
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

    </div>
  );
}