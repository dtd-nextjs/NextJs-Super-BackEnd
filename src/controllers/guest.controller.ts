import envConfig from '@/config'
import { DishStatus, OrderStatus, Role } from '@/constants/type'
import prisma from '@/database'
import { GuestCreateOrdersBodyType, GuestLoginBodyType } from '@/schemaValidations/guest.schema'
import { StatusError } from '@/utils/errors'
import { signAccessToken, signRefreshToken } from '@/utils/jwt'
import { addMilliseconds } from 'date-fns'
import ms from 'ms'

export const guestLoginController = async (body: GuestLoginBodyType) => {
  const table = await prisma.table.findUnique({
    where: {
      number: body.tableNumber,
      token: body.token
    }
  })
  if (!table) {
    throw new StatusError({
      message: 'Bàn không tồn tại hoặc mã token không đúng',
      status: 401
    })
  }

  let guest = await prisma.guest.create({
    data: {
      name: body.name
    }
  })

  const refreshToken = signRefreshToken({
    userId: guest.id,
    role: Role.Guest,
    exp: ms(envConfig.GUEST_REFRESH_TOKEN_EXPIRES_IN)
  })
  const accessToken = signAccessToken({
    userId: guest.id,
    role: Role.Guest,
    exp: ms(envConfig.GUEST_ACCESS_TOKEN_EXPIRES_IN)
  })
  const refreshTokenExpiresAt = addMilliseconds(new Date(), ms(envConfig.GUEST_REFRESH_TOKEN_EXPIRES_IN))
  guest = await prisma.guest.update({
    where: {
      id: guest.id
    },
    data: {
      refreshToken,
      refreshTokenExpiresAt
    }
  })

  return {
    guest,
    accessToken,
    refreshToken
  }
}

export const guestCreateOrdersController = async (guestId: number, body: GuestCreateOrdersBodyType) => {
  const result = await prisma.$transaction(async (tx) => {
    const guest = await tx.guest.findUniqueOrThrow({
      where: {
        id: guestId
      }
    })
    const orders = await Promise.all(
      body.orders.map(async (order) => {
        const dish = await tx.dish.findUniqueOrThrow({
          where: {
            id: order.dishId
          }
        })
        const dishSnapshot = await tx.dishSnapshot.create({
          data: {
            description: dish.description,
            image: dish.image,
            name: dish.name,
            price: dish.price,
            dishId: dish.id,
            status: dish.status
          }
        })
        const orderRecord = await tx.order.create({
          data: {
            dishSnapshotId: dishSnapshot.id,
            guestId,
            quantity: order.quantity,
            tableNumber: guest.tableNumber,
            orderHandlerId: null,
            status: OrderStatus.Pending
          },
          include: {
            dishSnapshot: true,
            guest: true,
            orderHandler: true
          }
        })
        type OrderRecord = typeof orderRecord
        return orderRecord as OrderRecord & {
          status: (typeof OrderStatus)[keyof typeof OrderStatus]
          dishSnapshot: OrderRecord['dishSnapshot'] & {
            status: (typeof DishStatus)[keyof typeof DishStatus]
          }
        }
      })
    )
    return orders
  })
  return result
}
