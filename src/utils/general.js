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
