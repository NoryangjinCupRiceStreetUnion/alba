import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import type { ZodError } from "zod"

export function dataResponse<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init)
}

export function listResponse<T>(
  data: T[],
  options: { nextCursor: string | null; hasNext: boolean }
) {
  return NextResponse.json({ data, ...options })
}

export function errorResponse(
  code: string,
  message: string,
  status: number,
  details?: unknown
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details === undefined ? {} : { details }),
      },
    },
    { status }
  )
}

export function validationError(error: ZodError) {
  return errorResponse(
    "VALIDATION_ERROR",
    "요청 값을 확인해주세요.",
    400,
    error.flatten()
  )
}

export function internalError(error: unknown) {
  console.error(error)

  return errorResponse(
    "INTERNAL_SERVER_ERROR",
    "서버에서 요청을 처리하지 못했습니다.",
    500
  )
}

export function isPrismaError(error: unknown, code: string) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  )
}

export function parseLimit(value: string | null, fallback = 20, maximum = 50) {
  if (value === null) return fallback

  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) return null

  return parsed
}
