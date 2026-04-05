import jwt from "jsonwebtoken"

//user authentication middleware
const authUser = async (req,res,next) => {
    try {
        const {token} = req.headers
        if(!token) {
            return res.json({success:false,message:"Not authorized, Login Again"})
        }
        const tokenDecode = jwt.verify(token,process.env.JWT_SECRET)
        req.user = { userId: tokenDecode.id }
        next();
    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
    }
}

export default authUser


