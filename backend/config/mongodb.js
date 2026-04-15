import mongoose from "mongoose";

const buildMongoUri = () => {
    const rawUri = process.env.MONGODB_URI;

    if (!rawUri) {
        throw new Error('MONGODB_URI is missing');
    }

    // If a db name already exists in URI, use it as-is.
    const hasDbName = /mongodb(?:\+srv)?:\/\/[^/]+\/[^?]+/.test(rawUri);
    if (hasDbName) {
        return rawUri;
    }

    const dbName = process.env.MONGODB_DB_NAME || 'prescripto';
    const [base, query] = rawUri.split('?');
    const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;

    return query
        ? `${normalizedBase}/${dbName}?${query}`
        : `${normalizedBase}/${dbName}`;
}

const connectDb = async () => {
    try {
        mongoose.connection.on('connected', () => console.log("Database Connected"))
        mongoose.connection.on('error', (err) => console.error('MongoDB connection error:', err.message))
        mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'))

        const mongoUri = buildMongoUri();
        await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 15000,
        })

        return mongoose.connection;
    } catch (error) {
        console.error(error.message);
        throw error;
    }
}

export default connectDb