const { Clerk } = require('@clerk/clerk-sdk-node');

const clerk = Clerk({
  apiKey: process.env.CLERK_SECRET_KEY,
});

module.exports = clerk;