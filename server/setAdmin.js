require('dotenv').config();
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const MONGO_URI = 'mongodb+srv://okinamo:frivE%40789456123@cluster0.1hdwciy.mongodb.net/lunaranime?appName=Cluster0';

const setupAdmin = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const email = 'louayhamdi438@gmail.com';
    const password = 'frivE789456123';
    const username = 'AdminLouay';

    let user = await User.findOne({ email });

    if (user) {
      user.role = 'admin';
      const salt = await bcrypt.genSalt(12);
      user.password = await bcrypt.hash(password, salt);
      // We use save() but since pre-save hooks hash it again, we need to bypass it or not manually hash it here.
      // Wait, in User.js we have:
      // userSchema.pre('save', async function () {
      //   if (!this.isModified('password')) return;
      //   const salt = await bcrypt.genSalt(12);
      //   this.password = await bcrypt.hash(this.password, salt);
      // });
      // So we just set the plaintext password and let pre-save handle it.
      user.password = password;
      await user.save();
      console.log(`✅ Success! Updated existing user (${email}) to Admin and updated password.`);
    } else {
      user = new User({
        username,
        email,
        password, // pre-save will hash this
        role: 'admin'
      });
      await user.save();
      console.log(`✅ Success! Created new Admin account for ${email}.`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up admin:', error.message);
    process.exit(1);
  }
};

setupAdmin();
