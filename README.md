# Finance Tracker

A personal budgeting and finance tracking web application with a clean, modern UI inspired by Wealthsimple.

## ✨ Features

- **Dashboard**: Overview of income, expenses, savings, debt, and net worth
- **Interactive Charts**: Spending breakdown by category with time filters
- **Transaction Management**: Add, edit, delete transactions with recurring support
- **Financial Health**: Track investments, accounts, and budget goals
- **Zero-based Budgeting**: Ensure every dollar is accounted for

## 🚀 Quick Start

### 1. Prerequisites
- Python 3.7+ with pip
- Node.js 16+ with npm
- Git (optional)

### 2. Setup & Run

#### Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate  # On Windows
source venv/bin/activate # On macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Start the Flask server
python finance-tracker-backend.py
```

#### Frontend Setup
```bash
# In a new terminal, navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm start
```

### 3. Access Application
- Open **Frontend**: http://localhost:3000 in your browser
- Backend API will be available at: http://localhost:5000/api

### 4. Verification
- The dashboard should load automatically
- Try creating a new transaction to verify the full stack integration
- Check the browser console for any potential errors

### 5. Stopping the Application
- Press Ctrl+C in both terminal windows
- Or close the terminal windows to stop both servers

## 🛠️ Development Tools

Use the `dev-tools.sh` script for common development tasks:

```bash
./dev-tools.sh help          # Show all available commands
./dev-tools.sh status        # Check if services are running
./dev-tools.sh stop          # Stop all services
./dev-tools.sh clean         # Clean dependencies and build files
./dev-tools.sh reset-db      # Reset database (WARNING: deletes data)
./dev-tools.sh test          # Run tests
./dev-tools.sh build         # Build production version
```

## 📁 Project Structure

```
finance-tracker/
├── backend/
│   ├── finance-tracker-backend.py    # Flask API server
│   ├── requirements.txt              # Python dependencies
│   └── finance_tracker.db            # SQLite database (auto-created)
├── frontent/                         # React frontend
│   ├── src/
│   │   ├── BudgetTracker.js          # Main component
│   │   ├── App.js                    # App wrapper
│   │   └── index.js                  # Entry point
│   ├── public/
│   ├── package.json
│   └── tailwind.config.js
├── setup.sh                          # Initial setup script
├── run.sh                            # Start application script
├── dev-tools.sh                      # Development helper script
└── README.md
```

## 🎯 Tech Stack

- **Frontend**: React, Tailwind CSS, Recharts, Lucide Icons
- **Backend**: Flask, SQLite
- **UI Colors**: Pink Marshmallow (#f4b8d4), Delicate Blue (#a8c8ec), Veiled Vista (#c7e2c8), Custom Yellow (#f1f0b0)

## 🔧 API Endpoints

### Transactions
- `GET /api/transactions` - Get all transactions (with optional filters)
- `POST /api/transactions` - Create new transaction
- `PUT /api/transactions/<id>` - Update transaction
- `DELETE /api/transactions/<id>` - Delete transaction

### Recurring Transactions
- `GET /api/recurring-transactions` - Get recurring transactions
- `POST /api/recurring-transactions` - Create recurring transaction
- `PUT /api/recurring-transactions/<id>` - Update recurring transaction
- `DELETE /api/recurring-transactions/<id>` - Delete recurring transaction

### Analytics
- `GET /api/analytics/financial-overview` - Income/expense summary
- `GET /api/analytics/spending-by-category?period=month|6months|year` - Spending breakdown

### Budget & Accounts
- `GET /api/budget-goals` - Get current budget goals
- `POST /api/budget-goals` - Update budget goals
- `GET /api/accounts` - Get investment accounts
- `POST /api/accounts` - Add new account
- `GET /api/categories` - Get transaction categories

### Utilities
- `POST /api/process-recurring` - Manually process recurring transactions

## 📊 Database Schema

### Transactions
```sql
CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    category TEXT NOT NULL,
    notes TEXT,
    recurring_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Budget Goals
```sql
CREATE TABLE budget_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    monthly_income REAL NOT NULL DEFAULT 0,
    debt_payments REAL NOT NULL DEFAULT 0,
    savings REAL NOT NULL DEFAULT 0,
    investments REAL NOT NULL DEFAULT 0,
    discretionary REAL NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Accounts
```sql
CREATE TABLE accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    balance REAL NOT NULL DEFAULT 0,
    monthly_contribution REAL NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🐛 Troubleshooting

### Common Issues

**Port Already in Use:**
```powershell
# On Windows (PowerShell)
netstat -ano | findstr :3000  # Check what's using port 3000
netstat -ano | findstr :5000  # Check what's using port 5000
taskkill /PID <PID> /F       # Kill the process using the port

# On macOS/Linux
lsof -ti:3000 | xargs kill -9
lsof -ti:5000 | xargs kill -9
```

**Backend Issues:**
1. If you see "ImportError" or "ModuleNotFoundError":
```bash
# Verify virtual environment is activated (you should see (venv) in terminal)
# Then reinstall dependencies:
pip install -r requirements.txt
```

2. If database errors occur:
```bash
# Remove the existing database and let it recreate
rm backend/finance_tracker.db  # On Windows: del backend\finance_tracker.db
```

**Frontend Issues:**
1. If npm install fails:
```bash
# Clear npm cache and node_modules
rm -rf node_modules
npm cache clean --force
npm install
```

2. If you see "Invalid Hook Call":
```bash
# Ensure you have only one copy of React in node_modules
npm dedupe
```

**Connection Issues:**
1. Verify both servers are running (check both terminal windows)
2. Confirm API URL in frontend `.env` matches backend port
3. Check browser console for CORS or network errors

### Environment Variables

Create `.env` file in `frontent/` directory:
```env
REACT_APP_API_BASE_URL=http://localhost:5000/api
REACT_APP_NAME=Finance Tracker
```

## 🔒 Security Notes

- This application is designed for **local use only**
- No authentication is implemented
- Database contains sensitive financial information
- Do not expose to public networks without proper security measures

## 📝 Sample Data

The application includes sample data on first run:
- Sample transactions (salary, expenses, etc.)
- Default budget goals
- Sample investment accounts (TFSA, RRSP, FHSA)
- Common transaction categories

## 🚀 Production Deployment

For production deployment:

1. **Build frontend:**
   ```bash
   cd frontent
   npm run build
   ```

2. **Configure Flask for production:**
   - Set `debug=False`
   - Use proper WSGI server (Gunicorn, uWSGI)
   - Configure database backups
   - Add authentication if needed

3. **Environment setup:**
   - Use environment variables for configuration
   - Secure database file permissions
   - Configure HTTPS

## 🤝 Contributing

This is a personal finance tracker. Feel free to fork and customize for your own needs!

## 📄 License

This project is for personal use. Modify and adapt as needed.

---

**Happy budgeting! 💰**

For support or questions, check the troubleshooting section or review the API documentation above.