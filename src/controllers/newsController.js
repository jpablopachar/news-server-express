import { v2 as cloudinary } from 'cloudinary'
import formidable from 'formidable'
import moment from 'moment'
import { mongo } from 'mongoose'
import { CLOUD_API_KEY, CLOUD_API_SECRET, CLOUD_NAME } from '../config.js'
import { ROLES } from '../constants/roles.js'
import Auth from '../models/auth.js'
import Gallery from '../models/gallery.js'
import News from '../models/news.js'
import { handleServerError } from '../utils/general.js'
import { responseReturn } from '../utils/res.js'

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: CLOUD_API_KEY,
  api_secret: CLOUD_API_SECRET,
  secure: true,
})

export class NewsController {
  addNews = async (req, res) => {
    const { id, name, category } = req.userInfo

    const form = formidable({ multiples: true })

    try {
      const [fields, files] = await form.parse(req)
      const { url } = await cloudinary.uploader.upload(
        files.image[0].filepath,
        { folder: 'news_images' }
      )
      const { title, description } = fields

      const news = await News.create({
        writerId: id,
        writerName: name,
        title: title[0].trim(),
        slug: title[0].trim().split(' ').join('-'),
        category,
        description: description[0],
        date: moment().format('LL'),
        image: url,
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
      }).sort({ createdAt: -1 })

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

      let allImages = []

      for (let i = 0; i < images.length; i++) {
        const { url } = await cloudinary.uploader.upload(images[i].filepath, {
          folder: 'news_images',
        })

        allImages.push({ writerId: id, url })
      }

      const image = await Gallery.insertMany(allImages)

      return responseReturn(res, 201, {
        message: 'Images added',
        images: image,
      })
    } catch (error) {
      return handleServerError(res, error, 'addImages')
    }
  }

  getDashboardNews = async (req, res) => {
    const { id, role } = req.userInfo

    try {
      if (role === ROLES.ADMIN) {
        const news = await News.find().sort({ createdAt: -1 })

        return responseReturn(res, 200, { news })
      } else {
        const news = await News.find({
          writerId: mongo.ObjectId.createFromHexString(id),
        }).sort({ createdAt: -1 })

        return responseReturn(res, 200, { news })
      }
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
      const { title, description } = fields

      let url = fields.oldImage[0]

      if (Object.keys(files).length > 0) {
        const spliteImage = url.split('/')
        const imagesFile = spliteImage[spliteImage.length - 1].split('.')[0]

        await cloudinary.uploader.destroy(imagesFile)

        const data = await cloudinary.uploader.upload(
          files.new_image[0].filepath,
          { folder: 'news_images' }
        )

        url = data.url
      }

      const news = await News.findByIdAndUpdate(
        newsId,
        {
          title: title[0].trim(),
          slug: title[0].trim().split(' ').join('-'),
          description: description[0],
          image: url,
        },
        { new: true }
      )

      return responseReturn(res, 200, { message: 'News updated', news })
    } catch (error) {
      return handleServerError(res, error, 'updateNews')
    }
  }

  deleteNews = async (req, res) => {
    const { newsId } = req.params

    try {
      const news = await News.findById(newsId)

      if (!news) return responseReturn(res, 404, { error: 'News not found' })

      const publicId = news.image.split('/').pop().split('.')[0]

      await cloudinary.uploader.destroy(
        `news_images/${publicId}`,
        (error, result) => {
          if (error) {
            console.log('error deleting image from cloudinary', error)

            return responseReturn(res, 500, {
              message: 'Failed to delete image form cloudinary',
            })
          }

          console.log('Image deleted from Cloudinary', result)
        }
      )

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
      const categoryNews = await News.aggregate([
        {
          $sort: { createdAt: -1 },
        },
        {
          $match: {
            status: 'active',
          },
        },
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
            news: {
              $slice: ['$news', 5],
            },
          },
        },
      ])

      const news = {}

      for (let i = 0; i < categoryNews.length; i++) {
        news[categoryNews[i].category] = categoryNews[i].news
      }

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
              $eq: 'active',
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
      const popularNews = await News.find({ status: 'active' })
        .sort({ count: -1 })
        .limit(4)

      return responseReturn(res, 200, { popularNews })
    } catch (error) {
      return handleServerError(res, error, 'getPopularNews')
    }
  }

  getLatestNews = async (_, res) => {
    try {
      const news = await News.find({ status: 'active' })
        .sort({ createdAt: -1 })
        .limit(5)

      return responseReturn(res, 200, { news })
    } catch (error) {
      return handleServerError(res, error, 'getLatestNews')
    }
  }

  getRecentNews = async (_, res) => {
    try {
      const news = await News.find({ status: 'active' })
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
            status: 'active',
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
      })

      return responseReturn(res, 200, { news })
    } catch (error) {
      return handleServerError(res, error, 'newsSearch')
    }
  }

  newsStatistics = async (_, res) => {
    try {
      const totalNews = await News.countDocuments()
      const totalPendingNews = await News.countDocuments({ status: 'pending' })
      const totalActiveNews = await News.countDocuments({ status: 'active' })
      const deactiveNews = await News.countDocuments({ status: 'deactive' })
      const totalWriters = await Auth.countDocuments({ role: 'writer' })

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
