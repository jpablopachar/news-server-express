import { Router } from 'express'
import { AuthController } from '../controllers/authController.js'
import { Middleware } from '../middlewares/middleware.js'

const authController = new AuthController()
const middleware = new Middleware()

export const authRoute = Router()

authRoute.post('/login', authController.login)
authRoute.post(
  '/writer/add',
  middleware.auth,
  middleware.role,
  authController.addWriter
)
authRoute.get(
  '/news/writers',
  middleware.auth,
  middleware.role,
  authController.getWriters
)
authRoute.get(
  '/news/writer/:id',
  middleware.auth,
  middleware.role,
  authController.getWriterById
)
authRoute.put(
  '/update/writer/:id',
  middleware.auth,
  middleware.role,
  authController.updateWriter
)
authRoute.delete(
  '/delete/writer/:id',
  middleware.auth,
  middleware.role,
  authController.deleteWriter
)
authRoute.put(
  '/update-profile/:id',
  middleware.auth,
  middleware.role,
  authController.updateProfile
)
authRoute.get(
  '/profile/:id',
  middleware.auth,
  middleware.role,
  authController.getProfile
)
authRoute.post(
  '/change-password',
  middleware.auth,
  authController.changePassword
)
