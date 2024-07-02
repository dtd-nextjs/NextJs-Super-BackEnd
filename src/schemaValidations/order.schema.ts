import { DishStatusValues, OrderStatusValues } from '@/constants/type'
import { AccountSchema } from '@/schemaValidations/account.schema'
import z from 'zod'

const DishSnapshotSchema = z.object({
  id: z.number(),
  name: z.string(),
  price: z.number(),
  image: z.string(),
  description: z.string(),
  status: z.enum(DishStatusValues),
  dishId: z.number().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})
export const OrderSchema = z.object({
  id: z.number(),
  guestId: z.number().nullable(),
  guest: z
    .object({
      id: z.number(),
      name: z.string(),
      tableNumber: z.number().nullable()
    })
    .nullable(),
  tableNumber: z.number().nullable(),
  dishSnapshotId: z.number(),
  dishSnapshot: DishSnapshotSchema,
  quantity: z.number(),
  orderHandlerId: z.number().nullable(),
  orderHandler: AccountSchema.nullable(),
  status: z.enum(OrderStatusValues)
})

export const UpdateOrderBody = z.object({
  status: z.enum(OrderStatusValues),
  dishId: z.number(),
  quantity: z.number()
})

export type UpdateOrderBodyType = z.TypeOf<typeof UpdateOrderBody>

export const OrderParam = z.object({
  orderId: z.coerce.number()
})

export type OrderParamType = z.TypeOf<typeof OrderParam>

export const UpdateOrderRes = z.object({
  message: z.string(),
  data: OrderSchema
})

export type UpdateOrderResType = z.TypeOf<typeof UpdateOrderRes>

export const GetOrdersRes = z.object({
  message: z.string(),
  data: z.array(OrderSchema)
})

export type GetOrdersResType = z.TypeOf<typeof GetOrdersRes>
