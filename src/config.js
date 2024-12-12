/* eslint-disable no-undef */

import dotenv from 'dotenv'

dotenv.config({ path: `.env.${process.env.NODE_ENV || 'dev'}` })

export const NODE_ENV = process.env.NODE_ENV || 'dev'
export const PORT = process.env.PORT || 3000
export const DB_URL = process.env.DB_URL
export const SECRET = process.env.SECRET
export const CLOUD_NAME = process.env.CLOUD_NAME
export const CLOUD_API_KEY = process.env.CLOUD_API_KEY
export const CLOUD_API_SECRET = process.env.CLOUD_API_SECRET
export const CLIENT_URL = process.env.CLIENT_URL
export const FRONTEND_URL = process.env.FRONTEND_URL