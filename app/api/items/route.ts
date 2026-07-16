import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// GET /api/items - 물건 목록 조회
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get("q") ?? undefined
    const region = searchParams.get("region") ?? undefined
    const tradeMethod = searchParams.get("tradeMethod") as "MEET" | "DELIVER" | null
    const minPrice = searchParams.get("minPrice") ? parseInt(searchParams.get("minPrice")!) : undefined
    const maxPrice = searchParams.get("maxPrice") ? parseInt(searchParams.get("maxPrice")!) : undefined
    const sort = (searchParams.get("sort") as "latest" | "priceAsc" | "priceDesc") ?? "latest"
    const cursor = searchParams.get("cursor") ?? undefined
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50)

    const orderBy =
      sort === "priceAsc"
        ? { dailyPrice: "asc" as const }
        : sort === "priceDesc"
        ? { dailyPrice: "desc" as const }
        : { createdAt: "desc" as const }

    const items = await prisma.item.findMany({
      where: {
        status: "AVAILABLE",
        ...(q && {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        }),
        ...(region && { region: { contains: region } }),
        ...(tradeMethod && { tradeMethod }),
        ...(minPrice !== undefined && { dailyPrice: { gte: minPrice } }),
        ...(maxPrice !== undefined && { dailyPrice: { lte: maxPrice } }),
      },
      orderBy,
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      include: {
        images: { orderBy: { order: "asc" }, take: 1 },
        owner: { select: { id: true, name: true, nickname: true, image: true, mannerScore: true } },
      },
    })

    const hasNext = items.length > limit
    const data = items.slice(0, limit).map((item) => ({
      ...item,
      thumbnailUrl: item.images[0]?.url ?? null,
      images: undefined,
    }))

    return NextResponse.json({ data, nextCursor: hasNext ? data[data.length - 1]?.id : null, hasNext })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." } }, { status: 500 })
  }
}

// POST /api/items - 물건 등록
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } }, { status: 401 })
    }

    const body = await req.json()
    const { name, description, tradeMethod, region, dailyPrice, weeklyPrice, availableFrom, availableUntil, images } = body

    if (!name || name.length < 2 || name.length > 60) {
      return NextResponse.json({ error: { code: "INVALID_NAME", message: "물건 이름은 2~60자여야 합니다." } }, { status: 400 })
    }
    if (!images || images.length < 1 || images.length > 5) {
      return NextResponse.json({ error: { code: "INVALID_IMAGES", message: "이미지는 1~5개여야 합니다." } }, { status: 400 })
    }
    if (new Date(availableFrom) >= new Date(availableUntil)) {
      return NextResponse.json({ error: { code: "INVALID_DATES", message: "대여 시작일이 종료일보다 빨라야 합니다." } }, { status: 400 })
    }

    const item = await prisma.item.create({
      data: {
        ownerId: session.user.id,
        name,
        description,
        tradeMethod,
        region,
        dailyPrice,
        weeklyPrice: weeklyPrice ?? null,
        availableFrom: new Date(availableFrom),
        availableUntil: new Date(availableUntil),
        images: {
          create: images.map((img: { url: string; order: number }) => ({ url: img.url, order: img.order })),
        },
      },
      include: { images: true },
    })

    return NextResponse.json({ data: item }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." } }, { status: 500 })
  }
}
