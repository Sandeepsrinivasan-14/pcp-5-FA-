process.env.NODE_ENV = 'test';
process.env.JWT_SECRET =
    process.env.JWT_SECRET || 'test-secret-key-that-is-long-enough-for-validation';
process.env.SEED_DEMO_USERS = 'false';
process.env.CORS_ORIGINS = '*';

const mongoose = require('mongoose');

let mongoServer;

beforeAll(async () => {
    // CI supplies a real MongoDB service container via MONGODB_TEST_URI.
    // Locally we fall back to an ephemeral in-memory server, which downloads a
    // mongod binary on first use.
    let uri = process.env.MONGODB_TEST_URI;

    if (!uri) {
        // eslint-disable-next-line global-require
        const { MongoMemoryServer } = require('mongodb-memory-server');
        mongoServer = await MongoMemoryServer.create();
        uri = mongoServer.getUri();
    }

    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
});

afterEach(async () => {
    // Every test starts from an empty database, so ordering never matters.
    const { collections } = mongoose.connection;
    await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
    }
    if (mongoServer) await mongoServer.stop();
});
