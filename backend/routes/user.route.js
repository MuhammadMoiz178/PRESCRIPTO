import express from 'express'
import { getProfile, loginUser, registerUser, updateProfile } from '../controllers/user.controller.js'
import authUser from '../middlewares/auth-User.middlware.js'
import upload from '../middlewares/multer.js'

const userRouter = express.Router()

userRouter.post('/register',registerUser)
userRouter.post('/login',loginUser)
userRouter.get('/get-profile',authUser,getProfile)
userRouter.post('/update-profile',upload.single('image'),authUser,updateProfile)

export default userRouter