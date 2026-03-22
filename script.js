window.db = {
    accounts: JSON.parse(localStorage.getItem('accounts')) || [],
    departments: JSON.parse(localStorage.getItem('departments')) || [],
    requests: JSON.parse(localStorage.getItem('requests')) || [],
    
    saveAccounts() {
        localStorage.setItem('accounts', JSON.stringify(this.accounts));
    },
    
    saveDepartments() {
        localStorage.setItem('departments', JSON.stringify(this.departments));
    },
    
    saveRequests() {
        localStorage.setItem('requests', JSON.stringify(this.requests));
    },
    
    findAccount(email) {
        return this.accounts.find(acc => acc.email === email);
    },
    
    addAccount(account) {
        this.accounts.push(account);
        this.saveAccounts();
    },
    
    updateAccount(email, updates) {
        const account = this.findAccount(email);
        if (account) {
            Object.assign(account, updates);
            this.saveAccounts();
        }
    },
    
    addDepartment(department) {
        this.departments.push(department);
        this.saveDepartments();
    },
    
    deleteDepartment(id) {
        this.departments = this.departments.filter(dept => dept.id !== id);
        this.saveDepartments();
    },
    
    addRequest(request) {
        this.requests.push(request);
        this.saveRequests();
    },
    
    updateRequest(id, updates) {
        const request = this.requests.find(req => req.id === id);
        if (request) {
            Object.assign(request, updates);
            this.saveRequests();
        }
    }
};

let currentUser = null;


// ─── AUTH HEADER HELPER ───────────────────────────────────────────────────────

function getAuthHeader() {
    const token = sessionStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── ADMIN DASHBOARD ─────────────────────────────────────────────────────────

async function loadAdminDashboard() {
    const content = document.getElementById('adminDashboardContent');
    content.innerHTML = `<p style="color:#888">Loading dashboard...</p>`;

    // Fetch all data in parallel
    let dashData = { message: '', data: '' };
    let employees = [];
    let departments = [];
    let requests = [];
    let accounts = [];

    try {
        const [dashRes, empRes, deptRes, reqRes, accRes] = await Promise.all([
            fetch('http://localhost:3000/api/admin/dashboard', { headers: getAuthHeader() }),
            fetch('http://localhost:3000/api/employees',        { headers: getAuthHeader() }),
            fetch('http://localhost:3000/api/departments',      { headers: getAuthHeader() }),
            fetch('http://localhost:3000/api/requests',         { headers: getAuthHeader() }),
            fetch('http://localhost:3000/api/accounts',         { headers: getAuthHeader() })
        ]);
        if (dashRes.ok) dashData    = await dashRes.json();
        if (empRes.ok)  employees   = await empRes.json();
        if (deptRes.ok) departments = await deptRes.json();
        if (reqRes.ok)  requests    = await reqRes.json();
        if (accRes.ok)  accounts    = await accRes.json();
    } catch (err) {
        console.warn('API unavailable, using local data.');
        employees   = window.db.accounts.filter(a => a.verified);
        departments = window.db.departments;
        requests    = window.db.requests;
        accounts    = window.db.accounts;
    }

    const totalUsers    = accounts.length;
    const verifiedUsers = accounts.filter(a => a.verified).length;
    const pendingReqs   = requests.filter(r => r.status === 'Pending').length;
    const approvedReqs  = requests.filter(r => r.status === 'Approved').length;

    content.innerHTML = `
        <!-- Welcome banner -->
        <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); color: white;
                    padding: 24px 28px; border-radius: 10px; margin-bottom: 28px;">
            <h2 style="margin:0 0 6px; font-size:22px;">👋 Welcome back, ${currentUser.firstName}!</h2>
            <p style="margin:0; opacity:.75; font-size:14px;">${dashData.message || 'Here\'s what\'s happening today.'}</p>
        </div>

        <!-- Stat cards -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap:16px; margin-bottom:28px;">
            ${statCard('👥', 'Total Accounts', totalUsers, '#4361ee')}
            ${statCard('✅', 'Verified Users', verifiedUsers, '#2ec4b6')}
            ${statCard('🏢', 'Departments', departments.length, '#ff9f1c')}
            ${statCard('🕐', 'Pending Requests', pendingReqs, '#e71d36')}
            ${statCard('✔️', 'Approved Requests', approvedReqs, '#2dc653')}
            ${statCard('👷', 'Employees', employees.length, '#9b5de5')}
        </div>

        <!-- Quick links -->
        <div style="margin-bottom:28px;">
            <h3 style="margin:0 0 12px; font-size:15px; color:#555;">Quick Actions</h3>
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
                ${quickBtn('👤 Manage Accounts',    '#/accounts')}
                ${quickBtn('🏢 Manage Departments', '#/departments')}
                ${quickBtn('👷 View Employees',     '#/employees')}
            </div>
        </div>

        <!-- Recent requests table -->
        <div>
            <h3 style="margin:0 0 12px; font-size:15px; color:#555;">Recent Requests</h3>
            ${requests.length === 0
                ? `<p style="color:#aaa; font-size:14px;">No requests submitted yet.</p>`
                : `<table>
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Type</th>
                            <th>Description</th>
                            <th>Status</th>
                            <th>Submitted</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${requests.slice(-10).reverse().map(req => `
                            <tr>
                                <td>${req.userName || req.userEmail}</td>
                                <td>${req.type}</td>
                                <td style="max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${req.description}</td>
                                <td>${statusBadge(req.status)}</td>
                                <td>${new Date(req.createdAt).toLocaleDateString()}</td>
                                <td>
                                    ${req.status === 'Pending' ? `
                                        <button onclick="updateRequestStatus('${req.id}', 'Approved')"
                                            style="padding:4px 10px; background:#2dc653; color:white; border:none; border-radius:4px; cursor:pointer; margin-right:4px; font-size:12px;">
                                            Approve
                                        </button>
                                        <button onclick="updateRequestStatus('${req.id}', 'Rejected')"
                                            style="padding:4px 10px; background:#e71d36; color:white; border:none; border-radius:4px; cursor:pointer; font-size:12px;">
                                            Reject
                                        </button>
                                    ` : '—'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>`
            }
        </div>
    `;
}

function statCard(icon, label, value, color) {
    return `
        <div style="background:white; border:1px solid #eee; border-radius:10px;
                    padding:20px 16px; text-align:center; box-shadow:0 2px 8px rgba(0,0,0,.05);">
            <div style="font-size:26px; margin-bottom:6px;">${icon}</div>
            <div style="font-size:28px; font-weight:700; color:${color};">${value}</div>
            <div style="font-size:12px; color:#888; margin-top:4px;">${label}</div>
        </div>`;
}

function quickBtn(label, href) {
    return `<a href="${href}" style="padding:10px 18px; background:#f0f4ff; color:#4361ee;
                border:1px solid #c7d2fe; border-radius:8px; text-decoration:none;
                font-size:14px; font-weight:500;">${label}</a>`;
}

function statusBadge(status) {
    const styles = {
        Pending:  'background:#fff3cd; color:#856404;',
        Approved: 'background:#d4edda; color:#155724;',
        Rejected: 'background:#f8d7da; color:#721c24;'
    };
    return `<span style="padding:3px 10px; border-radius:12px; font-size:12px;
                font-weight:bold; ${styles[status] || ''}">${status}</span>`;
}

async function updateRequestStatus(id, status) {
    try {
        const res = await fetch(`http://localhost:3000/api/requests/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify({ status })
        });
        if (!res.ok) throw new Error();
    } catch (err) {
        // Fallback: update locally
        window.db.updateRequest(id, { status });
    }
    loadAdminDashboard();
}


// ─── ROUTING ────────────────────────────────────────────────────────────────

function navigateTo(hash) {
    window.location.hash = hash;
}

function handleRouting() {
    const hash = window.location.hash || '#/';
    const route = hash.substring(2);
    
    const protectedRoutes = ['profile', 'requests', 'employees', 'departments', 'accounts', 'admin-dashboard'];
    const adminRoutes = ['employees', 'departments', 'accounts', 'admin-dashboard'];
    
    if (protectedRoutes.includes(route) && !currentUser) {
        navigateTo('#/login');
        return;
    }
    
    if (adminRoutes.includes(route) && (!currentUser || currentUser.role !== 'admin')) {
        navigateTo('#/profile');
        return;
    }
    
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    let pageId = route ? `${route}-page` : 'home-page';
    const targetPage = document.getElementById(pageId);
    
    if (targetPage) {
        targetPage.classList.add('active');
        loadPageContent(route);
    } else {
        document.getElementById('home-page').classList.add('active');
    }
}

function loadPageContent(route) {
    switch(route) {
        case 'admin-dashboard':
            loadAdminDashboard();
            break;
        case 'profile':
            loadProfile();
            break;
        case 'employees':
            loadEmployees();
            break;
        case 'accounts':
            loadAccounts();
            break;
        case 'departments':
            loadDepartments();
            break;
        case 'requests':
            loadRequests();
            break;
    }
}

function setAuthState(isAuth, user = null) {
    currentUser = user;
    const body = document.body;
    
    if (isAuth) {
        body.classList.remove('not-authenticated');
        body.classList.add('authenticated');
        
        if (user && user.role === 'admin') {
            body.classList.add('is-admin');
        } else {
            body.classList.remove('is-admin');
        }
    } else {
        body.classList.remove('authenticated', 'is-admin');
        body.classList.add('not-authenticated');
    }
}

function showDashboard(user) {
    setAuthState(true, user);
    applyRoleUI(user);
    // Admins land on the admin dashboard, regular users on profile
    if (user && user.role === 'admin') {
        navigateTo('#/admin-dashboard');
    } else {
        navigateTo('#/profile');
    }
}

// ─── ROLE-BASED UI ────────────────────────────────────────────────────────────

/**
 * Show or hide elements based on the user's role.
 * In your HTML, mark admin-only elements with:   data-role="admin"
 * Mark auth-only elements with:                  data-role="user"
 * Elements with neither attribute are always shown.
 */
function applyRoleUI(user) {
    const isAdmin = user && user.role === 'admin';
    const isLoggedIn = !!user;

    // Admin-only elements (e.g. Admin Dashboard button, nav links)
    document.querySelectorAll('[data-role="admin"]').forEach(el => {
        el.style.display = isAdmin ? '' : 'none';
    });

    // Auth-only elements (visible to any logged-in user)
    document.querySelectorAll('[data-role="user"]').forEach(el => {
        el.style.display = isLoggedIn ? '' : 'none';
    });

    // Guest-only elements (visible only when NOT logged in)
    document.querySelectorAll('[data-role="guest"]').forEach(el => {
        el.style.display = isLoggedIn ? 'none' : '';
    });
}

// ─── CHECK AUTH ON LOAD ───────────────────────────────────────────────────────

async function checkAuthOnLoad() {
    const authToken = sessionStorage.getItem('authToken');

    if (!authToken) {
        // No token — treat as guest
        applyRoleUI(null);
        return;
    }

    // 1. Try calling /api/profile with the stored token
    try {
        const res = await fetch('http://localhost:3000/api/profile', {
            headers: getAuthHeader()
        });

        if (res.ok) {
            const user = await res.json();
            // Token is valid — restore session from server data
            setAuthState(true, user);
            applyRoleUI(user);
            return;
        }

        // Token rejected by server — clear it and fall through
        sessionStorage.removeItem('authToken');
        applyRoleUI(null);
        return;

    } catch (err) {
        // 2. API unreachable — fall back to local DB lookup
        console.warn('API unavailable, falling back to local session restore.');
        const user = window.db.findAccount(authToken);

        if (user && user.verified) {
            setAuthState(true, user);
            applyRoleUI(user);
        } else {
            sessionStorage.removeItem('authToken');
            applyRoleUI(null);
        }
    }
}


// ─── REGISTER ────────────────────────────────────────────────────────────────

async function handleRegister(e) {
    e.preventDefault();
    
    const firstName = document.getElementById('registerFirstName').value;
    const lastName = document.getElementById('registerLastName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    
    if (password.length < 6) {
        alert('Password must be at least 6 characters!');
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstName, lastName, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Also save locally as fallback
            if (!window.db.findAccount(email)) {
                window.db.addAccount({
                    firstName,
                    lastName,
                    email,
                    password,
                    verified: false,
                    role: 'user',
                    createdAt: new Date().toISOString()
                });
            }

            localStorage.setItem('unverified_email', email);
            navigateTo('#/verify-email');
        } else {
            alert('Registration failed: ' + data.error);
        }
    } catch (err) {
        // Fallback: local-only registration
        console.warn('API unavailable, falling back to local registration.');

        if (window.db.findAccount(email)) {
            alert('Email already exists! Please login.');
            return;
        }

        window.db.addAccount({
            firstName,
            lastName,
            email,
            password,
            verified: false,
            role: 'user',
            createdAt: new Date().toISOString()
        });

        localStorage.setItem('unverified_email', email);
        navigateTo('#/verify-email');
    }
}


// ─── VERIFY EMAIL ─────────────────────────────────────────────────────────────

function loadVerifyEmailPage() {
    const email = localStorage.getItem('unverified_email');
    if (email) {
        document.getElementById('verifyEmailDisplay').textContent = email;
    }
}

async function handleSimulateVerify() {
    const email = localStorage.getItem('unverified_email');
    
    if (!email) {
        alert('No email to verify!');
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/verify-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (response.ok) {
            window.db.updateAccount(email, { verified: true });
            localStorage.removeItem('unverified_email');
            alert('Email verified successfully! You can now login.');
            navigateTo('#/login');
        } else {
            alert('Verification failed: ' + data.error);
        }
    } catch (err) {
        // Fallback: local verification
        console.warn('API unavailable, falling back to local verification.');
        window.db.updateAccount(email, { verified: true });
        localStorage.removeItem('unverified_email');
        alert('Email verified successfully! You can now login.');
        navigateTo('#/login');
    }
}


// ─── LOGIN ────────────────────────────────────────────────────────────────────

async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Save token in sessionStorage for page refresh persistence
            sessionStorage.setItem('authToken', data.token);
            alert(`Welcome, ${data.user.firstName}!`);
            showDashboard(data.user);
        } else {
            alert('Login failed: ' + data.error);
        }
    } catch (err) {
        // Fallback: local authentication
        console.warn('API unavailable, falling back to local auth.');

        const account = window.db.findAccount(username);

        if (!account) {
            alert('Account not found!');
            return;
        }

        if (!account.verified) {
            alert('Please verify your email first!');
            return;
        }

        if (account.password !== password) {
            alert('Invalid password!');
            return;
        }

        sessionStorage.setItem('authToken', username);
        alert(`Welcome, ${account.firstName}!`);
        showDashboard(account);
    }
}


// ─── LOGOUT ───────────────────────────────────────────────────────────────────

async function handleLogout(e) {
    e.preventDefault();
    
    const authToken = sessionStorage.getItem('authToken');

    try {
        await fetch('http://localhost:3000/api/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            }
        });
    } catch (err) {
        console.warn('API unavailable, logging out locally.');
    }

    sessionStorage.removeItem('authToken');
    setAuthState(false);
    applyRoleUI(null);
    navigateTo('#/');
}


// ─── PROFILE ──────────────────────────────────────────────────────────────────

function loadProfile() {
    if (!currentUser) return;
    
    const content = document.getElementById('profileContent');
    content.innerHTML = `
        <div style="margin-top: 20px;">
            <p><strong>Name:</strong> ${currentUser.firstName} ${currentUser.lastName}</p>
            <p><strong>Email:</strong> ${currentUser.email}</p>
            <p><strong>Role:</strong> ${currentUser.role}</p>
            <p><strong>Account Created:</strong> ${new Date(currentUser.createdAt).toLocaleDateString()}</p>
        </div>
    `;
}


// ─── EMPLOYEES ────────────────────────────────────────────────────────────────

async function loadEmployees() {
    const content = document.getElementById('employeesContent');
    let employees;

    try {
        const res = await fetch('http://localhost:3000/api/employees', {
            headers: getAuthHeader()
        });
        if (res.ok) {
            employees = await res.json();
        } else {
            throw new Error('API error');
        }
    } catch (err) {
        console.warn('API unavailable, falling back to local data.');
        employees = window.db.accounts.filter(acc => acc.verified);
    }
    
    content.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined</th>
                </tr>
            </thead>
            <tbody>
                ${employees.map(emp => `
                    <tr>
                        <td>${emp.firstName} ${emp.lastName}</td>
                        <td>${emp.email}</td>
                        <td>${emp.role}</td>
                        <td>${new Date(emp.createdAt).toLocaleDateString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}


// ─── ACCOUNTS ─────────────────────────────────────────────────────────────────

async function loadAccounts() {
    const content = document.getElementById('accountsContent');
    let accounts;

    try {
        const res = await fetch('http://localhost:3000/api/accounts', {
            headers: getAuthHeader()
        });
        if (res.ok) {
            accounts = await res.json();
        } else {
            throw new Error('API error');
        }
    } catch (err) {
        console.warn('API unavailable, falling back to local data.');
        accounts = window.db.accounts;
    }
    
    content.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Verified</th>
                    <th>Created</th>
                </tr>
            </thead>
            <tbody>
                ${accounts.map(acc => `
                    <tr>
                        <td>${acc.firstName} ${acc.lastName}</td>
                        <td>${acc.email}</td>
                        <td>${acc.role}</td>
                        <td>${acc.verified ? '✅' : '❌'}</td>
                        <td>${new Date(acc.createdAt).toLocaleDateString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}


// ─── DEPARTMENTS ──────────────────────────────────────────────────────────────

async function loadDepartments() {
    const content = document.getElementById('departmentsContent');
    let departments;

    try {
        const res = await fetch('http://localhost:3000/api/departments', {
            headers: getAuthHeader()
        });
        if (res.ok) {
            departments = await res.json();
        } else {
            throw new Error('API error');
        }
    } catch (err) {
        console.warn('API unavailable, falling back to local data.');
        departments = window.db.departments;
    }
    
    content.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h3>Add New Department</h3>
            <form id="addDepartmentForm" style="display: flex; gap: 10px; margin-top: 10px;">
                <input type="text" id="deptName" placeholder="Department Name" required style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                <input type="text" id="deptHead" placeholder="Department Head" required style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                <input type="number" id="deptEmployees" placeholder="# Employees" required style="width: 120px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                <button type="submit" class="btn" style="width: auto; padding: 8px 20px;">Add</button>
            </form>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>Department Name</th>
                    <th>Head</th>
                    <th>Employees</th>
                    <th>Created</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${departments.length === 0 ? 
                    '<tr><td colspan="5" style="text-align: center; color: #888;">No departments yet. Add one above!</td></tr>' :
                    departments.map(dept => `
                        <tr>
                            <td>${dept.name}</td>
                            <td>${dept.head}</td>
                            <td>${dept.employeeCount}</td>
                            <td>${new Date(dept.createdAt).toLocaleDateString()}</td>
                            <td>
                                <button onclick="deleteDepartment('${dept.id}')" style="padding: 5px 10px; background-color: #d32f2f; color: white; border: none; border-radius: 4px; cursor: pointer;">Delete</button>
                            </td>
                        </tr>
                    `).join('')
                }
            </tbody>
        </table>
    `;

    const form = document.getElementById('addDepartmentForm');
    if (form) {
        form.addEventListener('submit', handleAddDepartment);
    }
}

async function handleAddDepartment(e) {
    e.preventDefault();
    
    const name = document.getElementById('deptName').value;
    const head = document.getElementById('deptHead').value;
    const employeeCount = parseInt(document.getElementById('deptEmployees').value);
    
    const newDepartment = {
        id: 'dept_' + Date.now(),
        name,
        head,
        employeeCount,
        createdAt: new Date().toISOString()
    };

    try {
        const res = await fetch('http://localhost:3000/api/departments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify(newDepartment)
        });
        if (!res.ok) throw new Error('API error');
    } catch (err) {
        console.warn('API unavailable, saving locally.');
        window.db.addDepartment(newDepartment);
    }

    loadDepartments();
}

function deleteDepartment(id) {
    if (confirm('Are you sure you want to delete this department?')) {
        window.db.deleteDepartment(id);
        loadDepartments();
    }
}


// ─── REQUESTS ─────────────────────────────────────────────────────────────────

async function loadRequests() {
    if (!currentUser) return;
    
    const content = document.getElementById('requestsContent');
    let userRequests;

    try {
        const res = await fetch('http://localhost:3000/api/requests', {
            headers: getAuthHeader()
        });
        if (res.ok) {
            userRequests = await res.json();
        } else {
            throw new Error('API error');
        }
    } catch (err) {
        console.warn('API unavailable, falling back to local data.');
        userRequests = window.db.requests.filter(req => req.userEmail === currentUser.email);
    }
    
    content.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h3>Submit New Request</h3>
            <form id="addRequestForm" style="margin-top: 10px;">
                <div class="form-group">
                    <label>Request Type:</label>
                    <select id="requestType" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="">Select type...</option>
                        <option value="Leave">Leave Request</option>
                        <option value="Equipment">Equipment Request</option>
                        <option value="Training">Training Request</option>
                        <option value="IT Support">IT Support</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Description:</label>
                    <textarea id="requestDescription" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; min-height: 100px;"></textarea>
                </div>
                <button type="submit" class="btn">Submit Request</button>
            </form>
        </div>
        
        <h3>My Requests</h3>
        <table>
            <thead>
                <tr>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Submitted</th>
                </tr>
            </thead>
            <tbody>
                ${userRequests.length === 0 ? 
                    '<tr><td colspan="4" style="text-align: center; color: #888;">No requests yet. Submit one above!</td></tr>' :
                    userRequests.map(req => `
                        <tr>
                            <td>${req.type}</td>
                            <td>${req.description}</td>
                            <td>
                                <span style="padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; 
                                    ${req.status === 'Pending' ? 'background-color: #fff3cd; color: #856404;' : 
                                      req.status === 'Approved' ? 'background-color: #d4edda; color: #155724;' : 
                                      'background-color: #f8d7da; color: #721c24;'}">
                                    ${req.status}
                                </span>
                            </td>
                            <td>${new Date(req.createdAt).toLocaleDateString()}</td>
                        </tr>
                    `).join('')
                }
            </tbody>
        </table>
    `;
    
    const form = document.getElementById('addRequestForm');
    if (form) {
        form.addEventListener('submit', handleAddRequest);
    }
}

async function handleAddRequest(e) {
    e.preventDefault();
    
    const type = document.getElementById('requestType').value;
    const description = document.getElementById('requestDescription').value;
    
    const newRequest = {
        id: 'req_' + Date.now(),
        userEmail: currentUser.email,
        userName: `${currentUser.firstName} ${currentUser.lastName}`,
        type,
        description,
        status: 'Pending',
        createdAt: new Date().toISOString()
    };

    try {
        const res = await fetch('http://localhost:3000/api/requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify(newRequest)
        });
        if (!res.ok) throw new Error('API error');
    } catch (err) {
        console.warn('API unavailable, saving locally.');
        window.db.addRequest(newRequest);
    }
    
    document.getElementById('requestType').value = '';
    document.getElementById('requestDescription').value = '';
    
    loadRequests();
}


// ─── INIT ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async function() {
    await checkAuthOnLoad(); // Restore session + apply role UI before routing
    
    if (!window.location.hash) {
        window.location.hash = '#/';
    }
    
    handleRouting();
    
    window.addEventListener('hashchange', handleRouting);
    
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    const simulateVerifyBtn = document.getElementById('simulateVerifyBtn');
    if (simulateVerifyBtn) {
        simulateVerifyBtn.addEventListener('click', handleSimulateVerify);
    }
    
    if (window.location.hash === '#/verify-email') {
        loadVerifyEmailPage();
    }
    
    // Seed default admin account (local fallback)
    if (window.db.accounts.length === 0) {
        window.db.addAccount({
            firstName: 'Admin',
            lastName: 'User',
            email: 'admin@test.com',
            password: 'admin123',
            verified: true,
            role: 'admin',
            createdAt: new Date().toISOString()
        });
    }
    
    // Seed default departments (local fallback)
    if (window.db.departments.length === 0) {
        window.db.addDepartment({
            id: 'dept_1',
            name: 'Human Resources',
            head: 'Sarah Johnson',
            employeeCount: 12,
            createdAt: new Date().toISOString()
        });
        
        window.db.addDepartment({
            id: 'dept_2',
            name: 'Engineering',
            head: 'Michael Chen',
            employeeCount: 45,
            createdAt: new Date().toISOString()
        });
        
        window.db.addDepartment({
            id: 'dept_3',
            name: 'Sales',
            head: 'Emily Rodriguez',
            employeeCount: 28,
            createdAt: new Date().toISOString()
        });
    }
});