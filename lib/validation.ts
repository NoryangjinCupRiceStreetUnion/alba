import {
  ItemCategory,
  ItemStatus,
  RentalStatus,
  TradeMethod,
} from "@prisma/client"
import { z } from "zod"

const priceSchema = z.number().int().min(0).max(100_000_000)
const dateSchema = z.coerce.date()
const imageUrlSchema = z
  .string()
  .min(1)
  .max(7_000_000)
  .refine(
    (value) => value.startsWith("data:image/") || URL.canParse(value),
    "올바른 이미지 URL 또는 Data URL이 아닙니다."
  )

const itemFieldsSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().min(1).max(2_000),
  category: z.nativeEnum(ItemCategory),
  tradeMethod: z.nativeEnum(TradeMethod),
  region: z.string().trim().min(2).max(100),
  locationDetail: z.string().trim().max(200).nullable().optional(),
  dailyPrice: priceSchema,
  weeklyPrice: priceSchema.nullable().optional(),
  availableFrom: dateSchema,
  availableUntil: dateSchema,
  images: z
    .array(
      z.object({
        url: imageUrlSchema,
        order: z.number().int().min(0),
      })
    )
    .min(1)
    .max(5)
    .refine(
      (images) =>
        new Set(images.map((image) => image.order)).size === images.length,
      "이미지 순서는 중복될 수 없습니다."
    ),
})

export const itemCreateSchema = itemFieldsSchema.refine(
  (value) => value.availableFrom < value.availableUntil,
  {
    message: "대여 종료 시각은 시작 시각보다 늦어야 합니다.",
    path: ["availableUntil"],
  }
)

export const itemUpdateSchema = itemFieldsSchema
  .omit({ images: true })
  .partial()
  .extend({
    status: z.nativeEnum(ItemStatus).optional(),
    images: z
      .array(
        z.object({
          url: imageUrlSchema,
          order: z.number().int().min(0),
        })
      )
      .min(1)
      .max(5)
      .refine(
        (images) =>
          new Set(images.map((image) => image.order)).size === images.length,
        "이미지 순서는 중복될 수 없습니다."
      )
      .optional(),
  })

export const userUpdateSchema = z
  .object({
    nickname: z.string().trim().min(2).max(30).nullable().optional(),
    image: z.string().url().max(2_048).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "수정할 값을 하나 이상 입력해주세요.",
  })

export const availabilitySchema = z
  .object({ startAt: dateSchema, endAt: dateSchema })
  .refine((value) => value.startAt < value.endAt, {
    message: "대여 종료 시각은 시작 시각보다 늦어야 합니다.",
    path: ["endAt"],
  })

export const rentalCreateSchema = z
  .object({
    itemId: z.string().cuid(),
    startAt: dateSchema,
    endAt: dateSchema,
  })
  .refine((value) => value.startAt < value.endAt, {
    message: "대여 종료 시각은 시작 시각보다 늦어야 합니다.",
    path: ["endAt"],
  })

export const rentalStatusSchema = z.object({
  status: z.nativeEnum(RentalStatus),
})

export const reviewCreateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  content: z.string().trim().max(1_000).nullable().optional(),
})
