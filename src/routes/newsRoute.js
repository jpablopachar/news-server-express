import { Router } from 'express'
import { NewsController } from '../controllers/newsController.js'
import { Middleware } from '../middlewares/middleware.js'

const newsController = new NewsController()
const middleware = new Middleware()

export const newsRoute = Router()

newsRoute.post('/news/add', middleware.auth, newsController.addNews)
newsRoute.get('/images', middleware.auth, newsController.getImages)
newsRoute.post('/images/add', middleware.auth, newsController.addImages)
newsRoute.get('/news', middleware.auth, newsController.getDashboardNews)
newsRoute.get(
  '/edit/news/:newsId',
  middleware.auth,
  newsController.getEditDashboardNews
)
newsRoute.put(
  '/news/update/:newsId',
  middleware.auth,
  newsController.updateNews
)
newsRoute.delete(
  '/news/delete/:newsId',
  middleware.auth,
  newsController.deleteNews
)
newsRoute.put(
  '/news/status-update/:newsId',
  middleware.auth,
  newsController.updateNewsStatus
)

// Frontend Api All
newsRoute.get('/all/news', newsController.getAllNews)
newsRoute.get('/category/all', newsController.getCategories)
newsRoute.get('/news/details/:slug', newsController.getDetailsNews)
newsRoute.get('/category/news/:category', newsController.getCategoryNews)
newsRoute.get('/popular/news', newsController.getPopularNews)
newsRoute.get('/latest/news', newsController.getLatestNews)
newsRoute.get('/recent/news', newsController.getRecentNews)
newsRoute.get('/images/news', newsController.getImagesNews)
newsRoute.get('/search/news', newsController.newsSearch)
newsRoute.get('/news-statistics', newsController.newsStatistics)
