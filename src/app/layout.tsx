// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/Header";
import { PokedexProvider } from "@/contexts/PokedexContext"; // Import the provider

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Vitrus - Pokémon Tools", // Updated site title
    description: "Pokémon type effectiveness guesser and other tools by Vitrus.",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
        <body className={`${inter.className} bg-gray-900`}>
        <PokedexProvider> {/* Wrap with PokedexProvider */}
            <SiteHeader />
            {children}
        </PokedexProvider>
        </body>
        </html>
    );
}