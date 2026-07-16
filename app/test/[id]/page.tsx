import Link from "next/link"
import { notFound } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import ItemDetailClient from "./ItemDetailClient"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: PageProps) {
  const { id } = await params
  const session = await auth()
  const user = session?.user

  const item = await prisma.item.findUnique({
    where: { id },
    include: {
      images: { orderBy: { order: "asc" } },
      owner: { select: { id: true, name: true, nickname: true, image: true, trustBattery: true } },
      rentals: {
        where: { status: { in: ["APPROVED", "BORROWED"] } },
        select: { startAt: true, endAt: true },
      },
    },
  })

  if (!item || item.status === "DEACTIVATED") {
    notFound()
  }

  const days = Math.max(1, Math.ceil((new Date(item.availableUntil).getTime() - new Date(item.availableFrom).getTime()) / (1000 * 60 * 60 * 24)))
  const detailItem = {
    id: item.id,
    name: item.name,
    category: item.tradeMethod === "DELIVER" ? "delivery" : "rental",
    region: item.region,
    dailyPrice: item.dailyPrice,
    weeklyPrice: item.weeklyPrice ?? undefined,
    tradeMethod: item.tradeMethod,
    available: item.status === "AVAILABLE",
    ownerNickname: item.owner?.nickname || item.owner?.name || "알 수 없음",
    ownerTrustBattery: item.owner?.trustBattery ?? 80,
    imageUrl: item.images[0]?.url ?? "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800&auto=format&fit=crop&q=80",
    gallery: item.images.map((image) => image.url),
    description: item.description,
    locationDetail: item.region,
    maxDuration: `${days}일`,
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-all duration-300">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/" className="transition-colors hover:text-foreground">홈</Link>
          <span>/</span>
          <span className="font-semibold text-foreground">{item.tradeMethod === "MEET" ? "직거래" : "택배"}</span>
          <span>/</span>
          <span className="max-w-[220px] truncate">{item.name}</span>
        </div>

        <ItemDetailClient item={detailItem} user={user} />
      </div>
    </div>
  )
}
