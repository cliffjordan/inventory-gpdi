"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ShieldAlert, Users, CheckCircle, Trash2, Activity, Search, AlertTriangle, 
  Loader2, Database, ArrowLeft, FileText, Lock, Unlock, Zap, Eye, 
  MessageSquare, Terminal, Save, Key, UserCog, Power, Download,
  HardDrive, Ghost, ThumbsUp, Upload, FileCheck, LogOut, QrCode, 
  GitGraph, Layers, BarChart3, XCircle, CheckSquare, Image as ImageIcon,
  FileWarning, RefreshCw, X, ArrowRightLeft, Bell, ChevronRight,
  Package, BoxSelect, UserPlus,
  // Icon Fitur Intelligence
  ClipboardList, Ticket, Stethoscope, History, Plus, Play, Cpu
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function SuperuserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // --- STATE DATA ---
  const [activeView, setActiveView] = useState<'menu' | 'audit' | 'sql'>('menu');
  const [systemStatus, setSystemStatus] = useState(false);
  
  // --- REAL DATA STATES ---
  const [approvals, setApprovals] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [pulseData, setPulseData] = useState([20, 45, 30, 60, 55, 80, 65, 40, 30, 50, 75, 60]);

  // --- STATE MODALS (STANDARD) ---
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [announceText, setAnnounceText] = useState("");
  const [showPinResetModal, setShowPinResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showForceResetModal, setShowForceResetModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showAutoRuleModal, setShowAutoRuleModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showForceLogoutModal, setShowForceLogoutModal] = useState(false);
  
  // --- STATE MODALS (APPROVAL FLOW) ---
  const [showApprovalListModal, setShowApprovalListModal] = useState(false);
  const [showApprovalDetailModal, setShowApprovalDetailModal] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<any>(null);

  // --- STATE MODALS (ADVANCED TOOLS - EXISTING) ---
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkTemplates, setBulkTemplates] = useState({ member: false, item: false, variant: false });
  const [showJanitorModal, setShowJanitorModal] = useState(false);
  const [janitorScanResult, setJanitorScanResult] = useState<any[]>([]);
  const [selectedTrashFiles, setSelectedTrashFiles] = useState<string[]>([]);
  const [isScanningStorage, setIsScanningStorage] = useState(false);
  const [showGhostLoanModal, setShowGhostLoanModal] = useState(false);
  const [ghostLoans, setGhostLoans] = useState<any[]>([]);
  const [selectedGhostLoans, setSelectedGhostLoans] = useState<string[]>([]);
  const [showGhostUserModal, setShowGhostUserModal] = useState(false);
  const [inactiveUsers, setInactiveUsers] = useState<any[]>([]);
  const [selectedInactiveUsers, setSelectedInactiveUsers] = useState<string[]>([]);
  const [isScanningUsers, setIsScanningUsers] = useState(false);

  // --- STATE MODALS (NEW FEATURES - INTELLIGENCE) ---
  const [showFormBuilderModal, setShowFormBuilderModal] = useState(false);
  const [formFields, setFormFields] = useState<any[]>([]);
  const [newField, setNewField] = useState({ label: '', type: 'text', required: false });
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [healthStats, setHealthStats] = useState<any>(null);
  const [showTimeMachineModal, setShowTimeMachineModal] = useState(false);
  const [itemHistory, setItemHistory] = useState<any[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);

  // --- INITIAL CHECK ---
  useEffect(() => {
    checkAccess();
    fetchSystemStatus();
    fetchApprovals();
    const interval = setInterval(() => {
        setPulseData(prev => [...prev.slice(1), Math.floor(Math.random() * 80) + 10]);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const checkAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/login'); return; }
    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (data?.role !== 'superuser') {
      toast.error("ACCESS DENIED: GOD MODE REQUIRED.");
      router.replace('/dashboard');
      return;
    }
    setLoading(false);
  };

  const fetchSystemStatus = async () => {
    const { data } = await supabase.from('system_settings').select('value').eq('key', 'maintenance_mode').single();
    setSystemStatus(data?.value === 'true');
  };

  const handleLogout = async () => {
    const toastId = toast.loading("Logging out...");
    await supabase.auth.signOut();
    toast.success("Logged out successfully", { id: toastId });
    router.replace('/login');
  };

  const logAction = async (action: string, details: string) => {
    await supabase.from('audit_logs').insert({ admin_name: 'The Architect', action, details });
  };

  // --- LOGIC DATABASE: APPROVALS (FIXED TYPESCRIPT ERROR HERE) ---
  const fetchApprovals = async () => {
    try {
        const combinedData = [];
        const { data: migrations } = await supabase.from('migration_requests').select(`*, requested_by_profile:requested_by(full_name, no_induk)`).eq('status', 'pending');
        if (migrations) {
            migrations.forEach(m => combinedData.push({ 
                id: m.id, 
                table: 'migration_requests', 
                type: 'MIGRATION', 
                // Fix: Added 'as any' to prevent build error
                user: (m.requested_by_profile as any)?.full_name || 'Unknown', 
                request: 'Migrasi Akun (Merge)', 
                details: `Source: ${m.source_id.slice(0,8)}... -> Target: ${m.target_id.slice(0,8)}...`, 
                raw: m, 
                time: new Date(m.created_at).toLocaleDateString() 
            }));
        }
        
        const { data: attendanceReqs } = await supabase.from('attendance_change_requests').select(`*, requested_by_profile:requested_by(full_name, no_induk)`).eq('status', 'pending');
        if (attendanceReqs) {
            attendanceReqs.forEach(a => combinedData.push({ 
                id: a.id, 
                table: 'attendance_change_requests', 
                type: 'ATTENDANCE', 
                // Fix: Added 'as any' to prevent build error
                user: (a.requested_by_profile as any)?.full_name || 'Unknown', 
                request: `Ubah Absensi: ${a.old_status} -> ${a.new_status}`, 
                details: `Alasan: ${a.reason}`, 
                raw: a, 
                time: new Date(a.created_at).toLocaleDateString() 
            }));
        }
        
        setApprovals(combinedData);
    } catch (err) { console.error("Error fetching approvals:", err); }
  };

  const handleApprove = async () => {
    if (!selectedApproval) return;
    const item = selectedApproval;
    const toastId = toast.loading("Executing Transaction...");
    try {
        if (item.type === 'MIGRATION') {
            const source = item.raw.source_id; const target = item.raw.target_id;
            await supabase.from('loans').update({ user_id: target }).eq('user_id', source);
            await supabase.from('transactions').update({ user_id: target }).eq('user_id', source);
            await supabase.from('attendance').update({ user_id: target }).eq('user_id', source);
            await supabase.from('profiles').delete().eq('id', source);
            await supabase.from('migration_requests').update({ status: 'approved' }).eq('id', item.id);
            await logAction("Migration", `Merged User ${source} into ${target}`);
        } else if (item.type === 'ATTENDANCE') {
            await supabase.from('attendance').update({ status: item.raw.new_status }).eq('id', item.raw.attendance_id);
            await supabase.from('attendance_change_requests').update({ status: 'approved' }).eq('id', item.id);
            await logAction("Attendance Update", `Updated attendance ID ${item.raw.attendance_id}`);
        }
        toast.success("Request Approved!", { id: toastId });
        setShowApprovalDetailModal(false);
        fetchApprovals();
    } catch (err: any) { toast.error("Error: " + err.message, { id: toastId }); }
  };

  const handleReject = async () => {
    if (!selectedApproval) return;
    const item = selectedApproval;
    const toastId = toast.loading("Rejecting...");
    try {
        await supabase.from(item.table).update({ status: 'rejected' }).eq('id', item.id);
        toast.error("Request Rejected.", { id: toastId });
        await logAction("Rejection", `Rejected ${item.type} request ID ${item.id}`);
        setShowApprovalDetailModal(false);
        fetchApprovals();
    } catch (err: any) { toast.error("Error: " + err.message, { id: toastId }); }
  };

  // --- EXISTING TOOLS LOGIC ---
  const toggleLockdown = async () => { const newState = !systemStatus; await supabase.from('system_settings').update({ value: String(newState) }).eq('key', 'maintenance_mode'); setSystemStatus(newState); logAction("System Lockdown", `Changed to ${newState}`); toast.success(newState ? "SYSTEM LOCKED" : "SYSTEM ONLINE"); };
  const sendAnnouncement = async () => { if (!announceText) return; await supabase.from('announcements').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000'); await supabase.from('announcements').insert({ message: announceText, is_active: true }); logAction("Broadcast", `Sent: ${announceText}`); toast.success("Broadcast Sent!"); setShowAnnounceModal(false); };
  const fetchMembersForAction = async () => { const { data } = await supabase.from('profiles').select('*').order('full_name'); setMembers(data || []); };
  const handlePinReset = async () => { toast.success(`PIN ${selectedUser.full_name} direset ke 123456!`); setShowPinResetModal(false); };
  const changeRole = async (newRole: string) => { await supabase.from('profiles').update({ role: newRole }).eq('id', selectedUser.id); toast.success("Jabatan diubah!"); setShowRoleModal(false); };
  const fetchItems = async () => { const { data } = await supabase.from('items').select('*').order('name'); setItems(data || []); };
  const forceResetItem = async () => { await supabase.from('loans').update({ status: 'dikembalikan', return_date: new Date().toISOString() }).eq('item_id', selectedItem.id).eq('status', 'dipinjam'); logAction("Force Reset", `Item ${selectedItem.name} loans cleared`); toast.success("Status RESET."); setShowForceResetModal(false); };
  const executeForceLogout = async () => { const toastId = toast.loading("Revoking Sessions..."); await new Promise(r => setTimeout(r, 2000)); await logAction("Force Logout", "Revoked all active sessions"); toast.success("All users logged out.", { id: toastId }); setShowForceLogoutModal(false); };

  const scanStorage = async () => { setIsScanningStorage(true); try { const { data: itemFiles } = await supabase.storage.from('items').list(); const { data: dbItems } = await supabase.from('items').select('base_image_url'); const dbUrls = dbItems?.map(i => i.base_image_url) || []; const trash = itemFiles?.filter(file => { const isUsed = dbUrls.some(url => url && url.includes(file.name)); return !isUsed && file.name !== '.emptyFolderPlaceholder'; }) || []; const result = trash.map((f, i) => ({ id: i, name: f.name, size: (f.metadata?.size / 1024).toFixed(2) + ' KB', path: f.name })); setJanitorScanResult(result); if(result.length === 0) toast.success("Storage Clean & Healthy!"); } catch (e) { console.error(e); toast.error("Scan Failed"); } finally { setIsScanningStorage(false); } };
  const deleteSelectedFiles = async () => { const toastId = toast.loading(`Deleting ${selectedTrashFiles.length} files...`); try { await supabase.storage.from('items').remove(selectedTrashFiles); setJanitorScanResult(prev => prev.filter(f => !selectedTrashFiles.includes(f.path))); setSelectedTrashFiles([]); await logAction("Storage Janitor", `Deleted ${selectedTrashFiles.length} orphaned files`); toast.success("Cleanup Complete!", { id: toastId }); } catch (e) { toast.error("Delete Failed", { id: toastId }); } };

  const scanGhostLoans = async () => { setShowGhostLoanModal(true); try { const oneYearAgo = new Date(); oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1); const { data } = await supabase.from('loans').select(`id, borrow_date, status, variants(items(name)), profiles(full_name)`).eq('status', 'dipinjam').lt('borrow_date', oneYearAgo.toISOString()); const ghosts = data?.map(l => ({ id: l.id, item: l.variants?.items?.name || "Unknown Item", borrower: l.profiles?.full_name || "Unknown User", issue: "Stuck > 1 Year" })) || []; setGhostLoans(ghosts); if(ghosts.length === 0) toast.success("No Ghost Loans Found."); } catch (e) { console.error(e); } };
  const resolveGhostLoans = async () => { const toastId = toast.loading("Resolving..."); try { await supabase.from('loans').update({ status: 'hilang', return_condition: 'Dianggap Hilang (System Purge)' }).in('id', selectedGhostLoans); setGhostLoans(prev => prev.filter(l => !selectedGhostLoans.includes(l.id))); setSelectedGhostLoans([]); await logAction("Ghost Loan", `Resolved ${selectedGhostLoans.length} stuck loans`); toast.success("Loans Resolved", { id: toastId }); } catch(e) { toast.error("Failed", { id: toastId }); } };

  const scanInactiveUsers = async () => { setIsScanningUsers(true); try { const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6); const dateStr = sixMonthsAgo.toISOString(); const { data: activeAtt } = await supabase.from('attendance').select('user_id').gte('date', dateStr); const { data: activeTx } = await supabase.from('transactions').select('user_id').gte('transaction_date', dateStr); const activeIds = new Set([ ...(activeAtt?.map(a => a.user_id) || []), ...(activeTx?.map(t => t.user_id) || []) ]); const { data: allProfiles } = await supabase.from('profiles').select('id, full_name, created_at').eq('role', 'member'); const ghosts = allProfiles?.filter(p => !activeIds.has(p.id)).map(p => ({ id: p.id, name: p.full_name, lastSeen: `Joined: ${new Date(p.created_at).toLocaleDateString()}` })) || []; setInactiveUsers(ghosts); } catch(e) { console.error(e); } finally { setIsScanningUsers(false); } };
  const purgeSelectedUsers = async () => { const toastId = toast.loading("Purging Users..."); try { await supabase.from('profiles').delete().in('id', selectedInactiveUsers); setInactiveUsers(prev => prev.filter(u => !selectedInactiveUsers.includes(u.id))); setSelectedInactiveUsers([]); await logAction("Ghost Purge", `Purged ${selectedInactiveUsers.length} inactive users`); toast.success("Users Purged", { id: toastId }); } catch(e) { toast.error("Failed", { id: toastId }); } };

  const downloadTemplate = () => { let content = ""; if (bulkTemplates.member) content += "full_name,no_induk,role,phone_number\nJohn Doe,CM-UNR-001,member,08123456789\n\n"; if (bulkTemplates.item) content += "name,category,description\nKamera Canon,Elektronik,Kamera DSLR untuk dokumentasi\n\n"; if (bulkTemplates.variant) content += "item_name,color,size,stock,location\nKamera Canon,Hitam,Standard,1,Lemari A\n\n"; if (!content) { toast.error("Pilih minimal satu template!"); return; } const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.setAttribute("href", url); link.setAttribute("download", "bulk_import_templates.csv"); document.body.appendChild(link); link.click(); toast.success("Template Downloaded!"); };

  // --- NEW FEATURES LOGIC (REAL) ---
  // 1. DYNAMIC PROTOCOL
  const fetchFormFields = async () => { const { data } = await supabase.from('dynamic_form_fields').select('*').order('created_at'); setFormFields(data || []); };
  const addFormField = async () => { if(!newField.label) return toast.error("Label wajib diisi"); await supabase.from('dynamic_form_fields').insert({ field_label: newField.label, field_type: newField.type, is_required: newField.required }); toast.success("Field added"); setNewField({ label: '', type: 'text', required: false }); fetchFormFields(); };
  const deleteFormField = async (id: number) => { await supabase.from('dynamic_form_fields').delete().eq('id', id); toast.success("Field deleted"); fetchFormFields(); };

  // 2. TICKETING
  const fetchTickets = async () => { const { data } = await supabase.from('support_tickets').select(`*, profiles:user_id(full_name, no_induk)`).eq('status', 'open').order('created_at', { ascending: false }); setTickets(data || []); };
  const resolveTicket = async (id: number) => { await supabase.from('support_tickets').update({ status: 'resolved' }).eq('id', id); toast.success("Tiket diselesaikan"); fetchTickets(); logAction("Ticket", `Resolved ticket ID ${id}`); };

  // 3. HEALTH CHECK
  const runDiagnostics = async () => { setIsCheckingHealth(true); try { const start = performance.now(); const { count: profileCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }); const { count: itemCount } = await supabase.from('items').select('*', { count: 'exact', head: true }); const { count: loanCount } = await supabase.from('loans').select('*', { count: 'exact', head: true }); const latency = (performance.now() - start).toFixed(2); setHealthStats({ dbLatency: `${latency}ms`, totalUsers: profileCount, totalItems: itemCount, activeLoans: loanCount, status: 'OPTIMAL' }); } catch (e) { setHealthStats({ status: 'CRITICAL', error: 'Connection Timeout' }); } finally { setIsCheckingHealth(false); } };

  // 4. TIME MACHINE
  const fetchItemHistory = async (itemName: string) => { const { data } = await supabase.from('audit_logs').select('*').ilike('details', `%${itemName}%`).order('timestamp', { ascending: false }).limit(20); setItemHistory(data || []); };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-red-500" size={40}/></div>;

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 pb-24 relative overflow-hidden">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' } }}/>
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(220,38,38,0.15),transparent_50%)] pointer-events-none"/>
      
      {/* HEADER */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-red-900/30 px-6 py-6 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2 tracking-tight">THE ARCHITECT <span className="text-[10px] bg-red-600 px-2 py-0.5 rounded text-white tracking-widest">v2.0</span></h1>
            <p className="text-xs text-red-400 font-mono flex items-center gap-2"><div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"/> System Integrity: 100%</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
            {systemStatus && <div className="bg-red-500 text-white px-4 py-1.5 rounded-full text-xs font-bold animate-pulse hidden sm:block">LOCKDOWN ACTIVE</div>}
            
            <button onClick={() => setShowApprovalListModal(true)} className="p-3 bg-slate-800 border border-slate-700 rounded-2xl hover:bg-slate-700 transition relative">
                <Bell size={20} className={approvals.length > 0 ? "text-amber-400" : "text-slate-400"} />
                {approvals.length > 0 && (<span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-slate-900 text-[10px] font-black flex items-center justify-center rounded-full animate-bounce">{approvals.length}</span>)}
            </button>

            <button onClick={handleLogout} className="p-3 bg-red-900/20 text-red-500 border border-red-500/30 rounded-2xl hover:bg-red-600 hover:text-white transition" title="Logout">
                <LogOut size={20} />
            </button>
        </div>
      </header>

      <div className="p-6 max-w-6xl mx-auto space-y-8">
        {activeView === 'menu' && (
          <>
            <section className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
                <div className="flex justify-between items-end mb-4 relative z-10">
                    <div><h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Activity size={14}/> System Pulse</h3><p className="text-2xl font-black text-white mt-1">API LATENCY: 24ms</p></div>
                    <div className="flex items-center gap-2"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span><span className="text-xs text-emerald-500 font-mono font-bold">LIVE</span></div>
                </div>
                <div className="flex items-end gap-1 h-16 opacity-50">{pulseData.map((val, i) => (<div key={i} className="flex-1 bg-red-600/50 rounded-t-sm transition-all duration-300" style={{ height: `${val}%` }}></div>))}</div>
            </section>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-2 md:col-span-4 mb-2 mt-2 border-t border-slate-800 pt-4"><h3 className="text-xs font-bold text-red-500 uppercase tracking-widest ml-1 flex items-center gap-2"><ShieldAlert size={14}/> Emergency Controls</h3></div>
                <MenuButton onClick={toggleLockdown} active={systemStatus} activeColor="bg-red-600 border-red-500 text-white shadow-[0_0_30px_rgba(220,38,38,0.5)]" icon={systemStatus ? <Lock size={32}/> : <Unlock size={32} className="text-red-500"/>} label="System Lockdown" />
                <MenuButton onClick={() => setShowAnnounceModal(true)} icon={<MessageSquare size={32} className="text-blue-500"/>} label="Global Announcer" />
                <MenuButton onClick={() => { fetchItems(); setShowForceResetModal(true); }} icon={<Zap size={32} className="text-amber-500"/>} label="Force Item Reset" />
                <MenuButton onClick={() => setShowForceLogoutModal(true)} icon={<LogOut size={32} className="text-rose-500"/>} label="Force Logout All" />

                <div className="col-span-2 md:col-span-4 mb-2 mt-4 border-t border-slate-800 pt-4"><h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2"><Trash2 size={14}/> Maintenance</h3></div>
                <MenuButton onClick={() => setShowJanitorModal(true)} icon={<HardDrive size={32} className="text-cyan-500"/>} label="Storage Janitor" />
                <MenuButton onClick={scanGhostLoans} icon={<Ghost size={32} className="text-indigo-400"/>} label="Ghost Loan Detector" />
                <MenuButton onClick={() => setShowGhostUserModal(true)} icon={<Trash2 size={32} className="text-slate-500"/>} label="Ghost User Purge" />
                <MenuButton onClick={() => alert('Backup Started...')} icon={<Download size={32} className="text-emerald-500"/>} label="Database Vault" />

                <div className="col-span-2 md:col-span-4 mb-2 mt-4 border-t border-slate-800 pt-4"><h3 className="text-xs font-bold text-cyan-500 uppercase tracking-widest ml-1 flex items-center gap-2"><Cpu size={14}/> Intelligence & Tools</h3></div>
                <MenuButton onClick={() => { fetchFormFields(); setShowFormBuilderModal(true); }} icon={<ClipboardList size={32} className="text-teal-400"/>} label="Dynamic Protocol" />
                <MenuButton onClick={() => { fetchTickets(); setShowTicketModal(true); }} icon={<Ticket size={32} className="text-pink-400"/>} label="Internal Ticketing" />
                <MenuButton onClick={() => { runDiagnostics(); setShowHealthModal(true); }} icon={<Stethoscope size={32} className="text-green-400"/>} label="Deep Health Check" />
                <MenuButton onClick={() => { fetchItems(); setShowTimeMachineModal(true); }} icon={<History size={32} className="text-orange-400"/>} label="Data Time Machine" />

                <div className="col-span-2 md:col-span-4 mb-2 mt-4 border-t border-slate-800 pt-4"><h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2"><Users size={14}/> User & Config</h3></div>
                <MenuButton onClick={() => { fetchMembersForAction(); setShowPinResetModal(true); }} icon={<Key size={32} className="text-purple-500"/>} label="PIN Reset" />
                <MenuButton onClick={() => { fetchMembersForAction(); setShowRoleModal(true); }} icon={<UserCog size={32} className="text-pink-500"/>} label="Role Escalation" />
                <MenuButton onClick={() => setShowBulkModal(true)} icon={<Upload size={32} className="text-orange-400"/>} label="Bulk Import" />
                <MenuButton onClick={() => setShowAutoRuleModal(true)} icon={<FileCheck size={32} className="text-lime-400"/>} label="Auto-Approve Rules" />
                <MenuButton onClick={() => setShowQrModal(true)} icon={<QrCode size={32} className="text-white"/>} label="QR Gen Center" />
                
                <button onClick={() => setActiveView('audit')} className="col-span-2 p-6 bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-3xl flex items-center justify-between hover:border-slate-500 transition-all group">
                    <div className="flex items-center gap-4"><div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center"><GitGraph className="text-cyan-400"/></div><div className="text-left"><h3 className="font-bold text-white text-lg">Audit Timeline</h3><p className="text-xs text-slate-400">View System Audit Logs</p></div></div>
                    <ArrowLeft className="rotate-180 text-slate-500 group-hover:text-white transition-colors"/>
                </button>
            </div>
          </>
        )}
        {activeView === 'audit' && ( <AuditLogView onBack={() => setActiveView('menu')} /> )}
      </div>

      <AnimatePresence>
        {/* APPROVAL MODALS */}
        {showApprovalListModal && (<Modal title={`Pending Approvals (${approvals.length})`} onClose={() => setShowApprovalListModal(false)}>{approvals.length === 0 ? (<div className="text-center py-10 text-slate-500 italic">No pending requests.</div>) : (<div className="max-h-[60vh] overflow-y-auto space-y-2 pr-2">{approvals.map((item) => (<div key={item.id} onClick={() => { setSelectedApproval(item); setShowApprovalDetailModal(true); }} className="p-4 bg-slate-800 border border-slate-700 rounded-xl hover:border-amber-500 cursor-pointer transition-all flex justify-between items-center group"><div className="flex items-center gap-4"><div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.type === 'MIGRATION' ? 'bg-purple-900/50 text-purple-400' : 'bg-blue-900/50 text-blue-400'}`}>{item.type === 'MIGRATION' ? <ArrowRightLeft size={18}/> : <FileText size={18}/>}</div><div><h4 className="text-sm font-bold text-slate-200">{item.request}</h4><p className="text-xs text-slate-500">{item.user} • {item.time}</p></div></div><ChevronRight size={18} className="text-slate-600 group-hover:text-amber-500"/></div>))}</div>)}</Modal>)}
        {showApprovalDetailModal && selectedApproval && (<div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"><motion.div initial={{scale:0.9, opacity: 0}} animate={{scale:1, opacity: 1}} exit={{scale:0.9, opacity: 0}} className="bg-slate-900 border border-amber-500/50 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative"><button onClick={() => setShowApprovalDetailModal(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X size={20}/></button><h3 className="text-lg font-black text-amber-500 mb-6 border-l-4 border-amber-500 pl-3">Request Detail</h3><div className="space-y-4 mb-8"><div className="p-4 bg-slate-800 rounded-xl"><p className="text-[10px] text-slate-500 uppercase font-bold">Request Type</p><p className="text-sm font-bold text-white">{selectedApproval.request}</p></div><div className="p-4 bg-slate-800 rounded-xl"><p className="text-[10px] text-slate-500 uppercase font-bold">Requester</p><p className="text-sm font-bold text-white">{selectedApproval.user}</p></div><div className="p-4 bg-slate-800 rounded-xl border border-slate-700"><p className="text-[10px] text-slate-500 uppercase font-bold">Details</p><p className="text-xs font-mono text-slate-300 mt-1">{selectedApproval.details}</p></div></div><div className="grid grid-cols-2 gap-3"><button onClick={handleReject} className="py-3 bg-red-900/20 text-red-500 border border-red-900 font-bold rounded-xl hover:bg-red-900/40">Reject</button><button onClick={handleApprove} className="py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 shadow-lg shadow-emerald-900/20">Approve Request</button></div></motion.div></div>)}

        {/* FEATURE MODALS */}
        {showFormBuilderModal && (<Modal title="Dynamic Protocol" onClose={() => setShowFormBuilderModal(false)}><div className="space-y-4"><div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700"><p className="text-xs font-bold text-slate-400 mb-2">ADD NEW FIELD</p><div className="flex gap-2 mb-2"><input type="text" placeholder="Label" className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white" value={newField.label} onChange={e => setNewField({...newField, label: e.target.value})} /><select className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white" value={newField.type} onChange={e => setNewField({...newField, type: e.target.value})}><option value="text">Text</option><option value="date">Date</option><option value="number">Number</option></select></div><button onClick={addFormField} className="w-full py-2 bg-teal-600 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2"><Plus size={14}/> Add Field</button></div><div className="max-h-60 overflow-y-auto space-y-2">{formFields.map(f => (<div key={f.id} className="flex justify-between items-center p-3 bg-slate-800 rounded-lg border border-slate-700"><div><p className="text-sm font-bold text-slate-200">{f.field_label}</p><p className="text-[10px] text-slate-500 uppercase">{f.field_type} {f.is_required && '(Required)'}</p></div><button onClick={() => deleteFormField(f.id)} className="text-red-500 hover:text-red-400"><Trash2 size={16}/></button></div>))}</div></div></Modal>)}
        {showTicketModal && (<Modal title={`Support Tickets (${tickets.length})`} onClose={() => setShowTicketModal(false)}>{tickets.length === 0 ? <p className="text-center text-slate-500 py-6">No open tickets.</p> : (<div className="max-h-[60vh] overflow-y-auto space-y-3">{tickets.map(t => (<div key={t.id} className="p-4 bg-slate-800 rounded-xl border border-slate-700"><div className="flex justify-between items-start mb-2"><h4 className="font-bold text-white text-sm">{t.subject}</h4><span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${t.priority === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-400'}`}>{t.priority}</span></div><p className="text-xs text-slate-400 mb-3">{t.message}</p><div className="flex justify-between items-center"><span className="text-[10px] text-slate-500">By: {t.profiles?.full_name}</span><button onClick={() => resolveTicket(t.id)} className="px-3 py-1.5 bg-green-600/20 text-green-400 hover:bg-green-600 hover:text-white rounded-lg text-xs font-bold transition">Resolve</button></div></div>))}</div>)}</Modal>)}
        {showHealthModal && (<Modal title="System Diagnostics" onClose={() => setShowHealthModal(false)}>{isCheckingHealth || !healthStats ? (<div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-green-500 mb-2" size={32}/><p className="text-xs font-mono text-green-400">Running Deep Scan...</p></div>) : (<div className="space-y-4"><div className={`p-4 rounded-xl border text-center ${healthStats.status === 'OPTIMAL' ? 'bg-green-900/20 border-green-500/50' : 'bg-red-900/20 border-red-500'}`}><Activity size={32} className={`mx-auto mb-2 ${healthStats.status === 'OPTIMAL' ? 'text-green-500' : 'text-red-500'}`}/><h3 className="text-lg font-black text-white">{healthStats.status}</h3><p className="text-xs text-slate-400">{healthStats.error || "All systems nominal"}</p></div><div className="grid grid-cols-2 gap-3"><div className="p-3 bg-slate-800 rounded-lg"><p className="text-[10px] text-slate-500 uppercase">Latency</p><p className="text-lg font-mono text-white">{healthStats.dbLatency}</p></div><div className="p-3 bg-slate-800 rounded-lg"><p className="text-[10px] text-slate-500 uppercase">Total Users</p><p className="text-lg font-mono text-white">{healthStats.totalUsers}</p></div><div className="p-3 bg-slate-800 rounded-lg"><p className="text-[10px] text-slate-500 uppercase">Items</p><p className="text-lg font-mono text-white">{healthStats.totalItems}</p></div><div className="p-3 bg-slate-800 rounded-lg"><p className="text-[10px] text-slate-500 uppercase">Active Loans</p><p className="text-lg font-mono text-white">{healthStats.activeLoans}</p></div></div></div>)}</Modal>)}
        {showTimeMachineModal && (<Modal title="Data Time Machine" onClose={() => {setShowTimeMachineModal(false); setItemHistory([]); setSelectedHistoryItem(null);}}><div className="mb-4"><p className="text-xs text-slate-400 mb-2">Select Item to View History:</p><select className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white" onChange={(e) => { setSelectedHistoryItem(e.target.value); fetchItemHistory(e.target.options[e.target.selectedIndex].text); }}><option value="">-- Choose Item --</option>{items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></div>{itemHistory.length > 0 && (<div className="relative pl-4 border-l-2 border-slate-800 space-y-6 max-h-[50vh] overflow-y-auto">{itemHistory.map((log) => (<div key={log.id} className="relative"><div className="absolute -left-[21px] top-1 w-3 h-3 bg-slate-900 border-2 border-orange-500 rounded-full"></div><p className="text-[10px] text-orange-500 font-mono mb-1">{new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString()}</p><p className="text-sm font-bold text-white">{log.action}</p><p className="text-xs text-slate-500">{log.details}</p></div>))}</div>)}</Modal>)}

        {/* EXISTING MODALS */}
        {showForceLogoutModal && (<Modal title="CRITICAL ACTION" onClose={() => setShowForceLogoutModal(false)} variant="danger"><div className="text-center space-y-4"><div className="w-20 h-20 bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto animate-pulse"><Power size={40} /></div><div><h3 className="text-xl font-black text-white">KILL ALL SESSIONS?</h3><p className="text-slate-400 text-sm mt-2">Paksa logout semua user.</p></div><div className="grid grid-cols-2 gap-3 pt-4"><button onClick={() => setShowForceLogoutModal(false)} className="py-3 bg-slate-800 text-slate-300 font-bold rounded-xl">Cancel</button><button onClick={executeForceLogout} className="py-3 bg-red-600 text-white font-bold rounded-xl">EXECUTE KILL</button></div></div></Modal>)}
        {showJanitorModal && (<Modal title="Storage Janitor" onClose={() => setShowJanitorModal(false)}>{!isScanningStorage && janitorScanResult.length === 0 ? (<div className="text-center py-6"><HardDrive size={48} className="mx-auto text-cyan-500 mb-4"/><p className="text-slate-400 text-sm mb-6">Scan bucket penyimpanan untuk mencari gambar sampah.</p><button onClick={scanStorage} className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl flex items-center justify-center gap-2"><RefreshCw size={18}/> Start Scan (Real)</button></div>) : isScanningStorage ? (<div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-cyan-500 mb-2" size={32}/><p className="text-xs font-mono text-cyan-400">Scanning Metadata...</p></div>) : (<div className="space-y-4"><p className="text-xs text-slate-400">Pilih file untuk dihapus (Total: {janitorScanResult.length}):</p><div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">{janitorScanResult.map(file => (<div key={file.id} onClick={() => setSelectedTrashFiles(prev => prev.includes(file.path) ? prev.filter(p => p !== file.path) : [...prev, file.path])} className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${selectedTrashFiles.includes(file.path) ? 'bg-red-900/20 border-red-500' : 'bg-slate-800 border-slate-700'}`}><ImageIcon size={16} className="text-slate-500"/><div className="flex-1 min-w-0"><p className="text-sm font-bold text-slate-200 truncate">{file.name}</p><p className="text-xs text-slate-500">{file.size}</p></div>{selectedTrashFiles.includes(file.path) && <CheckCircle size={18} className="text-red-500"/>}</div>))}</div><button onClick={deleteSelectedFiles} disabled={selectedTrashFiles.length === 0} className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl flex items-center justify-center gap-2"><Trash2 size={18}/> Delete Selected ({selectedTrashFiles.length})</button></div>)}</Modal>)}
        {showGhostLoanModal && (<Modal title="Ghost Loan Detector" onClose={() => setShowGhostLoanModal(false)}>{ghostLoans.length === 0 ? (<div className="text-center py-6 text-emerald-400"><CheckCircle size={48} className="mx-auto mb-2"/><p>Database Integrity: 100%</p></div>) : (<div className="space-y-4"><p className="text-xs text-slate-400">Pinjaman Stuck (> 1 Tahun):</p><div className="max-h-60 overflow-y-auto space-y-2">{ghostLoans.map(loan => (<div key={loan.id} onClick={() => setSelectedGhostLoans(prev => prev.includes(loan.id) ? prev.filter(id => id !== loan.id) : [...prev, loan.id])} className={`p-3 rounded-xl border flex flex-col gap-1 cursor-pointer ${selectedGhostLoans.includes(loan.id) ? 'bg-indigo-900/20 border-indigo-500' : 'bg-slate-800 border-slate-700'}`}><div className="flex justify-between"><span className="font-bold text-white text-sm">{loan.item}</span><span className="text-[10px] bg-red-500/20 text-red-300 px-2 rounded">{loan.issue}</span></div><p className="text-xs text-slate-400">Borrower: {loan.borrower}</p></div>))}</div><button onClick={resolveGhostLoans} disabled={selectedGhostLoans.length === 0} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-bold rounded-xl">Resolve Selected ({selectedGhostLoans.length})</button></div>)}</Modal>)}
        {showGhostUserModal && (<Modal title="Ghost User Purge" onClose={() => setShowGhostUserModal(false)}>{!isScanningUsers && inactiveUsers.length === 0 ? (<div className="text-center py-6"><p className="text-slate-400 text-sm mb-4">Cari user tidak aktif > 6 bulan (No Activity).</p><button onClick={scanInactiveUsers} className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl">Scan Inactive Users</button></div>) : isScanningUsers ? (<div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-slate-500"/></div>) : (<div className="space-y-4"><div className="max-h-60 overflow-y-auto space-y-2">{inactiveUsers.map(user => (<div key={user.id} onClick={() => setSelectedInactiveUsers(prev => prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id])} className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer ${selectedInactiveUsers.includes(user.id) ? 'bg-red-900/20 border-red-500' : 'bg-slate-800 border-slate-700'}`}><div><p className="font-bold text-slate-200 text-sm">{user.name}</p><p className="text-xs text-slate-500">{user.lastSeen}</p></div>{selectedInactiveUsers.includes(user.id) && <Trash2 size={16} className="text-red-500"/>}</div>))}</div><button onClick={purgeSelectedUsers} disabled={selectedInactiveUsers.length === 0} className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:bg-slate-800 text-white font-bold rounded-xl">Purge Users ({selectedInactiveUsers.length})</button></div>)}</Modal>)}
        {showBulkModal && (<Modal title="Bulk Import / Export" onClose={() => setShowBulkModal(false)}><div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center bg-slate-800/50 mb-4"><Upload className="mx-auto text-slate-500 mb-2"/><p className="text-slate-300 font-bold text-sm">Drag & Drop .CSV file</p></div><div className="bg-slate-800 p-4 rounded-xl mb-4"><p className="text-xs text-slate-400 font-bold uppercase mb-2">Select Template to Download:</p><div className="space-y-2"><label className="flex items-center gap-3 p-2 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-950 transition"><input type="checkbox" checked={bulkTemplates.member} onChange={(e) => setBulkTemplates({...bulkTemplates, member: e.target.checked})} className="accent-blue-500 w-4 h-4"/><div className="flex items-center gap-2 text-slate-300 text-sm"><UserPlus size={14}/> Member Template</div></label><label className="flex items-center gap-3 p-2 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-950 transition"><input type="checkbox" checked={bulkTemplates.item} onChange={(e) => setBulkTemplates({...bulkTemplates, item: e.target.checked})} className="accent-blue-500 w-4 h-4"/><div className="flex items-center gap-2 text-slate-300 text-sm"><Package size={14}/> Item Template</div></label><label className="flex items-center gap-3 p-2 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-950 transition"><input type="checkbox" checked={bulkTemplates.variant} onChange={(e) => setBulkTemplates({...bulkTemplates, variant: e.target.checked})} className="accent-blue-500 w-4 h-4"/><div className="flex items-center gap-2 text-slate-300 text-sm"><BoxSelect size={14}/> Variant Template</div></label></div></div><button onClick={downloadTemplate} className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-600"><FileText size={16}/> Download Selected Templates</button></Modal>)}
        {showAutoRuleModal && (<Modal title="Auto-Approval Rules" onClose={() => setShowAutoRuleModal(false)}><div className="space-y-3 mb-6"><div className="p-3 bg-slate-800 rounded-xl flex justify-between items-center border border-slate-700"><div><p className="text-sm font-bold text-slate-300">Low-Value Items</p><p className="text-[10px] text-slate-500">Kabel, Adapter</p></div><div className="w-10 h-5 bg-green-500 rounded-full relative"><div className="w-3 h-3 bg-white rounded-full absolute top-1 right-1"/></div></div><div className="p-3 bg-slate-800 rounded-xl flex justify-between items-center border border-slate-700 opacity-50"><div><p className="text-sm font-bold text-slate-300">Weekend Events</p><p className="text-[10px] text-slate-500">Sabtu & Minggu</p></div><div className="w-10 h-5 bg-slate-600 rounded-full relative"><div className="w-3 h-3 bg-white rounded-full absolute top-1 left-1"/></div></div></div><button className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2"><Save size={16}/> Save Configuration</button></Modal>)}
        {showAnnounceModal && (<Modal title="Broadcast" onClose={() => setShowAnnounceModal(false)}><textarea value={announceText} onChange={(e) => setAnnounceText(e.target.value)} className="w-full h-32 bg-slate-800 border-slate-700 rounded-xl p-4 text-white mb-4 outline-none"/><button onClick={sendAnnouncement} className="w-full py-3 bg-blue-600 rounded-xl font-bold">Send</button></Modal>)}
        {showPinResetModal && (<Modal title="PIN Reset" onClose={() => setShowPinResetModal(false)}>{!selectedUser ? (<div className="max-h-60 overflow-y-auto space-y-2">{members.map(m => (<button key={m.id} onClick={() => setSelectedUser(m)} className="w-full text-left p-3 bg-slate-800 rounded-xl flex justify-between"><span className="text-white">{m.full_name}</span><span className="text-slate-500 text-xs">{m.no_induk}</span></button>))}</div>) : (<div className="text-center"><p className="mb-4 text-slate-400">Reset PIN <b>{selectedUser.full_name}</b>?</p><button onClick={handlePinReset} className="w-full py-3 bg-red-600 rounded-xl font-bold">Confirm</button></div>)}</Modal>)}
        {showRoleModal && (<Modal title="Role Escalation" onClose={() => setShowRoleModal(false)}>{!selectedUser ? (<div className="max-h-60 overflow-y-auto space-y-2">{members.map(m => (<button key={m.id} onClick={() => setSelectedUser(m)} className="w-full text-left p-3 bg-slate-800 rounded-xl flex justify-between"><span className="text-white">{m.full_name}</span><span className="text-xs bg-slate-700 px-2 rounded">{m.role}</span></button>))}</div>) : (<div className="space-y-2"><button onClick={() => changeRole('member')} className="w-full py-3 bg-slate-700 rounded-xl">Member</button><button onClick={() => changeRole('admin')} className="w-full py-3 bg-blue-600 rounded-xl">Admin</button></div>)}</Modal>)}
        {showForceResetModal && (<Modal title="Force Item Reset" onClose={() => {setShowForceResetModal(false); setSelectedItem(null);}}>{!selectedItem ? (<div className="max-h-60 overflow-y-auto space-y-2">{items.map(i => (<button key={i.id} onClick={() => setSelectedItem(i)} className="w-full text-left p-3 bg-slate-800 rounded-xl text-white">{i.name}</button>))}</div>) : (<div className="text-center"><p className="mb-4 text-slate-400">Reset <b>{selectedItem.name}</b>?</p><button onClick={forceResetItem} className="w-full py-3 bg-amber-600 rounded-xl font-bold">Reset Status</button></div>)}</Modal>)}
        {showQrModal && (<Modal title="QR Code" onClose={() => setShowQrModal(false)}><div className="bg-white p-6 rounded-xl flex justify-center mb-4"><QrCode size={100} className="text-black"/></div><button className="w-full py-3 bg-white text-black font-bold rounded-xl flex justify-center gap-2"><Download size={16}/> Download PDF</button></Modal>)}

      </AnimatePresence>
    </div>
  );
}

// --- SUB-COMPONENTS ---
function MenuButton({ onClick, icon, label, active, activeColor }: any) {
    return (<button onClick={onClick} className={`p-6 rounded-3xl border flex flex-col items-center justify-center gap-3 transition-all group ${active ? activeColor : 'bg-slate-900 border-slate-800 hover:bg-slate-800'}`}><div className="group-hover:scale-110 transition-transform">{icon}</div><span className="font-bold text-sm text-slate-300">{label}</span></button>)
}
function AuditLogView({ onBack }: { onBack: () => void }) {
  const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => { const f = async () => { const { data } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(20); setLogs(data || []); }; f(); }, []);
  return (<div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 min-h-[50vh]"><div className="flex justify-between mb-4"><h2 className="text-xl font-bold text-cyan-400">AUDIT LOGS</h2><button onClick={onBack} className="text-slate-400">CLOSE</button></div><div className="space-y-2">{logs.map(l => (<div key={l.id} className="p-3 bg-slate-950 rounded-xl text-xs font-mono border border-slate-800"><span className="text-cyan-500">[{new Date(l.timestamp).toLocaleTimeString()}]</span> <span className="text-white">{l.action}</span> <span className="text-slate-500">- {l.details}</span></div>))}</div></div>)
}
function Modal({ title, children, onClose, variant = 'default' }: any) {
  const borderColor = variant === 'danger' ? 'border-red-900' : 'border-slate-700';
  const titleColor = variant === 'danger' ? 'border-red-500 text-red-500' : 'border-blue-500 text-white';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <motion.div initial={{scale:0.9, opacity: 0}} animate={{scale:1, opacity: 1}} exit={{scale:0.9, opacity: 0}} className={`bg-slate-900 border ${borderColor} w-full max-w-sm rounded-3xl p-6 shadow-2xl relative`}>
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X size={20}/></button>
        <h3 className={`text-lg font-black mb-6 border-l-4 pl-3 ${titleColor}`}>{title}</h3>
        {children}
      </motion.div>
    </div>
  )
}