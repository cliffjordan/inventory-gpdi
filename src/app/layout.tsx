import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// 1. WAJIB IMPORT INI
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Inventory Creative Ministry",
  description: "Aplikasi Peminjaman Kostum & Alat",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={inter.className}>
        
        {/* 2. PASANG WADAH TOAST DISINI (PALING ATAS) */}
        <Toaster 
          position="top-center" 
          reverseOrder={false}
          toastOptions={{
            // Styling Global agar terlihat modern
            style: {
              background: '#333',
              color: '#fff',
              borderRadius: '12px',
              fontSize: '14px',
              padding: '16px',
            },
            success: {
              style: {
                background: '#ECFDF5', // Hijau muda lembut
                color: '#065F46',      // Hijau tua text
                border: '1px solid #6EE7B7',
                fontWeight: 'bold',
              },
            },
            error: {
              style: {
                background: '#FEF2F2', // Merah muda lembut
                color: '#991B1B',      // Merah tua text
                border: '1px solid #FCA5A5',
                fontWeight: 'bold',
              },
            },
          }}
        />

        {children}
      </body>
    </html>
  );
}