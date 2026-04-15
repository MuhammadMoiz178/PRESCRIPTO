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

const startServer = async () => {
    try {
        await connectDb()
        await connectCloudinary()

        app.listen(PORT,()=>console.log(`Server is running on port http://localhost:${PORT}`))
    } catch (error) {
        console.error('Server startup failed:', error.message)
        process.exit(1)
    }
}

if (process.env.VERCEL) {
    await connectDb()
    await connectCloudinary()
} else {
    startServer()
}

export default app