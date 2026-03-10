/* Integration test: approve leave endpoint using mongodb-memory-server */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const jwt = require('jsonwebtoken');

let mongod;
let app;

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

  // require app after mongoose connected (models will use the same connection)
  app = require('../app');
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

afterEach(async () => {
  const collections = await mongoose.connection.db.collections();
  for (let coll of collections) {
    await coll.deleteMany({});
  }
});

test('PUT /api/admin/leave/:id/approve approves a pending leave', async () => {
  const User = require('../models/User');
  const Faculty = require('../models/Faculty');
  const FacultyLeave = require('../models/FacultyLeave');

  // create admin user
  const admin = await User.create({ email: 'admin@test.com', password: 'password', name: 'Admin', role: 'admin' });

  // create faculty and leave
  const faculty = await Faculty.create({ facultyId: 'F001', name: 'Dr Test', email: 'f@test.com', department: 'CSE', designation: 'Assistant Professor' });

  const leave = await FacultyLeave.create({ faculty: faculty._id, startDate: new Date(), endDate: new Date(), leaveType: 'casual', reason: 'testing' });

  const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET);

  const res = await request(app)
    .put(`/api/admin/leave/${leave._id}/approve`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  expect(res.body.success).toBe(true);
  expect(res.body.data.status).toBe('approved');

  // verify in DB
  const updated = await FacultyLeave.findById(leave._id);
  expect(updated.status).toBe('approved');
});
