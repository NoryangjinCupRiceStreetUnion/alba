// import "./globals.css"
import { auth, signOut } from "@/auth"
import Link from "next/link"
import { Button } from "@/components/ui/button"
// 필요한 경우 LoginBtn, ModeToggle 컴포넌트도 import 해야 합니다.

export default async function RootLayout({ // 1. async 추가
    children,
}: Readonly<{
    children?: React.ReactNode
}>) {
    // 2. await 추가
    const session = await auth()
    const user = session?.user

    return (
        // 3. 최상위 레이아웃이라면 html, body 태그 필수
        <html lang="ko">
            <body>
                <div className="px-6 py-2 pt-3 bg-gray-black">
                    <div className="flex items-center text-sm justify-between">
                        <div className="flex-1 flex items-center">
                            <img className="h-3 mr-1.5" src="/geekslogo.webp" alt="logo" />
                            참가자 강의 시스템
                            <a className="ml-5" href="/study">강의 목록</a>
                        </div>
                    </div>
                </div>

                {/* 4. 하위 페이지 렌더링을 위해 children 반드시 추가 */}
                <main>
                    {children}
                </main>
            </body>
        </html>
    )
}