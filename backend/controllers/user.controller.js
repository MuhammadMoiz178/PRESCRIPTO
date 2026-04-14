import validator from 'validator'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import userModel from '../models/user.model.js';
import {v2 as cloudinary} from 'cloudinary'
import doctorModel from '../models/doctor.model.js';
import appointmentModel from '../models/appointment.model.js';
import Stripe from 'stripe';
//Api to register user
const registerUser = async (req,res) => {
    try {
        const {name,email,password} = req.body;
        if(!name || !password || !email) {
            return res.json({success:false,message:"Missing Details"})
        }
        if(!validator.isEmail(email)) {
            return res.json({success:false,message:"enter a valid email"})
        }
        if(password.length < 8) {
            return res.json({success:false,message:"enter a strong password"})
        }
        //Hashing User Password
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password,salt);

        const userData = {
            name,
            email,
            password:hashedPassword
        }
        const newUser = new userModel(userData);
        const user = await newUser.save()

        const token = jwt.sign({id:user._id},process.env.JWT_SECRET)
        res.json({success:true,token})
    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
    }
}

//Api for user Login
const loginUser = async (req,res) => {
    try {
        const {email,password} = req.body;
        const user = await userModel.findOne({email})

        if(!user) {
        return res.json({success:false,message:"User does not exist"})
        }

        const isMatch = await bcrypt.compare(password,user.password)
        if(isMatch) {
            const token = jwt.sign({id:user._id},process.env.JWT_SECRET)
            res.json({success:true,token})
        } else {
            res.json({success:false,message:'Invalid Credientials'})
        }
    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
    }
}

//Api for user profile data
const getProfile = async (req,res) => {
    try {
        const {userId} = req.user;
        const userData = await userModel.findById(userId).select('-password');
        res.json({success:true,userData})
    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
    }
}

//Api to update profile
const updateProfile = async (req,res) => {
    try {
        const { userId } = req.user
        const {name,phone,address,dob,gender} = req.body
        const imageFile = req.file

        if(!name || !phone || !address || !dob || !gender) {
            return res.json({success:false,message:"Data Missing"})
        }
        await userModel.findByIdAndUpdate(userId,{name,phone,address:JSON.parse(address),dob,gender})

        if (imageFile) {
            const imageUpload = await cloudinary.uploader.upload(
                imageFile.path,
                {
                    resource_type: 'image'
                }
            )
            const imageUrl = imageUpload.secure_url //cloudinary image url
            await userModel.findByIdAndUpdate(userId, { image: imageUrl })
        }

        res.json({ success: true, message: "Profile Updated" })

    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
    }
}

//Api to book appointment
const bookAppointment = async (req,res) => {
    try {
        const { userId } = req.user;
        const { docId, slotDate, slotTime } = req.body

        const docData = await doctorModel.findById(docId).select("-password")
        if(!docData.available) {
            return res.json({success:false,message:"Doctor Not Available"})
        } 

        let slots_booked = docData.slots_booked
//         This stores booked slots in this format:
//       {
//          "2026-04-07": ["10:00", "11:00"]
//        }

        // Checking for slots Availability
        if(slots_booked[slotDate]) {
            if(slots_booked[slotDate].includes(slotTime)) {
                return res.json({success:false,message:"Slot not available"})
            } else {
                slots_booked[slotDate].push(slotTime)
            }
        } else {
            slots_booked[slotDate] = []
            slots_booked[slotDate].push(slotTime)
        }

        const userData = await userModel.findById(userId).select("-password")
        delete docData.slots_booked

        const appointmentData = {
            userId,
            docId,
            userData,
            docData,
            amount:docData.fees,
            slotTime,
            slotDate,
            date:Date.now()
        }
        const newAppointment = new appointmentModel(appointmentData)
        await newAppointment.save()

        // save new slots data in docData
        await doctorModel.findByIdAndUpdate(docId,{slots_booked})

        res.json({success:true,message:'Appointment Booked'})
    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
    }
}

// Api to get user appointments for frontend my-appointments page
const listAppointment = async (req,res) => {
    try {
        const {userId} = req.user
        const appointments = await appointmentModel.find({userId})
        res.json({success:true,appointments})
    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
    }
}

//Api to Cancel Appointment
const cancelAppointment = async (req,res) => {
    try {
        const {userId} = req.user;
        const {appointmentId} = req.body;
        
        const appointmentData = await appointmentModel.findById(appointmentId);

        //verify appointment user
        if(appointmentData.userId !== userId) {
            return res.json({success:false,message:"Unauthorized action"})
        }
        await appointmentModel.findByIdAndUpdate(appointmentId,{cancelled:true})
        
        //releasing doctor slot
        const {docId,slotDate,slotTime} = appointmentData;
        const docData = await doctorModel.findById(docId)

        let slots_booked = docData.slots_booked;

        slots_booked[slotDate] = slots_booked[slotDate].filter(e => e!==slotTime)

        await doctorModel.findByIdAndUpdate(docId,{slots_booked})

        res.json({success:true,message:"Appointment Cancelled"})
    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
    }
}

// Api to create stripe checkout session for appointment payment
const placeOrderStripe = async (req, res) => {
    try {
        const { userId } = req.user;
        const { appointmentId } = req.body;

        if (!process.env.STRIPE_SECRET_KEY) {
            return res.json({ success: false, message: 'Stripe is not configured on server' })
        }

        const appointmentData = await appointmentModel.findById(appointmentId)
        if (!appointmentData) {
            return res.json({ success: false, message: 'Appointment not found' })
        }

        if (appointmentData.userId !== userId) {
            return res.json({ success: false, message: 'Unauthorized action' })
        }

        if (appointmentData.cancelled || appointmentData.isCompleted) {
            return res.json({ success: false, message: 'This appointment cannot be paid online' })
        }

        if (appointmentData.payment) {
            return res.json({ success: false, message: 'Appointment is already paid' })
        }

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `Appointment with ${appointmentData.docData?.name || 'Doctor'}`,
                            description: `${appointmentData.slotDate} | ${appointmentData.slotTime}`
                        },
                        unit_amount: Math.round(appointmentData.amount * 100)
                    },
                    quantity: 1
                }
            ],
            metadata: {
                appointmentId: String(appointmentId),
                userId: String(userId)
            },
            success_url: `${frontendUrl}/my-appointments?session_id={CHECKOUT_SESSION_ID}&appointmentId=${appointmentId}`,
            cancel_url: `${frontendUrl}/my-appointments`
        })

        res.json({ success: true, sessionId: session.id, sessionUrl: session.url })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

// Api to verify stripe session and mark appointment as paid
const verifyStripe = async (req, res) => {
    try {
        const { userId } = req.user;
        const { sessionId, appointmentId } = req.body;

        if (!process.env.STRIPE_SECRET_KEY) {
            return res.json({ success: false, message: 'Stripe is not configured on server' })
        }

        const appointmentData = await appointmentModel.findById(appointmentId)
        if (!appointmentData) {
            return res.json({ success: false, message: 'Appointment not found' })
        }

        if (appointmentData.userId !== userId) {
            return res.json({ success: false, message: 'Unauthorized action' })
        }

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
        const session = await stripe.checkout.sessions.retrieve(sessionId)

        if (session.payment_status === 'paid') {
            await appointmentModel.findByIdAndUpdate(appointmentId, { payment: true })
            return res.json({ success: true, message: 'Payment successful' })
        }

        res.json({ success: false, message: 'Payment not completed' })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

export {registerUser, loginUser, getProfile, updateProfile, bookAppointment, listAppointment, cancelAppointment, placeOrderStripe, verifyStripe}