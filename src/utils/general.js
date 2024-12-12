import { v2 as cloudinary } from 'cloudinary'
import { responseReturn } from './res.js'

export const validateRequiredFields = (res, fields) => {
  for (const [field, message] of Object.entries(fields)) {
    if (!field) return responseReturn(res, 400, { error: message })
  }
}

export const handleServerError = (res, error, context = 'Error') => {
  console.error(`${context}:`, error)

  return responseReturn(res, 500, { error: 'Internal server error' })
}

export const uploadImageToCloudinary = async (filepath, folder) => {
  const { url } = await cloudinary.uploader.upload(filepath, { folder })

  return url
}

export const deleteImageFromCloudinary = async (url, path) => {
  const publicId = url.split('/').pop().split('.')[0]

  await cloudinary.uploader.destroy(`${path}/${publicId}`)
}
