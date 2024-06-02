import envConfig from '@/config'
import { PrismaErrorCode } from '@/constants/error-reference'
import { Role } from '@/constants/type'
import prisma from '@/database'
import {
  ChangePasswordBodyType,
  CreateEmployeeAccountBodyType,
  UpdateEmployeeAccountBodyType,
  UpdateMeBodyType
} from '@/schemaValidations/account.schema'
import { comparePassword, hashPassword } from '@/utils/crypto'
import { EntityError, isPrismaClientKnownRequestError } from '@/utils/errors'
import { getChalk } from '@/utils/helpers'

export const initOwnerAccount = async () => {
  const accountCount = await prisma.account.count()
  if (accountCount === 0) {
    const hashedPassword = await hashPassword(envConfig.INITIAL_PASSWORD_OWNER)
    await prisma.account.create({
      data: {
        name: 'Owner',
        email: envConfig.INITIAL_EMAIL_OWNER,
        password: hashedPassword,
        role: Role.Owner
      }
    })
    const chalk = await getChalk()
    console.log(
      chalk.bgCyan(
        `Khởi tạo tài khoản chủ quán thành công: ${envConfig.INITIAL_EMAIL_OWNER}|${envConfig.INITIAL_PASSWORD_OWNER}`
      )
    )
  }
}

export const createEmployeeAccount = async (body: CreateEmployeeAccountBodyType) => {
  try {
    const hashedPassword = await hashPassword(body.password)
    const account = await prisma.account.create({
      data: {
        name: body.name,
        email: body.email,
        password: hashedPassword,
        role: Role.Employee,
        avatar: body.avatar
      }
    })
    return account
  } catch (error: any) {
    if (isPrismaClientKnownRequestError(error)) {
      if (error.code === PrismaErrorCode.UniqueConstraintViolation) {
        throw new EntityError([{ field: 'email', message: 'Email đã tồn tại' }])
      }
    }
    throw error
  }
}

export const getEmployeeAccounts = async () => {
  const accounts = await prisma.account.findMany({
    where: {
      role: Role.Employee
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
  return accounts
}

export const getEmployeeAccount = async (accountId: number) => {
  const account = await prisma.account.findUniqueOrThrow({
    where: {
      id: accountId
    }
  })
  return account
}

export const getAccountList = async (accountId: number) => {
  const account = await prisma.account.findMany({
    orderBy: {
      createdAt: 'desc'
    },
    where: {
      id: {
        not: accountId
      }
    }
  })
  return account
}

export const updateEmployeeAccount = async (accountId: number, body: UpdateEmployeeAccountBodyType) => {
  try {
    if (body.changePassword) {
      const hashedPassword = await hashPassword(body.password!)
      const account = await prisma.account.update({
        where: {
          id: accountId
        },
        data: {
          name: body.name,
          email: body.email,
          avatar: body.avatar,
          password: hashedPassword
        }
      })
      return account
    } else {
      const account = await prisma.account.update({
        where: {
          id: accountId
        },
        data: {
          name: body.name,
          email: body.email,
          avatar: body.avatar
        }
      })
      return account
    }
  } catch (error: any) {
    if (isPrismaClientKnownRequestError(error)) {
      if (error.code === PrismaErrorCode.UniqueConstraintViolation) {
        throw new EntityError([{ field: 'email', message: 'Email đã tồn tại' }])
      }
    }
    throw error
  }
}

export const deleteEmployeeAccount = async (accountId: number) => {
  return prisma.account.delete({
    where: {
      id: accountId
    }
  })
}

export const getMeController = async (accountId: number) => {
  const account = prisma.account.findUniqueOrThrow({
    where: {
      id: accountId
    }
  })
  return account
}

export const updateMeController = async (accountId: number, body: UpdateMeBodyType) => {
  const account = prisma.account.update({
    where: {
      id: accountId
    },
    data: body
  })
  return account
}

export const changePasswordController = async (accountId: number, body: ChangePasswordBodyType) => {
  const hashedOldPassword = await hashPassword(body.oldPassword)
  const account = await prisma.account.findUniqueOrThrow({
    where: {
      id: accountId
    }
  })
  const isSame = await comparePassword(account.password, hashedOldPassword)
  if (isSame) {
    throw new EntityError([{ field: 'oldPassword', message: 'Mật khẩu cũ không đúng' }])
  }
  const hashedPassword = await hashPassword(body.password)
  const newAccount = await prisma.account.update({
    where: {
      id: accountId
    },
    data: {
      password: hashedPassword
    }
  })
  return newAccount
}
