// API endpoints configuration
const API_BASE_URL = 'http://localhost:5000/api';  // Adjust this to match your backend URL

export const fetchTransactions = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/transactions`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
};

export const fetchRecurringTransactions = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/recurring-transactions`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching recurring transactions:', error);
    return [];
  }
};

export const fetchFinancialOverview = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/financial-overview`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching financial overview:', error);
    return {
      totalIncome: 0,
      totalExpenses: 0,
      netSavings: 0,
      monthlyBudget: 0
    };
  }
};
