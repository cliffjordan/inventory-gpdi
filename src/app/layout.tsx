
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast"; 
import { CartProvider } from "@/context/CartContext"; // <--- 1. WAJIB ADA INI
import type { Metadata, Viewport } from "next";



;

// Menggunakan font Inter yang modern dan bersih
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Creative Ministry Inventory",
  description: "Aplikasi manajemen inventaris barang.",
  manifest: "/manifest.json",
};

// Konfigurasi viewport untuk memastikan tampilan mobile yang pas dan mencegah zoom otomatis pada input
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={inter.className}>
        {/* --- [GLOBAL BACKGROUND IMAGE] --- */}
        {/* Layer ini diletakkan di sini agar berlaku untuk SEMUA halaman */}
        <div 
          className="fixed inset-0 z-[-1]" // Posisi fixed di belakang konten (z-index negatif)
          style={{
            // Gambar baru: Abstract Gradient Halus
            backgroundImage: 'url("https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=1080&auto=format&fit=crop")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          {/* Overlay putih transparan agar teks di halaman tetap mudah dibaca */}
          <div className="absolute inset-0 bg-white/30 backdrop-blur-[1px]"></div>
        </div>

        <CartProvider>
           {/* Toaster untuk notifikasi popup */}
           <Toaster position="top-center" toastOptions={{ duration: 3000, style: { background: '#333', color: '#fff', borderRadius: '16px' } }} />
           
           {/* Konten halaman (page.tsx) akan dirender di sini, di atas background */}
           <main className="min-h-screen relative">{children}</main>
        </CartProvider>
      </body>
    </html>
  );
}