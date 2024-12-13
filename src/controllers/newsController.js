import { v2 as cloudinary } from 'cloudinary'
import formidable from 'formidable'
import moment from 'moment'
import { mongo } from 'mongoose'
import { CLOUD_API_KEY, CLOUD_API_SECRET, CLOUD_NAME } from '../config.js'
import { NEWS_STATUS } from '../constants/newsStatus.js'
import { ROLES } from '../constants/roles.js'
import Auth from '../models/auth.js'
import Gallery from '../models/gallery.js'
import News from '../models/news.js'
import {
  deleteImageFromCloudinary,
  handleServerError,
  uploadImageToCloudinary,
} from '../utils/general.js'
import { responseReturn } from '../utils/res.js'

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: CLOUD_API_KEY,
  api_secret: CLOUD_API_SECRET,
  secure: true,
})

export class NewsController {
  #createSlug(title) {
    return title.trim().toLowerCase().replace(/\s+/g, '-')
  }

  addNews = async (req, res) => {
    const { id, name, category } = req.userInfo

    const form = formidable({ multiples: true })

    try {
      const [fields, files] = await form.parse(req)
      const imageUrl = await uploadImageToCloudinary(
        files.image[0].filepath,
        'news_images'
      )

      const news = await News.create({
        writerId: id,
        writerName: name,
        title: fields.title[0].trim(),
        slug: this.#createSlug(fields.title[0]),
        category,
        description: fields.description[0],
        date: moment().format('LL'),
        image: imageUrl,
      })

      return responseReturn(res, 201, { message: 'News added', news })
    } catch (error) {
      return handleServerError(res, error, 'addNews')
    }
  }

  getImages = async (req, res) => {
    try {
      const images = await Gallery.find({
        writerId: mongo.ObjectId.createFromHexString(req.userInfo.id),
      })
        .sort({ createdAt: -1 })
        .lean()

      return responseReturn(res, 200, { images })
    } catch (error) {
      return handleServerError(res, error, 'getImages')
    }
  }

  addImages = async (req, res) => {
    const { id } = req.userInfo

    const form = formidable({})

    try {
      const [, files] = await form.parse(req)
      const { images } = files

      const uploadPromises = images.map(async (image) => {
        const url = await uploadImageToCloudinary(image.filepath, 'news_images')

        return { writerId: id, url }
      })

      const uploadedImages = await Promise.all(uploadPromises)

      const savedImages = await Gallery.insertMany(uploadedImages)

      return responseReturn(res, 201, {
        message: 'Images added',
        images: savedImages,
      })
    } catch (error) {
      return handleServerError(res, error, 'addImages')
    }
  }

  getDashboardNews = async (req, res) => {
    const { id, role } = req.userInfo

    try {
      const query =
        role === ROLES.ADMIN
          ? {}
          : { writerId: mongo.ObjectId.createFromHexString(id) }

      const news = await News.find(query).sort({ createdAt: -1 }).lean()

      return responseReturn(res, 200, { news })
    } catch (error) {
      return handleServerError(res, error, 'getDashboardNews')
    }
  }

  getEditDashboardNews = async (req, res) => {
    const { newsId } = req.params

    try {
      const news = await News.findById(newsId)

      if (!news) return responseReturn(res, 404, { error: 'News not found' })

      return responseReturn(res, 200, { news })
    } catch (error) {
      return handleServerError(res, error, 'getEditDashboardNews')
    }
  }

  updateNews = async (req, res) => {
    const { newsId } = req.params

    const form = formidable({})

    try {
      const [fields, files] = await form.parse(req)

      let imageUrl = fields.oldImage[0]

      if (files.newImage?.[0]?.filepath) {
        await deleteImageFromCloudinary(imageUrl)

        imageUrl = await uploadImageToCloudinary(
          files.newImage[0].filepath,
          'news_images'
        )
      }

      const updateNews = await News.findByIdAndUpdate(
        newsId,
        {
          title: fields.title[0].trim(),
          slug: this.#createSlug(fields.title[0]),
          description: fields.description[0],
          image: imageUrl,
        },
        { new: true }
      )

      return responseReturn(res, 200, {
        message: 'News updated',
        news: updateNews,
      })
    } catch (error) {
      return handleServerError(res, error, 'updateNews')
    }
  }

  deleteNews = async (req, res) => {
    const { newsId } = req.params

    try {
      const news = await News.findById(newsId)

      if (!news) return responseReturn(res, 404, { error: 'News not found' })

      await deleteImageFromCloudinary(news.image)
      await News.findByIdAndDelete(newsId)

      return responseReturn(res, 200, {
        message: 'News deleted with image successfully',
      })
    } catch (error) {
      return handleServerError(res, error, 'deleteNews')
    }
  }

  updateNewsStatus = async (req, res) => {
    const { role } = req.userInfo
    const { newsId } = req.params
    const { status } = req.body

    try {
      if (role !== ROLES.ADMIN)
        return responseReturn(res, 403, { error: 'Unauthorized' })

      const news = await News.findByIdAndUpdate(
        newsId,
        { status },
        { new: true }
      )

      if (!news) return responseReturn(res, 404, { error: 'News not found' })

      return responseReturn(res, 200, { message: 'News status updated', news })
    } catch (error) {
      return handleServerError(res, error, 'updateNewsStatus')
    }
  }

  getAllNews = async (req, res) => {
    try {
      const pipeline = [
        { $match: { status: NEWS_STATUS.ACTIVE } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: '$category',
            news: {
              $push: {
                _id: '$_id',
                title: '$title',
                slug: '$slug',
                writerName: '$writerName',
                image: '$image',
                description: '$description',
                date: '$date',
                category: '$category',
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            category: '$_id',
            news: { $slice: ['$news', 5] },
          },
        },
      ]

      const categoryNews = await News.aggregate(pipeline)

      const news = Object.fromEntries(
        categoryNews.map(({ category, news }) => [category, news])
      )

      return responseReturn(res, 200, { news })
    } catch (error) {
      return handleServerError(res, error, 'getAllNews')
    }
  }

  getCategories = async (_, res) => {
    try {
      const categories = await News.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            category: '$_id',
            count: 1,
          },
        },
      ])

      return responseReturn(res, 200, { categories })
    } catch (error) {
      return handleServerError(res, error, 'getCategories')
    }
  }

  getDetailsNews = async (req, res) => {
    const { slug } = req.params

    try {
      const news = await News.findByIdAndUpdate(
        { slug },
        { $inc: { count: 1 } },
        { new: true }
      )

      const relatedNews = await News.find({
        $and: [
          {
            slug: {
              $ne: slug,
            },
          },
          {
            category: {
              $eq: news.category,
            },
          },
        ],
      })
        .limit(4)
        .sort({ createAt: -1 })

      return responseReturn(res, 200, { news: news ? news : {}, relatedNews })
    } catch (error) {
      return handleServerError(res, error, 'getDetailsNews')
    }
  }

  getCategoryNews = async (req, res) => {
    const { category } = req.params

    if (!category)
      return responseReturn(res, 400, { error: 'Category is required' })

    try {
      const news = await News.find({
        $and: [
          {
            category: {
              $eq: category,
            },
          },
          {
            status: {
              $eq: NEWS_STATUS.ACTIVE,
            },
          },
        ],
      })

      return responseReturn(res, 200, { news })
    } catch (error) {
      return handleServerError(res, error, 'getCategoryNews')
    }
  }

  getPopularNews = async (_, res) => {
    try {
      const popularNews = await News.find({ status: NEWS_STATUS.ACTIVE })
        .sort({ count: -1 })
        .limit(4)
        .lean()

      return responseReturn(res, 200, { popularNews })
    } catch (error) {
      return handleServerError(res, error, 'getPopularNews')
    }
  }

  getLatestNews = async (_, res) => {
    try {
      const news = await News.find({ status: NEWS_STATUS.ACTIVE })
        .sort({ createdAt: -1 })
        .limit(5)

      return responseReturn(res, 200, { news })
    } catch (error) {
      return handleServerError(res, error, 'getLatestNews')
    }
  }

  getRecentNews = async (_, res) => {
    try {
      const news = await News.find({ status: NEWS_STATUS.ACTIVE })
        .sort({ createdAt: -1 })
        .skip(6)
        .limit(5)

      return responseReturn(res, 200, { news })
    } catch (error) {
      return handleServerError(res, error, 'getRecentNews')
    }
  }

  getImagesNews = async (_, res) => {
    try {
      const images = await News.aggregate([
        {
          $match: {
            status: NEWS_STATUS.ACTIVE,
          },
        },
        {
          $sample: {
            size: 9,
          },
        },
        {
          $project: {
            image: 1,
          },
        },
      ])

      return responseReturn(res, 200, { images })
    } catch (error) {
      return handleServerError(res, error, 'getImagesNews')
    }
  }

  newsSearch = async (req, res) => {
    const { value } = req.query

    if (!value)
      return responseReturn(res, 400, { error: 'Search value is required' })

    try {
      const news = await News.find({
        status: 'active',
        title: { $regex: value, $options: 'i' },
      }).lean()

      return responseReturn(res, 200, { news })
    } catch (error) {
      return handleServerError(res, error, 'newsSearch')
    }
  }

  newsStatistics = async (_, res) => {
    try {
      const [
        totalNews,
        totalPendingNews,
        totalActiveNews,
        deactiveNews,
        totalWriters,
      ] = await Promise.all([
        News.countDocuments(),
        News.countDocuments({ status: NEWS_STATUS.PENDING }),
        News.countDocuments({ status: NEWS_STATUS.ACTIVE }),
        News.countDocuments({ status: NEWS_STATUS.DEACTIVE }),
        Auth.countDocuments({ role: ROLES.WRITER }),
      ])

      return responseReturn(res, 200, {
        totalNews,
        totalPendingNews,
        totalActiveNews,
        deactiveNews,
        totalWriters,
      })
    } catch (error) {
      return handleServerError(res, error, 'newsStatistics')
    }
  }
}
