import localFont from "next/font/local"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { NextAuthProvider } from "./providers"
import { Toaster } from "@/components/ui/sonner"

const pretendard = localFont({
    src: "../public/PretendardVariable.ttf",
    variable: "--font-pretendard",
    weight: "45 920",
    display: "swap",
});
import Top from '@/components/top'
import Footer from '@/components/footer'

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html
            lang="ko"
            suppressHydrationWarning
            className={cn("font-sans antialiased", pretendard.variable, pretendard.className)}
        >
            <body>
                <NextAuthProvider>
                    <ThemeProvider>
                        <Top />
                        {children}
                        <Footer />
                    </ThemeProvider>
                    <Toaster richColors position="bottom-center" />
                </NextAuthProvider>
            </body>
        </html>
    )
}
