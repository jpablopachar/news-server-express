import { compare } from 'bcrypt'
import { v2 as cloudinary } from 'cloudinary'
import { sign } from 'jsonwebtoken'
import {
  CLOUD_API_KEY,
  CLOUD_API_SECRET,
  CLOUD_NAME,
  SECRET,
} from '../config.js'
import Auth from '../models/auth.js'
import { responseReturn } from '../utils/res.js'

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: CLOUD_API_KEY,
  api_secret: CLOUD_API_SECRET,
  secure: true,
})

export class AuthController {
  login = async (req, res) => {
    const { email, password } = req.body

    if (!email || !password)
      return responseReturn(res, 400, { error: 'Email and password required' })

    try {
      const user = await Auth.findOne({ email }).select('+password')

      if (!user) return responseReturn(res, 404, { error: 'User not found' })

      const passwordMatch = await compare(password, user.password)

      if (!passwordMatch)
        return responseReturn(res, 401, { error: 'Invalid password' })

      const payload = {
        id: user.id,
        name: user.name,
        category: user.category,
        role: user.role,
      }

      const token = sign(payload, SECRET, { expiresIn: '1d' })

      return responseReturn(res, 200, { message: 'Login successful', token })
    } catch (error) {
      console.error('Error in login', error)

      return responseReturn(res, 500, { error: 'Internal server error' })
    }
  }
}
