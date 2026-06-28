require('dotenv').config();
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const mongoose = require('mongoose');
const User = require('./models/User');

// Read from environment variables — NEVER hardcode credentials
const MONGO_URI = process.env.MONGO_URI;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'AdminLouay';

if (!MONGO_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('❌ Missing required environment variables.');
  console.error('   Set these in your .env file:');
  console.error('   MONGO_URI=mongodb+srv://...');
  console.error('   ADMIN_EMAIL=your@email.com');
  console.error('   ADMIN_PASSWORD=your_secure_password');
  console.error('   ADMIN_USERNAME=YourAdminName (optional, defaults to AdminLouay)');
  process.exit(1);
}

const setupAdmin = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    let user = await User.findOne({ email: ADMIN_EMAIL });

    if (user) {
      user.role = 'admin';
      user.password = ADMIN_PASSWORD; // pre-save hook will hash this
      await user.save();
      console.log(`✅ Success! Updated existing user (${ADMIN_EMAIL}) to Admin.`);
    } else {
      user = new User({
        username: ADMIN_USERNAME,
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD, // pre-save hook will hash this
        role: 'admin'
      });
      await user.save();
      console.log(`✅ Success! Created new Admin account for ${ADMIN_EMAIL}.`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up admin:', error.message);
    process.exit(1);
  }
};

setupAdmin();
