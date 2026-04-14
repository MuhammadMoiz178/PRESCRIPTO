import express from 'express'
import { bookAppointment, cancelAppointment, getProfile, listAppointment, loginUser, placeOrderStripe, registerUser, updateProfile, verifyStripe } from '../controllers/user.controller.js'
import authUser from '../middlewares/auth-User.middlware.js'
import upload from '../middlewares/multer.js'

const userRouter = express.Router()

userRouter.post('/register',registerUser)
userRouter.post('/login',loginUser)
userRouter.get('/get-profile',authUser,getProfile)
userRouter.post('/update-profile',upload.single('image'),authUser,updateProfile)
userRouter.post('/book-appointment',authUser,bookAppointment)
userRouter.get('/appointments',authUser,listAppointment)
userRouter.post('/cancel-appointment',authUser,cancelAppointment)
userRouter.post('/place-order-stripe',authUser,placeOrderStripe)
userRouter.post('/verify-stripe',authUser,verifyStripe)

export default userRouter