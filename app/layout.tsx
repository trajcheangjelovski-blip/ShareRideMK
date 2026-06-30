import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Macedonia Ride — заедничко патување",
  description:
    "Меѓуградско carpool патување во Македонија. Најди превоз или понуди слободни места.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="mk" className={inter.variable}>
      <body className="min-h-screen bg-white font-sans text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
