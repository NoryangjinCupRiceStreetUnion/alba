import { ItemStatus, Prisma, RentalStatus } from "@prisma/client"

import { auth } from "@/auth"
import {
  errorResponse,
  internalError,
  isPrismaError,
  listResponse,
  parseLimit,
  validationError,
} from "@/lib/api"
import {
  BLOCKING_RENTAL_STATUSES,
  calculateRentalPrice,
  incrementDailyMetric,
  overlapsRentalPeriod,
} from "@/lib/marketplace"
import { prisma } from "@/lib/prisma"
import { rentalCreateSchema } from "@/lib/validation"

export async function GET(request: Request) {
  try {
    const session = await auth()
    const userId = session?.user?.id

    if (!userId) {
      return errorResponse("UNAUTHORIZED", "로그인이 필요합니다.", 401)
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get("role") ?? "borrower"
    const statusValue = searchParams.get("status")
    const cursor = searchParams.get("cursor")
    const limit = parseLimit(searchParams.get("limit"))

    if (role !== "borrower" && role !== "owner") {
      return errorResponse(
        "INVALID_ROLE",
        "role은 borrower 또는 owner입니다.",
        400
      )
    }
    if (
      statusValue &&
      !Object.values(RentalStatus).includes(statusValue as RentalStatus)
    ) {
      return errorResponse(
        "INVALID_RENTAL_STATUS",
        "대여 상태를 확인해주세요.",
        400
      )
    }
    if (limit === null) {
      return errorResponse(
        "INVALID_LIMIT",
        "limit은 1부터 50 사이의 정수여야 합니다.",
        400
      )
    }

    const rentals = await prisma.rental.findMany({
      where: {
        ...(role === "owner"
          ? { item: { ownerId: userId } }
          : { borrowerId: userId }),
        ...(statusValue ? { status: statusValue as RentalStatus } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        item: {
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
        },
        borrower: {
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

    const hasNext = rentals.length > limit
    const data = hasNext ? rentals.slice(0, limit) : rentals

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
    const borrowerId = session?.user?.id

    if (!borrowerId) {
      return errorResponse("UNAUTHORIZED", "로그인이 필요합니다.", 401)
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errorResponse("INVALID_JSON", "JSON 본문이 필요합니다.", 400)
    }

    const parsed = rentalCreateSchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error)
    const { itemId, startAt, endAt } = parsed.data

    const result = await prisma.$transaction(
      async (tx) => {
        const item = await tx.item.findUnique({ where: { id: itemId } })
        if (!item || item.status !== ItemStatus.AVAILABLE) {
          return { error: "ITEM_NOT_FOUND" as const }
        }
        if (item.ownerId === borrowerId) {
          return { error: "OWN_ITEM" as const }
        }
        if (item.availableFrom > startAt || item.availableUntil < endAt) {
          return { error: "OUTSIDE_AVAILABILITY" as const }
        }

        const conflict = await tx.rental.findFirst({
          where: {
            itemId,
            status: { in: [...BLOCKING_RENTAL_STATUSES] },
            ...overlapsRentalPeriod(startAt, endAt),
          },
          select: { id: true },
        })
        if (conflict) return { error: "RENTAL_PERIOD_CONFLICT" as const }

        const rental = await tx.rental.create({
          data: {
            itemId,
            borrowerId,
            startAt,
            endAt,
            totalPrice: calculateRentalPrice({
              startAt,
              endAt,
              dailyPrice: item.dailyPrice,
              weeklyPrice: item.weeklyPrice,
            }),
          },
          include: {
            item: {
              include: { images: { orderBy: { order: "asc" }, take: 1 } },
            },
            borrower: {
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
        const chat = await tx.chat.create({
          data: {
            itemId,
            rentalId: rental.id,
            ownerId: item.ownerId,
            borrowerId,
          },
        })
        await incrementDailyMetric(tx, itemId, "rentalRequestCount")

        return { rental, chatId: chat.id }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    )

    if ("error" in result) {
      if (result.error === "ITEM_NOT_FOUND") {
        return errorResponse("ITEM_NOT_FOUND", "물건을 찾을 수 없습니다.", 404)
      }
      if (result.error === "OWN_ITEM") {
        return errorResponse(
          "OWN_ITEM",
          "본인의 물건은 대여할 수 없습니다.",
          400
        )
      }
      if (result.error === "OUTSIDE_AVAILABILITY") {
        return errorResponse(
          "OUTSIDE_AVAILABILITY",
          "대여 가능한 기간을 벗어났습니다.",
          400
        )
      }
      return errorResponse(
        "RENTAL_PERIOD_CONFLICT",
        "해당 기간에는 이미 승인된 대여가 있습니다.",
        409
      )
    }

    return Response.json(
      { data: result.rental, chatId: result.chatId },
      { status: 201 }
    )
  } catch (error) {
    if (isPrismaError(error, "P2034")) {
      return errorResponse(
        "RENTAL_PERIOD_CONFLICT",
        "동시에 처리된 대여 요청이 있습니다. 다시 시도해주세요.",
        409
      )
    }
    return internalError(error)
  }
}
