import {
  errorResponse,
  internalError,
  listResponse,
  parseLimit,
} from "@/lib/api"
import { prisma } from "@/lib/prisma"

type Context = { params: Promise<{ userId: string }> }

export async function GET(request: Request, { params }: Context) {
  try {
    const { userId } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseLimit(searchParams.get("limit"))
    const cursor = searchParams.get("cursor")

    if (limit === null) {
      return errorResponse(
        "INVALID_LIMIT",
        "limit은 1부터 50 사이의 정수여야 합니다.",
        400
      )
    }

    const exists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })
    if (!exists) {
      return errorResponse("USER_NOT_FOUND", "사용자를 찾을 수 없습니다.", 404)
    }

    const reviews = await prisma.review.findMany({
      where: { targetUserId: userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        rating: true,
        content: true,
        createdAt: true,
        author: {
          select: { id: true, name: true, nickname: true, image: true },
        },
        rental: {
          select: { id: true, item: { select: { id: true, name: true } } },
        },
      },
    })

    const hasNext = reviews.length > limit
    const data = hasNext ? reviews.slice(0, limit) : reviews

    return listResponse(data, {
      hasNext,
      nextCursor: hasNext ? (data.at(-1)?.id ?? null) : null,
    })
  } catch (error) {
    return internalError(error)
  }
}
