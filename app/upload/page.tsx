"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Camera, CheckCircle2, Sparkles, X, Info, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function UploadPage() {
  const { status } = useSession()

  // Form states
  const [images, setImages] = useState<string[]>([])
  const [name, setName] = useState("")
  const [category, setCategory] = useState<"DEVICES" | "TOOLS" | "BOOKS" | "LEISURE" | "APPAREL">("DEVICES")
  const [description, setDescription] = useState("")
  const [tradeMethod, setTradeMethod] = useState<"MEET" | "DELIVER">("MEET")
  const [region, setRegion] = useState("서울 동작구 노량진동")
  const [locationDetail, setLocationDetail] = useState("")
  const [dailyPrice, setDailyPrice] = useState("")
  const [useWeeklyPrice, setUseWeeklyPrice] = useState(false)
  const [weeklyPrice, setWeeklyPrice] = useState("")
  const [availableFrom, setAvailableFrom] = useState("")
  const [availableUntil, setAvailableUntil] = useState("")

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [createdItemId, setCreatedItemId] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // Handle local image file upload converting to Base64
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileList = Array.from(e.target.files)
      
      // Limit to max 5 images
      if (images.length + fileList.length > 5) {
        alert("이미지는 최대 5장까지 등록할 수 있습니다.")
        return
      }

      fileList.forEach((file) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            setImages((prev) => [...prev, reader.result as string])
          }
        }
        reader.readAsDataURL(file)
      })
    }
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  // Validate form
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}
    if (images.length === 0) newErrors.images = "최소 1장 이상의 물건 이미지를 업로드해 주세요."
    if (name.length < 2 || name.length > 60) newErrors.name = "물건 이름은 2자 이상, 60자 이하로 작성해 주세요."
    if (!description || description.length > 2000) newErrors.description = "설명은 1자 이상, 2,000자 이하로 작성해 주세요."
    if (!dailyPrice || parseInt(dailyPrice) <= 0) newErrors.dailyPrice = "올바른 1일 대여료를 입력해 주세요."
    if (useWeeklyPrice && (!weeklyPrice || parseInt(weeklyPrice) <= 0)) newErrors.weeklyPrice = "올바른 7일 대여 요금을 입력해 주세요."
    if (!availableFrom) newErrors.availableFrom = "대여 시작 가능일을 정해 주세요."
    if (!availableUntil) newErrors.availableUntil = "대여 종료 예정일을 정해 주세요."
    if (availableFrom && availableUntil && new Date(availableFrom) >= new Date(availableUntil)) {
      newErrors.availableUntil = "종료일은 시작일 이후 날짜여야 합니다."
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    setErrors({})

    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          category,
          tradeMethod,
          region,
          locationDetail: locationDetail.trim() || null,
          dailyPrice: Number(dailyPrice),
          weeklyPrice: useWeeklyPrice && weeklyPrice ? Number(weeklyPrice) : null,
          availableFrom: `${availableFrom}T00:00:00.000Z`,
          availableUntil: `${availableUntil}T23:59:59.000Z`,
          images: images.map((url, index) => ({ url, order: index })),
        }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error?.message ?? "등록에 실패했습니다.")
      }

      const payload = await res.json()
      setCreatedItemId(payload.data.id)
      setIsSuccess(true)
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : "등록에 실패했습니다." })
    } finally {
      setIsSubmitting(false)
    }
  }

  // If user session is loading
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <svg className="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    )
  }

  // If not logged in
  if (status === "unauthenticated") {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 bg-background text-foreground transition-all duration-300">
        <div className="absolute top-20 left-[10%] -z-10 h-96 w-96 rounded-full bg-indigo-500/10 opacity-60 blur-[120px] dark:bg-indigo-500/5" />
        <div className="z-10 w-full max-w-md rounded-3xl border border-border/80 bg-card p-8 shadow-xl text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 mb-4">
            <Info className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">로그인이 필요합니다</h2>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            대여 물건을 등록하시려면 먼저 회원가입 및 로그인을 완료해 주세요. 컵밥거리 이웃들이 기다리고 있습니다.
          </p>
          <Link href="/login" className="mt-6 block">
            <Button className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-11">
              로그인 하러가기
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground transition-all duration-300">
      {/* Background Orbs */}
      <div className="absolute top-20 left-[5%] -z-10 h-80 w-80 rounded-full bg-indigo-500/10 opacity-50 blur-[120px] dark:bg-indigo-500/5" />
      <div className="absolute bottom-20 right-[5%] -z-10 h-[400px] w-[400px] rounded-full bg-purple-500/10 opacity-40 blur-[130px] dark:bg-purple-500/5" />

      <main className="mx-auto max-w-3xl px-6 py-12">
        {isSuccess ? (
          /* SUCCESS SCREEN */
          <div className="rounded-3xl border border-border bg-card p-8 md:p-12 text-center shadow-xl animate-in scale-in-95 duration-200">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mb-6 animate-bounce">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight">대여 물건 등록 완료!</h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              물건 등록이 완료되었습니다. 이제 목록에서 바로 확인할 수 있고, 대여 요청이 들어오면 채팅으로 이어집니다.
            </p>

            {/* Created card mockup */}
            <div className="my-8 max-w-sm mx-auto rounded-2xl border border-border bg-background p-4 text-left shadow-md flex items-center gap-4">
              <img
                src={images[0]}
                alt="preview"
                className="w-20 h-20 rounded-xl object-cover bg-accent"
              />
              <div className="flex-1 min-w-0">
                <span className="inline-block text-[9px] font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded mb-1">
                  {category === "DEVICES" ? "IT/디바이스" : category === "TOOLS" ? "생활/공구" : category === "BOOKS" ? "도서/전공서적" : category === "LEISURE" ? "캠핑/레저" : "의류/잡화"}
                </span>
                <h3 className="text-sm font-bold truncate text-foreground">{name}</h3>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-extrabold mt-1">
                  {parseInt(dailyPrice).toLocaleString()}원 <span className="text-[10px] text-muted-foreground font-normal">/ 1일</span>
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-3">
              {createdItemId && (
                <Link href={`/item/${createdItemId}`}>
                  <Button className="w-full sm:w-auto px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-11 shadow-md shadow-indigo-600/15">
                    등록한 물건 보기
                  </Button>
                </Link>
              )}
              <Link href="/">
                <Button variant="outline" className="w-full sm:w-auto px-6 rounded-xl font-bold h-11">
                  목록으로 가기
                </Button>
              </Link>
              <button
                onClick={() => {
                  setImages([])
                  setName("")
                  setDescription("")
                  setDailyPrice("")
                  setUseWeeklyPrice(false)
                  setWeeklyPrice("")
                  setAvailableFrom("")
                  setAvailableUntil("")
                  setLocationDetail("")
                  setCreatedItemId(null)
                  setIsSuccess(false)
                }}
                className="w-full sm:w-auto px-6 rounded-xl border border-border text-sm font-semibold hover:bg-accent h-11 transition-colors"
              >
                추가 등록하기
              </button>
            </div>
          </div>
        ) : (
          /* UPLOAD FORM */
          <div>
            <div className="text-left mb-10">
              <div className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-3 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                <Sparkles className="h-3.5 w-3.5" />
                물품 등록하기
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">당신의 안 쓰는 물건을 공유하세요</h1>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
                사용하지 않는 물건을 등록하면 이웃이 필요할 때 바로 빌릴 수 있습니다.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 text-left">
              {/* Image Slots */}
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <label className="block text-xs font-extrabold text-foreground mb-1">물건 이미지 등록 (최대 5장)</label>
                <p className="text-[10px] text-muted-foreground mb-4">대표 사진(첫 번째 슬롯)을 시작으로 노출됩니다. 실제 실물 사진을 올려주세요.</p>
                
                <div className="flex flex-wrap gap-3">
                  {images.map((img, index) => (
                    <div key={index} className="relative w-20 h-20 rounded-xl overflow-hidden border border-border bg-accent">
                      <img src={img} alt={`upload-${index}`} className="w-full h-full object-cover" />
                      {index === 0 && (
                        <div className="absolute bottom-0 inset-x-0 bg-indigo-600 text-white text-[9px] font-bold text-center py-0.5 shadow-sm">
                          대표 사진
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}

                  {images.length < 5 && (
                    <label className="relative flex flex-col items-center justify-center w-20 h-20 rounded-xl border-2 border-dashed border-border/80 bg-background/50 hover:bg-accent/40 cursor-pointer transition-all hover:border-indigo-500/50">
                      <Camera className="h-5 w-5 text-muted-foreground" />
                      <span className="text-[9px] text-muted-foreground mt-1 font-semibold">사진 추가</span>
                      <input
                        aria-label="물건 이미지 선택"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                {errors.images && (
                  <p className="mt-3 text-xs text-rose-500 font-semibold">{errors.images}</p>
                )}
              </div>

              {/* Basic Fields Card */}
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center pl-1">
                    <label htmlFor="item-name" className="text-xs font-extrabold text-foreground">물건 이름</label>
                    <span className="text-[10px] text-muted-foreground">{name.length} / 60자</span>
                  </div>
                  <input
                    id="item-name"
                    type="text"
                    required
                    placeholder="예: 아이패드 프로 M2 (11인치, 2세대 펜슬 포함)"
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, 60))}
                    className="h-11 w-full rounded-xl border border-border bg-background px-4 text-xs focus:border-indigo-600 focus:outline-none placeholder:text-muted-foreground/60"
                  />
                  {errors.name && <p className="text-xs text-rose-500 font-semibold mt-0.5">{errors.name}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="item-category" className="text-xs font-extrabold text-foreground pl-1">카테고리</label>
                    <select
                      id="item-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as typeof category)}
                      className="h-11 w-full rounded-xl border border-border bg-background px-3 text-xs focus:border-indigo-600 focus:outline-none"
                    >
                      <option value="DEVICES">IT/디바이스</option>
                      <option value="TOOLS">생활/공구</option>
                      <option value="BOOKS">도서/전공서적</option>
                      <option value="LEISURE">캠핑/레저</option>
                      <option value="APPAREL">의류/잡화</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="item-region" className="text-xs font-extrabold text-foreground pl-1">기본 대여 지역</label>
                    <input
                      id="item-region"
                      type="text"
                      required
                      placeholder="예: 서울 동작구 노량진동"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="h-11 w-full rounded-xl border border-border bg-background px-4 text-xs focus:border-indigo-600 focus:outline-none placeholder:text-muted-foreground/60"
                    />
                  </div>
                </div>
              </div>

              {/* Trade Method & Availability Card */}
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-extrabold text-foreground pl-1">거래 가능 방식</label>
                    <div className="grid grid-cols-2 gap-2 bg-background p-1 rounded-xl border border-border">
                      <button
                        type="button"
                        onClick={() => setTradeMethod("MEET")}
                        className={`h-9 rounded-lg text-xs font-bold transition-all ${
                          tradeMethod === "MEET"
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        🤝 대면 직거래
                      </button>
                      <button
                        type="button"
                        onClick={() => setTradeMethod("DELIVER")}
                        className={`h-9 rounded-lg text-xs font-bold transition-all ${
                          tradeMethod === "DELIVER"
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        📦 택배 거래
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="item-location-detail" className="text-xs font-extrabold text-foreground pl-1">상세 거래 위치 및 협의 사항</label>
                    <input
                      id="item-location-detail"
                      type="text"
                      placeholder="예: 노량진역 3번 출구 또는 메가스터디 로비"
                      value={locationDetail}
                      onChange={(e) => setLocationDetail(e.target.value)}
                      className="h-11 w-full rounded-xl border border-border bg-background px-4 text-xs focus:border-indigo-600 focus:outline-none placeholder:text-muted-foreground/60"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="available-from" className="text-xs font-extrabold text-foreground pl-1">대여 시작 가능일</label>
                    <div className="relative">
                      <input
                        id="available-from"
                        type="date"
                        required
                        value={availableFrom}
                        onChange={(e) => setAvailableFrom(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        className="h-11 w-full rounded-xl border border-border bg-background px-4 text-xs focus:border-indigo-600 focus:outline-none"
                      />
                    </div>
                    {errors.availableFrom && <p className="text-xs text-rose-500 font-semibold pl-1 mt-0.5">{errors.availableFrom}</p>}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="available-until" className="text-xs font-extrabold text-foreground pl-1">대여 종료 기한일</label>
                    <div className="relative">
                      <input
                        id="available-until"
                        type="date"
                        required
                        value={availableUntil}
                        onChange={(e) => setAvailableUntil(e.target.value)}
                        min={availableFrom || new Date().toISOString().split("T")[0]}
                        className="h-11 w-full rounded-xl border border-border bg-background px-4 text-xs focus:border-indigo-600 focus:outline-none"
                      />
                    </div>
                    {errors.availableUntil && <p className="text-xs text-rose-500 font-semibold pl-1 mt-0.5">{errors.availableUntil}</p>}
                  </div>
                </div>
              </div>

              {/* Price settings Card */}
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="daily-price" className="text-xs font-extrabold text-foreground pl-1">1일 대여 요금 (원)</label>
                  <input
                    id="daily-price"
                    type="number"
                    required
                    placeholder="예: 2000"
                    value={dailyPrice}
                    onChange={(e) => setDailyPrice(e.target.value)}
                    className="h-11 w-full rounded-xl border border-border bg-background px-4 text-xs focus:border-indigo-600 focus:outline-none placeholder:text-muted-foreground/60"
                  />
                  {errors.dailyPrice && <p className="text-xs text-rose-500 font-semibold pl-1 mt-0.5">{errors.dailyPrice}</p>}
                </div>

                <div className="border-t border-border/40 pt-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between pl-1">
                    <div className="flex flex-col">
                      <span className="text-xs font-extrabold text-foreground">7일(주간) 특별 패키지 요금 설정</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">7일 이상 대여하는 이웃에게 특별 혜택 가격을 제안해 보세요.</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useWeeklyPrice}
                        onChange={(e) => setUseWeeklyPrice(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {useWeeklyPrice && (
                    <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                      <label className="text-[10px] text-muted-foreground font-semibold pl-1">7일 대여 총 패키지 금액 (원)</label>
                      <input
                        type="number"
                        placeholder="예: 10000 (하루당 1,420원 꼴, 할인 효과)"
                        value={weeklyPrice}
                        onChange={(e) => setWeeklyPrice(e.target.value)}
                        className="h-11 w-full rounded-xl border border-border bg-background px-4 text-xs focus:border-indigo-600 focus:outline-none placeholder:text-muted-foreground/60"
                      />
                      {errors.weeklyPrice && <p className="text-xs text-rose-500 font-semibold pl-1 mt-0.5">{errors.weeklyPrice}</p>}
                    </div>
                  )}
                </div>
              </div>

              {/* Description fields Card */}
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center pl-1">
                    <label htmlFor="item-description" className="text-xs font-extrabold text-foreground">대여 물건 상세 설명</label>
                    <span className="text-[10px] text-muted-foreground">{description.length} / 2000자</span>
                  </div>
                  <textarea
                    id="item-description"
                    required
                    placeholder="대여할 물품의 실사용 정보, 상태, 구성품, 유의사항 등을 이웃들이 쉽게 알아볼 수 있도록 꼼꼼하게 작성해 주세요."
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
                    rows={6}
                    className="w-full rounded-xl border border-border bg-background p-4 text-xs focus:border-indigo-600 focus:outline-none placeholder:text-muted-foreground/60 resize-none leading-relaxed"
                  />
                  {errors.description && <p className="text-xs text-rose-500 font-semibold pl-1 mt-0.5">{errors.description}</p>}
                </div>
              </div>

              {/* Submitting button */}
              {errors.submit && (
                <p className="text-sm font-medium text-rose-500">{errors.submit}</p>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold tracking-wide shadow-lg shadow-indigo-600/15"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    대여 물건 게시중...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    등록하고 목록에서 확인하기
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}
