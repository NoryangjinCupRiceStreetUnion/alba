import localFont from "next/font/local"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

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
                <Top />
                <ThemeProvider>{children}</ThemeProvider>
                <Footer />
            </body>
        </html>
    )
}
