const mongoose = require('mongoose');
const config = require('./index');
const logger = require('../utils/logger');

mongoose.set('strictQuery', true);

const connect = async (uri = config.mongoUri) => {
    await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
    });
    logger.info('MongoDB connected');
    return mongoose.connection;
};

const disconnect = async () => {
    await mongoose.connection.close();
    logger.info('MongoDB disconnected');
};

const isConnected = () => mongoose.connection.readyState === 1;

module.exports = { connect, disconnect, isConnected };
