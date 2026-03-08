import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sylva Music - Professional Spotify Downloader",
  description: "Download and stream your favorite Spotify tracks in high quality MP3",
  keywords: "spotify downloader, music downloader, mp3 downloader, spotify to mp3",
  authors: [{ name: "Sylva Music" }],
  openGraph: {
    title: "Sylva Music - Professional Spotify Downloader",
    description: "Download and stream your favorite Spotify tracks in high quality MP3",
    type: "website",
    siteName: "Sylva Music",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster 
          position="bottom-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#363636",
              color: "#fff",
              borderRadius: "9999px",
              padding: "12px 24px",
              fontSize: "14px",
            },
            success: {
              iconTheme: {
                primary: "#10b981",
                secondary: "#fff",
              },
            },
            error: {
              iconTheme: {
                primary: "#ef4444",
                secondary: "#fff",
              },
            },
          }}
        />
      </body>
    </html>
  );
}