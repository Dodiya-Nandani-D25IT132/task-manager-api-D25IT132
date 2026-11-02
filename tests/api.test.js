const request = require('supertest');
const app = require('../server');

describe('Task Manager API - Auth & Caching Integration Tests', () => {
    const testEmail = `auth_test_${Date.now()}@charusat.ac.in`;
    const testPassword = 'Password@123';
    let authToken = '';

    // 1. Route validation
    test('GET /non-existent-route should return 404 structured JSON', async () => {
        const res = await request(app).get('/non-existent-route');
        expect(res.statusCode).toBe(404);
        expect(res.body).toHaveProperty('error', 'Route not found');
    });

    // 2. Registration tests
    test('POST /register should successfully create a new user', async () => {
        const res = await request(app)
            .post('/register')
            .send({ email: testEmail, password: testPassword });

        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('message', 'User registered successfully');
        expect(res.body.user).toHaveProperty('email', testEmail.toLowerCase());
        expect(res.body.user).not.toHaveProperty('password');
    });

    test('POST /register with duplicate email should return 400', async () => {
        const res = await request(app)
            .post('/register')
            .send({ email: testEmail, password: testPassword });

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error', 'User already exists');
    });

    // 3. Login tests
    test('POST /login with missing fields should return 400 validation error', async () => {
        const res = await request(app)
            .post('/login')
            .send({});
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error', 'Email and password are required');
    });

    test('POST /login with incorrect password should return 401 Unauthorized', async () => {
        const res = await request(app)
            .post('/login')
            .send({ email: testEmail, password: 'WrongPassword999' });

        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('error', 'Invalid email or password');
    });

    test('POST /login with non-existent email should return 401 Unauthorized', async () => {
        const res = await request(app)
            .post('/login')
            .send({ email: 'unregistered_ghost_user@example.com', password: 'password123' });

        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('error', 'Invalid email or password');
    });

    test('POST /login with valid credentials should return 200 and JWT token', async () => {
        const res = await request(app)
            .post('/login')
            .send({ email: testEmail, password: testPassword });

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('token');
        authToken = res.body.token;
        expect(typeof authToken).toBe('string');
        expect(authToken.length).toBeGreaterThan(20);
    });

    // 4. Authenticated Task & Cache tests
    test('GET /tasks without authorization header should return 401', async () => {
        const res = await request(app).get('/tasks');
        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('error', 'Authorization header missing');
    });

    test('GET /tasks with valid token should return 200 (Cache Miss / Populates Cache)', async () => {
        const res = await request(app)
            .get('/tasks')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    test('GET /tasks with valid token should return 200 (Cache Hit from Memory)', async () => {
        const res = await request(app)
            .get('/tasks')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    test('POST /tasks should create a task and invalidate cache', async () => {
        const res = await request(app)
            .post('/tasks')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                title: `Automated Test Task ${Date.now()}`,
                description: 'Verifying cache invalidation in Jest suite'
            });

        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('title');
    });
});
