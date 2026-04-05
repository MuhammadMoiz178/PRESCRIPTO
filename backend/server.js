import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import connectDb from './config/mongodb.js'
import connectCloudinary from './config/cloudinary.js'
import adminRouter from './routes/admin.route.js'
import doctorRouter from './routes/doctor.route.js'
import userRouter from './routes/user.route.js'

//app config
const app = express()
const PORT = process.env.PORT || 4000;
connectDb()
connectCloudinary()
// middlewares
app.use(express.json())
app.use(cors())

// api endpoints
app.use('/api/admin',adminRouter)
app.use('/api/doctor',doctorRouter)
app.use('/api/user',userRouter)

app.get('/',(req,res)=>{
    res.send('Api is working')
})

app.listen(PORT,()=>console.log(`Server is running on port http://localhost:${PORT}`))