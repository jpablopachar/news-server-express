import { verify } from 'jsonwebtoken'
import { SECRET } from '../config.js'
import { ROLES } from '../constants/roles.js'
import { handleServerError } from '../utils/general.js'
import { responseReturn } from '../utils/res.js'

export class Middleware {
  auth = async (req, res, next) => {
    const { authorization } = req.headers

    if (!authorization || !authorization.startsWith('Bearer '))
      return responseReturn(res, 401, { error: 'Unauthorized' })

    const token = authorization.split('Bearer ')[1]

    if (!token) return responseReturn(res, 401, { error: 'Token not provided' })

    try {
      const decoded = verify(token, SECRET)

      req.userInfo = decoded

      next()
    } catch (error) {
      return handleServerError(res, error, 'auth')
    }
  }

  role = async (req, res, next) => {
    const { userInfo } = req

    if (!userInfo || ![ROLES.ADMIN, ROLES.WRITER].includes(userInfo.role))
      return responseReturn(res, 403, { message: 'Access denied' })

    next()
  }
}
