import Link from "next/link"
import { MessageCircle, MapPin, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { prisma } from "@/lib/prisma"

export default async function Page() {
  const items = await prisma.item.findMany({
    where: { status: "AVAILABLE" },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      images: { orderBy: { order: "asc" }, take: 1 },
      owner: { select: { nickname: true, name: true, mannerScore: true } },
    },
  })

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <Sparkles className="h-3 w-3" /> 실시간 대여 목록
          </div>
          <h1 className="text-2xl font-black tracking-tight">DB 기반 물품 목록</h1>
          <p className="mt-2 text-sm text-muted-foreground">등록된 물건을 바로 확인하고 대여 요청을 보낼 수 있습니다.</p>
        </div>
        <Link href="/chat">
          <Button variant="outline" className="rounded-xl">
            <MessageCircle className="mr-2 h-4 w-4" /> 채팅 보기
          </Button>
        </Link>
      </div>

      {items.length === 0 ? (
        <Card className="border-dashed border-border/70 bg-accent/20">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            아직 등록된 물품이 없습니다. 먼저 새 물건을 등록해 주세요.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <Link key={item.id} href={`/test/${item.id}`} className="group overflow-hidden rounded-2xl border border-border/50 bg-card transition-all hover:-translate-y-1 hover:border-indigo-500/40 hover:shadow-lg">
              <div className="relative aspect-video overflow-hidden bg-accent/30">
                <img src={item.images[0]?.url ?? "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800&auto=format&fit=crop&q=80"} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute left-3 top-3 flex gap-1">
                  <Badge className={item.tradeMethod === "MEET" ? "bg-indigo-600" : "bg-purple-600"}>{item.tradeMethod === "MEET" ? "직거래" : "택배"}</Badge>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{item.region}</span>
                </div>
                <h2 className="mt-2 text-base font-bold">{item.name}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-2">{item.description}</p>
                <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground">1일 대여료</p>
                    <p className="text-base font-black">{item.dailyPrice.toLocaleString()}원</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{item.owner?.nickname || item.owner?.name || "알 수 없음"}</p>
                    <p className="mt-1 font-semibold text-foreground">신뢰도 {item.owner?.mannerScore ?? 36.5}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
