import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "ResearchDB",
    description: "Search and chat with research papers",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body
                className={`${inter.className} bg-[#F8F6F2] text-[#2F2A24]`}
            >
                {children}
            </body>
        </html>
    );
}