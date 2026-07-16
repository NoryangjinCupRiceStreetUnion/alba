import { auth, signOut } from "@/auth"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function Page() {
  const session = await auth()
  const user = session?.user

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#090b11] p-6 text-white">
      {/* Background Decorative Blur Orbs */}
      <div className="absolute top-[-10%] right-[-10%] h-[300px] w-[300px] rounded-full bg-indigo-600 opacity-15 blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] h-[300px] w-[300px] rounded-full bg-purple-600 opacity-15 blur-[120px]" />

      <div className="z-10 w-full max-w-md rounded-3xl border border-white/[0.08] bg-white/[0.02] p-8 backdrop-blur-xl shadow-2xl">
        {user ? (
          <div className="flex flex-col items-center text-center">
            {/* 프로필 이미지 혹은 이니셜 아바타 */}
            <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-indigo-500/30 p-1 shadow-lg shadow-indigo-500/10">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt={user.name || "User Avatar"}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-indigo-500/20 text-2xl font-bold text-indigo-400">
                  {user.name ? user.name[0] : "U"}
                </div>
              )}
            </div>

            <h1 className="mt-6 text-2xl font-bold tracking-tight text-white">
              안녕하세요, <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">{user.name || "사용자"}</span>님!
            </h1>
            <p className="mt-1 text-sm text-gray-400">{user.email}</p>

            <div className="mt-8 w-full border-t border-white/[0.08] pt-6">
              <div className="flex flex-col gap-3">
                <div className="rounded-xl bg-white/[0.03] p-4 text-left border border-white/[0.05]">
                  <p className="text-xs text-gray-500">인증 제공처</p>
                  <p className="text-sm font-medium text-gray-300 mt-1">NextAuth 소셜 연동 성공</p>
                </div>

                <form
                  action={async () => {
                    "use server"
                    await signOut({ redirectTo: "/login" })
                  }}
                  className="w-full"
                >
                  <Button
                    type="submit"
                    variant="destructive"
                    className="w-full h-11 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all duration-200 cursor-pointer"
                  >
                    로그아웃
                  </Button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">시작하기</h1>
            <p className="mt-2 text-sm text-gray-400">
              서비스를 이용하려면 로그인이 필요합니다.
            </p>

            <div className="mt-8 w-full">
              <Link href="/login" passHref className="w-full">
                <Button className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-white shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all duration-200 cursor-pointer">
                  로그인 페이지로 이동
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

