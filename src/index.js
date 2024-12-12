import cors from 'cors'
import express from 'express'
import morgan from 'morgan'
import { CLIENT_URL, FRONTEND_URL, PORT } from './config.js'
import { authRoute } from './routes/authRoute.js'
import { newsRoute } from './routes/newsRoute.js'
import { dbConnect } from './utils/db.js'

const corsOptions = {
  origin: [CLIENT_URL, FRONTEND_URL],
  credentials: true,
}

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(morgan('dev'))
app.use(cors(corsOptions))

app.use('/api', authRoute)
app.use('/api', newsRoute)

dbConnect().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
  })
})
