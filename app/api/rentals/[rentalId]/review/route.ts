import { Prisma, RentalStatus } from "@prisma/client"

import { auth } from "@/auth"
import {
  dataResponse,
  errorResponse,
  internalError,
  isPrismaError,
  validationError,
} from "@/lib/api"
import { applyTrustBatteryRating } from "@/lib/marketplace"
import { prisma } from "@/lib/prisma"
import { reviewCreateSchema } from "@/lib/validation"

type Context = { params: Promise<{ rentalId: string }> }

export async function POST(request: Request, { params }: Context) {
  try {
    const { rentalId } = await params
    const session = await auth()
    const authorId = session?.user?.id

    if (!authorId) {
      return errorResponse("UNAUTHORIZED", "로그인이 필요합니다.", 401)
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errorResponse("INVALID_JSON", "JSON 본문이 필요합니다.", 400)
    }
    const parsed = reviewCreateSchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error)

    const result = await prisma.$transaction(
      async (tx) => {
        const rental = await tx.rental.findUnique({
          where: { id: rentalId },
          include: { item: { select: { ownerId: true } } },
        })
        if (!rental) return { error: "RENTAL_NOT_FOUND" as const }
        if (rental.status !== RentalStatus.RETURNED) {
          return { error: "RENTAL_NOT_RETURNED" as const }
        }

        const isOwner = rental.item.ownerId === authorId
        const isBorrower = rental.borrowerId === authorId
        if (!isOwner && !isBorrower) return { error: "FORBIDDEN" as const }

        const targetUserId = isOwner ? rental.borrowerId : rental.item.ownerId
        const target = await tx.user.findUnique({
          where: { id: targetUserId },
          select: { trustBattery: true },
        })
        if (!target) return { error: "USER_NOT_FOUND" as const }

        const review = await tx.review.create({
          data: {
            rentalId,
            authorId,
            targetUserId,
            rating: parsed.data.rating,
            content: parsed.data.content ?? null,
          },
          select: {
            id: true,
            rentalId: true,
            authorId: true,
            targetUserId: true,
            rating: true,
            content: true,
            createdAt: true,
          },
        })
        const user = await tx.user.update({
          where: { id: targetUserId },
          data: {
            trustBattery: applyTrustBatteryRating(
              target.trustBattery,
              parsed.data.rating
            ),
          },
          select: { id: true, trustBattery: true },
        })

        return { review, trustBattery: user.trustBattery }
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
      if (result.error === "RENTAL_NOT_RETURNED") {
        return errorResponse(
          "RENTAL_NOT_RETURNED",
          "반납이 완료된 거래에만 후기를 작성할 수 있습니다.",
          409
        )
      }
      if (result.error === "FORBIDDEN") {
        return errorResponse(
          "FORBIDDEN",
          "거래 당사자만 후기를 작성할 수 있습니다.",
          403
        )
      }
      return errorResponse(
        "USER_NOT_FOUND",
        "평가할 사용자를 찾을 수 없습니다.",
        404
      )
    }

    return dataResponse(result, { status: 201 })
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      return errorResponse(
        "REVIEW_ALREADY_EXISTS",
        "이 거래에 대한 후기를 이미 작성했습니다.",
        409
      )
    }
    if (isPrismaError(error, "P2034")) {
      return errorResponse(
        "REVIEW_CONFLICT",
        "후기가 동시에 처리되었습니다. 다시 시도해주세요.",
        409
      )
    }
    return internalError(error)
  }
}
