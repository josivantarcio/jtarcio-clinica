import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/theme-provider";
import { Toaster } from "@/providers/toast-provider";
import { Toaster as SonnerToaster } from "sonner";
import { ClientProvider } from "@/providers/client-provider";
import { AuthProvider } from "@/components/providers/auth-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EO Clínica - Sistema de Agendamento Médico",
  description: "Sistema moderno de agendamento médico com IA integrada",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192.png"
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "EO Clínica"
  },
  formatDetection: {
    telephone: false
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#10b981"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <ClientProvider>
          <AuthProvider>
            <ThemeProvider
              defaultTheme="light"
              storageKey="eo-clinica-theme"
            >
              {children}
              <Toaster />
              <SonnerToaster />
            </ThemeProvider>
          </AuthProvider>
        </ClientProvider>
      </body>
    </html>
  );
}
