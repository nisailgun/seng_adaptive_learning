const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/learning_db';

const connectMongo = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ MongoDB Connection Successful');
        return mongoose.connection;
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        throw error;
    }
};

module.exports = { connectMongo, mongoose };
