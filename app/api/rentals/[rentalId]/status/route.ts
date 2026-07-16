import { Prisma, RentalStatus } from "@prisma/client"

import { auth } from "@/auth"
import {
  dataResponse,
  errorResponse,
  internalError,
  isPrismaError,
  validationError,
} from "@/lib/api"
import {
  BLOCKING_RENTAL_STATUSES,
  incrementDailyMetric,
  overlapsRentalPeriod,
} from "@/lib/marketplace"
import { prisma } from "@/lib/prisma"
import { rentalStatusSchema } from "@/lib/validation"

type Context = { params: Promise<{ rentalId: string }> }

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { rentalId } = await params
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
    const parsed = rentalStatusSchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error)
    const nextStatus = parsed.data.status

    const result = await prisma.$transaction(
      async (tx) => {
        const rental = await tx.rental.findUnique({
          where: { id: rentalId },
          include: { item: true },
        })
        if (!rental) return { error: "RENTAL_NOT_FOUND" as const }

        const isOwner = rental.item.ownerId === userId
        const isBorrower = rental.borrowerId === userId
        if (!isOwner && !isBorrower) return { error: "FORBIDDEN" as const }

        const allowed =
          (rental.status === RentalStatus.REQUESTED &&
            nextStatus === RentalStatus.APPROVED &&
            isOwner) ||
          (rental.status === RentalStatus.REQUESTED &&
            nextStatus === RentalStatus.REJECTED &&
            isOwner) ||
          (rental.status === RentalStatus.REQUESTED &&
            nextStatus === RentalStatus.CANCELED &&
            isBorrower) ||
          (rental.status === RentalStatus.APPROVED &&
            nextStatus === RentalStatus.CANCELED) ||
          (rental.status === RentalStatus.APPROVED &&
            nextStatus === RentalStatus.BORROWED &&
            isOwner) ||
          (rental.status === RentalStatus.BORROWED &&
            nextStatus === RentalStatus.RETURNED &&
            isOwner)

        if (!allowed) return { error: "INVALID_STATUS_TRANSITION" as const }

        if (nextStatus === RentalStatus.APPROVED) {
          const conflict = await tx.rental.findFirst({
            where: {
              id: { not: rental.id },
              itemId: rental.itemId,
              status: { in: [...BLOCKING_RENTAL_STATUSES] },
              ...overlapsRentalPeriod(rental.startAt, rental.endAt),
            },
            select: { id: true },
          })
          if (conflict) return { error: "RENTAL_PERIOD_CONFLICT" as const }
        }

        const updated = await tx.rental.update({
          where: { id: rental.id },
          data: { status: nextStatus },
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

        if (nextStatus === RentalStatus.APPROVED) {
          await incrementDailyMetric(tx, rental.itemId, "rentalApprovedCount")
        }

        return { rental: updated }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    )

    if ("error" in result) {
      if (result.error === "RENTAL_NOT_FOUND") {
        return errorResponse(
          "RENTAL_NOT_FOUND",
          "대여 내역을 찾을 수 없습니다.",
          404
        )
      }
      if (result.error === "FORBIDDEN") {
        return errorResponse(
          "FORBIDDEN",
          "거래 당사자만 변경할 수 있습니다.",
          403
        )
      }
      if (result.error === "RENTAL_PERIOD_CONFLICT") {
        return errorResponse(
          "RENTAL_PERIOD_CONFLICT",
          "해당 기간에는 이미 승인된 대여가 있습니다.",
          409
        )
      }
      return errorResponse(
        "INVALID_STATUS_TRANSITION",
        "현재 상태에서는 요청한 상태로 변경할 수 없습니다.",
        409
      )
    }

    return dataResponse(result.rental)
  } catch (error) {
    if (isPrismaError(error, "P2034")) {
      return errorResponse(
        "RENTAL_STATE_CONFLICT",
        "동시에 변경된 대여 상태가 있습니다. 다시 시도해주세요.",
        409
      )
    }
    return internalError(error)
  }
}
