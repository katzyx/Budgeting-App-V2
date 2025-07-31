// frontend/src/BudgetTracker.js
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Calendar, Plus, Edit, Trash2, Save, X, Target, PiggyBank, Building, RefreshCw } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

const BudgetTracker = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [chartView, setChartView] = useState('month');
  const [chartType, setChartType] = useState('bar');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // State management
  const [transactions, setTransactions] = useState([]);
  const [financialOverview, setFinancialOverview] = useState({
    income: 0,
    expenses: 0,
    savings: 0,
    debt: 12500,
    netWorth: 25750
  });
  const [spendingData, setSpendingData] = useState([]);
  const [budgetGoals, setBudgetGoals] = useState({
    monthlyIncome: 5200,
    debtPayments: 800,
    savings: 1000,
    investments: 600,
    discretionary: 2800
  });
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // Transaction form states
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [newTransaction, setNewTransaction] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    type: 'expense',
    category: 'Groceries',
    notes: ''
  });

  // API functions
  const apiCall = async (endpoint, options = {}) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API call failed:', error);
      setError(error.message);
      throw error;
    }
  };

  const fetchTransactions = async () => {
    try {
      const data = await apiCall('/transactions');
      setTransactions(data);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  };

  const fetchFinancialOverview = async () => {
    try {
      const data = await apiCall('/analytics/financial-overview');
      setFinancialOverview(data);
    } catch (error) {
      console.error('Failed to fetch financial overview:', error);
    }
  };

  const fetchSpendingData = async (period = 'month') => {
    try {
      const data = await apiCall(`/analytics/spending-by-category?period=${period}`);
      const colors = ['#f4b8d4', '#a8c8ec', '#c7e2c8', '#f1f0b0', '#f4b8d4', '#a8c8ec', '#c7e2c8', '#f1f0b0', '#f4b8d4'];
      const dataWithColors = data.map((item, index) => ({
        ...item,
        color: colors[index % colors.length]
      }));
      setSpendingData(dataWithColors);
    } catch (error) {
      console.error('Failed to fetch spending data:', error);
    }
  };

  const fetchBudgetGoals = async () => {
    try {
      const data = await apiCall('/budget-goals');
      setBudgetGoals(data);
    } catch (error) {
      console.error('Failed to fetch budget goals:', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const data = await apiCall('/accounts');
      setAccounts(data);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await apiCall('/categories');
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchTransactions(),
          fetchFinancialOverview(),
          fetchSpendingData(),
          fetchBudgetGoals(),
          fetchAccounts(),
          fetchCategories()
        ]);
      } catch (error) {
        console.error('Failed to load initial data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Refresh spending data when chart view changes
  useEffect(() => {
    fetchSpendingData(chartView);
  }, [chartView]);

  // Transaction functions
  const addTransaction = async () => {
    if (!newTransaction.description || !newTransaction.amount) return;
    
    try {
      const transactionData = {
        ...newTransaction,
        amount: newTransaction.type === 'expense' ? -Math.abs(parseFloat(newTransaction.amount)) : Math.abs(parseFloat(newTransaction.amount))
      };
      
      await apiCall('/transactions', {
        method: 'POST',
        body: JSON.stringify(transactionData),
      });
      
      // Reset form and refresh data
      setNewTransaction({
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: '',
        type: 'expense',
        category: categories[0] || 'Groceries',
        notes: ''
      });
      setShowTransactionForm(false);
      
      // Refresh data
      await Promise.all([
        fetchTransactions(),
        fetchFinancialOverview(),
        fetchSpendingData(chartView)
      ]);
    } catch (error) {
      console.error('Failed to add transaction:', error);
    }
  };

  const updateTransaction = async () => {
    if (!editingTransaction.description || !editingTransaction.amount) return;
    
    try {
      const transactionData = {
        ...editingTransaction,
        amount: editingTransaction.type === 'expense' ? -Math.abs(parseFloat(editingTransaction.amount)) : Math.abs(parseFloat(editingTransaction.amount))
      };
      
      await apiCall(`/transactions/${editingTransaction.id}`, {
        method: 'PUT',
        body: JSON.stringify(transactionData),
      });
      
      setEditingTransaction(null);
      
      // Refresh data
      await Promise.all([
        fetchTransactions(),
        fetchFinancialOverview(),
        fetchSpendingData(chartView)
      ]);
    } catch (error) {
      console.error('Failed to update transaction:', error);
    }
  };

  const deleteTransaction = async (id) => {
    try {
      await apiCall(`/transactions/${id}`, {
        method: 'DELETE',
      });
      
      // Refresh data
      await Promise.all([
        fetchTransactions(),
        fetchFinancialOverview(),
        fetchSpendingData(chartView)
      ]);
    } catch (error) {
      console.error('Failed to delete transaction:', error);
    }
  };

  const updateBudgetGoals = async (newGoals) => {
    try {
      await apiCall('/budget-goals', {
        method: 'POST',
        body: JSON.stringify(newGoals),
      });
      setBudgetGoals(newGoals);
    } catch (error) {
      console.error('Failed to update budget goals:', error);
    }
  };

  // UI Components
  const StatCard = ({ title, amount, icon: Icon, bgColor = '#f4b8d4', textColor = 'text-gray-900' }) => (
    <div className="rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow" style={{ backgroundColor: bgColor }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Icon className="h-4 w-4 text-gray-600" />
          <h3 className="text-gray-600 font-medium text-sm">{title}</h3>
        </div>
      </div>
      <p className={`text-xl font-bold ${textColor}`}>
        ${amount.toLocaleString()}
      </p>
    </div>
  );

  const Navigation = () => (
    <nav className="bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">Finance Tracker</h1>
            {loading && <RefreshCw className="h-4 w-4 animate-spin text-gray-500" />}
          </div>
          <div className="flex space-x-8">
            {['dashboard', 'transactions', 'health'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-2 rounded-lg font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                style={{
                  backgroundColor: activeTab === tab ? '#f4b8d4' : 'transparent'
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );

  const TransactionForm = ({ transaction, onSave, onCancel, isEditing = false }) => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold mb-4">{isEditing ? 'Edit Transaction' : 'Add New Transaction'}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={transaction.date}
            onChange={(e) => isEditing 
              ? setEditingTransaction({...transaction, date: e.target.value})
              : setNewTransaction({...transaction, date: e.target.value})
            }
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <input
            type="text"
            value={transaction.description}
            onChange={(e) => isEditing 
              ? setEditingTransaction({...transaction, description: e.target.value})
              : setNewTransaction({...transaction, description: e.target.value})
            }
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-transparent"
            placeholder="Enter description"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
          <input
            type="number"
            step="0.01"
            value={Math.abs(transaction.amount) || ''}
            onChange={(e) => isEditing 
              ? setEditingTransaction({...transaction, amount: e.target.value})
              : setNewTransaction({...transaction, amount: e.target.value})
            }
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-transparent"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            value={transaction.type}
            onChange={(e) => isEditing 
              ? setEditingTransaction({...transaction, type: e.target.value})
              : setNewTransaction({...transaction, type: e.target.value})
            }
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-transparent"
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={transaction.category}
            onChange={(e) => isEditing 
              ? setEditingTransaction({...transaction, category: e.target.value})
              : setNewTransaction({...transaction, category: e.target.value})
            }
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-transparent"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
          <textarea
            value={transaction.notes || ''}
            onChange={(e) => isEditing 
              ? setEditingTransaction({...transaction, notes: e.target.value})
              : setNewTransaction({...transaction, notes: e.target.value})
            }
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-transparent"
            rows="2"
            placeholder="Add any additional notes"
          />
        </div>
      </div>
      <div className="flex justify-end space-x-2 mt-4">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <X className="h-4 w-4 inline mr-1" />
          Cancel
        </button>
        <button
          onClick={onSave}
          className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#f4b8d4' }}
        >
          <Save className="h-4 w-4 inline mr-1" />
          {isEditing ? 'Update' : 'Add'} Transaction
        </button>
      </div>
    </div>
  );

  const Dashboard = () => (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {error}
          <button 
            onClick={() => setError(null)}
            className="float-right text-red-700 hover:text-red-900"
          >
            ×
          </button>
        </div>
      )}

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Income"
          amount={Math.round(financialOverview.income)}
          icon={TrendingUp}
          bgColor="#c7e2c8"
          textColor="text-gray-900"
        />
        <StatCard
          title="Total Expenses"
          amount={Math.round(financialOverview.expenses)}
          icon={TrendingDown}
          bgColor="#f4b8d4"
          textColor="text-red-600"
        />
        <StatCard
          title="Savings"
          amount={Math.round(financialOverview.savings)}
          icon={DollarSign}
          bgColor="#a8c8ec"
          textColor="text-gray-900"
        />
        <StatCard
          title="Debt"
          amount={financialOverview.debt}
          icon={CreditCard}
          bgColor="#f1f0b0"
          textColor="text-gray-900"
        />
        <StatCard
          title="Net Worth"
          amount={financialOverview.netWorth}
          icon={TrendingUp}
          bgColor="#f4b8d4"
          textColor="text-green-600"
        />
      </div>

      {/* Spending Analysis Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Spending by Category</h2>
          <div className="flex items-center space-x-4">
            {/* Time Period Filter */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {[
                { key: 'month', label: 'Month' },
                { key: '6months', label: '6 Months' },
                { key: 'year', label: 'Year' }
              ].map((period) => (
                <button
                  key={period.key}
                  onClick={() => setChartView(period.key)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    chartView === period.key
                      ? 'text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  style={{
                    backgroundColor: chartView === period.key ? '#f4b8d4' : 'transparent'
                  }}
                >
                  {period.label}
                </button>
              ))}
            </div>

            {/* Chart Type Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {[
                { key: 'bar', label: 'Bar' },
                { key: 'pie', label: 'Pie' }
              ].map((type) => (
                <button
                  key={type.key}
                  onClick={() => setChartType(type.key)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    chartType === type.key
                      ? 'text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  style={{
                    backgroundColor: chartType === type.key ? '#a8c8ec' : 'transparent'
                  }}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <BarChart data={spendingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="category" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis 
                  tickFormatter={(value) => `${value.toLocaleString()}`}
                  fontSize={12}
                />
                <Tooltip 
                  formatter={(value) => [`${value.toLocaleString()}`, 'Amount']}
                  labelStyle={{ color: '#374151' }}
                />
                <Bar dataKey="amount" fill="#f4b8d4" radius={[4, 4, 0, 0]}>
                  {spendingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <PieChart>
                <Pie
                  data={spendingData}
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  dataKey="amount"
                  label={({ category, percent }) => 
                    `${category} ${(percent * 100).toFixed(1)}%`
                  }
                  labelLine={false}
                >
                  {spendingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value.toLocaleString()}`} />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity Summary */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Activity</h2>
        <div className="space-y-4">
          {transactions.slice(0, 5).map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: '#f4b8d4' }}>
                  <Calendar className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{transaction.description}</p>
                  <p className="text-sm text-gray-500">{transaction.date} • {transaction.category}</p>
                </div>
              </div>
              <span className={`font-semibold ${
                transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const Transactions = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <button
          onClick={() => setShowTransactionForm(true)}
          className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#f4b8d4' }}
        >
          <Plus className="h-4 w-4 inline mr-1" />
          Add Transaction
        </button>
      </div>

      {(showTransactionForm || editingTransaction) && (
        <TransactionForm
          transaction={editingTransaction || newTransaction}
          onSave={editingTransaction ? updateTransaction : addTransaction}
          onCancel={() => {
            setShowTransactionForm(false);
            setEditingTransaction(null);
          }}
          isEditing={!!editingTransaction}
        />
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">All Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{transaction.description}</div>
                      {transaction.notes && <div className="text-sm text-gray-500">{transaction.notes}</div>}
                      {transaction.recurring_id && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Recurring</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-semibold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      transaction.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {transaction.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => setEditingTransaction({...transaction, amount: Math.abs(transaction.amount)})}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteTransaction(transaction.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const FinancialHealth = () => {
    const totalAllocated = budgetGoals.debtPayments + budgetGoals.savings + budgetGoals.investments + budgetGoals.discretionary;
    const remaining = budgetGoals.monthlyIncome - totalAllocated;

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Financial Health</h1>

        {/* Budget Overview */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Monthly Budget Goals</h2>
            <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
              remaining === 0 ? 'bg-green-100 text-green-800' : remaining > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
            }`}>
              {remaining === 0 ? 'Fully Allocated' : remaining > 0 ? `${remaining} Unallocated` : `${Math.abs(remaining)} Over Budget`}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#f4b8d4' }}>
              <Target className="h-6 w-6 text-gray-600 mb-2" />
              <h3 className="text-sm font-medium text-gray-600">Debt Payments</h3>
              <p className="text-xl font-bold text-gray-900">${budgetGoals.debtPayments}</p>
            </div>
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#a8c8ec' }}>
              <PiggyBank className="h-6 w-6 text-gray-600 mb-2" />
              <h3 className="text-sm font-medium text-gray-600">Savings</h3>
              <p className="text-xl font-bold text-gray-900">${budgetGoals.savings}</p>
            </div>
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#c7e2c8' }}>
              <TrendingUp className="h-6 w-6 text-gray-600 mb-2" />
              <h3 className="text-sm font-medium text-gray-600">Investments</h3>
              <p className="text-xl font-bold text-gray-900">${budgetGoals.investments}</p>
            </div>
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#f1f0b0' }}>
              <DollarSign className="h-6 w-6 text-gray-600 mb-2" />
              <h3 className="text-sm font-medium text-gray-600">Discretionary</h3>
              <p className="text-xl font-bold text-gray-900">${budgetGoals.discretionary}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Monthly Income</span>
              <span className="text-sm font-bold text-gray-900">${budgetGoals.monthlyIncome}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className="h-4 rounded-full flex"
                style={{ width: '100%' }}
              >
                <div style={{ width: `${(budgetGoals.debtPayments / budgetGoals.monthlyIncome) * 100}%`, backgroundColor: '#f4b8d4' }}></div>
                <div style={{ width: `${(budgetGoals.savings / budgetGoals.monthlyIncome) * 100}%`, backgroundColor: '#a8c8ec' }}></div>
                <div style={{ width: `${(budgetGoals.investments / budgetGoals.monthlyIncome) * 100}%`, backgroundColor: '#c7e2c8' }}></div>
                <div style={{ width: `${(budgetGoals.discretionary / budgetGoals.monthlyIncome) * 100}%`, backgroundColor: '#f1f0b0' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Investment Accounts */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Investment & Savings Accounts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {accounts.map((account) => (
              <div key={account.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Building className="h-5 w-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">{account.name}</h3>
                  </div>
                  <span className="text-xs text-gray-500">{account.type}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Balance</span>
                    <span className="text-sm font-bold text-gray-900">${account.balance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Monthly Contribution</span>
                    <span className="text-sm font-medium text-green-600">${account.monthly_contribution}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Budget Goals Editor */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Adjust Budget Goals</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Income</label>
              <input
                type="number"
                value={budgetGoals.monthlyIncome}
                onChange={(e) => {
                  const newGoals = {...budgetGoals, monthlyIncome: parseFloat(e.target.value) || 0};
                  setBudgetGoals(newGoals);
                  updateBudgetGoals(newGoals);
                }}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Debt Payments</label>
              <input
                type="number"
                value={budgetGoals.debtPayments}
                onChange={(e) => {
                  const newGoals = {...budgetGoals, debtPayments: parseFloat(e.target.value) || 0};
                  setBudgetGoals(newGoals);
                  updateBudgetGoals(newGoals);
                }}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Savings</label>
              <input
                type="number"
                value={budgetGoals.savings}
                onChange={(e) => {
                  const newGoals = {...budgetGoals, savings: parse