"use client";

import React, { useState, useEffect } from 'react';
import { ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext'; // <--- IMPORT CONTEXT

export default function FloatingCart() {
  const { cart } = useCart(); // <--- PAKAI HOOK INI
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);

  const hiddenPaths = ['/login', '/register', '/superuser', '/cart'];

  useEffect(() => {
    if (hiddenPaths.includes(pathname)) {
      setIsVisible(false);
    } else {
      setIsVisible(true);
    }
  }, [pathname]);

  if (!isVisible || cart.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Link href="/cart"> 
          <div className="group flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-full shadow-xl shadow-blue-600/30 hover:bg-blue-700 hover:scale-110 transition-all cursor-pointer border-4 border-white relative">
            <ShoppingCart size={28} />
            <span className="absolute -top-1 -right-1 bg-red-500 border-2 border-white text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full animate-bounce">
              {cart.length}
            </span>
          </div>
        </Link>
      </motion.div>
    </AnimatePresence>
  );
}