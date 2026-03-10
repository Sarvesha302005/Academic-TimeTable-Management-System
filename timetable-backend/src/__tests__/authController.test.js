const authController = require('../controllers/authController');
const User = require('../models/User');
const Faculty = require('../models/Faculty');
const httpMocks = require('node-mocks-http');

// Mock models
jest.mock('../models/User');
jest.mock('../models/Faculty');

describe('Auth Controller', () => {
    let req, res, next;

    beforeEach(() => {
        req = httpMocks.createRequest();
        res = httpMocks.createResponse();
        next = jest.fn();
        process.env.JWT_SECRET = 'test_secret';
        process.env.JWT_EXPIRE = '1h';
        jest.clearAllMocks();
    });

    // --- SUCCESS CASES ---

    describe('register', () => {
        it('should register a new student successfully', async () => {
            req.body = {
                email: 'student@test.com',
                password: 'password123',
                name: 'Student Name',
                role: 'student',
                studentId: 'S123',
                year: 1,
                section: 'A'
            };

            User.findOne.mockResolvedValue(null);
            User.create.mockResolvedValue({
                _id: 'user_id_123',
                ...req.body,
                role: 'student'
            });

            await authController.register(req, res, next);

            expect(res.statusCode).toBe(201);
            expect(res._getJSONData().success).toBe(true);
            expect(User.create).toHaveBeenCalled();
        });

        it('should register a new faculty successfully', async () => {
            req.body = {
                email: 'faculty@test.com',
                password: 'password123',
                name: 'Faculty Name',
                role: 'faculty',
                facultyId: 'F123',
                department: 'CSE',
                designation: 'Professor'
            };

            User.findOne.mockResolvedValue(null);
            User.create.mockResolvedValue({
                _id: 'user_id_456',
                ...req.body
            });
            Faculty.create.mockResolvedValue({});

            await authController.register(req, res, next);

            expect(res.statusCode).toBe(201);
            expect(Faculty.create).toHaveBeenCalled();
        });
    });

    describe('login', () => {
        it('should login successfully with valid credentials', async () => {
            req.body = { email: 'test@test.com', password: 'password123' };
            const mockUser = {
                _id: 'user_id_123',
                email: 'test@test.com',
                password: 'hashedPassword',
                isActive: true,
                comparePassword: jest.fn().mockResolvedValue(true)
            };

            // Mock findOne to return a query object with select
            const mockQuery = { select: jest.fn().mockResolvedValue(mockUser) };
            User.findOne.mockReturnValue(mockQuery);

            await authController.login(req, res, next);

            expect(res.statusCode).toBe(200);
            expect(res._getJSONData().token).toBeDefined();
        });
    });

    describe('getMe', () => {
        it('should return current user profile', async () => {
            req.user = { _id: 'user_id_123' };
            User.findById.mockResolvedValue({ _id: 'user_id_123', name: 'Test User' });

            await authController.getMe(req, res, next);

            expect(res.statusCode).toBe(200);
            expect(res._getJSONData().user.name).toBe('Test User');
        });
    });

    describe('updateProfile', () => {
        it('should update user profile successfully', async () => {
            req.user = { _id: 'user_id_123', role: 'student' };
            req.body = { name: 'Updated Name', year: 2 };

            User.findByIdAndUpdate.mockResolvedValue({ _id: 'user_id_123', name: 'Updated Name', year: 2 });

            await authController.updateProfile(req, res, next);

            expect(res.statusCode).toBe(200);
            expect(res._getJSONData().user.name).toBe('Updated Name');
        });
    });

    // --- FAILURE CASES ---

    describe('register (failure)', () => {
        it('should fail if user already exists', async () => {
            req.body = { email: 'existing@test.com' };
            User.findOne.mockResolvedValue({ email: 'existing@test.com' });

            await authController.register(req, res, next);

            expect(res.statusCode).toBe(400);
            expect(res._getJSONData().error).toBe('User already exists with this email');
        });
    });

    describe('login (failure)', () => {
        it('should fail if email or password missing', async () => {
            req.body = { email: 'test@test.com' }; // Missing password

            await authController.login(req, res, next);

            expect(res.statusCode).toBe(400);
        });

        it('should fail if user not found', async () => {
            req.body = { email: 'notfound@test.com', password: 'pass' };
            const mockQuery = { select: jest.fn().mockResolvedValue(null) };
            User.findOne.mockReturnValue(mockQuery);

            await authController.login(req, res, next);

            expect(res.statusCode).toBe(401);
        });

        it('should fail if invalid password', async () => {
            req.body = { email: 'test@test.com', password: 'wrong' };
            const mockUser = {
                isActive: true,
                comparePassword: jest.fn().mockResolvedValue(false)
            };
            const mockQuery = { select: jest.fn().mockResolvedValue(mockUser) };
            User.findOne.mockReturnValue(mockQuery);

            await authController.login(req, res, next);

            expect(res.statusCode).toBe(401);
        });

        it('should fail if account is disabled', async () => {
            req.body = { email: 'disabled@test.com', password: 'pass' };
            const mockUser = {
                isActive: false
            };
            const mockQuery = { select: jest.fn().mockResolvedValue(mockUser) };
            User.findOne.mockReturnValue(mockQuery);

            await authController.login(req, res, next);

            expect(res.statusCode).toBe(401);
            expect(res._getJSONData().error).toContain('Account is disabled');
        });
    });
});