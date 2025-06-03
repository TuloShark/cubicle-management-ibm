const mongoose = require('mongoose');
const Cubicle = require('./models/Cubicle');
const Reservation = require('./models/Reservation');

// Test users
const testUsers = [
  { uid: 'user1', email: 'john.doe@example.com', displayName: 'John Doe' },
  { uid: 'user2', email: 'jane.smith@example.com', displayName: 'Jane Smith' },
  { uid: 'user3', email: 'bob.wilson@example.com', displayName: 'Bob Wilson' },
  { uid: 'user4', email: 'alice.brown@example.com', displayName: 'Alice Brown' },
  { uid: 'user5', email: 'charlie.davis@example.com', displayName: 'Charlie Davis' }
];

async function createTestData() {
  try {
    console.log('Starting test data creation...');
    
    // Use the correct database name and connection
    const mongoUri = 'mongodb://localhost:27017/demo';
    console.log('MongoDB URI:', mongoUri);
    
    // Connect to MongoDB
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Get available cubicles
    const allCubicles = await Cubicle.find();
    console.log(`Total cubicles in database: ${allCubicles.length}`);
    
    const availableCubicles = await Cubicle.find({ status: 'available' }).limit(15);
    console.log(`Found ${availableCubicles.length} available cubicles`);
    
    // Debug: check status distribution
    const statusCounts = {};
    allCubicles.forEach(c => {
      statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
    });
    console.log('Status distribution:', statusCounts);
    
    if (availableCubicles.length < 10) {
      console.log('Not enough available cubicles for testing');
      return;
    }
    
    // Create reservations for different users
    let reservationCount = 0;
    
    // User 1: 4 reservations
    for (let i = 0; i < 4 && i < availableCubicles.length; i++) {
      const cubicle = availableCubicles[reservationCount];
      await Cubicle.findByIdAndUpdate(cubicle._id, { status: 'reserved' });
      await Reservation.findOneAndUpdate(
        { cubicle: cubicle._id },
        { 
          cubicle: cubicle._id, 
          user: testUsers[0], 
          date: new Date() 
        },
        { upsert: true, new: true }
      );
      console.log(`Created reservation for ${testUsers[0].email} on cubicle ${cubicle.name}`);
      reservationCount++;
    }
    
    // User 2: 3 reservations
    for (let i = 0; i < 3 && reservationCount < availableCubicles.length; i++) {
      const cubicle = availableCubicles[reservationCount];
      await Cubicle.findByIdAndUpdate(cubicle._id, { status: 'reserved' });
      await Reservation.findOneAndUpdate(
        { cubicle: cubicle._id },
        { 
          cubicle: cubicle._id, 
          user: testUsers[1], 
          date: new Date() 
        },
        { upsert: true, new: true }
      );
      console.log(`Created reservation for ${testUsers[1].email} on cubicle ${cubicle.name}`);
      reservationCount++;
    }
    
    // User 3: 2 reservations
    for (let i = 0; i < 2 && reservationCount < availableCubicles.length; i++) {
      const cubicle = availableCubicles[reservationCount];
      await Cubicle.findByIdAndUpdate(cubicle._id, { status: 'reserved' });
      await Reservation.findOneAndUpdate(
        { cubicle: cubicle._id },
        { 
          cubicle: cubicle._id, 
          user: testUsers[2], 
          date: new Date() 
        },
        { upsert: true, new: true }
      );
      console.log(`Created reservation for ${testUsers[2].email} on cubicle ${cubicle.name}`);
      reservationCount++;
    }
    
    // User 4: 1 reservation
    if (reservationCount < availableCubicles.length) {
      const cubicle = availableCubicles[reservationCount];
      await Cubicle.findByIdAndUpdate(cubicle._id, { status: 'reserved' });
      await Reservation.findOneAndUpdate(
        { cubicle: cubicle._id },
        { 
          cubicle: cubicle._id, 
          user: testUsers[3], 
          date: new Date() 
        },
        { upsert: true, new: true }
      );
      console.log(`Created reservation for ${testUsers[3].email} on cubicle ${cubicle.name}`);
      reservationCount++;
    }
    
    // Set a couple cubicles to error status for testing
    const errorCubicles = await Cubicle.find({ status: 'available' }).limit(2);
    for (const cubicle of errorCubicles) {
      await Cubicle.findByIdAndUpdate(cubicle._id, { status: 'error' });
      console.log(`Set cubicle ${cubicle.name} to error status`);
    }
    
    console.log(`✅ Test data created successfully!`);
    console.log(`- Created ${reservationCount} reservations for ${testUsers.length - 1} users`);
    console.log(`- Set 2 cubicles to error status`);
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('Error creating test data:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  createTestData().then(() => {
    console.log('Test data creation completed');
    process.exit(0);
  });
}

module.exports = { createTestData };
