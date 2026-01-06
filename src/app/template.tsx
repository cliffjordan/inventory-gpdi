"use client";

import { motion } from "framer-motion";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      // Keadaan awal (sebelum muncul)
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      
      // Keadaan akhir (saat muncul)
      animate={{ opacity: 1, y: 0, scale: 1 }}
      
      // Durasi dan kelengkungan animasi
      transition={{ ease: "easeOut", duration: 0.4 }}
      
      className="min-h-screen" // Pastikan tinggi penuh
    >
      {children}
    </motion.div>
  );
}