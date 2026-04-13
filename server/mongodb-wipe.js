const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/lunaranime')
.then(async () => {
   const db = mongoose.connection.db;
   
   // Hard wipe of everything
   await db.collection('users').deleteMany({});
   await db.collection('watchhistories').deleteMany({});
   await db.collection('watchlists').deleteMany({});
   await db.collection('tokens').deleteMany({}); // in case jwt tokens are stored
   
   console.log('Completely wiped all accounts and history as requested!');
   process.exit(0);
}).catch(e => {
   console.error('DB Error:', e);
   process.exit(1);
});
