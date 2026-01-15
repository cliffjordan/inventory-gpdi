import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast"; 
import { CartProvider } from "@/context/CartContext"; // <--- 1. WAJIB ADA INI

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Creative Ministry Inventory",
  description: "App Inventory System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={inter.className}>
        {/* 2. WAJIB BUNGKUS APLIKASI DENGAN INI */}
        <CartProvider>
          <Toaster position="top-center" />
          {children}
        </CartProvider>
      </body>
    </html>
  );
}