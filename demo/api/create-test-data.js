// Add test reservations with different users
const testUsers = [
  { uid: 'user1', email: 'john.doe@example.com', displayName: 'John Doe' },
  { uid: 'user2', email: 'jane.smith@example.com', displayName: 'Jane Smith' },
  { uid: 'user3', email: 'bob.wilson@example.com', displayName: 'Bob Wilson' },
  { uid: 'user4', email: 'alice.brown@example.com', displayName: 'Alice Brown' }
];

// Get some available cubicles
const availableCubicles = db.cubicles.find({status: 'available'}).limit(10).toArray();
print(`Found ${availableCubicles.length} available cubicles`);

let reservationCount = 0;

// User 1: 4 reservations
for (let i = 0; i < 4 && i < availableCubicles.length; i++) {
  const cubicle = availableCubicles[reservationCount];
  db.cubicles.updateOne({_id: cubicle._id}, {$set: {status: 'reserved'}});
  db.reservations.replaceOne(
    {cubicle: cubicle._id},
    {cubicle: cubicle._id, user: testUsers[0], date: new Date()},
    {upsert: true}
  );
  print(`Created reservation for ${testUsers[0].email} on cubicle ${cubicle.name}`);
  reservationCount++;
}

// User 2: 3 reservations
for (let i = 0; i < 3 && reservationCount < availableCubicles.length; i++) {
  const cubicle = availableCubicles[reservationCount];
  db.cubicles.updateOne({_id: cubicle._id}, {$set: {status: 'reserved'}});
  db.reservations.replaceOne(
    {cubicle: cubicle._id},
    {cubicle: cubicle._id, user: testUsers[1], date: new Date()},
    {upsert: true}
  );
  print(`Created reservation for ${testUsers[1].email} on cubicle ${cubicle.name}`);
  reservationCount++;
}

// User 3: 2 reservations
for (let i = 0; i < 2 && reservationCount < availableCubicles.length; i++) {
  const cubicle = availableCubicles[reservationCount];
  db.cubicles.updateOne({_id: cubicle._id}, {$set: {status: 'reserved'}});
  db.reservations.replaceOne(
    {cubicle: cubicle._id},
    {cubicle: cubicle._id, user: testUsers[2], date: new Date()},
    {upsert: true}
  );
  print(`Created reservation for ${testUsers[2].email} on cubicle ${cubicle.name}`);
  reservationCount++;
}

// User 4: 1 reservation
if (reservationCount < availableCubicles.length) {
  const cubicle = availableCubicles[reservationCount];
  db.cubicles.updateOne({_id: cubicle._id}, {$set: {status: 'reserved'}});
  db.reservations.replaceOne(
    {cubicle: cubicle._id},
    {cubicle: cubicle._id, user: testUsers[3], date: new Date()},
    {upsert: true}
  );
  print(`Created reservation for ${testUsers[3].email} on cubicle ${cubicle.name}`);
  reservationCount++;
}

// Set 2 cubicles to error status
const errorCubicles = db.cubicles.find({status: 'available'}).limit(2).toArray();
for (const cubicle of errorCubicles) {
  db.cubicles.updateOne({_id: cubicle._id}, {$set: {status: 'error'}});
  print(`Set cubicle ${cubicle.name} to error status`);
}

print(`✅ Test data created successfully!`);
print(`- Created ${reservationCount} reservations for ${testUsers.length} users`);
print(`- Set 2 cubicles to error status`);
