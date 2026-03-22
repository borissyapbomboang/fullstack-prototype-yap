const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'your-very-secure-secret';

// ─── FIX 1: CORS — was 'https://' (wrong), must be 'http://' ─────────────────
app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500']
}));

app.use(express.json());

// ─── USERS (in-memory) ────────────────────────────────────────────────────────
let users = [
    {
        id: 1,
        username: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@test.com',
        password: '...',
        role: 'admin',
        verified: true,
        createdAt: new Date().toISOString()
    },
    {
        id: 2,
        username: 'alice',
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@test.com',
        password: '...',
        role: 'user',
        verified: true,
        createdAt: new Date().toISOString()
    }
];

// Hash passwords on startup if not already hashed
if (!users[0].password.startsWith('$2a$')) {
    users[0].password = bcrypt.hashSync('admin123', 10);
    users[1].password = bcrypt.hashSync('alice123', 10);
}


// ─── REGISTER ────────────────────────────────────────────────────────────────
app.post('/api/register', async (req, res) => {
    const { firstName, lastName, email, password, role = 'user' } = req.body;

    // Validate required fields (no username needed — email is the identifier)
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!firstName || !lastName) {
        return res.status(400).json({ error: 'First name and last name are required' });
    }

    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
        return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
        id: users.length + 1,
        username: email,   // use email as username internally
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role,
        verified: false,
        createdAt: new Date().toISOString()
    };
    users.push(newUser);
    res.status(201).json({ message: 'User registered successfully' });
});


// ─── VERIFY EMAIL ─────────────────────────────────────────────────────────────
app.post('/api/verify-email', (req, res) => {
    const { email } = req.body;
    const user = users.find(u => u.email === email);

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    user.verified = true;
    res.json({ message: 'Email verified successfully' });
});


// ─── LOGIN ────────────────────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    // username field accepts either email or username
    const user = users.find(u => u.email === username || u.username === username);

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.verified) {
        return res.status(403).json({ error: 'Please verify your email first' });
    }

    const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, SECRET_KEY, { expiresIn: '1h' });

    res.json({
        token,
        user: {
            id: user.id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            verified: user.verified,
            createdAt: user.createdAt
        }
    });
});


// ─── LOGOUT ───────────────────────────────────────────────────────────────────
app.post('/api/logout', authenticateToken, (req, res) => {
    // JWT is stateless — client just drops the token
    res.json({ message: 'Logged out successfully' });
});


// ─── PROFILE ──────────────────────────────────────────────────────────────────
app.get('/api/profile', authenticateToken, (req, res) => {
    const user = users.find(u => u.id === req.user.id || u.email === req.user.email);
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        verified: user.verified,
        createdAt: user.createdAt
    });
});


// ─── ADMIN DASHBOARD ──────────────────────────────────────────────────────────
app.get('/api/admin/dashboard', authenticateToken, authorizeRole('admin'), (req, res) => {
    res.json({ message: 'Welcome to the admin dashboard!', data: 'Secret admin info' });
});


// ─── EMPLOYEES (admin only) ───────────────────────────────────────────────────
app.get('/api/employees', authenticateToken, authorizeRole('admin'), (req, res) => {
    const employees = users
        .filter(u => u.verified)
        .map(({ password, ...u }) => u); // strip passwords
    res.json(employees);
});


// ─── ACCOUNTS (admin only) ────────────────────────────────────────────────────
app.get('/api/accounts', authenticateToken, authorizeRole('admin'), (req, res) => {
    const accounts = users.map(({ password, ...u }) => u);
    res.json(accounts);
});


// ─── DEPARTMENTS ──────────────────────────────────────────────────────────────
let departments = [
    { id: 'dept_1', name: 'Human Resources', head: 'Sarah Johnson', employeeCount: 12, createdAt: new Date().toISOString() },
    { id: 'dept_2', name: 'Engineering', head: 'Michael Chen', employeeCount: 45, createdAt: new Date().toISOString() },
    { id: 'dept_3', name: 'Sales', head: 'Emily Rodriguez', employeeCount: 28, createdAt: new Date().toISOString() }
];

app.get('/api/departments', authenticateToken, (req, res) => {
    res.json(departments);
});

app.post('/api/departments', authenticateToken, authorizeRole('admin'), (req, res) => {
    const dept = { ...req.body, createdAt: new Date().toISOString() };
    departments.push(dept);
    res.status(201).json(dept);
});

app.delete('/api/departments/:id', authenticateToken, authorizeRole('admin'), (req, res) => {
    departments = departments.filter(d => d.id !== req.params.id);
    res.json({ message: 'Department deleted' });
});


// ─── REQUESTS ─────────────────────────────────────────────────────────────────
let requests = [];

app.get('/api/requests', authenticateToken, (req, res) => {
    // Users see only their own; admins see all
    const result = req.user.role === 'admin'
        ? requests
        : requests.filter(r => r.userEmail === req.user.email);
    res.json(result);
});

app.post('/api/requests', authenticateToken, (req, res) => {
    const newReq = { ...req.body, status: 'Pending', createdAt: new Date().toISOString() };
    requests.push(newReq);
    res.status(201).json(newReq);
});

app.patch('/api/requests/:id', authenticateToken, authorizeRole('admin'), (req, res) => {
    const request = requests.find(r => r.id === req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    request.status = req.body.status;
    res.json(request);
});


// ─── GUEST CONTENT ────────────────────────────────────────────────────────────
app.get('/api/content/guest', (req, res) => {
    res.json({ message: 'Welcome, guest! This content is public.' });
});


// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

function authorizeRole(role) {
    return (req, res, next) => {
        if (req.user.role !== role) {
            return res.status(403).json({ error: 'Access denied: insufficient permissions' });
        }
        next();
    };
}


// ─── START ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\nBackend running on http://localhost:${PORT}`);
    console.log('─────────────────────────────────────');
    console.log('Admin:  username: admin  password: admin123');
    console.log('User:   username: alice  password: alice123');
    console.log('─────────────────────────────────────\n');
});