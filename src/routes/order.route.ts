import { ManagerRoom } from '@/constants/type'
import { getOrdersController, updateOrderController } from '@/controllers/order.controller'
import { requireLoginedHook, requireOwnerHook } from '@/hooks/auth.hooks'
import {
  GetOrdersRes,
  GetOrdersResType,
  OrderParam,
  OrderParamType,
  UpdateOrderBody,
  UpdateOrderBodyType,
  UpdateOrderRes,
  UpdateOrderResType
} from '@/schemaValidations/order.schema'
import { FastifyInstance, FastifyPluginOptions } from 'fastify'

export default async function orderRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  fastify.addHook('preValidation', fastify.auth([requireLoginedHook]))

  fastify.get<{ Reply: GetOrdersResType }>(
    '/',
    {
      schema: {
        response: {
          200: GetOrdersRes
        }
      },
      preValidation: fastify.auth([requireOwnerHook])
    },
    async (request, reply) => {
      const result = await getOrdersController()
      reply.send({
        message: 'Lấy đơn hàng thành công',
        data: result as GetOrdersResType['data']
      })
    }
  )

  fastify.put<{ Reply: UpdateOrderResType; Body: UpdateOrderBodyType; Params: OrderParamType }>(
    '/:orderId',
    {
      schema: {
        response: {
          200: UpdateOrderRes
        },
        body: UpdateOrderBody,
        params: OrderParam
      },
      preValidation: fastify.auth([requireOwnerHook])
    },
    async (request, reply) => {
      const result = await updateOrderController(request.params.orderId, {
        ...request.body,
        orderHandlerId: request.decodedAccessToken?.userId as number
      })
      if (result.socketId) {
        fastify.io.to(result.socketId).to(ManagerRoom).emit('update-order', result.order)
      } else {
        fastify.io.to(ManagerRoom).emit('update-order', result.order)
      }
      reply.send({
        message: 'Cập nhật đơn hàng thành công',
        data: result.order as UpdateOrderResType['data']
      })
    }
  )
}
