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


function navigateTo(hash) {
    window.location.hash = hash;
}

function handleRouting() {
    const hash = window.location.hash || '#/';
    const route = hash.substring(2); 
    
    const protectedRoutes = ['profile', 'requests', 'employees', 'departments', 'accounts'];
    
    const adminRoutes = ['employees', 'departments', 'accounts'];
    
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

function checkAuthOnLoad() {
    const authToken = localStorage.getItem('auth_token');
    
    if (authToken) {
        const user = window.db.findAccount(authToken);
        if (user && user.verified) {
            setAuthState(true, user);
        } else {
            localStorage.removeItem('auth_token');
        }
    }
}


function handleRegister(e) {
    e.preventDefault();
    
    const firstName = document.getElementById('registerFirstName').value;
    const lastName = document.getElementById('registerLastName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    
    if (password.length < 6) {
        alert('Password must be at least 6 characters!');
        return;
    }
    
    if (window.db.findAccount(email)) {
        alert('Email already exists! Please login.');
        return;
    }
    
    const newAccount = {
        firstName,
        lastName,
        email,
        password,
        verified: false,
        role: 'user',
        createdAt: new Date().toISOString()
    };
    
    window.db.addAccount(newAccount);
    

    localStorage.setItem('unverified_email', email);
    

    navigateTo('#/verify-email');
}


function loadVerifyEmailPage() {
    const email = localStorage.getItem('unverified_email');
    if (email) {
        document.getElementById('verifyEmailDisplay').textContent = email;
    }
}

function handleSimulateVerify() {
    const email = localStorage.getItem('unverified_email');
    
    if (!email) {
        alert('No email to verify!');
        return;
    }
    

    window.db.updateAccount(email, { verified: true });
    

    localStorage.removeItem('unverified_email');
    
    alert('Email verified successfully! You can now login.');
    navigateTo('#/login');
}


function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    

    const account = window.db.findAccount(email);
    
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
    

    localStorage.setItem('auth_token', email);
    setAuthState(true, account);
    
    alert(`Welcome, ${account.firstName}!`);
    navigateTo('#/profile');
}


function handleLogout(e) {
    e.preventDefault();
    
    localStorage.removeItem('auth_token');
    setAuthState(false);
    
    navigateTo('#/');
}


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

function loadEmployees() {
    const content = document.getElementById('employeesContent');
    

    const employees = window.db.accounts.filter(acc => acc.verified);
    
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

function loadAccounts() {
    const content = document.getElementById('accountsContent');
    
    const accounts = window.db.accounts;
    
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

function loadDepartments() {
    const content = document.getElementById('departmentsContent');
    
    const departments = window.db.departments;
    
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

function handleAddDepartment(e) {
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
    
    window.db.addDepartment(newDepartment);
    
    loadDepartments();
}

function deleteDepartment(id) {
    if (confirm('Are you sure you want to delete this department?')) {
        window.db.deleteDepartment(id);
        loadDepartments();
    }
}

function loadRequests() {
    if (!currentUser) return;
    
    const content = document.getElementById('requestsContent');

    const userRequests = window.db.requests.filter(req => req.userEmail === currentUser.email);
    
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

function handleAddRequest(e) {
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
    
    window.db.addRequest(newRequest);
    
    document.getElementById('requestType').value = '';
    document.getElementById('requestDescription').value = '';
    
    loadRequests();
}


document.addEventListener('DOMContentLoaded', function() {
    checkAuthOnLoad();
    
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