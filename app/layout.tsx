"use client";

import localFont from "next/font/local"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

const pretendard = localFont({
    src: "../public/PretendardVariable.ttf",
    variable: "--font-sans",
    display: "swap",
})

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html
            lang="ko"
            suppressHydrationWarning
            className={cn("font-sans antialiased", pretendard.variable)}
        >
            <body>
                <ThemeProvider>{children}</ThemeProvider>
            </body>
        </html>
    )
}
