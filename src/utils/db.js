/* eslint-disable no-undef */

import { connect } from 'mongoose'
import { DB_URL, NODE_ENV } from '../config.js'

export const dbConnect = async () => {
  try {
    await connect(DB_URL)

    if (NODE_ENV !== 'prod') console.log('Db connected')
  } catch (error) {
    console.error(error.message)

    process.exit(1)
  }
}
