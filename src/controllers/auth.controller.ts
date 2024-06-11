import envConfig from '@/config'
import prisma from '@/database'
import { LoginBodyType } from '@/schemaValidations/auth.schema'
import { RoleType, TokenPayload } from '@/types/jwt.types'
import { comparePassword } from '@/utils/crypto'
import { AuthError, EntityError } from '@/utils/errors'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/utils/jwt'
import { addMilliseconds } from 'date-fns'
import ms from 'ms'

export const logoutController = async (refreshToken: string) => {
  await prisma.refreshToken.delete({
    where: {
      token: refreshToken
    }
  })
  return 'Đăng xuất thành công'
}

export const loginController = async (body: LoginBodyType) => {
  const account = await prisma.account.findUnique({
    where: {
      email: body.email
    }
  })
  if (!account) {
    throw new EntityError([{ field: 'email', message: 'Email không tồn tại' }])
  }
  const isPasswordMatch = await comparePassword(body.password, account.password)
  if (!isPasswordMatch) {
    throw new EntityError([{ field: 'password', message: 'Email hoặc mật khẩu không đúng' }])
  }
  const accessToken = signAccessToken({
    userId: account.id,
    role: account.role as RoleType
  })
  const refreshToken = signRefreshToken({
    userId: account.id,
    role: account.role as RoleType
  })
  const refreshTokenExpiresAt = addMilliseconds(new Date(), ms(envConfig.REFRESH_TOKEN_EXPIRES_IN))

  await prisma.refreshToken.create({
    data: {
      accountId: account.id,
      token: refreshToken,
      expiresAt: refreshTokenExpiresAt
    }
  })
  return {
    account,
    accessToken,
    refreshToken
  }
}

export const refreshTokenController = async (refreshToken: string) => {
  let decodedRefreshToken: TokenPayload
  try {
    decodedRefreshToken = verifyRefreshToken(refreshToken)
  } catch (error) {
    throw new AuthError('Refresh token không hợp lệ')
  }
  const refreshTokenDoc = await prisma.refreshToken.findUniqueOrThrow({
    where: {
      token: refreshToken
    },
    include: {
      account: true
    }
  })
  const account = refreshTokenDoc.account
  const newAccessToken = signAccessToken({
    userId: account.id,
    role: account.role as RoleType
  })
  const newRefreshToken = signRefreshToken({
    userId: account.id,
    role: account.role as RoleType,
    exp: decodedRefreshToken.exp
  })
  await prisma.refreshToken.delete({
    where: {
      token: refreshToken
    }
  })
  await prisma.refreshToken.create({
    data: {
      accountId: account.id,
      token: newRefreshToken,
      expiresAt: refreshTokenDoc.expiresAt
    }
  })
  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken
  }
}
