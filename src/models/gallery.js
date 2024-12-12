import { Schema, model } from 'mongoose'

const gallerySchema = new Schema(
  {
    writerId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Authors',
    },
    url: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
)

export default model('Images', gallerySchema)
