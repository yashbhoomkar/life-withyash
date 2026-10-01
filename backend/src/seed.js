import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { seedInitialContent } from './seedData.js';

dotenv.config({ path: '../.env' });

async function seed() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DATABASE || 'personalwebsite',
  });
  await seedInitialContent();
  await mongoose.disconnect();
  console.log('Initial content is present in MongoDB.');
}

seed().catch(async (error) => {
  console.error('Database seeding failed:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});
