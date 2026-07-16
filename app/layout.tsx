import localFont from "next/font/local"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

const pretendard = localFont({
    src: "../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
    variable: "--font-pretendard",
    weight: "45 920",
    display: "swap",
});

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
                <ThemeProvider>{children}</ThemeProvider>
            </body>
        </html>
    )
}
