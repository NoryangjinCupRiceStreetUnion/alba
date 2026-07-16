"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Calendar, MapPin, Sparkles, CheckCircle2, Share2, Heart, Info, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import BatteryProgress from "@/components/bat"
import { toast } from "sonner"

interface ItemType {
  id: string
  name: string
  category?: string
  region: string
  dailyPrice: number
  weeklyPrice?: number
  tradeMethod: string
  available?: boolean
  ownerNickname?: string
  ownerMannerScore?: number
  imageUrl?: string
  gallery?: string[]
  description: string
  locationDetail?: string
  maxDuration?: string
}

interface ItemDetailClientProps {
  item: ItemType
  user: any
}

export default function ItemDetailClient({ item, user }: ItemDetailClientProps) {
  const router = useRouter()
  const [isLiked, setIsLiked] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [isBooked, setIsBooked] = useState(false)
  const [isBookingOpen, setIsBookingOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [redirectChatId, setRedirectChatId] = useState<string | null>(null)

  // 금액 계산
  let rentalDays = 0
  let originalPrice = 0
  let totalPrice = 0
  let discount = 0

  if (startDate && endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = end.getTime() - start.getTime()
    if (diffTime >= 0) {
      rentalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
      originalPrice = rentalDays * item.dailyPrice
      if (item.weeklyPrice && rentalDays >= 7) {
        const weeks = Math.floor(rentalDays / 7)
        const remainingDays = rentalDays % 7
        totalPrice = weeks * item.weeklyPrice + remainingDays * item.dailyPrice
        discount = originalPrice - totalPrice
      } else {
        totalPrice = originalPrice
      }
    }
  }

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rentalDays <= 0 || isSubmitting) return

    if (!user) {
      toast.error("로그인이 필요합니다.")
      router.push("/login")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/rentals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          startAt: new Date(startDate).toISOString(),
          endAt: new Date(endDate).toISOString(),
        }),
      })

      if (res.ok) {
        const payload = await res.json()
        setRedirectChatId(payload.chatId ?? null)
        setIsBooked(true)
        setIsBookingOpen(false)
        toast.success("대여 신청이 완료됐습니다. 판매자와 바로 대화할 수 있는 채팅방으로 이동합니다.")
        setTimeout(() => {
          if (payload.chatId) {
            router.push(`/chat/${payload.chatId}`)
          } else {
            router.push("/chat")
          }
        }, 1000)
      } else {
        const err = await res.json()
        toast.error(err?.error?.message ?? "대여 신청에 실패했습니다.")
      }
    } catch {
      toast.error("오류가 발생했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Image Viewer */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Main Image Frame - 이미지 1장 */}
          <div className="relative aspect-video rounded-3xl overflow-hidden border border-border/60 bg-accent/20 shadow-md">
            <img
              src={item.imageUrl}
              alt={item.name}
              className="h-full w-full object-cover"
            />
            {/* Overlay Badges */}
            <div className="absolute top-4 left-4 flex gap-2">
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full text-white shadow-md ${
                item.tradeMethod === "MEET" ? "bg-indigo-600" : "bg-purple-600"
              }`}>
                {item.tradeMethod === "MEET" ? "🤝 대면 직거래" : "📦 택배 가능"}
              </span>
              <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md">
                대여 즉시가능
              </span>
            </div>
          </div>

          {/* 썸네일 갤러리 제거 - 이미지 1장만 표시 */}

          {/* Description Card */}
          <div className="mt-4 rounded-3xl border border-border/50 bg-card p-6 text-left">
            <h3 className="text-lg font-bold mb-4">상세 물건 설명</h3>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {item.description}
            </p>
            <div className="mt-6 flex items-center gap-2 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 p-3 text-xs text-indigo-600 dark:text-indigo-400">
              <Info className="h-4 w-4 shrink-0" />
              <span>동작구 이웃 간의 신뢰 거래를 위해 본인인증 완료 회원만 거래를 제안할 수 있습니다.</span>
            </div>
          </div>
        </div>

        {/* Right Column: Information & Reservation Widget */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Header Info Card */}
          <div className="rounded-3xl border border-border/50 bg-card p-6 text-left shadow-sm">
            <div className="flex justify-between items-start gap-4">
              <div>
                <span className="inline-block text-[10px] font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-md mb-2">
                  {item.category === "devices" ? "IT/디바이스" : item.category === "tools" ? "생활/공구" : item.category === "books" ? "도서/전공서적" : item.category === "leisure" ? "캠핑/레저" : item.category === "delivery" ? "택배 가능" : "대여 물품"}
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-tight">
                  {item.name}
                </h1>
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{item.region}</span>
                </div>
              </div>

              {/* Utility buttons */}
              <div className="flex gap-1">
                <button
                  onClick={() => setIsLiked(!isLiked)}
                  className={`p-2 rounded-xl border transition-colors ${
                    isLiked ? "bg-rose-500/10 border-rose-500 text-rose-500" : "border-border/60 hover:bg-accent"
                  }`}
                >
                  <Heart className={`h-4 w-4 ${isLiked ? "fill-rose-500" : ""}`} />
                </button>
                <button className="p-2 rounded-xl border border-border/60 hover:bg-accent text-muted-foreground hover:text-foreground">
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Price Tags */}
            <div className="mt-6 flex flex-wrap gap-4 border-t border-b border-border/40 py-4">
              <div className="flex-1 min-w-[120px]">
                <span className="text-[10px] text-muted-foreground font-semibold">1일 대여 기준가</span>
                <p className="text-xl font-black text-foreground mt-0.5">
                  {item.dailyPrice.toLocaleString()}원
                </p>
              </div>
              {item.weeklyPrice && (
                <div className="flex-1 min-w-[120px] border-l border-border/40 pl-4">
                  <span className="text-[10px] text-indigo-500 font-bold flex items-center gap-0.5">
                    <Sparkles className="h-3 w-3" />
                    7일 특별 패키지
                  </span>
                  <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {item.weeklyPrice.toLocaleString()}원
                  </p>
                  <span className="text-[9px] text-muted-foreground">
                    (하루당 약 {Math.round(item.weeklyPrice / 7).toLocaleString()}원)
                  </span>
                </div>
              )}
            </div>

            {/* Specs Summary */}
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="bg-accent/40 border border-border/40 rounded-xl p-2.5">
                <span className="text-[10px] text-muted-foreground">최대 대여 기한</span>
                <p className="font-bold mt-0.5 text-foreground">{item.maxDuration ?? "협의 가능"}</p>
              </div>
              <div className="bg-accent/40 border border-border/40 rounded-xl p-2.5">
                <span className="text-[10px] text-muted-foreground">택배 가능 유무</span>
                <p className="font-bold mt-0.5 text-foreground">{item.tradeMethod === "DELIVER" ? "가능 (선/착불)" : "불가능 (대면만)"}</p>
              </div>
              <div className="col-span-2 bg-accent/40 border border-border/40 rounded-xl p-2.5">
                <span className="text-[10px] text-muted-foreground">희망 거래 상세 장소</span>
                <p className="font-bold mt-0.5 text-foreground">{item.locationDetail ?? item.region}</p>
              </div>
            </div>
          </div>

          {/* Owner Info Profile */}
          <div className="rounded-3xl border border-border/50 bg-card p-5 text-left shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10 font-black text-indigo-500 border border-indigo-500/20">
                {item.ownerNickname?.[0] ?? "U"}
              </div>
              <div>
                <span className="text-xs text-muted-foreground font-semibold">대여자 정보</span>
                <h4 className="text-sm font-bold text-foreground">{item.ownerNickname ?? "알 수 없음"}</h4>
              </div>
            </div>
            {/* 신뢰 배터리 */}
            <div className="flex flex-col items-end gap-1">
              <span className="text-[9px] text-muted-foreground font-bold">신뢰 배터리 {(item.ownerMannerScore ?? 36.5) >= 80 ? "🔥" : ""}</span>
              <BatteryProgress percentage={item.ownerMannerScore ?? 36.5} />
            </div>
          </div>

          {/* Date Picker & Calculator Card */}
          <div className="rounded-3xl border border-indigo-500/20 bg-indigo-500/5 p-6 text-left shadow-md relative overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] h-32 w-32 rounded-full bg-indigo-600/10 blur-xl" />
            <h3 className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 mb-4">
              <Calendar className="h-4 w-4" />
              대여 기간 선택 및 예상 요금
            </h3>

            <form onSubmit={handleBooking} className="flex flex-col gap-4 relative z-10">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-muted-foreground font-bold pl-1">대여 시작일</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="h-10 rounded-xl border border-border bg-background px-3 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-muted-foreground font-bold pl-1">반납 예정일</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || new Date().toISOString().split("T")[0]}
                    className="h-10 rounded-xl border border-border bg-background px-3 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Real-time Calculation Panel */}
              {rentalDays > 0 ? (
                <div className="rounded-2xl bg-card border border-border/80 p-4 mt-2 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>총 대여 기간</span>
                    <span className="font-bold text-foreground">{rentalDays}일</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>기본 대여료 ({item.dailyPrice.toLocaleString()}원 x {rentalDays}일)</span>
                    <span>{originalPrice.toLocaleString()}원</span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between text-xs text-emerald-500 font-semibold bg-emerald-500/10 px-2 py-1 rounded-lg">
                      <span>7일 패키지 할인 적용</span>
                      <span>-{discount.toLocaleString()}원</span>
                    </div>
                  )}

                  <div className="border-t border-border/40 pt-2 flex justify-between items-end">
                    <span className="text-xs font-bold">최종 대여 합계</span>
                    <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                      {totalPrice.toLocaleString()}원
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border/80 p-4 text-center text-xs text-muted-foreground bg-background/40">
                  대여 시작일과 반납 예정일을 선택하시면 금액이 계산됩니다.
                </div>
              )}

              {/* Rent Action Button */}
              <Button
                type="submit"
                disabled={rentalDays <= 0}
                className="mt-4 h-12 w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold tracking-wide shadow-md shadow-indigo-600/15 disabled:opacity-50"
              >
                대여 예약 제안하기
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Success Booking Modal Dialog */}
      {isBooked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl border border-border/80 bg-card p-6 shadow-2xl text-center animate-in scale-in-95 duration-200">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mb-4 animate-bounce">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            
            <h2 className="text-xl font-extrabold tracking-tight">대여 예약 신청 완료!</h2>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              물건 소유주인 <span className="font-bold text-foreground">{item.ownerNickname}</span>님께 예약 요청 메세지가 전달되었습니다. 승인 시 대여 일정이 최종 조율됩니다.
            </p>

            {/* Receipt Box */}
            <div className="mt-5 rounded-2xl bg-accent/40 border border-border/40 p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">신청 상품</span>
                <span className="font-bold text-foreground truncate max-w-[200px]">{item.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">대여 일정</span>
                <span className="font-bold text-foreground">{startDate} ~ {endDate} ({rentalDays}일간)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">예정 요금</span>
                <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                  {totalPrice.toLocaleString()}원
                </span>
              </div>
              <div className="flex justify-between border-t border-border/40 pt-2">
                <span className="text-muted-foreground">희망 거래</span>
                <span className="font-bold text-foreground">{item.tradeMethod === "MEET" ? "직거래" : "택배"} ({item.region})</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsBooked(false)}
                className="h-10 rounded-xl border border-border text-xs font-semibold hover:bg-accent transition-colors"
              >
                닫기
              </button>
              <button
                onClick={() => {
                  if (redirectChatId) {
                    router.push(`/chat/${redirectChatId}`)
                  } else {
                    router.push("/chat")
                  }
                }}
                className="h-10 w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/10"
              >
                채팅방으로 이동
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
