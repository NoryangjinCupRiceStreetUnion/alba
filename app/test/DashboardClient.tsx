"use client"

import { useState } from "react"
import { Sparkles, CheckCircle2, PlayCircle, BookOpen, Repeat, ShieldCheck, Bookmark, ArrowRight, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface DashboardClientProps {
  user: any
}

const MOCK_COURSES = [
  { id: 1, title: "2026 공무원 행정법 총론 입문 강좌", desc: "행정법의 근본 체계와 주요 행정 작용 및 권리 규제 방안 기초", duration: "12강 / 240분" },
  { id: 2, title: "노량진 9급 영어 어휘 마스터 핵심 500", desc: "공무원 영어 시험 빈출 어휘집 완벽 암기 프로그램", duration: "8강 / 160분" },
  { id: 3, title: "한국사 근현대사 핵심 요약 특강", desc: "개항기부터 현대사까지의 흐름을 3시간 만에 마스터하는 압축 특강", duration: "5강 / 180분" },
  { id: 4, title: "공학용 계산기 핵심 사용법 및 회로 문제 실전", desc: "전기/전자 전공 학생들을 위한 CAS 공학 계산기 특화 응용 강의", duration: "4강 / 100분" },
  { id: 5, title: "성공적인 공기업 면접 대비 모의 피드백", desc: "답변 구조화 및 비언어적 자세 피드백을 담은 합격 면접 바이블", duration: "6강 / 120분" },
];

const MOCK_RENTALS = [
  { id: "r1", name: "보쉬 전동 햄머드릴 세트", role: "borrower", period: "2026-07-20 ~ 2026-07-22", price: 6000, status: "진행중", statusColor: "text-indigo-500 bg-indigo-500/10" },
  { id: "r2", name: "iPad Pro 11-inch (애플펜슬 포함)", role: "borrower", period: "2026-07-25 ~ 2026-07-27", price: 15000, status: "승인대기", statusColor: "text-amber-500 bg-amber-500/10" },
  { id: "r3", name: "2026 공무원 행정법 총론 기본서", role: "owner", period: "2026-07-18 ~ 2026-07-21", price: 4000, status: "반납완료", statusColor: "text-emerald-500 bg-emerald-500/10" },
];

export default function DashboardClient({ user }: DashboardClientProps) {
  const [watchedIds, setWatchedIds] = useState<Set<number>>(new Set([1, 3]))
  const [activeTab, setActiveTab] = useState<"courses" | "rentals">("courses")

  const toggleWatch = (id: number) => {
    setWatchedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const totalCourses = MOCK_COURSES.length
  const completedCourses = watchedIds.size
  const percent = totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0

  return (
    <div className="relative min-h-[80vh] bg-background text-foreground transition-all duration-300">
      {/* Glow Orbs */}
      <div className="absolute top-10 left-[10%] -z-10 h-72 w-72 rounded-full bg-indigo-500/10 opacity-50 blur-[100px] dark:bg-indigo-500/5" />

      <div className="mx-auto max-w-5xl">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 text-left">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-500 text-white shadow-lg">
              {user?.image ? (
                <img src={user.image} alt="avatar" className="h-full w-full object-cover rounded-3xl" />
              ) : (
                <User className="h-8 w-8" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">{user?.name || "학습자"}님의 대시보드</h1>
              <p className="text-xs text-muted-foreground mt-1">오늘도 목표를 향해 한 걸음 더 나아가세요.</p>
            </div>
          </div>

          {/* Tab buttons */}
          <div className="flex rounded-2xl bg-card border border-border p-1 text-xs self-start md:self-center shadow-sm">
            <button
              onClick={() => setActiveTab("courses")}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold transition-all ${
                activeTab === "courses" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              강의 수강 목록
            </button>
            <button
              onClick={() => setActiveTab("rentals")}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold transition-all ${
                activeTab === "rentals" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Repeat className="h-4 w-4" />
              대여 내역 관리
            </button>
          </div>
        </div>

        {/* Tab Panel Content */}
        {activeTab === "courses" ? (
          /* COURSES LIST TAB */
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-200">
            {/* Progress Bar Card */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm text-left relative overflow-hidden">
              <div className="absolute top-[-20%] right-[-10%] h-36 w-36 rounded-full bg-indigo-600/10 blur-xl" />
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Bookmark className="h-4 w-4 text-indigo-500" />
                  전체 강의 진도율
                </h3>
                <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                  {percent}% ({completedCourses} / {totalCourses}강 수강)
                </span>
              </div>
              
              {/* Custom Progress Bar */}
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden border border-border/40">
                <div
                  className="bg-gradient-to-r from-indigo-600 to-purple-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>

            {/* Course Grid */}
            <div className="grid grid-cols-1 gap-4 text-left">
              {MOCK_COURSES.map((course) => {
                const isCompleted = watchedIds.has(course.id)
                return (
                  <div
                    key={course.id}
                    onClick={() => toggleWatch(course.id)}
                    className={`group relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border transition-all duration-300 hover:shadow-md cursor-pointer ${
                      isCompleted
                        ? "border-emerald-500/25 bg-emerald-500/[0.02]"
                        : "border-border/60 bg-card hover:border-indigo-500/30"
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground font-semibold bg-accent/60 px-2 py-0.5 rounded">
                          {course.duration}
                        </span>
                        {isCompleted && (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" />
                            완료됨
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-foreground mt-2 group-hover:text-indigo-600 transition-colors">
                        {course.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {course.desc}
                      </p>
                    </div>

                    <button
                      className={`h-9 px-4 rounded-xl text-xs font-bold shrink-0 transition-all ${
                        isCompleted
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/10"
                      }`}
                    >
                      {isCompleted ? "다시 수강하기" : "학습 완료 체크"}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* RENTALS LIST TAB */
          <div className="space-y-6 text-left animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-4">
                <ShieldCheck className="h-4.5 w-4.5 text-indigo-500" />
                나의 로컬 대여/공유 현황
              </h3>
              
              <div className="divide-y divide-border/40">
                {MOCK_RENTALS.map((rental) => (
                  <div key={rental.id} className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          rental.role === "borrower"
                            ? "text-indigo-600 bg-indigo-500/10 border border-indigo-500/15"
                            : "text-purple-600 bg-purple-500/10 border border-purple-500/15"
                        }`}>
                          {rental.role === "borrower" ? "내가 빌린 물건" : "내가 빌려준 물건"}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rental.statusColor}`}>
                          {rental.status}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold mt-2 text-foreground truncate">{rental.name}</h4>
                      <p className="text-[10px] text-muted-foreground mt-1">대여 기간: {rental.period}</p>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-center">
                      <div className="text-right">
                        <span className="text-[9px] text-muted-foreground block leading-none">합계 요금</span>
                        <span className="text-sm font-extrabold text-foreground">{rental.price.toLocaleString()}원</span>
                      </div>
                      <button className="h-8 px-3 rounded-lg border border-border text-xs font-bold hover:bg-accent transition-colors">
                        상세보기
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Back to Browse callout */}
            <div className="rounded-3xl border border-dashed border-border/80 bg-accent/25 p-8 text-center max-w-md mx-auto mt-6">
              <span className="text-2xl">🤝</span>
              <h4 className="font-bold text-sm text-foreground mt-2">필요한 물건이 더 있으신가요?</h4>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                동작구 노량진 이웃들이 공유하는 온갖 생활 집기와 IT 기기, 도서들이 준비되어 있습니다.
              </p>
              <Link href="/">
                <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold">
                  물건 둘러보러 가기
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
