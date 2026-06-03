const mongoose = require('mongoose');

const uri = "mongodb+srv://sndpsrinivasan_db_user:JUTkrJThrkgjbBev@clusterpcp5fa.qtor6gh.mongodb.net/placement_db?retryWrites=true&w=majority&appName=Clusterpcp5FA";

async function testDb() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(uri);
        console.log('Connected!');
        
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections in database:');
        for (const col of collections) {
            const count = await mongoose.connection.db.collection(col.name).countDocuments();
            console.log(`- ${col.name}: ${count} documents`);
            if (count > 0) {
                const sample = await mongoose.connection.db.collection(col.name).findOne();
                console.log(`  Sample:`, JSON.stringify(sample, null, 2));
            }
        }
        
        await mongoose.disconnect();
        console.log('Disconnected.');
    } catch (error) {
        console.error('Database connection error:', error.message);
    }
}

testDb();
