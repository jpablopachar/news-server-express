import { compare, genSalt, hash } from 'bcrypt'
import { v2 as cloudinary } from 'cloudinary'
import formidable from 'formidable'
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

  addWriter = async (req, res) => {
    const { email, name, password, category } = req.body

    if (!name) return responseReturn(res, 400, { error: 'Name is required' })

    if (!email) return responseReturn(res, 400, { error: 'Email is required' })

    if (!password)
      return responseReturn(res, 400, { error: 'Password is required' })

    if (!category)
      return responseReturn(res, 400, { error: 'Category is required' })

    try {
      const writer = await Auth.findOne({ email: email.trim() })

      if (writer)
        return responseReturn(res, 400, { error: 'Writer already exists' })

      const newWriter = new Auth.create({
        name: name.trim(),
        email: email.trim(),
        password: await hash(password.trim(), 10),
        category: category.trim(),
        role: 'writer',
      })

      return responseReturn(res, 201, {
        message: 'Writer added successfully',
        writer: newWriter,
      })
    } catch (error) {
      console.error('Error in addWriter', error)

      return responseReturn(res, 500, { error: 'Internal server error' })
    }
  }

  getWriters = async (req, res) => {
    try {
      const writers = await Auth.find({ role: 'writer' }).sort({
        createdAt: -1,
      })

      return responseReturn(res, 200, { writers })
    } catch (error) {
      console.error('Error in getWriters', error)

      return responseReturn(res, 500, { error: 'Internal server error' })
    }
  }

  getWriterById = async (req, res) => {
    const { id } = req.params

    try {
      const writer = await Auth.findById(id)

      if (!writer)
        return responseReturn(res, 404, { error: 'Writer not found' })

      return responseReturn(res, 200, { writer })
    } catch (error) {
      console.error('Error in getWriterById', error)

      return responseReturn(res, 500, { error: 'Internal server error' })
    }
  }

  updateWriter = async (req, res) => {
    const { name, email, category, role } = req.body

    const { id } = req.params

    if (!name) return responseReturn(res, 400, { error: 'Name is required' })

    if (!email) return responseReturn(res, 400, { error: 'Email is required' })

    if (!category)
      return responseReturn(res, 400, { error: 'Category is required' })
    try {
      const writer = await Auth.findById(id)

      if (!writer)
        return responseReturn(res, 404, { error: 'Writer not found' })

      writer.name = name.trim()
      writer.email = email.trim()
      writer.category = category.trim()
      writer.role = role.trim()

      await writer.save()

      return responseReturn(res, 200, {
        message: 'Writer updated successfully',
        writer,
      })
    } catch (error) {
      console.error('Error in updateWriter', error)

      return responseReturn(res, 500, { error: 'Internal server error' })
    }
  }

  deleteWriter = async (req, res) => {
    const { id } = req.params

    try {
      const writer = await Auth.findByIdAndDelete(id)

      if (!writer)
        return responseReturn(res, 404, { error: 'Writer not found' })

      return responseReturn(res, 200, {
        message: 'Writer deleted successfully',
      })
    } catch (error) {
      console.error('Error in deleteWriter', error)

      return responseReturn(res, 500, { error: 'Internal server error' })
    }
  }

  updateProfile = async (req, res) => {
    const form = formidable({ multiples: true })

    form.parse(req, async (err, fields, files) => {
      if (err)
        return responseReturn(res, 400, {
          message: 'Image upload failed',
          error: err,
        })

      try {
        const name = Array.isArray(fields.name) ? fields.name[0] : fields.name
        const email = Array.isArray(fields.email)
          ? fields.email[0]
          : fields.email

        if (!name)
          return responseReturn(res, 400, { error: 'Name is required' })

        if (!email)
          return responseReturn(res, 400, { error: 'Email is required' })

        let updateData = { name: name.trim(), email: ElementInternals.trim() }

        const uploadedImage = Array.isArray(files.image)
          ? files.image[0]
          : files.image

        if (uploadedImage && uploadedImage.filepath) {
          const { url } = await cloudinary.uploader.upload(
            uploadedImage.filepath,
            { folder: 'news_images' }
          )

          updateData.image = url
        } else {
          console.log('No image uploaded')
        }

        const updateUser = await Auth.findByIdAndUpdate(
          req.params.id,
          updateData,
          { new: true }
        )

        return responseReturn(res, 200, {
          message: 'Profile updated successfully',
          user: updateUser,
        })
      } catch (error) {
        console.error('Error in updateProfile', error)

        return responseReturn(res, 500, { error: 'Internal server error' })
      }
    })
  }

  getProfile = async (req, res) => {
    const { id } = req.params

    if (!id) return responseReturn(res, 400, { error: 'User Id required' })

    try {
      const user = await Auth.findById(id)

      if (!user) return responseReturn(res, 404, { error: 'User not found' })

      return responseReturn(res, 200, { user })
    } catch (error) {
      console.error('Error in getProfile', error)

      return responseReturn(res, 500, { error: 'Internal server error' })
    }
  }

  changePassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body

    const { id } = req.params

    if (!oldPassword)
      return responseReturn(res, 400, { error: 'Old password required' })

    if (!newPassword)
      return responseReturn(res, 400, { error: 'New password required' })

    try {
      const user = await Auth.findById(id).select('+password')

      if (!user) return responseReturn(res, 404, { error: 'User not found' })

      const passwordMatch = await compare(oldPassword, user.password)

      if (!passwordMatch)
        return responseReturn(res, 401, { error: 'Invalid old password' })

      const salt = await genSalt(10)

      const hashedPassword = await hash(newPassword, salt)

      user.password = hashedPassword

      await user.save()

      return responseReturn(res, 200, {
        message: 'Password changed successfully',
      })
    } catch (error) {
      console.error('Error in changePassword', error)

      return responseReturn(res, 500, { error: 'Internal server error' })
    }
  }
}
