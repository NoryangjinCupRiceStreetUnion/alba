import { ItemStatus, Prisma, TradeMethod } from "@prisma/client"

import { auth } from "@/auth"
import {
  dataResponse,
  errorResponse,
  internalError,
  isPrismaError,
  listResponse,
  parseLimit,
  validationError,
} from "@/lib/api"
import {
  BLOCKING_RENTAL_STATUSES,
  overlapsRentalPeriod,
} from "@/lib/marketplace"
import { prisma } from "@/lib/prisma"
import { availabilitySchema, itemCreateSchema } from "@/lib/validation"

const SORT_VALUES = ["latest", "priceAsc", "priceDesc"] as const

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseLimit(searchParams.get("limit"))
    const cursor = searchParams.get("cursor")
    const q = searchParams.get("q")?.trim()
    const region = searchParams.get("region")?.trim()
    const ownerId = searchParams.get("ownerId")?.trim()
    const tradeMethodValue = searchParams.get("tradeMethod")
    const sortValue = searchParams.get("sort") ?? "latest"

    if (limit === null) {
      return errorResponse(
        "INVALID_LIMIT",
        "limit은 1부터 50 사이의 정수여야 합니다.",
        400
      )
    }

    if (!SORT_VALUES.includes(sortValue as (typeof SORT_VALUES)[number])) {
      return errorResponse(
        "INVALID_SORT",
        "지원하지 않는 정렬 방식입니다.",
        400
      )
    }

    if (
      tradeMethodValue &&
      !Object.values(TradeMethod).includes(tradeMethodValue as TradeMethod)
    ) {
      return errorResponse(
        "INVALID_TRADE_METHOD",
        "지원하지 않는 거래 방식입니다.",
        400
      )
    }

    const minPriceText = searchParams.get("minPrice")
    const maxPriceText = searchParams.get("maxPrice")
    const minPrice = minPriceText === null ? undefined : Number(minPriceText)
    const maxPrice = maxPriceText === null ? undefined : Number(maxPriceText)

    if (
      (minPrice !== undefined &&
        (!Number.isInteger(minPrice) || minPrice < 0)) ||
      (maxPrice !== undefined &&
        (!Number.isInteger(maxPrice) || maxPrice < 0)) ||
      (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice)
    ) {
      return errorResponse(
        "INVALID_PRICE_RANGE",
        "가격 범위를 확인해주세요.",
        400
      )
    }

    const availableFrom = searchParams.get("availableFrom")
    const availableUntil = searchParams.get("availableUntil")
    let requestedPeriod: { startAt: Date; endAt: Date } | undefined

    if (availableFrom !== null || availableUntil !== null) {
      const parsed = availabilitySchema.safeParse({
        startAt: availableFrom,
        endAt: availableUntil,
      })
      if (!parsed.success) return validationError(parsed.error)
      requestedPeriod = parsed.data
    }

    const where: Prisma.ItemWhereInput = {
      status: ItemStatus.AVAILABLE,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(region ? { region: { contains: region, mode: "insensitive" } } : {}),
      ...(ownerId ? { ownerId } : {}),
      ...(tradeMethodValue
        ? { tradeMethod: tradeMethodValue as TradeMethod }
        : {}),
      ...(minPrice !== undefined || maxPrice !== undefined
        ? { dailyPrice: { gte: minPrice, lte: maxPrice } }
        : {}),
      ...(requestedPeriod
        ? {
            availableFrom: { lte: requestedPeriod.startAt },
            availableUntil: { gte: requestedPeriod.endAt },
            rentals: {
              none: {
                status: { in: [...BLOCKING_RENTAL_STATUSES] },
                ...overlapsRentalPeriod(
                  requestedPeriod.startAt,
                  requestedPeriod.endAt
                ),
              },
            },
          }
        : {}),
    }

    const orderBy: Prisma.ItemOrderByWithRelationInput[] =
      sortValue === "priceAsc"
        ? [{ dailyPrice: "asc" }, { id: "asc" }]
        : sortValue === "priceDesc"
          ? [{ dailyPrice: "desc" }, { id: "desc" }]
          : [{ createdAt: "desc" }, { id: "desc" }]

    const items = await prisma.item.findMany({
      where,
      orderBy,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        images: { orderBy: { order: "asc" }, take: 1 },
        owner: {
          select: {
            id: true,
            name: true,
            nickname: true,
            image: true,
            trustBattery: true,
          },
        },
      },
    })

    const hasNext = items.length > limit
    const data = hasNext ? items.slice(0, limit) : items

    return listResponse(data, {
      hasNext,
      nextCursor: hasNext ? (data.at(-1)?.id ?? null) : null,
    })
  } catch (error) {
    if (isPrismaError(error, "P2025")) {
      return errorResponse("INVALID_CURSOR", "유효하지 않은 cursor입니다.", 400)
    }
    return internalError(error)
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    const ownerId = session?.user?.id

    if (!ownerId) {
      return errorResponse("UNAUTHORIZED", "로그인이 필요합니다.", 401)
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errorResponse("INVALID_JSON", "JSON 본문이 필요합니다.", 400)
    }

    const parsed = itemCreateSchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error)

    const { images, ...itemData } = parsed.data
    const item = await prisma.item.create({
      data: {
        ...itemData,
        weeklyPrice: itemData.weeklyPrice ?? null,
        ownerId,
        images: { create: images },
      },
      include: {
        images: { orderBy: { order: "asc" } },
        owner: {
          select: {
            id: true,
            name: true,
            nickname: true,
            image: true,
            trustBattery: true,
          },
        },
      },
    })

    return dataResponse(item, { status: 201 })
  } catch (error) {
    return internalError(error)
  }
}
