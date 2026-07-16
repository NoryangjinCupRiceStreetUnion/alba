"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Moon, Sun, MessageCircle } from "lucide-react";
import { useTheme } from "next-themes";
import { useSession, signOut } from "next-auth/react";
import BatteryProgress from "@/components/bat";

export default function Navbar() {
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/70 backdrop-blur-lg transition-all duration-300">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* 원본 로고 */}
        <Link href="/" className="flex items-center gap-2 group">
          <img
            src="/logo.png"
            alt="logo"
            className="h-7 transition-transform group-hover:scale-105"
          />
        </Link>

        {/* 내비게이션 */}
        <nav className="hidden md:flex items-center gap-1.5 text-sm font-medium">
          <Link href="/" className="px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
            물건 탐색
          </Link>
          <Link href="/upload" className="px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
            물건 등록
          </Link>
          <Link href="/chat" className="px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
            채팅
          </Link>
          <Link href="/test" className="px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
            목록
          </Link>
        </nav>

        {/* 우측: 세션 + 테마 */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              {/* 신뢰 배터리 */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-accent/40 border border-border/40 text-xs">
                <span className="text-muted-foreground font-semibold">신뢰 배터리</span>
                <BatteryProgress percentage={36.5} />
              </div>
              {/* 프로필 아바타 */}
              <div className="flex items-center gap-2">
                {user.image ? (
                  <img src={user.image} alt="profile" className="h-8 w-8 rounded-xl object-cover ring-2 ring-primary/20" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary border border-primary/20 text-sm">
                    {user.name ? user.name[0] : user.email ? user.email[0].toUpperCase() : "U"}
                  </div>
                )}
                <span className="hidden lg:block text-sm font-semibold">{user.name || "사용자"}</span>
              </div>
              {/* 로그아웃 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                로그아웃
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <Button variant="default" size="sm" className="rounded-xl">
                시작하기
              </Button>
            </Link>
          )}

          {/* 다크모드 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-xl"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
}
