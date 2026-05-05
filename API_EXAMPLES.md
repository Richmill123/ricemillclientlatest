# Rice Mill Management System - API Examples

## 🚀 Getting Started

### Base URL
```
Development: http://localhost:5000
Production: https://yourdomain.com
```

### Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## 🔐 Authentication Examples

### 1. Admin Login
```bash
curl -X POST http://localhost:5000/api/admins/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin@123"
  }'
```

**Response:**
```json
{
  "_id": "6401234567890abcdef12345",
  "name": "Super Admin",
  "username": "admin",
  "email": "admin@ricemill.com",
  "role": "super_admin",
  "active": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "15m"
}
```

### 2. Refresh Token
```bash
curl -X POST http://localhost:5000/api/admins/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

### 3. Logout
```bash
curl -X POST http://localhost:5000/api/admins/logout \
  -H "Authorization: Bearer <your-access-token>"
```

## 👤 Admin Management Examples

### 1. Create Admin (Super Admin only)
```bash
curl -X POST http://localhost:5000/api/admins \
  -H "Authorization: Bearer <your-access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Manager",
    "username": "john_manager",
    "email": "john@ricemill.com",
    "password": "Manager@123",
    "role": "admin"
  }'
```

### 2. Get All Admins (Super Admin only)
```bash
curl -X GET http://localhost:5000/api/admins \
  -H "Authorization: Bearer <your-access-token>"
```

### 3. Get Admin Profile
```bash
curl -X GET http://localhost:5000/api/admins/profile \
  -H "Authorization: Bearer <your-access-token>"
```

### 4. Toggle Admin Status (Super Admin only)
```bash
curl -X PUT http://localhost:5000/api/admins/6401234567890abcdef12345/active \
  -H "Authorization: Bearer <your-access-token>"
```

## 📊 Dashboard Examples

### Get Dashboard Analytics
```bash
curl -X GET "http://localhost:5000/api/admins/dashboard?clientId=6401234567890abcdef12345&startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer <your-access-token>"
```

**Response:**
```json
{
  "revenue": {
    "orders": 150000,
    "sales": 85000,
    "total": 245000
  },
  "expense": {
    "wages": 45000,
    "salary": 12000,
    "other": 8000,
    "total": 65000
  },
  "profit": 180000,
  "todaySummary": {
    "totalOrder": 500,
    "paddyTaken": 300,
    "newOrder": 50,
    "output": 250
  },
  "paddyProcessed": {
    "totalBags": 1200,
    "paidBags": 800
  },
  "sales": {
    "byItemType": {
      "bran": {"quantity": 100, "amount": 5000},
      "husk": {"quantity": 200, "amount": 2000},
      "black rice": {"quantity": 50, "amount": 7500}
    }
  },
  "stock": {
    "available": {
      "bran": 500,
      "husk": 800,
      "black rice": 200,
      "broken rice": 300
    }
  }
}
```

## 👥 Employee Management Examples

### 1. Create Employee
```bash
curl -X POST http://localhost:5000/api/employees \
  -H "Authorization: Bearer <your-access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ramesh Kumar",
    "email": "ramesh@ricemill.com",
    "phone": "+919876543210",
    "salary": 15000,
    "position": "Operator",
    "clientId": "6401234567890abcdef12345"
  }'
```

### 2. Get All Employees
```bash
curl -X GET "http://localhost:5000/api/employees?clientId=6401234567890abcdef12345" \
  -H "Authorization: Bearer <your-access-token>"
```

### 3. Update Employee
```bash
curl -X PUT http://localhost:5000/api/employees/6401234567890abcdef12345 \
  -H "Authorization: Bearer <your-access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ramesh Kumar Updated",
    "salary": 16000
  }'
```

### 4. Delete Employee
```bash
curl -X DELETE http://localhost:5000/api/employees/6401234567890abcdef12345 \
  -H "Authorization: Bearer <your-access-token>"
```

## 📦 Order Management Examples

### 1. Create Order
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Authorization: Bearer <your-access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "6401234567890abcdef12345",
    "customerName": "ABC Traders",
    "numberOfBags": 100,
    "bagWeight": 50,
    "totalAmount": 150000,
    "status": "CREATED"
  }'
```

### 2. Get All Orders
```bash
curl -X GET "http://localhost:5000/api/orders?clientId=6401234567890abcdef12345" \
  -H "Authorization: Bearer <your-access-token>"
```

### 3. Update Order Status
```bash
curl -X PUT http://localhost:5000/api/orders/6401234567890abcdef12345 \
  -H "Authorization: Bearer <your-access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "BOILING PROCESS COMPLETED"
  }'
```

## 💰 Sale Management Examples

### 1. Create Sale
```bash
curl -X POST http://localhost:5000/api/sales \
  -H "Authorization: Bearer <your-access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "6401234567890abcdef12345",
    "customerName": "XYZ Company",
    "items": [
      {
        "itemType": "bran",
        "quantity": 50,
        "rate": 50,
        "amount": 2500
      },
      {
        "itemType": "black rice",
        "quantity": 25,
        "rate": 150,
        "amount": 3750
      }
    ],
    "totalAmount": 6250,
    "paymentStatus": "Paid"
  }'
```

### 2. Get All Sales
```bash
curl -X GET "http://localhost:5000/api/sales?clientId=6401234567890abcdef12345" \
  -H "Authorization: Bearer <your-access-token>"
```

## 💳 Wage Management Examples

### 1. Create Wage Entry
```bash
curl -X POST http://localhost:5000/api/wages \
  -H "Authorization: Bearer <your-access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "6401234567890abcdef12345",
    "employeeId": "6401234567890abcdef12345",
    "bags": 20,
    "ratePerBag": 25,
    "totalWage": 500,
    "date": "2024-01-15"
  }'
```

### 2. Get All Wages
```bash
curl -X GET "http://localhost:5000/api/wages?clientId=6401234567890abcdef12345" \
  -H "Authorization: Bearer <your-access-token>"
```

## 📋 Stock Management Examples

### 1. Create/Update Stock
```bash
curl -X POST http://localhost:5000/api/stock \
  -H "Authorization: Bearer <your-access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "6401234567890abcdef12345",
    "itemType": "bran",
    "availableQuantity": 500
  }'
```

### 2. Get All Stock
```bash
curl -X GET "http://localhost:5000/api/stock?clientId=6401234567890abcdef12345" \
  -H "Authorization: Bearer <your-access-token>"
```

### 3. Update Stock Quantity
```bash
curl -X PUT http://localhost:5000/api/stock/6401234567890abcdef12345 \
  -H "Authorization: Bearer <your-access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "availableQuantity": 450
  }'
```

## 💸 Expense Management Examples

### 1. Create Expense
```bash
curl -X POST http://localhost:5000/api/expenses \
  -H "Authorization: Bearer <your-access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "6401234567890abcdef12345",
    "description": "Electricity bill",
    "amount": 5000,
    "category": "electricity",
    "date": "2024-01-15"
  }'
```

### 2. Get All Expenses
```bash
curl -X GET "http://localhost:5000/api/expenses?clientId=6401234567890abcdef12345" \
  -H "Authorization: Bearer <your-access-token>"
```

## 🧾 Billing Management Examples

### 1. Create Bill
```bash
curl -X POST http://localhost:5000/api/billing \
  -H "Authorization: Bearer <your-access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "6401234567890abcdef12345",
    "customerName": "ABC Traders",
    "items": [
      {
        "description": "Paddy processing charges",
        "quantity": 100,
        "rate": 1500,
        "amount": 150000
      }
    ],
    "totalAmount": 150000,
    "status": "draft"
  }'
```

### 2. Get All Bills
```bash
curl -X GET "http://localhost:5000/api/billing?clientId=6401234567890abcdef12345" \
  -H "Authorization: Bearer <your-access-token>"
```

## 🏦 Income Management Examples

### 1. Create Income Entry
```bash
curl -X POST http://localhost:5000/api/income \
  -H "Authorization: Bearer <your-access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "6401234567890abcdef12345",
    "description": "Rice sales income",
    "amount": 25000,
    "source": "sale",
    "date": "2024-01-15"
  }'
```

### 2. Get All Income
```bash
curl -X GET "http://localhost:5000/api/income?clientId=6401234567890abcdef12345" \
  -H "Authorization: Bearer <your-access-token>"
```

## 🛒 Purchase Management Examples

### 1. Create Purchase
```bash
curl -X POST http://localhost:5000/api/purchases \
  -H "Authorization: Bearer <your-access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "6401234567890abcdef12345",
    "supplier": "Paddy Suppliers Ltd",
    "items": [
      {
        "description": "Raw paddy",
        "quantity": 1000,
        "unitPrice": 25,
        "totalPrice": 25000
      }
    ],
    "totalAmount": 25000,
    "paymentStatus": "paid"
  }'
```

### 2. Get All Purchases
```bash
curl -X GET "http://localhost:5000/api/purchases?clientId=6401234567890abcdef12345" \
  -H "Authorization: Bearer <your-access-token>"
```

## 🔍 Health Check Examples

### Application Health
```bash
curl -X GET http://localhost:5000/health
```

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.5,
  "environment": "production",
  "version": "1.0.0"
}
```

## 📱 JavaScript/Frontend Examples

### Using Fetch API
```javascript
// Login
const login = async (username, password) => {
  try {
    const response = await fetch('http://localhost:5000/api/admins/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Store tokens
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      return data;
    } else {
      throw new Error(data.error || 'Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

// Get dashboard data
const getDashboard = async (clientId, startDate, endDate) => {
  try {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(
      `http://localhost:5000/api/admins/dashboard?clientId=${clientId}&startDate=${startDate}&endDate=${endDate}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch dashboard data');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Dashboard error:', error);
    throw error;
  }
};

// Create employee
const createEmployee = async (employeeData) => {
  try {
    const token = localStorage.getItem('accessToken');
    const response = await fetch('http://localhost:5000/api/employees', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(employeeData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create employee');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Create employee error:', error);
    throw error;
  }
};
```

### Using Axios
```javascript
import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Add request interceptor to include token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Try to refresh token
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post('http://localhost:5000/api/admins/refresh-token', {
          refreshToken,
        });
        
        const { accessToken } = response.data;
        localStorage.setItem('accessToken', accessToken);
        
        // Retry the original request
        error.config.headers.Authorization = `Bearer ${accessToken}`;
        return api.request(error.config);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API calls
export const apiCalls = {
  // Auth
  login: (credentials) => api.post('/admins/login', credentials),
  logout: () => api.post('/admins/logout'),
  
  // Dashboard
  getDashboard: (params) => api.get('/admins/dashboard', { params }),
  
  // Employees
  getEmployees: (params) => api.get('/employees', { params }),
  createEmployee: (data) => api.post('/employees', data),
  updateEmployee: (id, data) => api.put(`/employees/${id}`, data),
  deleteEmployee: (id) => api.delete(`/employees/${id}`),
  
  // Orders
  getOrders: (params) => api.get('/orders', { params }),
  createOrder: (data) => api.post('/orders', data),
  updateOrder: (id, data) => api.put(`/orders/${id}`, data),
  
  // Sales
  getSales: (params) => api.get('/sales', { params }),
  createSale: (data) => api.post('/sales', data),
  
  // Stock
  getStock: (params) => api.get('/stock', { params }),
  updateStock: (id, data) => api.put(`/stock/${id}`, data),
  
  // And so on for other endpoints...
};
```

## 📝 Error Handling

### Common Error Responses
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Please provide a valid email",
      "value": "invalid-email"
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

```json
{
  "error": "Access denied. No token provided.",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

```json
{
  "error": "Not authorized, token failed",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🔄 Pagination

Most list endpoints support pagination:
```bash
curl -X GET "http://localhost:5000/api/employees?clientId=6401234567890abcdef12345&page=1&limit=10" \
  -H "Authorization: Bearer <your-access-token>"
```

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

## 🎯 Tips for API Usage

1. **Always include the Authorization header** for protected endpoints
2. **Handle 401 errors** by refreshing tokens or redirecting to login
3. **Validate input data** before sending to avoid validation errors
4. **Use clientId parameter** for multi-tenant data isolation
5. **Implement proper error handling** in your frontend
6. **Use rate limiting** to avoid being blocked
7. **Cache frequently accessed data** to improve performance

---

For more detailed information, refer to the inline code documentation and the main README.md file.
