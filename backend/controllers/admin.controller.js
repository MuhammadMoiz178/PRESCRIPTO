import validator from "validator"
import brcrypt from "bcrypt"
import {v2 as cloudinary} from "cloudinary"
import doctorModel from "../models/doctor.model.js"
// Api for adding doctor
const addDoctor = async (req,res) => {
    try {
        const {name,email,password,speciality,degree,experience,about,fees,address} = req.body;         
        const imageFile = req.file

        // console.log({name,email,password,speciality,degree,experience,about,fees,address},imageFile);

        //checking for all data to add doctor
        if(!name || !email || !password || !speciality || !degree || !experience || !about || !fees || !address) {
            return res.json({success:false,message:"Missing Details"})
        }
        // Validating email format
        if(!validator.isEmail(email)) {
            return res.json({success:false,message:"Please enter a valid email"})
        }
        // validating strong password
        if(password.length<8) {
            return res.json({success:false,message:"Please enter a strong password"})
        }
        //hashing doctor password
        const salt = await brcrypt.genSalt(10)
        const hashedPassword = await brcrypt.hash(password,salt)

        //Upload Image to Cloudinary
        const imageUpload = await cloudinary.uploader.upload(imageFile.path,{resource_type:"image"})
        const imageUrl = imageUpload.secure_url

        const doctorData = {
            name,
            email,
            image:imageUrl,
            password:hashedPassword,
            speciality,
            degree,
            experience,
            about,
            fees,
            address:JSON.parse(address),
            date:Date.now()
        }

        const newDoctor = new doctorModel(doctorData)
        await newDoctor.save()

        res.json({success:true,message:"Doctor added"})
    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
    }
}

export {addDoctor}