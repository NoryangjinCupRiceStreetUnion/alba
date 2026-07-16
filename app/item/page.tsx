import Link from "next/link"
import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export default async function Page() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/item")

  const items = await prisma.item.findMany({
    where: { status: "AVAILABLE" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      region: true,
      dailyPrice: true,
    },
  })

  return (
    <main className="min-h-svh p-6">
      <h1 className="mb-6 text-3xl font-semibold">등록된 물건</h1>
      {items.length === 0 ? (
        <p className="text-muted-foreground">등록된 물건이 없습니다.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/item/${item.id}`}
              className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm"
            >
              <h2 className="text-lg font-medium">{item.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {item.region}
              </p>
              <p className="mt-3 font-semibold">
                1일 {item.dailyPrice.toLocaleString("ko-KR")}원
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
