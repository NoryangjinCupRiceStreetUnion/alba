import { ItemStatus } from "@prisma/client"

import {
  dataResponse,
  errorResponse,
  internalError,
  validationError,
} from "@/lib/api"
import {
  BLOCKING_RENTAL_STATUSES,
  calculateRentalPrice,
  overlapsRentalPeriod,
} from "@/lib/marketplace"
import { prisma } from "@/lib/prisma"
import { availabilitySchema } from "@/lib/validation"

type Context = { params: Promise<{ itemId: string }> }

export async function GET(request: Request, { params }: Context) {
  try {
    const { itemId } = await params
    const { searchParams } = new URL(request.url)
    const parsed = availabilitySchema.safeParse({
      startAt: searchParams.get("startAt"),
      endAt: searchParams.get("endAt"),
    })
    if (!parsed.success) return validationError(parsed.error)

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        status: true,
        dailyPrice: true,
        weeklyPrice: true,
        availableFrom: true,
        availableUntil: true,
      },
    })
    if (!item) {
      return errorResponse("ITEM_NOT_FOUND", "물건을 찾을 수 없습니다.", 404)
    }

    const { startAt, endAt } = parsed.data
    const withinAvailability =
      item.status === ItemStatus.AVAILABLE &&
      item.availableFrom <= startAt &&
      item.availableUntil >= endAt

    const conflict = withinAvailability
      ? await prisma.rental.findFirst({
          where: {
            itemId,
            status: { in: [...BLOCKING_RENTAL_STATUSES] },
            ...overlapsRentalPeriod(startAt, endAt),
          },
          select: { id: true },
        })
      : null

    const available = withinAvailability && conflict === null
    return dataResponse({
      available,
      totalPrice: available
        ? calculateRentalPrice({
            startAt,
            endAt,
            dailyPrice: item.dailyPrice,
            weeklyPrice: item.weeklyPrice,
          })
        : null,
    })
  } catch (error) {
    return internalError(error)
  }
}
