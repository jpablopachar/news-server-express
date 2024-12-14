import { compare, genSalt, hash } from 'bcrypt'
import { v2 as cloudinary } from 'cloudinary'
import formidable from 'formidable'
import pkg from 'jsonwebtoken'
import {
  CLOUD_API_KEY,
  CLOUD_API_SECRET,
  CLOUD_NAME,
  SECRET,
} from '../config.js'
import Auth from '../models/auth.js'
import { handleServerError, validateRequiredFields } from '../utils/general.js'
import { responseReturn } from '../utils/res.js'

const { sign } = pkg

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: CLOUD_API_KEY,
  api_secret: CLOUD_API_SECRET,
  secure: true,
})

export class AuthController {
  login = async (req, res) => {
    const { email, password } = req.body

    validateRequiredFields(res, 500, {
      email: 'Email is required',
      password: 'Password is required',
    })

    try {
      const user = await Auth.findOne({ email }).select('+password')

      if (!user) return responseReturn(res, 404, { error: 'User not found' })

      const passwordMatch = await compare(password, user.password)

      if (!passwordMatch)
        return responseReturn(res, 401, { error: 'Invalid password' })

      const token = sign(
        {
          id: user.id,
          name: user.name,
          category: user.category,
          role: user.role,
        },
        SECRET,
        { expiresIn: '1d' }
      )

      return responseReturn(res, 200, { message: 'Login successful', token })
    } catch (error) {
      return handleServerError(res, error, 'login')
    }
  }

  addWriter = async (req, res) => {
    const { email, name, password, category } = req.body

    validateRequiredFields(res, {
      name: 'Name is required',
      email: 'Email is required',
      password: 'Password is required',
      category: 'Category is required',
    })

    try {
      const existingWriter = await Auth.findOne({ email: email.trim() })

      if (existingWriter)
        return responseReturn(res, 400, { error: 'Writer already exists' })

      const newWriter = await Auth.create({
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
      return handleServerError(res, error, 'addWriter')
    }
  }

  getWriters = async (req, res) => {
    try {
      const writers = await Auth.find({ role: 'writer' }).sort({
        createdAt: -1,
      })

      return responseReturn(res, 200, { writers })
    } catch (error) {
      return handleServerError(res, error, 'getWriters')
    }
  }

  getWriterById = async (req, res) => {
    try {
      const writer = await Auth.findById(req.params.id)

      if (!writer)
        return responseReturn(res, 404, { error: 'Writer not found' })

      return responseReturn(res, 200, { writer })
    } catch (error) {
      return handleServerError(res, error, 'getWriterById')
    }
  }

  updateWriter = async (req, res) => {
    const { name, email, category, role } = req.body

    validateRequiredFields(res, {
      name: 'Name is required',
      email: 'Email is required',
      category: 'Category is required',
    })

    try {
      const writer = await Auth.findById(req.params.id)

      if (!writer)
        return responseReturn(res, 404, { error: 'Writer not found' })

      Object.assign(writer, {
        name: name.trim(),
        email: email.trim(),
        category: category.trim(),
        role: role?.trim(),
      })

      await writer.save()

      return responseReturn(res, 200, {
        message: 'Writer updated successfully',
        writer,
      })
    } catch (error) {
      return handleServerError(res, error, 'updateWriter')
    }
  }

  deleteWriter = async (req, res) => {
    try {
      const writer = await Auth.findByIdAndDelete(req.params.id)

      if (!writer)
        return responseReturn(res, 404, { error: 'Writer not found' })

      return responseReturn(res, 200, {
        message: 'Writer deleted successfully',
      })
    } catch (error) {
      return handleServerError(res, error, 'deleteWriter')
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
        return handleServerError(res, error, 'updateProfile')
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
      return handleServerError(res, error, 'getProfile')
    }
  }

  changePassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body

    validateRequiredFields(res, {
      oldPassword: 'Old password is required',
      newPassword: 'New password is required',
    })

    try {
      const user = await Auth.findById(req.params.id).select('+password')

      if (!user) return responseReturn(res, 404, { error: 'User not found' })

      const passwordMatch = await compare(oldPassword, user.password)

      if (!passwordMatch)
        return responseReturn(res, 401, { error: 'Invalid old password' })

      user.password = await hash(newPassword, await genSalt(10))

      await user.save()

      return responseReturn(res, 200, {
        message: 'Password changed successfully',
      })
    } catch (error) {
      return handleServerError(res, error, 'changePassword')
    }
  }
}
