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
      owner: {
        select: {
          name: true,
          nickname: true,
          trustBattery: true,
        },
      },
    },
  })

  if (!item || item.status === "DEACTIVATED") {
    notFound()
  }

  const days = Math.max(
    1,
    Math.ceil(
      (item.availableUntil.getTime() - item.availableFrom.getTime()) /
        (1000 * 60 * 60 * 24)
    )
  )
  const detailItem = {
    id: item.id,
    name: item.name,
    category: item.category.toLowerCase(),
    region: item.region,
    dailyPrice: item.dailyPrice,
    weeklyPrice: item.weeklyPrice ?? undefined,
    tradeMethod: item.tradeMethod,
    ownerNickname: item.owner.nickname || item.owner.name || "알 수 없음",
    ownerTrustBattery: item.owner.trustBattery,
    imageUrl: item.images[0]?.url,
    description: item.description,
    locationDetail: item.locationDetail ?? item.region,
    availableFrom: item.availableFrom.toISOString(),
    availableUntil: item.availableUntil.toISOString(),
    maxDuration: `${days}일`,
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-all duration-300">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/" className="transition-colors hover:text-foreground">
            홈
          </Link>
          <span>/</span>
          <span className="font-semibold text-foreground">
            {item.tradeMethod === "MEET" ? "직거래" : "택배"}
          </span>
          <span>/</span>
          <span className="max-w-[220px] truncate">{item.name}</span>
        </div>

        <ItemDetailClient item={detailItem} user={user} />
      </div>
    </div>
  )
}
