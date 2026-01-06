"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Package, CheckCircle, Calendar, ShieldCheck, Clock, Camera, X, Loader2, MousePointer2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import imageCompression from 'browser-image-compression';

// IMPORT PENTING
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase'; // Koneksi Database

export default function ReturnPage() {
  const router = useRouter();

  // --- STATE ---
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [myLoans, setMyLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- STATE UPLOAD ---
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [arrowPos, setArrowPos] = useState({ x: 50, y: 50 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // 1. AMBIL DATA PEMINJAMAN SAYA
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return router.push('/login');
        setUser(authUser);

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();
        setProfile(profileData);

        const { data: loanData, error } = await supabase
          .from('loans')
          .select(`
            id,
            borrow_date,
            variants:variant_id (
              size,
              items:item_id ( name, base_image_url )
            )
          `)
          .eq('user_id', authUser.id)
          .eq('status', 'dipinjam');

        if (error) throw error;
        setMyLoans(loanData || []);

      } catch (error) {
        console.error("Gagal load data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  // 2. PROSES UPLOAD FOTO (PREVIEW)
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const imageFile = event.target.files?.[0];
    if (!imageFile) return;

    const loadingToast = toast.loading('Mengompres foto...');
    setIsProcessing(true);
    setArrowPos({ x: 50, y: 50 }); 

    const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1280, useWebWorker: true };

    try {
      const compressedFile = await imageCompression(imageFile, options);
      setPreviewUrl(URL.createObjectURL(compressedFile)); 
      
      toast.dismiss(loadingToast);
      toast.success('Foto siap! Silakan tandai lokasi.');
    } catch (error) {
      console.log(error);
      toast.dismiss(loadingToast);
      toast.error("Gagal proses gambar.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. GESER PANAH MERAH
  const handleImageClick = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    setArrowPos({ x, y });
  };

  // 4. GENERATE GAMBAR FINAL (GABUNG FOTO + PANAH)
  const generateFinalBlob = async (): Promise<Blob | null> => {
    if (!previewUrl) return null;
    return new Promise((resolve) => {
        const img = new Image();
        img.src = previewUrl;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(null); return; }

            canvas.width = img.width;
            canvas.height = img.height;
            
            ctx.drawImage(img, 0, 0);
            
            const arrowX = (arrowPos.x / 100) * canvas.width;
            const arrowY = (arrowPos.y / 100) * canvas.height;

            ctx.fillStyle = "red";
            ctx.strokeStyle = "white";
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(arrowX, arrowY);
            ctx.lineTo(arrowX - 20, arrowY + 40);
            ctx.lineTo(arrowX + 20, arrowY + 40);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.font = "bold 24px Arial";
            ctx.fillStyle = "white";
            ctx.fillText("Lokasi", arrowX - 35, arrowY + 70);

            canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8);
        };
    });
  };

  // 5. SUBMIT KE SUPABASE (FINAL)
  const handleConfirmReturn = async () => {
    if (!selectedLoan) return;
    
    setIsProcessing(true);
    const toastId = toast.loading('Mengupload bukti & menyimpan...');

    try {
        const finalBlob = await generateFinalBlob();
        if (!finalBlob) throw new Error("Gagal memproses gambar final.");

        const fileName = `proof-${selectedLoan.id}-${Date.now()}.jpg`;
        
        const { error: uploadError } = await supabase
            .storage
            .from('inventory-proofs') 
            .upload(fileName, finalBlob, {
                contentType: 'image/jpeg'
            });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase
            .storage
            .from('inventory-proofs')
            .getPublicUrl(fileName);

        const { error: dbError } = await supabase
            .from('loans')
            .update({
                status: 'kembali',
                return_date: new Date().toISOString(),
                return_proof_url: publicUrl 
            })
            .eq('id', selectedLoan.id);

        if (dbError) throw dbError;

        setMyLoans(prev => prev.filter(loan => loan.id !== selectedLoan.id));
        
        toast.success("Barang berhasil dikembalikan!", { id: toastId });
        
        setSelectedLoan(null);
        setPreviewUrl(null);
        setShowSuccess(true);

    } catch (error: any) {
        console.error(error);
        toast.error("Gagal: " + error.message, { id: toastId });
    } finally {
        setIsProcessing(false);
    }
  };

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
    return <div className="h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-blue-600"/></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      
      <header className="bg-white p-4 sticky top-0 z-10 shadow-sm border-b border-gray-100">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-full transition">
            <ArrowLeft size={24} className="text-gray-700" />
          </Link>
          <h1 className="text-xl font-bold text-gray-800">Pengembalian Saya</h1>
        </div>
      </header>

      <main className="p-4 space-y-6">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase">Login Sebagai</p>
            <h2 className="text-lg font-bold text-gray-800 capitalize">{profile?.full_name || '...'}</h2>
            <p className="text-xs text-blue-600 font-mono">{profile?.no_induk || '...'}</p>
          </div>
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
        </div>

        <div>
          <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
            <Clock size={16} className="text-blue-600"/>
            Barang Yang Kamu Bawa
          </h3>

          <div className="space-y-3">
            {myLoans.length > 0 ? (
              myLoans.map((loan) => (
                <div key={loan.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3 transition hover:shadow-md">
                  <div className="flex gap-4">
                    <div className={`w-16 h-16 ${loan.variants?.items?.base_image_url || 'bg-gray-200'} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <Package className="text-white/50" size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800 text-sm">{loan.variants?.items?.name}</h4>
                        <span className="inline-block bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded mt-1">
                            {loan.variants?.size}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                            <Calendar size={12} />
                            <span>Pinjam: {new Date(loan.borrow_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                        </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setSelectedLoan(loan); setPreviewUrl(null); }}
                    className="w-full py-3 bg-white border border-blue-500 text-blue-600 font-bold rounded-xl hover:bg-blue-50 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <Camera size={16} />
                    Upload Bukti & Kembalikan
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
                <CheckCircle size={32} className="text-green-500 mx-auto mb-4" />
                <h3 className="font-bold text-gray-800">Tidak Ada Tanggungan</h3>
                <p className="text-gray-500 text-sm mt-1">Terima kasih Kak {profile?.full_name?.split(' ')[0]}!</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* --- 2. POPUP UPLOAD BUKTI --- */}
      <AnimatePresence>
        {selectedLoan && (
            <motion.div 
                className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                initial="hidden" animate="visible" exit="hidden" variants={backdropVariants}
            >
                <motion.div 
                    className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                    variants={modalVariants} 
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
                        <h3 className="font-bold text-gray-800">Bukti Pengembalian</h3>
                        <button onClick={() => setSelectedLoan(null)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-500">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto">
                        {previewUrl ? (
                            <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg mb-4 flex items-start gap-2">
                                <MousePointer2 className="text-blue-600 mt-0.5" size={16} />
                                <p className="text-xs text-blue-800 leading-relaxed">
                                    <strong>Geser / Klik pada foto</strong> untuk meletakkan panah merah tepat di posisi barang.
                                </p>
                            </div>
                        ) : (
                            <div className="text-center mb-6">
                                <p className="text-gray-500 text-sm mb-1">Barang dikembalikan:</p>
                                <p className="font-bold text-gray-900">{selectedLoan?.variants?.items?.name}</p>
                            </div>
                        )}

                        <div className="mb-6 relative">
                            {previewUrl ? (
                                <div 
                                    ref={imageContainerRef}
                                    onClick={handleImageClick}
                                    onTouchMove={handleImageClick} 
                                    className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-900 cursor-crosshair touch-none"
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={previewUrl} alt="Bukti" className="w-full object-contain" />
                                    <div 
                                        className="absolute transform -translate-x-1/2 -translate-y-full pointer-events-none transition-all duration-75"
                                        style={{ left: `${arrowPos.x}%`, top: `${arrowPos.y}%`, filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.5))' }}
                                    >
                                        <svg width="60" height="60" viewBox="0 0 24 24" fill="red" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 19V5" /><path d="M5 12l7 7 7-7" />
                                        </svg>
                                        <div className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 text-center shadow-sm">Lokasi</div>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); setPreviewUrl(null); }} className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-red-500 text-white rounded-full backdrop-blur-md transition">
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-blue-50 hover:border-blue-400 transition group">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        {isProcessing ? <Loader2 className="animate-spin text-blue-500 mb-2" size={32} /> : <Camera className="text-gray-400 group-hover:text-blue-500 mb-2" size={32} />}
                                        <p className="mb-2 text-sm text-gray-500 group-hover:text-blue-600 font-bold">{isProcessing ? "Memproses..." : "Ambil Foto"}</p>
                                        <p className="text-xs text-gray-400">Bukti barang diletakkan kembali</p>
                                    </div>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isProcessing} />
                                </label>
                            )}
                        </div>

                        <button 
                            onClick={handleConfirmReturn}
                            disabled={!previewUrl || isProcessing}
                            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${previewUrl && !isProcessing ? 'bg-green-600 text-white shadow-green-600/20 active:scale-95' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                        >
                            {isProcessing ? <Loader2 className="animate-spin" /> : <CheckCircle size={20} />}
                            {isProcessing ? "Menyimpan Data..." : "Konfirmasi Posisi & Selesai"}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* --- 3. POPUP SUKSES --- */}
      <AnimatePresence>
        {showSuccess && (
            <motion.div 
                className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                initial="hidden" animate="visible" exit="hidden" variants={backdropVariants}
            >
                <motion.div 
                    className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full text-center space-y-4 border border-white/20"
                    variants={modalVariants} 
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2 animate-bounce">
                        <CheckCircle size={40} strokeWidth={3} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-1">Berhasil!</h2>
                        <p className="text-gray-500">Barang sudah tercatat kembali dan bukti foto sudah disimpan.</p>
                    </div>
                    <div className="pt-4">
                        <button 
                            onClick={() => setShowSuccess(false)}
                            className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition shadow-lg active:scale-95"
                        >
                            Oke, Mantap
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}