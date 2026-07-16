import { notFound } from "next/navigation"

import { Button } from "@/components/ui/button"
import { prisma } from "@/lib/prisma"

type Props = { params: Promise<{ id: string }> }

export default async function Page({ params }: Props) {
  const { id } = await params
  const item = await prisma.item.findUnique({
    where: { id },
    include: {
      images: { orderBy: { order: "asc" } },
      owner: { select: { name: true, nickname: true, trustBattery: true } },
    },
  })

  if (!item) notFound()

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col justify-center p-6">
      <p className="text-sm text-muted-foreground">{item.region}</p>
      <h1 className="mt-2 text-3xl font-bold">{item.name}</h1>
      <p className="mt-4 whitespace-pre-wrap text-muted-foreground">
        {item.description}
      </p>
      <p className="mt-6 text-lg font-bold">
        1일 {item.dailyPrice.toLocaleString("ko-KR")}원
        {item.weeklyPrice === null
          ? null
          : ` · 1주 ${item.weeklyPrice.toLocaleString("ko-KR")}원`}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {item.owner.nickname ?? item.owner.name ?? "사용자"} · 신뢰배터리{" "}
        {item.owner.trustBattery}
      </p>
      <Button className="mt-8">대여하기</Button>
    </main>
  )
}
