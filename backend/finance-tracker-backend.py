from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import json
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

# Database configuration
DATABASE = 'finance_tracker.db'

def get_db_connection():
    """Create and return database connection"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row  # Enable dict-like access to rows
    return conn

def init_database():
    """Initialize database with required tables"""
    conn = get_db_connection()
    
    # Create transactions table
    conn.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            description TEXT NOT NULL,
            amount REAL NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
            category TEXT NOT NULL,
            notes TEXT,
            recurring_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (recurring_id) REFERENCES recurring_transactions (id)
        )
    ''')
    
    # Create recurring transactions table
    conn.execute('''
        CREATE TABLE IF NOT EXISTS recurring_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            description TEXT NOT NULL,
            amount REAL NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
            category TEXT NOT NULL,
            notes TEXT,
            frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
            start_date TEXT NOT NULL,
            end_date TEXT,
            next_occurrence TEXT NOT NULL,
            is_active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create budget_goals table
    conn.execute('''
        CREATE TABLE IF NOT EXISTS budget_goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            monthly_income REAL NOT NULL DEFAULT 0,
            debt_payments REAL NOT NULL DEFAULT 0,
            savings REAL NOT NULL DEFAULT 0,
            investments REAL NOT NULL DEFAULT 0,
            discretionary REAL NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create accounts table
    conn.execute('''
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            balance REAL NOT NULL DEFAULT 0,
            monthly_contribution REAL NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

def calculate_next_occurrence(start_date, frequency):
    """Calculate next occurrence date based on frequency"""
    start = datetime.strptime(start_date, '%Y-%m-%d')
    
    if frequency == 'weekly':
        return (start + timedelta(weeks=1)).strftime('%Y-%m-%d')
    elif frequency == 'biweekly':
        return (start + timedelta(weeks=2)).strftime('%Y-%m-%d')
    elif frequency == 'monthly':
        return (start + relativedelta(months=1)).strftime('%Y-%m-%d')
    elif frequency == 'quarterly':
        return (start + relativedelta(months=3)).strftime('%Y-%m-%d')
    elif frequency == 'yearly':
        return (start + relativedelta(years=1)).strftime('%Y-%m-%d')
    
    return start_date

def process_recurring_transactions():
    """Process recurring transactions that are due"""
    conn = get_db_connection()
    today = datetime.now().strftime('%Y-%m-%d')
    
    # Get all active recurring transactions due today or overdue
    recurring = conn.execute('''
        SELECT * FROM recurring_transactions 
        WHERE is_active = 1 AND next_occurrence <= ?
        AND (end_date IS NULL OR end_date >= ?)
    ''', (today, today)).fetchall()
    
    for rec in recurring:
        # Create new transaction from recurring template
        conn.execute('''
            INSERT INTO transactions (date, description, amount, type, category, notes, recurring_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (rec['next_occurrence'], rec['description'], rec['amount'], 
              rec['type'], rec['category'], rec['notes'], rec['id']))
        
        # Update next occurrence
        new_next_occurrence = calculate_next_occurrence(rec['next_occurrence'], rec['frequency'])
        conn.execute('''
            UPDATE recurring_transactions 
            SET next_occurrence = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (new_next_occurrence, rec['id']))
    
    conn.commit()
    conn.close()
    return len(recurring)

# ==================== TRANSACTION ROUTES ====================

@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    """Get all transactions with optional filtering"""
    process_recurring_transactions()  # Process any due recurring transactions
    
    conn = get_db_connection()
    
    # Get query parameters for filtering
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    category = request.args.get('category')
    transaction_type = request.args.get('type')
    
    # Build query with filters
    query = 'SELECT * FROM transactions WHERE 1=1'
    params = []
    
    if start_date:
        query += ' AND date >= ?'
        params.append(start_date)
    
    if end_date:
        query += ' AND date <= ?'
        params.append(end_date)
    
    if category:
        query += ' AND category = ?'
        params.append(category)
    
    if transaction_type:
        query += ' AND type = ?'
        params.append(transaction_type)
    
    query += ' ORDER BY date DESC, id DESC'
    
    transactions = conn.execute(query, params).fetchall()
    conn.close()
    
    return jsonify([dict(row) for row in transactions])

@app.route('/api/transactions', methods=['POST'])
def create_transaction():
    """Create a new transaction"""
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['date', 'description', 'amount', 'type', 'category']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    conn = get_db_connection()
    
    cursor = conn.execute('''
        INSERT INTO transactions (date, description, amount, type, category, notes)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (data['date'], data['description'], data['amount'], 
          data['type'], data['category'], data.get('notes', '')))
    
    transaction_id = cursor.lastrowid
    conn.commit()
    
    # Get the created transaction
    transaction = conn.execute('SELECT * FROM transactions WHERE id = ?', (transaction_id,)).fetchone()
    conn.close()
    
    return jsonify(dict(transaction)), 201

@app.route('/api/transactions/<int:transaction_id>', methods=['PUT'])
def update_transaction(transaction_id):
    """Update an existing transaction"""
    data = request.get_json()
    
    conn = get_db_connection()
    
    # Check if transaction exists
    existing = conn.execute('SELECT * FROM transactions WHERE id = ?', (transaction_id,)).fetchone()
    if not existing:
        conn.close()
        return jsonify({'error': 'Transaction not found'}), 404
    
    # Update transaction
    conn.execute('''
        UPDATE transactions 
        SET date = ?, description = ?, amount = ?, type = ?, category = ?, 
            notes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (data.get('date', existing['date']), 
          data.get('description', existing['description']),
          data.get('amount', existing['amount']),
          data.get('type', existing['type']),
          data.get('category', existing['category']),
          data.get('notes', existing['notes']),
          transaction_id))
    
    conn.commit()
    
    # Get updated transaction
    transaction = conn.execute('SELECT * FROM transactions WHERE id = ?', (transaction_id,)).fetchone()
    conn.close()
    
    return jsonify(dict(transaction))

@app.route('/api/transactions/<int:transaction_id>', methods=['DELETE'])
def delete_transaction(transaction_id):
    """Delete a transaction"""
    conn = get_db_connection()
    
    # Check if transaction exists
    existing = conn.execute('SELECT * FROM transactions WHERE id = ?', (transaction_id,)).fetchone()
    if not existing:
        conn.close()
        return jsonify({'error': 'Transaction not found'}), 404
    
    conn.execute('DELETE FROM transactions WHERE id = ?', (transaction_id,))
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Transaction deleted successfully'})

# ==================== RECURRING TRANSACTION ROUTES ====================

@app.route('/api/recurring-transactions', methods=['GET'])
def get_recurring_transactions():
    """Get all recurring transactions"""
    conn = get_db_connection()
    recurring = conn.execute('SELECT * FROM recurring_transactions ORDER BY next_occurrence').fetchall()
    conn.close()
    
    return jsonify([dict(row) for row in recurring])

@app.route('/api/recurring-transactions', methods=['POST'])
def create_recurring_transaction():
    """Create a new recurring transaction"""
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['description', 'amount', 'type', 'category', 'frequency', 'start_date']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    # Calculate next occurrence
    next_occurrence = calculate_next_occurrence(data['start_date'], data['frequency'])
    
    conn = get_db_connection()
    
    cursor = conn.execute('''
        INSERT INTO recurring_transactions 
        (description, amount, type, category, notes, frequency, start_date, 
         end_date, next_occurrence, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (data['description'], data['amount'], data['type'], data['category'],
          data.get('notes', ''), data['frequency'], data['start_date'],
          data.get('end_date'), next_occurrence, data.get('is_active', True)))
    
    recurring_id = cursor.lastrowid
    conn.commit()
    
    # Get the created recurring transaction
    recurring = conn.execute('SELECT * FROM recurring_transactions WHERE id = ?', (recurring_id,)).fetchone()
    conn.close()
    
    return jsonify(dict(recurring)), 201

@app.route('/api/recurring-transactions/<int:recurring_id>', methods=['PUT'])
def update_recurring_transaction(recurring_id):
    """Update an existing recurring transaction"""
    data = request.get_json()
    
    conn = get_db_connection()
    
    # Check if recurring transaction exists
    existing = conn.execute('SELECT * FROM recurring_transactions WHERE id = ?', (recurring_id,)).fetchone()
    if not existing:
        conn.close()
        return jsonify({'error': 'Recurring transaction not found'}), 404
    
    # Update recurring transaction
    conn.execute('''
        UPDATE recurring_transactions 
        SET description = ?, amount = ?, type = ?, category = ?, notes = ?, 
            frequency = ?, start_date = ?, end_date = ?, is_active = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (data.get('description', existing['description']),
          data.get('amount', existing['amount']),
          data.get('type', existing['type']),
          data.get('category', existing['category']),
          data.get('notes', existing['notes']),
          data.get('frequency', existing['frequency']),
          data.get('start_date', existing['start_date']),
          data.get('end_date', existing['end_date']),
          data.get('is_active', existing['is_active']),
          recurring_id))
    
    conn.commit()
    
    # Get updated recurring transaction
    recurring = conn.execute('SELECT * FROM recurring_transactions WHERE id = ?', (recurring_id,)).fetchone()
    conn.close()
    
    return jsonify(dict(recurring))

@app.route('/api/recurring-transactions/<int:recurring_id>', methods=['DELETE'])
def delete_recurring_transaction(recurring_id):
    """Delete a recurring transaction"""
    conn = get_db_connection()
    
    # Check if recurring transaction exists
    existing = conn.execute('SELECT * FROM recurring_transactions WHERE id = ?', (recurring_id,)).fetchone()
    if not existing:
        conn.close()
        return jsonify({'error': 'Recurring transaction not found'}), 404
    
    conn.execute('DELETE FROM recurring_transactions WHERE id = ?', (recurring_id,))
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Recurring transaction deleted successfully'})

# ==================== ANALYTICS ROUTES ====================

@app.route('/api/analytics/spending-by-category', methods=['GET'])
def get_spending_by_category():
    """Get spending breakdown by category"""
    period = request.args.get('period', 'month')  # month, 6months, year
    
    conn = get_db_connection()
    
    # Calculate date range based on period
    today = datetime.now()
    if period == 'month':
        start_date = today.replace(day=1).strftime('%Y-%m-%d')
    elif period == '6months':
        start_date = (today - relativedelta(months=6)).strftime('%Y-%m-%d')
    elif period == 'year':
        start_date = (today - relativedelta(years=1)).strftime('%Y-%m-%d')
    else:
        start_date = today.replace(day=1).strftime('%Y-%m-%d')
    
    # Get spending by category (expenses only)
    spending = conn.execute('''
        SELECT category, SUM(ABS(amount)) as total_amount
        FROM transactions 
        WHERE type = 'expense' AND date >= ?
        GROUP BY category
        ORDER BY total_amount DESC
    ''', (start_date,)).fetchall()
    
    conn.close()
    
    return jsonify([{'category': row['category'], 'amount': row['total_amount']} for row in spending])

@app.route('/api/analytics/financial-overview', methods=['GET'])
def get_financial_overview():
    """Get financial overview (income, expenses, savings, etc.)"""
    conn = get_db_connection()
    
    # Get current month data
    today = datetime.now()
    start_of_month = today.replace(day=1).strftime('%Y-%m-%d')
    
    # Calculate income and expenses for current month
    income = conn.execute('''
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions 
        WHERE type = 'income' AND date >= ?
    ''', (start_of_month,)).fetchone()['total']
    
    expenses = conn.execute('''
        SELECT COALESCE(SUM(ABS(amount)), 0) as total
        FROM transactions 
        WHERE type = 'expense' AND date >= ?
    ''', (start_of_month,)).fetchone()['total']
    
    # Calculate savings (income - expenses)
    savings = income - expenses
    
    # Get total debt (this would typically come from account balances)
    # For now, we'll use a placeholder or sum of debt-related transactions
    debt = 12500  # Placeholder - you'd calculate this from account balances
    
    # Calculate net worth (you'd typically get this from account balances)
    net_worth = 25750  # Placeholder
    
    conn.close()
    
    return jsonify({
        'income': income,
        'expenses': expenses,
        'savings': savings,
        'debt': debt,
        'net_worth': net_worth
    })

# ==================== BUDGET GOALS ROUTES ====================

@app.route('/api/budget-goals', methods=['GET'])
def get_budget_goals():
    """Get current budget goals"""
    conn = get_db_connection()
    
    # Get the most recent budget goals
    goals = conn.execute('''
        SELECT * FROM budget_goals 
        ORDER BY created_at DESC 
        LIMIT 1
    ''').fetchone()
    
    conn.close()
    
    if goals:
        return jsonify(dict(goals))
    else:
        # Return default values if no goals set
        return jsonify({
            'monthly_income': 5200,
            'debt_payments': 800,
            'savings': 1000,
            'investments': 600,
            'discretionary': 2800
        })

@app.route('/api/budget-goals', methods=['POST'])
def update_budget_goals():
    """Update budget goals"""
    data = request.get_json()
    
    conn = get_db_connection()
    
    cursor = conn.execute('''
        INSERT INTO budget_goals 
        (monthly_income, debt_payments, savings, investments, discretionary)
        VALUES (?, ?, ?, ?, ?)
    ''', (data.get('monthly_income', 0),
          data.get('debt_payments', 0),
          data.get('savings', 0),
          data.get('investments', 0),
          data.get('discretionary', 0)))
    
    goals_id = cursor.lastrowid
    conn.commit()
    
    # Get the created budget goals
    goals = conn.execute('SELECT * FROM budget_goals WHERE id = ?', (goals_id,)).fetchone()
    conn.close()
    
    return jsonify(dict(goals))

# ==================== ACCOUNTS ROUTES ====================

@app.route('/api/accounts', methods=['GET'])
def get_accounts():
    """Get all accounts"""
    conn = get_db_connection()
    accounts = conn.execute('SELECT * FROM accounts ORDER BY name').fetchall()
    conn.close()
    
    return jsonify([dict(row) for row in accounts])

@app.route('/api/accounts', methods=['POST'])
def create_account():
    """Create a new account"""
    data = request.get_json()
    
    required_fields = ['name', 'type']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    conn = get_db_connection()
    
    cursor = conn.execute('''
        INSERT INTO accounts (name, type, balance, monthly_contribution)
        VALUES (?, ?, ?, ?)
    ''', (data['name'], data['type'], 
          data.get('balance', 0), data.get('monthly_contribution', 0)))
    
    account_id = cursor.lastrowid
    conn.commit()
    
    # Get the created account
    account = conn.execute('SELECT * FROM accounts WHERE id = ?', (account_id,)).fetchone()
    conn.close()
    
    return jsonify(dict(account)), 201

# ==================== UTILITY ROUTES ====================

@app.route('/api/process-recurring', methods=['POST'])
def manual_process_recurring():
    """Manually trigger processing of recurring transactions"""
    count = process_recurring_transactions()
    return jsonify({'message': f'Processed {count} recurring transactions'})

@app.route('/api/categories', methods=['GET'])
def get_categories():
    """Get all unique categories from transactions"""
    conn = get_db_connection()
    categories = conn.execute('''
        SELECT DISTINCT category FROM transactions 
        UNION 
        SELECT DISTINCT category FROM recurring_transactions
        ORDER BY category
    ''').fetchall()
    conn.close()
    
    category_list = [row['category'] for row in categories]
    
    # Add default categories if none exist
    default_categories = ['Groceries', 'Housing', 'Transportation', 'Dining Out', 
                         'Entertainment', 'Utilities', 'Healthcare', 'Shopping', 
                         'Other', 'Salary', 'Freelance', 'Investment Returns']
    
    all_categories = list(set(category_list + default_categories))
    all_categories.sort()
    
    return jsonify(all_categories)

# ==================== ERROR HANDLERS ====================

@app.errorhandler(400)
def bad_request(error):
    return jsonify({'error': 'Bad request'}), 400

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

# ==================== MAIN ====================

if __name__ == '__main__':
    # Initialize database on startup
    init_database()
    
    # Insert some sample data if database is empty
    conn = get_db_connection()
    transaction_count = conn.execute('SELECT COUNT(*) as count FROM transactions').fetchone()['count']
    
    if transaction_count == 0:
        # Insert sample transactions
        sample_transactions = [
            ('2025-07-29', 'Salary Deposit', 2600, 'income', 'Salary', 'Bi-weekly paycheck'),
            ('2025-07-28', 'Grocery Store', -85.50, 'expense', 'Groceries', ''),
            ('2025-07-27', 'Gas Station', -45.00, 'expense', 'Transportation', ''),
            ('2025-07-26', 'Restaurant', -67.80, 'expense', 'Dining Out', 'Dinner with friends'),
            ('2025-07-25', 'Netflix Subscription', -15.99, 'expense', 'Entertainment', ''),
            ('2025-07-24', 'Rent Payment', -1200, 'expense', 'Housing', 'Monthly rent'),
            ('2025-07-23', 'Freelance Work', 500, 'income', 'Freelance', 'Web design project')
        ]
        
        for transaction in sample_transactions:
            conn.execute('''
                INSERT INTO transactions (date, description, amount, type, category, notes)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', transaction)
        
        # Insert sample recurring transactions
        sample_recurring = [
            ('Salary', 2600, 'income', 'Salary', 'Bi-weekly paycheck', 'biweekly', '2025-07-29', None, '2025-08-12', 1),
            ('Rent', -1200, 'expense', 'Housing', 'Monthly rent payment', 'monthly', '2025-08-01', None, '2025-08-01', 1),
            ('Netflix', -15.99, 'expense', 'Entertainment', 'Streaming subscription', 'monthly', '2025-08-01', None, '2025-08-01', 1)
        ]
        
        for recurring in sample_recurring:
            conn.execute('''
                INSERT INTO recurring_transactions 
                (description, amount, type, category, notes, frequency, start_date, end_date, next_occurrence, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', recurring)
        
        # Insert sample accounts
        sample_accounts = [
            ('TFSA', 'Tax-Free Savings', 15000, 500),
            ('RRSP', 'Retirement Savings', 25000, 800),
            ('FHSA', 'First Home Savings', 8000, 300),
            ('Emergency Fund', 'Savings', 5000, 200)
        ]
        
        for account in sample_accounts:
            conn.execute('''
                INSERT INTO accounts (name, type, balance, monthly_contribution)
                VALUES (?, ?, ?, ?)
            ''', account)
        
        conn.commit()
        print("Sample data inserted successfully!")
    
    conn.close()
    
    print("Finance Tracker API starting...")
    print("Available endpoints:")
    print("- GET/POST /api/transactions")
    print("- PUT/DELETE /api/transactions/<id>")
    print("- GET/POST /api/recurring-transactions")
    print("- GET /api/analytics/spending-by-category")
    print("- GET /api/analytics/financial-overview")
    print("- GET/POST /api/budget-goals")
    print("- GET/POST /api/accounts")
    
    app.run(debug=True, host='0.0.0.0', port=5000)