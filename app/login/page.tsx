"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"

export default function LoginPage() {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null)
  const [testName, setTestName] = useState("")
  const [testEmail, setTestEmail] = useState("")

  const handleLogin = async (provider: "google" | "kakao" | "naver") => {
    setLoadingProvider(provider)
    try {
      await signIn(provider, { callbackUrl: "/" })
    } catch (error) {
      console.error(error)
      setLoadingProvider(null)
    }
  }

  const handleTestLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testEmail) return
    setLoadingProvider("credentials")
    try {
      await signIn("credentials", {
        name: testName || "테스트 유저",
        email: testEmail,
        callbackUrl: "/",
      })
    } catch (error) {
      console.error(error)
      setLoadingProvider(null)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#090b11] px-4 text-white">
      {/* Background Decorative Blur Orbs */}
      <div className="absolute top-[-10%] left-[-10%] h-[350px] w-[350px] rounded-full bg-indigo-600 opacity-20 blur-[130px]" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[350px] w-[350px] rounded-full bg-purple-600 opacity-20 blur-[130px]" />

      <div className="z-10 w-full max-w-md rounded-3xl border border-white/[0.08] bg-white/[0.02] p-8 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:border-white/[0.12]">
        <div className="flex flex-col items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">간편 로그인</h1>
          <p className="mt-2 text-sm text-gray-400">원하시는 계정으로 간편하게 시작하세요.</p>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          {/* 구글 로그인 버튼 */}
          <button
            onClick={() => handleLogin("google")}
            disabled={loadingProvider !== null}
            className="group relative flex h-12 w-full items-center justify-center rounded-xs bg-white px-4 text-sm font-semibold text-gray-900 transition-all duration-200 hover:bg-gray-50 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-md cursor-pointer"
          >
            {loadingProvider === "google" ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-gray-900" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Google 로그인 중...
              </span>
            ) : (
              <span className="flex items-center gap-3">
                <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                Google 계정으로 로그인
              </span>
            )}
          </button>

          {/* 카카오 로그인 버튼 */}
          <button
            onClick={() => handleLogin("kakao")}
            disabled={loadingProvider !== null}
            className="group relative flex h-12 w-full items-center justify-center rounded-xs bg-[#FEE500] px-4 text-sm font-semibold text-[#191919] transition-all duration-200 hover:bg-[#FEE500]/95 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-md cursor-pointer"
          >
            {loadingProvider === "kakao" ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-[#191919]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                카카오 로그인 중...
              </span>
            ) : (
              <span className="flex items-center gap-3">
                <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                  <path d="M12 3c-4.97 0-9 3.118-9 6.965 0 2.458 1.648 4.614 4.145 5.848l-.837 3.096c-.09.336.115.66.449.544l3.633-2.463c.523.078 1.057.12 1.61.12 4.97 0 9-3.118 9-6.965C21 6.118 16.97 3 12 3z"/>
                </svg>
                카카오톡으로 로그인
              </span>
            )}
          </button>

          {/* 네이버 로그인 버튼 */}
          <button
            onClick={() => handleLogin("naver")}
            disabled={loadingProvider !== null}
            className="group relative flex h-12 w-full items-center justify-center rounded-xs bg-[#03C75A] px-4 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#03C75A]/95 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-md hover:shadow-[#03C75A]/20 hover:shadow-lg cursor-pointer"
          >
            {loadingProvider === "naver" ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                네이버 로그인 중...
              </span>
            ) : (
              <span className="flex items-center gap-3">
                <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                  <path d="M16.273 2.25h5.477V21.75h-5.477l-8.02-11.75v11.75H2.777V2.25h5.477l8.02 11.75V2.25z"/>
                </svg>
                네이버로 로그인
              </span>
            )}
          </button>
        </div>

        {/* 구분선 */}
        <div className="my-6 flex items-center justify-center gap-2">
          <div className="h-[1px] flex-1 bg-white/[0.08]" />
          <span className="text-xs text-gray-500 font-medium">또는</span>
          <div className="h-[1px] flex-1 bg-white/[0.08]" />
        </div>

        {/* 테스트 로그인 폼 */}
        <form onSubmit={handleTestLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="test-name" className="text-xs text-gray-400 font-semibold pl-1">테스트 이름</label>
            <input
              id="test-name"
              type="text"
              placeholder="홍길동"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              className="h-11 w-full rounded-xs border border-white/[0.08] bg-white/[0.03] px-3.5 text-sm transition-all focus:border-indigo-500 focus:outline-none placeholder:text-gray-600"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="test-email" className="text-xs text-gray-400 font-semibold pl-1">테스트 이메일 *</label>
            <input
              id="test-email"
              type="email"
              required
              placeholder="test@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="h-11 w-full rounded-xs border border-white/[0.08] bg-white/[0.03] px-3.5 text-sm transition-all focus:border-indigo-500 focus:outline-none placeholder:text-gray-600"
            />
          </div>
          <button
            type="submit"
            disabled={loadingProvider !== null || !testEmail}
            className="group relative flex h-11 w-full items-center justify-center rounded-xs bg-indigo-600 px-4 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-md shadow-indigo-600/10 cursor-pointer"
          >
            {loadingProvider === "credentials" ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                테스트 로그인 중...
              </span>
            ) : (
              <span>테스트 계정으로 즉시 로그인</span>
            )}
          </button>
        </form>

        <div className="mt-8 flex items-center justify-between text-xs text-gray-500">
          <span>안전한 보안 로그인을 제공합니다.</span>
          <a href="#" className="hover:text-indigo-400 hover:underline">도움이 필요하신가요?</a>
        </div>
      </div>
    </div>
  )
}
