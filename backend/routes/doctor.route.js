import express from 'express'
import { appointmentCancel, appointmentComplete, appointmentsDoctor, doctorList, loginDoctor } from '../controllers/doctor.controller.js'
import authDoctor from '../middlewares/auth-Doctor.middleware.js'

const doctorRouter = express.Router()

doctorRouter.get('/list',doctorList)
doctorRouter.post('/login',loginDoctor)
doctorRouter.get('/appointments',authDoctor,appointmentsDoctor)
doctorRouter.post('/complete-appointment',authDoctor,appointmentComplete)
doctorRouter.get('/cancel-appointment',authDoctor,appointmentCancel)

export default doctorRouter