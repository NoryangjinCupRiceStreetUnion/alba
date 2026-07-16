import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { ItemCategory, TradeMethod } from "@prisma/client"
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
        owner: { select: { id: true, name: true, nickname: true, image: true, trustBattery: true } },
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
    const {
      name,
      description,
      category,
      tradeMethod,
      region,
      locationDetail,
      dailyPrice,
      weeklyPrice,
      availableFrom,
      availableUntil,
      images,
    } = body

    if (typeof name !== "string" || name.length < 2 || name.length > 60) {
      return NextResponse.json({ error: { code: "INVALID_NAME", message: "물건 이름은 2~60자여야 합니다." } }, { status: 400 })
    }
    if (
      !Array.isArray(images) ||
      images.length < 1 ||
      images.length > 5 ||
      images.some((image) =>
        typeof image !== "object" ||
        image === null ||
        typeof image.url !== "string" ||
        !image.url ||
        !Number.isInteger(image.order) ||
        image.order < 0
      )
    ) {
      return NextResponse.json({ error: { code: "INVALID_IMAGES", message: "이미지는 1~5개여야 합니다." } }, { status: 400 })
    }
    if (!Object.values(ItemCategory).includes(category as ItemCategory)) {
      return NextResponse.json({ error: { code: "INVALID_CATEGORY", message: "지원하지 않는 카테고리입니다." } }, { status: 400 })
    }
    if (!Object.values(TradeMethod).includes(tradeMethod as TradeMethod)) {
      return NextResponse.json({ error: { code: "INVALID_TRADE_METHOD", message: "지원하지 않는 거래 방식입니다." } }, { status: 400 })
    }
    if (typeof description !== "string" || description.length < 1 || description.length > 2000) {
      return NextResponse.json({ error: { code: "INVALID_DESCRIPTION", message: "설명은 1~2,000자여야 합니다." } }, { status: 400 })
    }
    if (typeof region !== "string" || !region.trim()) {
      return NextResponse.json({ error: { code: "INVALID_REGION", message: "대여 지역을 입력해주세요." } }, { status: 400 })
    }
    if (locationDetail != null && (typeof locationDetail !== "string" || locationDetail.length > 200)) {
      return NextResponse.json({ error: { code: "INVALID_LOCATION_DETAIL", message: "상세 위치는 200자 이하여야 합니다." } }, { status: 400 })
    }
    if (!Number.isInteger(dailyPrice) || dailyPrice <= 0 || (weeklyPrice != null && (!Number.isInteger(weeklyPrice) || weeklyPrice <= 0))) {
      return NextResponse.json({ error: { code: "INVALID_PRICE", message: "대여 요금을 확인해주세요." } }, { status: 400 })
    }

    const start = new Date(availableFrom)
    const end = new Date(availableUntil)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
      return NextResponse.json({ error: { code: "INVALID_DATES", message: "대여 시작일이 종료일보다 빨라야 합니다." } }, { status: 400 })
    }

    const item = await prisma.item.create({
      data: {
        ownerId: session.user.id,
        name,
        description,
        category: category as ItemCategory,
        tradeMethod: tradeMethod as TradeMethod,
        region: region.trim(),
        locationDetail: typeof locationDetail === "string" && locationDetail.trim() ? locationDetail.trim() : null,
        dailyPrice,
        weeklyPrice: weeklyPrice ?? null,
        availableFrom: start,
        availableUntil: end,
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
