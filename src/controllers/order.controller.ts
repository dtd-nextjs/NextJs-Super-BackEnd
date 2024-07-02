import prisma from '@/database'
import { UpdateOrderBodyType } from '@/schemaValidations/order.schema'

export const getOrdersController = async () => {
  const orders = await prisma.order.findMany({
    include: {
      dishSnapshot: true,
      orderHandler: true,
      guest: true
    }
  })
  return orders
}

export const updateOrderController = async (
  orderId: number,
  body: UpdateOrderBodyType & { orderHandlerId: number }
) => {
  const { status, dishId, quantity, orderHandlerId } = body
  const result = await prisma.$transaction(async (tx) => {
    const order = await prisma.order.findUniqueOrThrow({
      where: {
        id: orderId
      },
      include: {
        dishSnapshot: true
      }
    })
    let dishSnapshotId = order.dishSnapshotId
    if (order.dishSnapshot.dishId !== dishId) {
      const dish = await tx.dish.findUniqueOrThrow({
        where: {
          id: dishId
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
      dishSnapshotId = dishSnapshot.id
    }
    const newOrder = await tx.order.update({
      where: {
        id: orderId
      },
      data: {
        status,
        dishSnapshotId,
        quantity,
        orderHandlerId
      },
      include: {
        dishSnapshot: true,
        orderHandler: true,
        guest: true
      }
    })
    return newOrder
  })
  const socketRecord = await prisma.socket.findUnique({
    where: {
      guestId: result.guestId!
    }
  })
  return {
    order: result,
    socketId: socketRecord?.socketId
  }
}
