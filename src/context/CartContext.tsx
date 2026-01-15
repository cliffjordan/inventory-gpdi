"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase'; // Import supabase

type CartItem = {
  item_id: any;
  variant_id: any;
  name: string;
  image_url: string;
  color: string;
  size: string;
  location: string;
};

type CartContextType = {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (variantId: any) => void;
  clearCart: () => void;
  isLoading: boolean;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Cek User Saat Ini (Agar Cart Terisolasi)
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
      
      // Jika ada user, load cart milik dia. Jika tidak, kosongkan.
      if (user?.id) {
        const saved = localStorage.getItem(`cm_cart_${user.id}`);
        if (saved) {
          try { setCart(JSON.parse(saved)); } catch (e) { setCart([]); }
        } else {
          setCart([]);
        }
      } else {
        setCart([]); // Reset jika logout
      }
      setIsLoading(false);
    };

    checkUser();

    // Listener jika user login/logout di tab lain
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUserId(session.user.id);
        const saved = localStorage.getItem(`cm_cart_${session.user.id}`);
        if (saved) try { setCart(JSON.parse(saved)); } catch (e) { setCart([]); }
      } else if (event === 'SIGNED_OUT') {
        setUserId(null);
        setCart([]);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  // 2. Simpan ke LocalStorage Unik (cm_cart_USERID)
  useEffect(() => {
    if (userId && !isLoading) {
      localStorage.setItem(`cm_cart_${userId}`, JSON.stringify(cart));
      window.dispatchEvent(new Event('cart-updated'));
    }
  }, [cart, userId, isLoading]);

  const addToCart = (item: CartItem) => {
    const exists = cart.find((c) => c.variant_id === item.variant_id);
    if (exists) {
      toast.error("Barang sudah ada di keranjang");
      return;
    }
    setCart((prev) => [...prev, item]);
    toast.success("Masuk keranjang!");
  };

  const removeFromCart = (variantId: any) => {
    setCart((prev) => prev.filter((item) => item.variant_id !== variantId));
    toast.success("Dihapus dari keranjang");
  };

  const clearCart = () => {
    setCart([]);
  };

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, isLoading }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}