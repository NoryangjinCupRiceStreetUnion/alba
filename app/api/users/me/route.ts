import { auth } from "@/auth"
import {
  dataResponse,
  errorResponse,
  internalError,
  validationError,
} from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { userUpdateSchema } from "@/lib/validation"

export async function GET() {
  try {
    const session = await auth()
    const userId = session?.user?.id

    if (!userId) {
      return errorResponse("UNAUTHORIZED", "로그인이 필요합니다.", 401)
    }

    const [user, itemCount, borrowedCount, lentCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          nickname: true,
          image: true,
          trustBattery: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.item.count({ where: { ownerId: userId } }),
      prisma.rental.count({ where: { borrowerId: userId } }),
      prisma.rental.count({ where: { item: { ownerId: userId } } }),
    ])

    if (!user) {
      return errorResponse("USER_NOT_FOUND", "사용자를 찾을 수 없습니다.", 404)
    }

    return dataResponse({ ...user, itemCount, borrowedCount, lentCount })
  } catch (error) {
    return internalError(error)
  }
}

export async function PATCH(request: Request) {
  try {
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

    const parsed = userUpdateSchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error)

    const user = await prisma.user.update({
      where: { id: userId },
      data: parsed.data,
      select: {
        id: true,
        email: true,
        name: true,
        nickname: true,
        image: true,
        trustBattery: true,
        updatedAt: true,
      },
    })

    return dataResponse(user)
  } catch (error) {
    return internalError(error)
  }
}
