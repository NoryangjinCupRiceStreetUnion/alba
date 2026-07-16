import { ItemStatus } from "@prisma/client"
import type { NextRequest } from "next/server"

import { auth } from "@/auth"
import {
  dataResponse,
  errorResponse,
  internalError,
  validationError,
} from "@/lib/api"
import {
  BLOCKING_RENTAL_STATUSES,
  incrementDailyMetric,
  startOfUtcDay,
} from "@/lib/marketplace"
import { prisma } from "@/lib/prisma"
import { itemUpdateSchema } from "@/lib/validation"

type Context = { params: Promise<{ itemId: string }> }

export async function GET(request: NextRequest, { params }: Context) {
  try {
    const { itemId } = await params
    const session = await auth()
    const viewerId = session?.user?.id
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        images: { orderBy: { order: "asc" } },
        owner: {
          select: {
            id: true,
            name: true,
            nickname: true,
            image: true,
            trustBattery: true,
            createdAt: true,
          },
        },
        rentals: {
          where: { status: { in: [...BLOCKING_RENTAL_STATUSES] } },
          select: { startAt: true, endAt: true },
          orderBy: { startAt: "asc" },
        },
      },
    })

    if (
      !item ||
      (item.status === ItemStatus.DEACTIVATED && item.ownerId !== viewerId)
    ) {
      return errorResponse("ITEM_NOT_FOUND", "물건을 찾을 수 없습니다.", 404)
    }

    const cookieName = `item-view-${item.id}`
    const today = startOfUtcDay().toISOString().slice(0, 10)
    const alreadyViewed = request.cookies.get(cookieName)?.value === today
    const shouldCount = item.ownerId !== viewerId && !alreadyViewed

    if (shouldCount) {
      await incrementDailyMetric(prisma, item.id, "viewCount")
    }

    const response = dataResponse(item)
    if (shouldCount) {
      response.cookies.set(cookieName, today, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24,
        path: "/",
      })
    }

    return response
  } catch (error) {
    return internalError(error)
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { itemId } = await params
    const session = await auth()
    const userId = session?.user?.id

    if (!userId) {
      return errorResponse("UNAUTHORIZED", "로그인이 필요합니다.", 401)
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errorResponse("INVALID_JSON", "JSON 본문이 필요합니다.", 400)
    }

    const parsed = itemUpdateSchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error)
    if (Object.keys(parsed.data).length === 0) {
      return errorResponse(
        "EMPTY_UPDATE",
        "수정할 값을 하나 이상 입력해주세요.",
        400
      )
    }

    const existing = await prisma.item.findUnique({ where: { id: itemId } })
    if (!existing) {
      return errorResponse("ITEM_NOT_FOUND", "물건을 찾을 수 없습니다.", 404)
    }
    if (existing.ownerId !== userId) {
      return errorResponse(
        "FORBIDDEN",
        "물건 소유자만 수정할 수 있습니다.",
        403
      )
    }

    const availableFrom = parsed.data.availableFrom ?? existing.availableFrom
    const availableUntil = parsed.data.availableUntil ?? existing.availableUntil
    if (availableFrom >= availableUntil) {
      return errorResponse(
        "INVALID_AVAILABILITY",
        "대여 종료 시각은 시작 시각보다 늦어야 합니다.",
        400
      )
    }

    const conflictingRental = await prisma.rental.findFirst({
      where: {
        itemId,
        status: { in: [...BLOCKING_RENTAL_STATUSES] },
        OR: [
          { startAt: { lt: availableFrom } },
          { endAt: { gt: availableUntil } },
        ],
      },
      select: { id: true },
    })
    if (conflictingRental) {
      return errorResponse(
        "ACTIVE_RENTAL_CONFLICT",
        "진행 중인 대여와 충돌하도록 대여 가능 기간을 변경할 수 없습니다.",
        409
      )
    }

    const { images, ...data } = parsed.data
    const item = await prisma.$transaction(async (tx) => {
      if (images) {
        await tx.itemImage.deleteMany({ where: { itemId } })
      }

      return tx.item.update({
        where: { id: itemId },
        data: {
          ...data,
          ...(images ? { images: { create: images } } : {}),
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
    })

    return dataResponse(item)
  } catch (error) {
    return internalError(error)
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { itemId } = await params
    const session = await auth()
    const userId = session?.user?.id

    if (!userId) {
      return errorResponse("UNAUTHORIZED", "로그인이 필요합니다.", 401)
    }

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: { id: true, ownerId: true },
    })
    if (!item) {
      return errorResponse("ITEM_NOT_FOUND", "물건을 찾을 수 없습니다.", 404)
    }
    if (item.ownerId !== userId) {
      return errorResponse(
        "FORBIDDEN",
        "물건 소유자만 삭제할 수 있습니다.",
        403
      )
    }

    const activeRentalCount = await prisma.rental.count({
      where: { itemId, status: { in: [...BLOCKING_RENTAL_STATUSES] } },
    })
    if (activeRentalCount > 0) {
      return errorResponse(
        "ACTIVE_RENTAL_EXISTS",
        "진행 중인 대여가 있어 물건을 비활성화할 수 없습니다.",
        409
      )
    }

    await prisma.item.update({
      where: { id: itemId },
      data: { status: ItemStatus.DEACTIVATED },
    })

    return new Response(null, { status: 204 })
  } catch (error) {
    return internalError(error)
  }
}
