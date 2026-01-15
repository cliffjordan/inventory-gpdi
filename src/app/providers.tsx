"use client";

import { CartProvider } from '@/context/CartContext';
import { Toaster } from 'react-hot-toast';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      {/* Konfigurasi Toaster Anda dipindahkan ke sini */}
      <Toaster 
        position="top-center" 
        reverseOrder={false}
        toastOptions={{
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '12px',
            fontSize: '14px',
            padding: '16px',
          },
          success: {
            style: {
              background: '#ECFDF5', 
              color: '#065F46',      
              border: '1px solid #6EE7B7',
              fontWeight: 'bold',
            },
          },
          error: {
            style: {
              background: '#FEF2F2', 
              color: '#991B1B',      
              border: '1px solid #FCA5A5',
              fontWeight: 'bold',
            },
          },
        }}
      />
      {children}
    </CartProvider>
  );
}