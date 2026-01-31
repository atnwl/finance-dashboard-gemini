import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine
} from 'recharts';
import {
  Plus, Trash2, Edit2, TrendingUp, TrendingDown, CreditCard,
  DollarSign, Activity, Wallet, Bell, Search, LayoutDashboard,
  MessageSquare, Send, X, Settings, Sparkles, User, Bot, AlertCircle, Camera, Loader2,
  Cloud, Upload, Download, LogOut, FileText, ChevronRight, FileX
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GoogleGenerativeAI } from "@google/generative-ai";
import ReactMarkdown from 'react-markdown';
import { supabase } from './utils/supabase';
import { encryptData, decryptData } from './utils/crypto';

// --- Utils ---
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const INCOME_CATEGORIES = [
  'Freelance', 'Gift', 'Investments', 'Refund', 'Salary', 'Transfer', 'Other'
];

const EXPENSE_CATEGORIES = [
  'Alcohol', 'Amazon', 'Apps/Software', 'Buy Now Pay Later', 'Credit Card Payment', 'Entertainment', 'Fees', 'Furnishings', 'Gas', 'Gifts', 'Groceries', 'Health', 'Housing', 'Insurance',
  'Kids: Activities', 'Kids: Clothes', 'Kids: Toys', 'Personal', 'Restaurants', 'Shopping', 'Student Loans', 'Taxes', 'Transfer', 'Travel', 'Utilities', 'Other'
];

const COLORS = ['#8DAA7F', '#88A0AF', '#D67C7C', '#D4A373', '#6B705C', '#A5A58D', '#9B8AA5', '#D4A5A5', '#7AA67A'];

const isRecurring = (item) => item.frequency !== 'one-time';

const getCategoryIcon = (category) => {
  const map = {
    'Amazon': '📦', 'Alcohol': '🍺', 'Apps/Software': '💻', 'Fees': '💸', 'Furnishings': '🛋️', 'Gifts': '🎁', 'Insurance': '🛡️', 'Taxes': '🏛️', 'Travel': '✈️',
    'Housing': '🏠', 'Groceries': '🛒', 'Restaurants': '🍔', 'Gas': '⛽', 'Utilities': '💡',
    'Entertainment': '🎬', 'Health': '❤️', 'Shopping': '🛍️', 'Personal': '👤',
    'Kids: Clothes': '👕', 'Kids: Toys': '🧸', 'Kids: Activities': '🎨',
    'Student Loans': '🎓', 'Buy Now Pay Later': '💳', 'Credit Card Payment': '💳',
    'Transfer': '🔄',
    'Salary': '💵', 'Freelance': '💻', 'Investments': '📈', 'Other': '📦'
  };
  return map[category] || '📦';
};

// --- Components ---

const Card = ({ children, className }) => (
  <div className={cn("bg-card border border-border rounded-2xl p-6 shadow-sm", className)}>
    {children}
  </div>
);

const Button = ({ children, variant = 'primary', className, ...props }) => {
  const baseStyles = "flex items-center justify-center px-4 py-2 rounded-xl font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: "bg-primary text-black hover:bg-primary/90 shadow-lg shadow-primary/20",
    outline: "border border-border text-muted hover:text-text hover:border-gray-600",
    ghost: "text-muted hover:text-text hover:bg-white/5",
    danger: "bg-danger/10 text-danger hover:bg-danger/20",
  };
  return (
    <button className={cn(baseStyles, variants[variant], className)} {...props}>
      {children}
    </button>
  );
};

const Input = ({ label, ...props }) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-xs font-semibold text-muted uppercase tracking-wider">{label}</label>}
    <input
      className={cn(
        "bg-background border border-border rounded-xl px-4 py-3 text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-gray-600 w-full",
        props.className
      )}
      style={props.type === 'date' ? { colorScheme: 'dark' } : {}}
      {...props}
    />
  </div>
);

const Select = ({ label, options, ...props }) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-xs font-semibold text-muted uppercase tracking-wider">{label}</label>}
    <div className="relative">
      <select
        className={cn(
          "w-full bg-[#0F1115] border border-border rounded-xl px-4 py-3 text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none transition-all cursor-pointer",
          props.className
        )}
        style={{
          WebkitAppearance: 'none',
          MozAppearance: 'none',
          appearance: 'none',
          backgroundColor: '#0F1115' // explicit styling
        }}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value} style={{ backgroundColor: '#0F1115', color: '#E5E7EB' }}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
      </div>
    </div>
  </div>
);

// --- Chat Component ---
const ChatWindow = ({ isOpen, onClose, data, financials, onAddItem, user, onLogin, onLogout, onSync, onRestore, syncStatus }) => {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('chatHistory');
    return saved ? JSON.parse(saved) : [{ role: 'model', text: "Hi! I'm your finance assistant. Ask me anything about your dashboard data." }];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('geminiApiKey') || '');
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(messages));
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSaveKey = (key) => {
    localStorage.setItem('geminiApiKey', key);
    setApiKey(key);
    setShowSettings(false);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    if (!apiKey) {
      setShowSettings(true);
      return;
    }

    const userMsg = { role: 'user', text: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const context = `
        You are a helpful financial assistant analyzing the user's personal finance dashboard.
        
        CURRENT DATA:
        - Total Monthly Income: $${financials.totalIncome.toFixed(2)}
        - Total Monthly Expenses: $${financials.totalExpenses.toFixed(2)}
        - Net Cash Flow: $${financials.net.toFixed(2)}
        - Expense Breakdown by Category: ${JSON.stringify(financials.byCategory)}
        - Transaction Count: ${data.income.length + data.expenses.length}
        - Subscriptions: ${data.expenses.filter(e => e.type === 'subscription').length}
        
        Raw Data (Sample):
        Income: ${JSON.stringify(data.income.slice(0, 5))}...
        Expenses: ${JSON.stringify(data.expenses.slice(0, 5))}...

        Answer the user's question concisely based on this data. formatting: use markdown.

        AVAILABLE CATEGORIES:
        - Income: ${INCOME_CATEGORIES.join(', ')}
        - Expenses: ${EXPENSE_CATEGORIES.join(', ')}

        ACTIONABLE POWER: 
        You can ADD transactions for the user. If they ask you to record something, explain that you've done it and include this EXACT JSON block at the bottom of your response:
        \`\`\`json
        {
          "action": "add_transaction",
          "data": {
            "name": "Merchant Name",
            "amount": 0.00,
            "date": "YYYY-MM-DD",
            "category": "One of the categories above",
            "isIncome": true/false,
            "frequency": "one-time",
            "type": "variable"
          }
        }
        \`\`\`

        You can also SET CATEGORY RULES. If a user says "Always categorize X as Y", include this JSON:
        \`\`\`json
        {
          "action": "update_rule",
          "data": {
            "name": "Merchant Name",
            "category": "Category",
            "isIncome": true/false
          }
        }
        \`\`\`
      `;

      // Filter history to ensure it starts with role 'user' (Gemini requirement)
      let historyItems = newMessages.slice(0, -1).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      const firstUserIdx = historyItems.findIndex(h => h.role === 'user');
      if (firstUserIdx !== -1) {
        historyItems = historyItems.slice(firstUserIdx);
      } else {
        historyItems = [];
      }

      const chat = model.startChat({
        history: historyItems.slice(-10), // keep limited context
      });

      const result = await chat.sendMessage(context + "\n\nUser Question: " + input);
      const response = await result.response;
      const text = response.text();

      // Check for AI Actions
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          const actionData = JSON.parse(jsonMatch[1]);
          if (actionData.action === 'add_transaction' && onAddItem) {
            onAddItem(actionData.data);
            console.log("AI added transaction:", actionData.data);
          }
          if (actionData.action === 'update_rule') {
            const cache = JSON.parse(localStorage.getItem('intelligenceCache') || '{}');
            cache[actionData.data.name.toLowerCase().trim()] = {
              category: actionData.data.category,
              isIncome: actionData.data.isIncome,
              type: 'variable',
              frequency: 'one-time'
            };
            localStorage.setItem('intelligenceCache', JSON.stringify(cache));
            console.log("AI updated rule:", actionData.data);
          }
        } catch (e) {
          console.error("AI Action JSON parse failed", e);
        }
      }

      setMessages(prev => [...prev, { role: 'model', text }]);
    } catch (error) {
      console.error("Chat Error:", error);
      const msg = error.message || "Unknown error";
      setMessages(prev => [...prev, { role: 'model', text: `Error: Could not connect to Gemini (${msg}). Please check your API Key and network.` }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 w-[90vw] md:w-[400px] h-[600px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
      {/* Header */}
      <div className="p-4 border-b border-border flex justify-between items-center bg-card rounded-t-2xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-secondary/50 flex items-center justify-center">
            <Sparkles size={16} className="text-black fill-current" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Gemini Assistant</h3>
            <p className="text-[10px] text-muted flex items-center gap-1">
              {localStorage.getItem('geminiApiKey') ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Online
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-danger" /> Offline (Missing Key)
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowSettings(!showSettings)} className="p-2 hover:bg-white/5 rounded-lg text-muted hover:text-text transition-colors">
            <Settings size={18} />
          </button>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-muted hover:text-text transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Settings Overlay */}
      {/* Settings Overlay */}
      {showSettings && (
        <div className="absolute inset-0 bg-card/95 backdrop-blur z-20 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <Settings size={32} className="text-muted mb-4" />
          <h3 className="font-bold text-lg mb-2">Settings Moved</h3>
          <p className="text-sm text-muted mb-6 max-w-[250px]">
            API keys and sync options are now available in the <strong>user menu</strong> (top-right avatar).
          </p>
          <Button variant="ghost" className="w-full" onClick={() => setShowSettings(false)}>Got it</Button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={cn("flex gap-3", msg.role === 'user' ? "flex-row-reverse" : "")}>
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
              msg.role === 'user' ? "bg-muted text-black" : "bg-primary/20 text-primary"
            )}>
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div className={cn(
              "p-3 rounded-2xl text-sm max-w-[80%]",
              msg.role === 'user' ? "bg-primary text-black rounded-tr-sm" : "bg-border/50 text-text rounded-tl-sm"
            )}>
              <ReactMarkdown
                components={{
                  p: ({ node, ...props }) => <p className="mb-1 last:mb-0" {...props} />,
                  ul: ({ node, ...props }) => <ul className="list-disc ml-4 mb-2" {...props} />,
                  li: ({ node, ...props }) => <li className="mb-0.5" {...props} />,
                  strong: ({ node, ...props }) => <span className="font-bold opacity-90" {...props} />,
                }}
              >
                {msg.text}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-primary"><Bot size={14} /></div>
            <div className="p-3 rounded-2xl bg-border/50 rounded-tl-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex items-center gap-2 bg-background border border-border rounded-xl px-2 py-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all shadow-inner"
        >
          <input
            className="flex-1 bg-transparent border-none focus:ring-0 px-2 text-sm text-text placeholder:text-muted/50"
            placeholder="Ask about your finances..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2 bg-primary text-black rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:grayscale transition-all active:scale-95"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};


// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [data, setData] = useState({ income: [], expenses: [], statements: [] });

  // Date Filtering State
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingStatement, setPendingStatement] = useState(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState(null);
  const [syncStatus, setSyncStatus] = useState('');

  // User Menu State
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [syncPassword, setSyncPassword] = useState('');
  const [lastBackupTime, setLastBackupTime] = useState(() => {
    const saved = localStorage.getItem('lastBackupTime');
    return saved ? new Date(saved) : null;
  });
  const [showDevMenu, setShowDevMenu] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('geminiApiKey') || '');
  const userMenuRef = useRef(null);

  // Auth State Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // One-time Legacy Data Wipe (Per User Request)
  useEffect(() => {
    const hasWiped = localStorage.getItem('hasWipedLegacyData_v2');
    if (!hasWiped) {
      localStorage.removeItem('financeData');
      setData({ income: [], expenses: [], statements: [] }); // Reset state
      localStorage.setItem('hasWipedLegacyData_v2', 'true');
      console.log("Legacy data wiped for fresh start.");
    } else {
      // Load data normally if already wiped
      const saved = localStorage.getItem('financeData');
      if (saved) {
        try {
          setData({ income: [], expenses: [], statements: [], ...JSON.parse(saved) });
        } catch (e) {
          console.error("Failed to load data", e);
        }
      }
    }
    setIsLoaded(true);
  }, []);

  // Save Data
  useEffect(() => {
    if (isLoaded && localStorage.getItem('hasWipedLegacyData_v2')) {
      localStorage.setItem('financeData', JSON.stringify(data));
    }
  }, [data, isLoaded]);

  // Persistence & Migration (Add IDs if missing)
  // Migration / ID Check (runs on load/change) - Keep mostly for ID generation ensuring
  useEffect(() => {
    let hasChanges = false;
    const migrate = (arr) => arr.map(item => {
      let newItem = { ...item };
      if (!newItem.id) {
        hasChanges = true;
        newItem.id = crypto.randomUUID();
      }
      if (!newItem.date) {
        hasChanges = true;
        newItem.date = new Date().toISOString().split('T')[0];
      }
      return newItem;
    });

    const newIncome = migrate(data.income);
    const newExpenses = migrate(data.expenses);

    if (hasChanges) {
      setData({ income: newIncome, expenses: newExpenses });
    }
  }, [data.income.length, data.expenses.length]); // Only run when counts change to avoid loops

  // Derived Data
  const normalizeToMonthly = (amount, frequency) => {
    const amt = parseFloat(amount);
    if (isNaN(amt)) return 0;
    const map = {
      'weekly': 52 / 12,
      'biweekly': 26 / 12,
      'monthly': 1,
      'quarterly': 1 / 3,
      'annual': 1 / 12,
      'one-time': 1 // Assuming one-time expenses count fully against the current month's budget
    };
    return amt * (map[frequency] || 0);
  };

  const financials = useMemo(() => {
    // Filter data by selected Month and Year
    const filterByDate = (item) => {
      if (!item.date) return false; // Should have date from migration, but safety first
      const d = new Date(item.date);
      // Adjust for timezone issues by effectively treating the string YYYY-MM-DD as local
      // Or simply parsing the string parts to avoid timezone shifts
      const [y, m] = item.date.split('-').map(Number);
      return (m - 1) === selectedMonth && y === selectedYear;
    };

    const monthlyIncome = data.income.filter(filterByDate);
    const monthlyExpenses = data.expenses.filter(filterByDate);

    // Helpers
    const isRecurring = (item) => item.frequency !== 'one-time';
    const isSpecial = (item) => item.category === 'Transfer' || item.category === 'Credit Card Payment';
    const notSpecial = (item) => !isSpecial(item);

    // Calculate totals - Now we sum ACTUAL amounts for the month, or logic for recurring?
    // User asked: "monthly income... should only reflect that month".
    // Strategy:
    // ... logic ...

    // Income
    const recurringIncome = data.income.filter(i => isRecurring(i) && notSpecial(i));
    const oneTimeIncome = data.income.filter(i => !isRecurring(i) && filterByDate(i) && notSpecial(i));
    const effectiveIncome = [...recurringIncome, ...oneTimeIncome];

    // 1. SMART RECURRING CALCULATION (Deduplicated & Latest)
    const uniqueRecurring = {};
    const NOW = new Date();

    // Group Expenses by Merchant (Latest wins)
    data.expenses
      .filter(e => isRecurring(e) && notSpecial(e))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .forEach(item => { uniqueRecurring[item.name.toLowerCase().trim()] = item; });

    // Filter for Active (Recency Check)
    const activeRecurringItems = Object.values(uniqueRecurring).filter(item => {
      const itemDate = new Date(item.date);
      const daysSince = (NOW - itemDate) / (1000 * 60 * 60 * 24);
      if (item.frequency === 'monthly' && daysSince > 60) return false;
      return true;
    });

    const totalRecurringExpenses = activeRecurringItems.reduce((acc, item) => acc + normalizeToMonthly(item.amount, item.frequency), 0);

    // Subscriptions Specifics (Subset of Active Recurring)
    const activeSubscriptions = activeRecurringItems.filter(i => i.type === 'subscription');
    const totalSubscriptionsCost = activeSubscriptions.reduce((acc, item) => acc + normalizeToMonthly(item.amount, item.frequency), 0);
    const activeSubscriptionCount = activeSubscriptions.length;

    // 2. Standard Expenses
    const recurringExpenses = data.expenses.filter(e => isRecurring(e) && notSpecial(e));
    const oneTimeExpenses = data.expenses.filter(e => !isRecurring(e) && filterByDate(e) && notSpecial(e));
    const effectiveExpenses = [...recurringExpenses, ...oneTimeExpenses];

    const totalIncome = effectiveIncome.reduce((acc, item) => acc + normalizeToMonthly(item.amount, item.frequency), 0);
    const totalExpenses = effectiveExpenses.reduce((acc, item) => acc + normalizeToMonthly(item.amount, item.frequency), 0);
    const net = totalIncome - totalExpenses;



    const totalCcPayments = data.expenses
      .filter(e => e.category === 'Credit Card Payment' && filterByDate(e))
      .reduce((acc, item) => acc + parseFloat(item.amount || 0), 0);

    // Group expenses by category
    const byCategory = effectiveExpenses.reduce((acc, item) => {
      const amt = normalizeToMonthly(item.amount, item.frequency);
      acc[item.category] = (acc[item.category] || 0) + amt;
      return acc;
    }, {});

    // Calculate Yearly Data for Chart (Dynamic)
    const yearlyData = MONTHS.map((monthName, index) => {
      const monthFilter = (item) => {
        if (!item.date) return false;
        const [y, m] = item.date.split('-').map(Number);
        return (m - 1) === index && y === selectedYear;
      };

      // Recurring logic applies to all months
      const mRecurringInc = data.income.filter(i => isRecurring(i) && notSpecial(i)).reduce((acc, i) => acc + normalizeToMonthly(i.amount, i.frequency), 0);
      const mRecurringExp = totalRecurringExpenses;

      // One-time logic specific to this month
      const mOneTimeInc = data.income.filter(i => !isRecurring(i) && monthFilter(i) && notSpecial(i)).reduce((acc, i) => acc + parseFloat(i.amount), 0);
      const mOneTimeExp = data.expenses.filter(e => !isRecurring(e) && monthFilter(e) && notSpecial(e)).reduce((acc, e) => acc + parseFloat(e.amount), 0);

      const inc = mRecurringInc + mOneTimeInc;
      const exp = mRecurringExp + mOneTimeExp;

      // Show all months that have recurring OR one-time data, or just show all 12 for alignment
      const shouldShow = true;

      return {
        name: monthName.slice(0, 3),
        year: selectedYear,
        income: inc,
        expenses: exp,
        hasData: shouldShow
      };
    });

    // Calculate Total Recurring for Budget Line (Smart)
    // 1. Group by Merchant Name (normalized)
    // 2. Take only the LATEST transaction

    return { totalIncome, totalExpenses, totalCcPayments, net, byCategory, totalSubscriptionsCost, activeSubscriptionCount, yearlyData, totalRecurringExpenses };
  }, [data, selectedMonth, selectedYear]);

  // Handlers
  const handleDelete = (type, id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    setData(prev => ({
      ...prev,
      [type]: prev[type].filter(item => item.id !== id)
    }));
  };

  const handleSave = (item) => {
    // Remove transient UI flags
    const cleanItem = { ...item };
    const type = cleanItem.isIncome ? 'income' : 'expenses';
    delete cleanItem.isIncome;
    delete cleanItem.originalIndex;

    // Ensure ID
    if (!cleanItem.id) cleanItem.id = crypto.randomUUID();

    // Update Intelligence Cache
    if (cleanItem.name && cleanItem.name.length >= 3) {
      const cache = JSON.parse(localStorage.getItem('intelligenceCache') || '{}');
      cache[cleanItem.name.toLowerCase().trim()] = {
        category: cleanItem.category,
        frequency: cleanItem.frequency, // Save frequency preference!
        isIncome: cleanItem.isIncome,
        type: cleanItem.type
      };
      localStorage.setItem('intelligenceCache', JSON.stringify(cache));
    }

    setData(prev => {
      const newData = { ...prev };

      if (editingItem) {
        const originalType = editingItem.isIncome ? 'income' : 'expenses';

        if (originalType === type) {
          // Same list update
          newData[type] = prev[type].map(x => x.id === cleanItem.id ? cleanItem : x);
        } else {
          // Move logic: remove from old, add to new
          newData[originalType] = prev[originalType].filter(x => x.id !== cleanItem.id);
          newData[type] = [...prev[type], cleanItem];
        }
      } else {
        // Add new
        newData[type] = [...prev[type], cleanItem];
      }
      return newData;
    });

    // Update Intelligence Cache with User's Truth
    if (cleanItem.name && cleanItem.name.length >= 3) {
      const cache = JSON.parse(localStorage.getItem('intelligenceCache') || '{}');
      cache[cleanItem.name.toLowerCase().trim()] = {
        category: cleanItem.category,
        frequency: cleanItem.frequency,
        isIncome: type === 'income',
        type: cleanItem.type
      };
      localStorage.setItem('intelligenceCache', JSON.stringify(cache));
    }

    setIsFormOpen(false);
    setEditingItem(null);
  };

  const handleSaveStatement = (stmt) => {
    setData(prev => ({ ...prev, statements: [...(prev.statements || []), stmt] }));
  };

  const handleDeleteStatement = (id, includeTransactions = false) => {
    const msg = includeTransactions
      ? "WARNING: This will delete the statement record AND all transactions imported from it.\n\nAre you sure you want to proceed?"
      : "Remove this statement record? \n\nNote: This only removes the entry from this list. Imported transactions will be KEPT in your dashboard.";

    if (window.confirm(msg)) {
      setData(prev => {
        const next = {
          ...prev,
          statements: prev.statements.filter(s => s.id !== id)
        };

        if (includeTransactions) {
          next.income = prev.income.filter(i => i.statementId !== id);
          next.expenses = prev.expenses.filter(i => i.statementId !== id);
        }

        return next;
      });
    }
  };

  // --- Auth & Sync Handlers ---
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          prompt: 'consent'  // Force GitHub to show auth screen (allows switching accounts)
        }
      }
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleSync = async (password) => {
    if (!user) return;
    setSyncStatus('Encrypting...');
    try {
      const encrypted = await encryptData(data, password);
      setSyncStatus('Uploading...');

      const now = new Date().toISOString();
      const { error } = await supabase
        .from('sync_store')
        .upsert({
          id: user.id,
          encrypted_blob: JSON.stringify(encrypted),
          updated_at: now
        });

      if (error) throw error;

      // Update local freshness tracker
      const backupDate = new Date(now);
      setLastBackupTime(backupDate);
      localStorage.setItem('lastBackupTime', now);

      setSyncStatus('Success: Backup Complete');
      setTimeout(() => setSyncStatus(''), 3000);
    } catch (err) {
      console.error(err);
      setSyncStatus('Error: ' + err.message);
    }
  };

  const handleRestore = async (password) => {
    if (!user) return;
    setSyncStatus('Downloading...');
    try {
      const { data: rows, error } = await supabase
        .from('sync_store')
        .select('encrypted_blob, updated_at')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (!rows) throw new Error("No backup found");

      setSyncStatus('Decrypting...');
      const decrypted = await decryptData(JSON.parse(rows.encrypted_blob), password);

      setData(decrypted);
      localStorage.setItem('financeData', JSON.stringify(decrypted));

      // Sync the freshness badge from server timestamp
      if (rows.updated_at) {
        const serverTime = new Date(rows.updated_at);
        setLastBackupTime(serverTime);
        localStorage.setItem('lastBackupTime', rows.updated_at);
      }

      setSyncStatus('Success: Data Restored');
      setTimeout(() => setSyncStatus(''), 3000);
      window.location.reload();
    } catch (err) {
      console.error(err);
      setSyncStatus('Error: ' + err.message);
    }
  };

  // Quick Backup (for Sync Card)
  const handleQuickBackup = async () => {
    if (!user) {
      setSyncStatus('Login required');
      return;
    }
    if (!syncPassword) {
      setSyncStatus('Enter password first');
      return;
    }
    await handleSync(syncPassword);
  };

  // Quick Restore (for Sync Card)
  const handleQuickRestore = async () => {
    if (!user) {
      setSyncStatus('Login required');
      return;
    }
    if (!syncPassword) {
      setSyncStatus('Enter password first');
      return;
    }
    await handleRestore(syncPassword);
  };

  // Delete All Transactions
  const handleDeleteAllData = () => {
    if (window.confirm('⚠️ Are you sure you want to delete ALL transactions?\\n\\nThis clears local data only. You can still restore from your cloud backup.')) {
      setData({ income: [], expenses: [] });
      localStorage.setItem('financeData', JSON.stringify({ income: [], expenses: [] }));
      setShowUserMenu(false);
      setSyncStatus('All transactions deleted');
      setTimeout(() => setSyncStatus(''), 3000);
    }
  };

  // Save Gemini API Key
  const handleSaveGeminiKey = () => {
    localStorage.setItem('geminiApiKey', geminiApiKey);
    setSyncStatus('API key saved!');
    setTimeout(() => setSyncStatus(''), 2000);
  };

  // Click-away handler for user menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
        setShowDevMenu(false);
      }
    };
    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  const openAddModal = () => {
    setEditingItem(null);
    setIsFormOpen(true);
  };

  const openEditModal = (item, type) => {
    setEditingItem({ ...item, type, isIncome: type === 'income' });
    setIsFormOpen(true);
  };

  // Renderers
  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Primary Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-card to-card/50 relative overflow-hidden group border-primary/10">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp size={48} />
          </div>
          <h3 className="text-muted text-sm font-medium">Monthly Income</h3>
          <p className="text-3xl font-bold mt-2 text-primary">${financials.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <div className="mt-4 text-xs text-primary/80 flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Income
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/50 relative overflow-hidden group border-secondary/10">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingDown size={48} />
          </div>
          <h3 className="text-muted text-sm font-medium">Monthly Expenses</h3>
          <p className="text-3xl font-bold mt-2 text-secondary">${financials.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <div className="mt-4 text-xs text-muted flex items-center gap-1">
            Excl. CC Payments
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet size={48} />
          </div>
          <h3 className="text-muted text-sm font-medium">Net Cash Flow</h3>
          <p className={cn("text-3xl font-bold mt-2", financials.net >= 0 ? "text-primary" : "text-danger")}>
            ${financials.net.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="mt-4 text-xs text-muted flex items-center gap-1">
            Available
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/50 relative overflow-hidden group border-white/5">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity size={48} />
          </div>
          <h3 className="text-muted text-sm font-medium">Subscriptions</h3>
          <p className="text-3xl font-bold mt-2 text-white">
            ${financials.totalSubscriptionsCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="mt-4 text-xs text-muted flex items-center gap-1">
            {financials.activeSubscriptionCount} active services
          </div>
        </Card>
      </div>

      {/* Secondary / Credit & Debt Tier */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card/30 border border-border/50 rounded-xl p-4 flex items-center justify-between group hover:border-secondary/30 transition-colors">
          <div>
            <h4 className="text-muted text-xs font-semibold uppercase tracking-wider mb-1">Credit Card Payments</h4>
            <p className="text-2xl font-bold text-secondary/90">${financials.totalCcPayments.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <CreditCard size={28} className="text-muted opacity-20 group-hover:opacity-40 transition-opacity" />
        </div>

        <div className="bg-card/30 border border-border/50 rounded-xl p-4 flex items-center justify-between group hover:border-secondary/30 transition-colors">
          <div>
            <h4 className="text-muted text-xs font-semibold uppercase tracking-wider mb-1">Credit Card Balances</h4>
            <p className="text-2xl font-bold text-white/40 italic text-sm">Coming Soon</p>
          </div>
          <Activity size={28} className="text-muted opacity-20 group-hover:opacity-40 transition-opacity" />
        </div>

        <div className="bg-card/30 border border-border/50 rounded-xl p-4 flex items-center justify-between group hover:border-purple-500/30 transition-colors">
          <div>
            <h4 className="text-muted text-xs font-semibold uppercase tracking-wider mb-1">Balance Transfers</h4>
            <p className="text-2xl font-bold text-white/40 italic text-sm">Coming Soon</p>
          </div>
          <TrendingDown size={28} className="text-muted opacity-20 group-hover:opacity-40 transition-opacity" />
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 min-h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Financial Overview</h3>

            {/* Date Filters */}
            <div className="flex gap-2">
              <span className="text-xs text-muted flex items-center px-2">
                Select bar to filter
              </span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-background border border-border text-xs rounded-lg px-2 py-1 outline-none focus:border-primary"
              >
                {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <Button onClick={() => setEditingItem(null) || setIsFormOpen(true)} className="w-10 h-10 !p-0 rounded-full flex items-center justify-center bg-primary text-black hover:scale-110 shadow-lg shadow-primary/25 ml-2">
                <Plus size={22} />
              </Button>
            </div>
          </div>
          <div className="h-[300px] w-full" style={{ outline: 'none' }}>
            <style>{`
              .recharts-wrapper { outline: none !important; }
              .recharts-surface:focus { outline: none !important; }
            `}</style>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                className="outline-none focus:outline-none"
                data={financials.yearlyData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                onClick={(e) => {
                  if (e) {
                    if (e.activeTooltipIndex !== undefined) {
                      setSelectedMonth(Number(e.activeTooltipIndex));
                    } else if (e.activeLabel) {
                      // Fallback: find index by name
                      const index = financials.yearlyData.findIndex(d => d.name === e.activeLabel);
                      if (index !== -1) setSelectedMonth(index);
                    }
                  }
                }}
                cursor="pointer"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10 }} dy={10} interval={0} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9CA3AF', fontSize: 11 }}
                  tickFormatter={(value) => value >= 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${value}`}
                />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[#161B21] border border-gray-700 p-3 rounded-lg shadow-xl">
                          <p className="text-gray-400 text-xs mb-2 font-medium">{label} {payload[0]?.payload?.year || ''}</p>
                          {payload.map((entry, index) => (
                            <div key={index} className="flex justify-between gap-4 text-sm">
                              <span style={{ color: entry.fill }}>
                                {entry.dataKey === 'income' ? 'Income' : 'Expenses'}
                              </span>
                              <span className="font-bold text-gray-200">
                                ${Number(entry.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine
                  y={financials.totalRecurringExpenses}
                  stroke="#D4A373"
                  strokeDasharray="3 3"
                  label={{
                    value: `Recurring: $${financials.totalRecurringExpenses.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
                    fill: "#D4A373",
                    fontSize: 10,
                    position: "insideTopRight"
                  }}
                />
                <Bar
                  key={`income-${selectedMonth}`}
                  dataKey="income"
                  radius={[4, 4, 0, 0]}
                  barSize={30}
                  isAnimationActive={false}
                >
                  {financials.yearlyData.map((entry, index) => {
                    const today = new Date();
                    const currentMonth = today.getMonth();
                    const currentYear = today.getFullYear();

                    const isPast = selectedYear < currentYear || (selectedYear === currentYear && index < currentMonth);
                    const isCurrent = selectedYear === currentYear && index === currentMonth;
                    const isFuture = selectedYear > currentYear || (selectedYear === currentYear && index > currentMonth);

                    const isSelected = index === selectedMonth;

                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={isPast ? "#334155" : isCurrent ? "#8DAA7F" : "#8DAA7F99"} // Primary (Moss Green)
                        stroke={isSelected ? "#ffffff" : "none"}
                        strokeWidth={isSelected ? 2 : 0}
                        fillOpacity={isSelected ? 1 : (isFuture ? 0.3 : 0.6)}
                      />
                    );
                  })}
                </Bar>
                <Bar
                  key={`expenses-${selectedMonth}`}
                  dataKey="expenses"
                  radius={[4, 4, 0, 0]}
                  barSize={30}
                  isAnimationActive={false}
                >
                  {financials.yearlyData.map((entry, index) => {
                    const today = new Date();
                    const currentMonth = today.getMonth();
                    const currentYear = today.getFullYear();

                    const isPast = selectedYear < currentYear || (selectedYear === currentYear && index < currentMonth);
                    const isCurrent = selectedYear === currentYear && index === currentMonth;
                    const isFuture = selectedYear > currentYear || (selectedYear === currentYear && index > currentMonth);

                    const isSelected = index === selectedMonth;

                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={isPast ? "#334155" : isCurrent ? "#88A0AF" : "#88A0AF99"} // Secondary (Steel Blue)
                        stroke={isSelected ? "#ffffff" : "none"}
                        strokeWidth={isSelected ? 2 : 0}
                        fillOpacity={isSelected ? 1 : (isFuture ? 0.3 : 0.6)}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="min-h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Expense Breakdown</h3>
          </div>
          <div className="h-[300px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={Object.entries(financials.byCategory)
                    .map(([name, value]) => ({ name, value }))
                    .sort((a, b) => b.value - a.value)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {Object.entries(financials.byCategory).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#161B21', borderColor: '#374151', borderRadius: '8px' }}
                  itemStyle={{ color: '#E5E7EB' }}
                  formatter={(value) => `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <span className="text-xs text-muted">Total</span>
              <p className="font-bold text-white">${financials.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            {Object.entries(financials.byCategory)
              .sort(([, a], [, b]) => b - a)
              .map(([name, value], idx) => (
                <div key={name} className="flex items-center gap-2 group relative cursor-help">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="text-muted truncate flex-1">{name}</span>
                  <span className="text-white font-medium shrink-0">
                    {Math.round(value / financials.totalExpenses * 100)}%
                  </span>
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-[#161B21] border border-border rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                    <p className="text-[10px] text-muted mb-0.5">{name}</p>
                    <p className="text-sm font-bold text-white">
                      ${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      </div>
    </div>
  );

  // --- Virtual Transactions Helper ---

  const getMonthlyItems = useMemo(() => {
    const today = new Date();
    const currentMonthIndex = today.getMonth();
    const currentYear = today.getFullYear();

    // Filter One-Time items for this specific month/year
    const monthFilter = (item) => {
      if (!item.date) return false;
      const [y, m] = item.date.split('-').map(Number);
      return (m - 1) === selectedMonth && y === selectedYear;
    };

    const oneTimeIncome = data.income.filter(i => !isRecurring(i) && monthFilter(i)).map(i => ({ ...i, _type: 'income', isVirtual: false }));
    const oneTimeExpenses = data.expenses.filter(e => !isRecurring(e) && monthFilter(e)).map(e => ({ ...e, _type: 'expenses', isVirtual: false }));

    // Generate Virtual Recurring Items
    // For each recurring item, IF it started before or during this month, allow it.
    // We assume recurring items are active indefinitely for now (simplified).
    const generateVirtual = (items, type) => items.filter(isRecurring).map(item => {
      // Create a virtual date for this month
      // Preserve the day of the month from the original date
      const [oy, om, od] = item.date.split('-').map(Number);
      // Handle day overflow (e.g. 31st in Feb) -> javascript Date object handles this (rolls over to Mar 1), which is fine/safe enough
      const virtualDate = new Date(selectedYear, selectedMonth, od);

      return {
        ...item,
        date: virtualDate.toISOString().split('T')[0],
        _type: type,
        isVirtual: true
        // id: item.id - Keep original ID for editing/deletion to work
      };
    });

    const virtualIncome = generateVirtual(data.income, 'income');
    const virtualExpenses = generateVirtual(data.expenses, 'expenses');

    const allItems = [...oneTimeIncome, ...oneTimeExpenses, ...virtualIncome, ...virtualExpenses];

    // Sort by Date Descending
    return allItems.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [data, selectedMonth, selectedYear]);

  // --- Render Functions ---

  const renderContent = () => {
    const isSearchActive = searchQuery.length >= 2;
    if (!isSearchActive && activeTab === 'dashboard') return renderDashboard();

    if (!isSearchActive && activeTab === 'statements') {
      // Group by unique account (provider + last4)
      const grouped = (data.statements || []).reduce((acc, s) => {
        const key = `${s.provider}-${s.last4 || 'unknown'}`;
        acc[key] = acc[key] || { provider: s.provider, last4: s.last4, statements: [] };
        acc[key].statements.push(s);
        return acc;
      }, {});

      // Sort accounts by most recent upload
      const sortedAccounts = Object.values(grouped).sort((a, b) => {
        const latestA = Math.max(...a.statements.map(s => new Date(s.uploadDate)));
        const latestB = Math.max(...b.statements.map(s => new Date(s.uploadDate)));
        return latestB - latestA;
      });

      return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-lg">Accounts & Statements</h2>
            <button
              onClick={() => {
                setEditingItem(null);
                setIsFormOpen(true);
              }}
              className="bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center transition-colors border border-primary/20"
            >
              <Upload size={14} className="mr-2" />
              Upload Statement
            </button>
          </div>
          {sortedAccounts.length === 0 ? (
            <div className="text-center py-12 text-muted">No statements uploaded yet.</div>
          ) : (
            <div className="space-y-4">
              {sortedAccounts.map((account) => (
                <AccountCard
                  key={`${account.provider}-${account.last4}`}
                  account={account}
                  onDelete={handleDeleteStatement}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    // Transactions / Subscriptions / Search Views
    const isSubView = activeTab === 'subscriptions';
    // isSearchActive defined at top

    const searchItems = isSearchActive ? [
      ...data.income.map(i => ({ ...i, _type: 'income' })),
      ...data.expenses.map(e => ({ ...e, _type: 'expenses' }))
    ].filter(item => {
      const q = searchQuery.toLowerCase();
      const matchesName = item.name.toLowerCase().includes(q);
      const matchesAmount = !isNaN(parseFloat(searchQuery)) && Math.abs(parseFloat(item.amount) - parseFloat(searchQuery)) < 0.01;
      return matchesName || matchesAmount;
    }).sort((a, b) => new Date(b.date) - new Date(a.date)) : [];

    const items = isSearchActive ? searchItems : (isSubView
      ? data.expenses.filter(e => e.type === 'subscription').map(x => ({ ...x, _type: 'expenses' })).sort((a, b) => parseInt(a.date.split('-')[2]) - parseInt(b.date.split('-')[2]))
      : getMonthlyItems);

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const isFutureMonth = selectedYear > currentYear || (selectedYear === currentYear && selectedMonth > currentMonth);

    // If Sub View, strictly showing list of services (no virtual logic needed usually, but keeping simple)
    // Actually for Sub View, user checks specific list.
    // For Main View, we use the Calculated Monthly Items.

    if (items.length === 0) {
      return (
        <div className="text-center py-12 text-muted">
          <div className="bg-card w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
            <Search size={24} opacity={0.5} />
          </div>
          <p>No transactions found for {MONTHS[selectedMonth]} {selectedYear}.</p>
        </div>
      );
    }

    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="p-0 overflow-hidden border-border/50">
          <div className="p-4 border-b border-white/5 flex justify-between items-center">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              {isSearchActive ? (
                <>
                  Search Results for "{searchQuery}"
                  <button onClick={() => setSearchQuery('')} className="p-1 hover:bg-white/10 rounded-full"><X size={14} /></button>
                </>
              ) : isSubView ? 'Subscriptions' : `Transactions - ${MONTHS[Number(selectedMonth)]} ${selectedYear}`}
            </h2>
            {!isSubView && !isSearchActive && (
              <span className="text-xs text-muted bg-white/5 px-2 py-1 rounded">
                {isFutureMonth ? 'Projected' : selectedMonth === currentMonth && selectedYear === currentYear ? 'Current' : 'Historic'}
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-card/50 text-xs uppercase text-muted font-medium border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 text-left">Transaction</th>
                  <th className="px-6 py-4 text-left">{isSubView ? 'Expected Day' : 'Date'}</th>
                  {isSubView && <th className="px-6 py-4 text-left">Frequency</th>}
                  <th className="px-6 py-4 text-left">Category</th>
                  <th className="px-6 py-4 text-left">Amount</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => { setEditingItem(item); setIsFormOpen(true); }}
                    className={cn(
                      "group transition-colors hover:bg-white/5 cursor-pointer",
                      item.isVirtual && isFutureMonth && "opacity-50 italic" // Virtual Style ONLY for Future
                    )}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm border border-white/5",
                          item._type === 'income' ? "bg-primary/20 text-primary" : "bg-danger/20 text-danger"
                        )}>
                          {item._type === 'income' ? '💰' : getCategoryIcon(item.category)}
                        </div>
                        <div>
                          <p className="font-medium text-text">{item.name} {item.isVirtual && <span className="text-[10px] ml-1 border border-border px-1 rounded">Monthly</span>}</p>
                          <p className="text-xs text-muted capitalize">{item.type || 'Income'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {(() => {
                        const [y, m, d] = item.date.split('-').map(Number);
                        const dateObj = new Date(y, m - 1, d);

                        if (isSubView) {
                          const j = d % 10, k = d % 100;
                          if (j === 1 && k !== 11) return d + "st";
                          if (j === 2 && k !== 12) return d + "nd";
                          if (j === 3 && k !== 13) return d + "rd";
                          return d + "th";
                        }

                        return dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                      })()}
                    </td>
                    {isSubView && (
                      <td className="px-6 py-4 text-sm">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap capitalize",
                          (item.frequency === 'annual' || item.frequency === 'yearly') ? "bg-warning/10 text-warning border-warning/20" :
                            (item.frequency === 'weekly' || item.frequency === 'biweekly') ? "bg-danger/10 text-danger border-danger/20" :
                              (item.frequency === 'quarterly') ? "bg-primary/10 text-primary border-primary/20" :
                                "bg-secondary/10 text-secondary border-secondary/20" // Default (Monthly)
                        )}>
                          {item.frequency || 'Monthly'}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 text-gray-400 border border-white/5 whitespace-nowrap">
                        {item.category}
                      </span>
                    </td>
                    <td className={cn("px-6 py-4 text-right font-medium", item._type === 'income' ? "text-primary" : "text-text")}>
                      {item._type === 'income' ? '+' : '-'}${parseFloat(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingItem(item);
                            setIsFormOpen(true);
                          }}
                          className="p-1.5 hover:bg-white/10 rounded-lg text-secondary transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item._type, item.id);
                          }}
                          className="p-1.5 hover:bg-white/10 rounded-lg text-danger transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };




  return (
    <div className="min-h-screen bg-background text-text flex flex-col relative selection:bg-primary/20">
      {/* Sidebar */}
      {/* Top Navigation (Desktop) & Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <div className="bg-primary p-1.5 rounded-lg">
              <Wallet className="text-black" size={20} />
            </div>
            <span className="text-lg font-bold tracking-tight hidden sm:block">FinBoard</span>
          </div>

          <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            <NavTab label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            <NavTab label="Transactions" active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} />
            <NavTab label="Subscriptions" active={activeTab === 'subscriptions'} onClick={() => setActiveTab('subscriptions')} />
            <NavTab label="Statements" active={activeTab === 'statements'} onClick={() => setActiveTab('statements')} />
            <NavTab label="Ask AI" active={isChatOpen} onClick={() => setIsChatOpen(!isChatOpen)} icon={MessageSquare} />
          </nav>

          <div className="flex items-center gap-3 flex-1 md:flex-none justify-end">
            <div className="relative w-full max-w-[200px] hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={14} />
              <input
                type="search"
                name="search"
                autoComplete="off"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-card/50 border-none rounded-full py-1.5 pl-9 pr-4 text-sm focus:ring-1 focus:ring-primary h-9 transition-all"
              />
            </div>
            <button className="p-2 text-muted hover:text-white relative">
              <Bell size={20} />
              <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-danger rounded-full border border-background"></div>
            </button>

            {/* User Avatar & Sync Card Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-secondary/50 border border-white/10 hover:ring-2 hover:ring-primary/50 transition-all"
              />

              {showUserMenu && (
                <div className="absolute right-0 top-12 w-72 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                  {/* User Info Row */}
                  <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-secondary/50" />
                      <div>
                        <p className="text-sm font-medium">{user?.email?.split('@')[0] || 'Guest'}</p>
                        <p className="text-xs text-muted">{user ? 'Logged In' : 'Not Logged In'}</p>
                      </div>
                    </div>
                    {lastBackupTime && (
                      <div className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        (Date.now() - lastBackupTime.getTime()) < 86400000 ? "bg-primary/20 text-primary" :
                          (Date.now() - lastBackupTime.getTime()) < 604800000 ? "bg-warning/20 text-warning" :
                            "bg-danger/20 text-danger"
                      )}>
                        {(Date.now() - lastBackupTime.getTime()) < 60000 ? 'Just now' :
                          (Date.now() - lastBackupTime.getTime()) < 3600000 ? `${Math.floor((Date.now() - lastBackupTime.getTime()) / 60000)}m ago` :
                            (Date.now() - lastBackupTime.getTime()) < 86400000 ? `${Math.floor((Date.now() - lastBackupTime.getTime()) / 3600000)}h ago` :
                              `${Math.floor((Date.now() - lastBackupTime.getTime()) / 86400000)}d ago`}
                      </div>
                    )}
                  </div>

                  {/* Sync Actions */}
                  <div className="p-3">
                    {user ? (
                      <>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <button
                            onClick={handleQuickBackup}
                            className="flex flex-col items-center justify-center gap-1 p-3 bg-background/50 border border-border/50 rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all"
                          >
                            <Cloud size={20} className="text-primary" />
                            <span className="text-xs font-medium">Backup</span>
                          </button>
                          <button
                            onClick={handleQuickRestore}
                            className="flex flex-col items-center justify-center gap-1 p-3 bg-background/50 border border-border/50 rounded-lg hover:border-secondary/50 hover:bg-secondary/5 transition-all"
                          >
                            <Download size={20} className="text-secondary" />
                            <span className="text-xs font-medium">Restore</span>
                          </button>
                        </div>

                        {/* Inline Password with Trap for Autofill */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex-1 relative">
                            {/* Trap: Invisible username field so Bitwarden fills this instead of Search */}
                            <input
                              type="text"
                              name="username"
                              value={user?.email || ''}
                              readOnly
                              autoComplete="username"
                              style={{ position: 'absolute', opacity: 0, height: 0, width: 0, zIndex: -1 }}
                            />
                            <input
                              type="password"
                              name="sync_password"
                              placeholder="Encryption password..."
                              value={syncPassword}
                              onChange={(e) => setSyncPassword(e.target.value)}
                              autoComplete="current-password"
                              className="w-full bg-background border border-border/50 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-primary"
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <button
                        onClick={() => { handleLogin(); setShowUserMenu(false); }}
                        className="w-full flex items-center justify-center gap-2 p-3 bg-white/5 border border-border/50 rounded-lg hover:bg-white/10 transition-all"
                      >
                        <User size={16} className="text-primary" />
                        <span className="text-sm font-medium">Login with GitHub to Sync</span>
                      </button>
                    )}

                    {/* Status */}
                    {syncStatus && (
                      <p className={cn(
                        "text-xs text-center py-1 rounded animate-pulse",
                        syncStatus.includes('Success') ? "text-primary" :
                          syncStatus.includes('Error') ? "text-danger" : "text-muted"
                      )}>{syncStatus}</p>
                    )}
                  </div>

                  {/* Developer Menu */}
                  <div className="border-t border-border/50">
                    <button
                      onClick={() => setShowDevMenu(!showDevMenu)}
                      className="w-full px-4 py-2 flex items-center justify-between text-xs text-muted hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Settings size={14} />
                        Developer
                      </span>
                      <span className={cn("transition-transform", showDevMenu && "rotate-90")}>▸</span>
                    </button>

                    {showDevMenu && (
                      <div className="bg-background/50 border-t border-border/30">
                        {/* Gemini API Key */}
                        <div className="px-4 py-3 space-y-2">
                          <div className="flex items-center gap-2 text-xs text-muted">
                            <Bot size={12} />
                            <span>Gemini API Key</span>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="password"
                              placeholder="AIzaSy..."
                              value={geminiApiKey}
                              onChange={(e) => setGeminiApiKey(e.target.value)}
                              className="flex-1 bg-background border border-border/50 rounded px-2 py-1 text-xs focus:outline-none focus:border-primary"
                            />
                            <button
                              onClick={handleSaveGeminiKey}
                              className="px-2 py-1 bg-primary/20 text-primary text-xs rounded hover:bg-primary/30 transition-colors"
                            >
                              Save
                            </button>
                          </div>
                        </div>

                        {/* Delete All */}
                        <button
                          onClick={handleDeleteAllData}
                          className="w-full px-4 py-2 flex items-center gap-2 text-xs text-danger hover:bg-danger/10 transition-colors border-t border-danger/20"
                        >
                          <Trash2 size={14} />
                          Delete All Transactions
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Logout */}
                  {user && (
                    <div className="border-t border-border/50">
                      <button
                        onClick={() => { supabase.auth.signOut(); setUser(null); setShowUserMenu(false); }}
                        className="w-full px-4 py-2 flex items-center gap-2 text-xs text-muted hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <LogOut size={14} />
                        Log Out
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 pb-24 md:pb-6 animate-in fade-in duration-500">


        {renderContent()}

      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur-lg pb-safe z-40">
        <div className="flex justify-around items-center h-16">
          <MobileNavItem icon={LayoutDashboard} label="Home" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <MobileNavItem icon={CreditCard} label="Txns" active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} />
          <button
            onClick={openAddModal}
            className="w-14 h-14 bg-primary rounded-full flex items-center justify-center text-black shadow-lg shadow-primary/30 -translate-y-5 border-4 border-background hover:scale-110 transition-transform active:scale-95"
          >
            <Plus size={28} />
          </button>
          <MobileNavItem icon={Activity} label="Subs" active={activeTab === 'subscriptions'} onClick={() => setActiveTab('subscriptions')} />
          <MobileNavItem icon={FileText} label="Docs" active={activeTab === 'statements'} onClick={() => setActiveTab('statements')} />
          <MobileNavItem icon={Bot} label="AI" active={isChatOpen} onClick={() => setIsChatOpen(!isChatOpen)} />
        </div>
      </div>
      <ChatWindow
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        data={data}
        financials={financials}
        onAddItem={handleSave}
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onSync={handleSync}
        onRestore={handleRestore}
        syncStatus={syncStatus}
      />

      {/* Transaction Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="text-lg font-bold">{editingItem ? 'Edit Item' : 'Add New Item'}</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-muted hover:text-white">✕</button>
            </div>

            <TransactionForm
              initialData={editingItem}
              data={data}
              setPendingStatement={setPendingStatement}
              pendingStatement={pendingStatement}
              onSaveStatement={handleSaveStatement}
              onSave={handleSave}
              onCancel={() => setIsFormOpen(false)}
              onOpenSettings={() => {
                setIsFormOpen(false); // Close form to show settings... or maybe keep form open?
                // Actually, ChatWindow settings is inside the Chat. We might need a global way to open settings.
                // For now, let's just use the existing state in ChatWindow if it were lifted, ALAS it is not.
                // We'll instruct user to open AI Chat > Settings.
                // BETTER: Lift 'showSettings' or pass a handler if possible. 
                // Since ChatWindow handles its own state, let's just open the AI Chat window so they see it.
                setIsChatOpen(true);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}



// --- Sub-components ---

function NavTab({ label, active, onClick, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
        active
          ? "bg-white text-black shadow-sm"
          : "text-muted hover:text-white hover:bg-white/5"
      )}
    >
      {Icon && <Icon size={16} />}
      {label}
    </button>
  );
}

function MobileNavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex flex-col items-center justify-center gap-1 h-full",
        active ? "text-primary" : "text-muted hover:text-text"
      )}
    >
      <Icon size={20} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function AccountCard({ account, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const sortedStmts = account.statements.sort((a, b) => new Date(b.date) - new Date(a.date));
  const latest = sortedStmts[0];
  const history = sortedStmts.slice(1);

  // Helper to avoid timezone shifts (parse YYYY-MM-DD as local date)
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <Card className="p-4 border-border/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <CreditCard size={20} />
          </div>
          <div>
            <h3 className="font-semibold">{account.provider}</h3>
            <p className="text-xs text-muted">Ending in ••••{account.last4 || '????'}</p>
          </div>
        </div>
        <div className="text-right flex flex-col items-end">
          <div className="flex items-center gap-1">
            <p className="text-sm font-medium mr-1">Latest: {formatDate(latest.date)}</p>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(latest.id, false); }}
              className="text-muted hover:text-orange-400 transition-colors p-1"
              title="Remove record only (Keep transactions)"
            >
              <Trash2 size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(latest.id, true); }}
              className="text-muted hover:text-red-500 transition-colors p-1"
              title="Delete record AND transactions"
            >
              <FileX size={14} />
            </button>
          </div>
          {latest.transactionCount !== undefined && <p className="text-xs text-muted">{latest.transactionCount} transactions</p>}
        </div>
      </div>

      {history.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-muted hover:text-white flex items-center gap-1 transition-colors"
          >
            <ChevronRight size={14} className={cn("transition-transform", expanded && "rotate-90")} />
            Statement History ({history.length} more)
          </button>
          {expanded && (
            <div className="mt-2 space-y-1 pl-5">
              {history.map(s => (
                <div key={s.id} className="flex justify-between items-center text-xs p-1.5 hover:bg-white/5 rounded group">
                  <span>{formatDate(s.date)}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted">Uploaded {new Date(s.uploadDate).toLocaleDateString()}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(s.id, false); }}
                      className="text-muted hover:text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                      title="Remove record only (Keep transactions)"
                    >
                      <Trash2 size={12} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(s.id, true); }}
                      className="text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                      title="Delete record AND transactions"
                    >
                      <FileX size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function TransactionForm({ initialData, data, setPendingStatement, pendingStatement, onSaveStatement, onSave, onCancel, onOpenSettings }) {
  const [formData, setFormData] = useState(
    initialData ? {
      frequency: (initialData.type === 'subscription' || initialData.type === 'bill') ? 'monthly' : 'one-time',
      ...initialData
    } : {
      name: '',
      amount: '',
      category: 'Groceries', // Updated default
      frequency: 'one-time',
      type: 'variable',
      isIncome: false,
      date: (() => {
        const d = new Date();
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().split('T')[0];
      })() // Local "YYYY-MM-DD"
    }
  );
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiFlash, setAiFlash] = useState(false); // Visual cue for AI actions
  const [bulkItems, setBulkItems] = useState([]); // Array of parsed items for review

  // Helper to flash fields
  const triggerAiFlash = () => {
    setAiFlash(true);
    setTimeout(() => setAiFlash(false), 2000);
  };

  // Intelligence: Auto-fill based on Name with Gemini & Cache
  useEffect(() => {
    if (initialData) return; // Don't override if editing
    if (!formData.name || formData.name.length < 3) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const lowerName = formData.name.toLowerCase().trim();

      // 1. Check Cache
      const cache = JSON.parse(localStorage.getItem('intelligenceCache') || '{ }');
      if (cache[lowerName]) {
        console.log("Memory Hit:", lowerName);
        // Preserve current date if set, otherwise don't overwrite it with old cache data (cache usually has no date)
        const { date, ...rest } = cache[lowerName];

        // Validate cache data
        if (!rest.category || (rest.isIncome === undefined)) {
          // Invalid cache, skip it
          return;
        }

        setFormData(prev => ({ ...prev, ...rest }));
        triggerAiFlash();
        return;
      }

      // 2. Ask Gemini
      const apiKey = localStorage.getItem('geminiApiKey');
      if (!apiKey) {
        // Silent fail or maybe subtle indicator?
        // Since this is auto-running while typing, we shouldn't alert repeatedly.
        return;
      }

      setIsAiLoading(true);
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `
    Classify transaction: "${formData.name}"

    Context lists:
    - Income Categories: ${INCOME_CATEGORIES.join(', ')}
    - Expense Categories: ${EXPENSE_CATEGORIES.join(', ')}

    Return STRICT JSON only:
    {
      "category": "String (must be one of the lists above)",
    "frequency": "String (one-time, weekly, biweekly, monthly, annual)",
    "isIncome": boolean,
    "type": "String (variable, bill, subscription) - only for expenses" 
          }
    `;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          const prediction = JSON.parse(jsonMatch[0]);
          console.log("Gemini Prediction:", prediction);

          // Validate Category
          const validCats = prediction.isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
          if (!validCats.includes(prediction.category)) {
            prediction.category = validCats[0]; // Fallback
          }

          const suggestion = {
            category: prediction.category,
            frequency: prediction.frequency,
            isIncome: prediction.isIncome,
            type: prediction.type || 'variable'
          };

          if (!suggestion.category) {
            suggestion.category = suggestion.isIncome ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0];
          }

          setFormData(prev => ({ ...prev, ...suggestion }));
          triggerAiFlash();

          // 3. Save to Cache
          cache[lowerName] = suggestion;
          localStorage.setItem('intelligenceCache', JSON.stringify(cache));
        }
      } catch (err) {
        console.error("AI Classification failed", err);
      } finally {
        setIsAiLoading(false);
      }
    }, 800); // 800ms debounce

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [formData.name, initialData]);

  // Ensure Category validity when type switches
  useEffect(() => {
    const validCategories = formData.isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    if (!validCategories.includes(formData.category)) {
      setFormData(prev => ({ ...prev, category: validCategories[0] }));
    }
  }, [formData.isIncome, formData.category]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  // Receipt Scanning
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const apiKey = localStorage.getItem('geminiApiKey');
    if (!apiKey) {
      if (window.confirm("Gemini API Key is missing. Open AI Assistant to configure it?")) {
        onOpenSettings();
      }
      return;
    }

    setIsAiLoading(true);
    const startTime = Date.now();

    // Small delay to allow React to render the loading spinner before processing starts
    setTimeout(() => {
      // Convert to Base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Data = reader.result.split(',')[1];

          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

          // Fetch Intelligence Cache to teach Gemini user's preferences
          const cache = JSON.parse(localStorage.getItem('intelligenceCache') || '{}');
          const knownRules = Object.entries(cache)
            .map(([name, data]) => `- ${name}: ${data.category}`)
            .slice(-40) // Pick last 40 most recent/relevant rules to avoid over-bloating prompt
            .join('\n');

          const prompt = `
    Analyze this image (receipt, bank statement, or credit card statement). It may be a single receipt or a list of transactions.
    
    EXTRACT ALL distinct transactions found in the document.
    - Ignore headers, footers, account summaries, or balances.
    - If it's a statement, handle various layouts (tables, lists, blocks).
    
    IMPORTANT - DETECTING DOCUMENT TYPE:
    - If this is a CREDIT CARD STATEMENT (you see card numbers, APR, minimum payment due, etc.):
      - Charges/purchases = EXPENSES (isIncome: false)
      - Payments/credits TO the card = mark as category "Credit Card Payment", isIncome: false (NOT income!)
    - If this is a BANK STATEMENT:
      - Deposits = INCOME (isIncome: true)
      - Withdrawals/debits = EXPENSES (isIncome: false)
      - Payments TO credit cards = category "Credit Card Payment", isIncome: false
    
    For EACH transaction, extract:
    - Merchant Name (name) - Clean up (remove dates/IDs from name if possible)
    - Date (date) in YYYY-MM-DD format
    - Amount (amount) - number only (absolute value)
    - Is Income (isIncome) - boolean. See rules above for proper classification.
    - Category (category) - best guess from: ${INCOME_CATEGORIES.join(', ')}, ${EXPENSE_CATEGORIES.join(', ')}
    - Type (type) - FOR EXPENSES ONLY: "variable" (one-time purchases), "bill" (regular recurring utilities/services), or "subscription" (auto-renewing memberships/software)
    
    USER CATEGORIZATION RULES (PRIORITIZE THESE IF MERCHANT MATCHES):
    ${knownRules || 'No custom rules set yet.'}

    Return STRICT JSON Object: 
    {
      "metadata": {
        "provider": "Chase",
        "last4": "1234",
        "statementEndDate": "2026-01-24"
      },
      "transactions": [
        {"name": "Merchant", "date": "2026-01-15", "amount": 10.50, "isIncome": false, "category": "Food", "type": "variable"},
        ...
      ]
    }
    
    IMPORTANT for metadata:
    - provider: The bank/card issuer name (Chase, Fidelity, Amex, Fold, Robinhood, etc.). LOOK FOR THE LOGO explicitly.
    - last4: Last 4 digits of the account/card number (look for "Account Number: XXXX XXXX XXXX 1234" or similar)
    - statementEndDate: Look for "Opening/Closing Date", "Statement Period", or "Closing Date".
      Extract the END/CLOSING date (the second date if there's a range like "12/25/25 - 01/24/26").
      CRITICAL: If year is shown as 2 digits (e.g., "25" or "26"), interpret as 2025 or 2026 (current decade).
      Return in YYYY-MM-DD format (e.g., "2026-01-24" for "01/24/26").
    `;

          const result = await model.generateContent([
            prompt,
            {
              inlineData: {
                data: base64Data,
                mimeType: file.type
              }
            }
          ]);

          const responseText = result.response.text().replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(responseText);

          let rawItems = [];
          let metadata = null;

          if (Array.isArray(parsed)) {
            rawItems = parsed;
          } else if (parsed.transactions && Array.isArray(parsed.transactions)) {
            rawItems = parsed.transactions;
            metadata = parsed.metadata;
          } else {
            rawItems = [parsed];
          }

          // Apply local cache as a secondary "Guarantee" layer
          const items = rawItems.map(item => {
            const lowerName = item.name.toLowerCase().trim();
            if (cache[lowerName]) {
              return {
                ...item,
                category: cache[lowerName].category,
                isIncome: cache[lowerName].isIncome,
                frequency: cache[lowerName].frequency || item.frequency, // Restore frequency!
                type: cache[lowerName].type || item.type,
                isRuleApplied: true
              };
            }
            return item;
          });

          if (items.length === 0) throw new Error("No transactions found");

          const minLoadTimePromise = new Promise(resolve => {
            const elapsed = Date.now() - startTime;
            setTimeout(resolve, Math.max(0, 1500 - elapsed));
          });

          await minLoadTimePromise;

          if (items.length === 1) {
            // Single Item Mode (Old Behavior)
            const prediction = items[0];
            console.log("Gemini Prediction:", prediction);

            const validCats = prediction.isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
            if (!validCats.includes(prediction.category)) {
              prediction.category = 'Other'; // Safer default than index 0 (Alcohol)
            }

            setFormData(prev => ({
              ...prev,
              name: prediction.name,
              amount: prediction.amount,
              category: prediction.category,
              // If date is present, use it, else keep default
              ...(prediction.date && { date: prediction.date })
            }));
            triggerAiFlash();
          } else {
            // Bulk Mode
            if (metadata) {
              setPendingStatement(metadata);
            } else {
              setPendingStatement(null);
            }
            setBulkItems(items.map(i => ({
              ...i,
              id: Math.random().toString(36).substr(2, 9),
              isIncome: i.isIncome ?? false,
              type: i.type || 'variable',
              frequency: (i.type === 'bill' || i.type === 'subscription') ? 'monthly' : 'one-time'
            })));
          }

        } catch (err) {
          console.error("Receipt scanning failed:", err);

          let errorMessage = "Failed to scan receipt. ";
          if (err.message?.includes("API key")) {
            errorMessage += "API key issue - check your Gemini API key.";
          } else if (err.message?.includes("JSON") || err.name === "SyntaxError") {
            errorMessage += "Could not parse AI response. The image might be unclear.";
          } else if (err.message?.includes("quota") || err.message?.includes("rate")) {
            errorMessage += "API rate limit reached. Try again in a minute.";
          } else if (err.message?.includes("RECITATION") || err.message?.includes("SAFETY")) {
            errorMessage += "Content was blocked by AI safety filters.";
          } else {
            errorMessage += err.message || "Unknown error occurred.";
          }

          alert(errorMessage);
        } finally {
          setIsAiLoading(false);
          // Reset file input value so same file can be selected again if needed
          e.target.value = '';
        }
      };
      reader.readAsDataURL(file);
    }, 10);
  };

  const aiClass = aiFlash ? "!bg-[#0F1115] ring-2 ring-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)] transition-all duration-1000" : "";
  const isIncome = formData.isIncome;

  // BULK HANDLERS
  const handleBulkUpdate = (index, field, value) => {
    setBulkItems(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const handleBulkRemove = (index) => {
    setBulkItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleBulkImport = () => {
    // Generate statement ID early so we can link transactions
    const pendingStmtId = pendingStatement ? Math.random().toString(36).substr(2, 9) : null;

    bulkItems.forEach(item => {
      // Safe duplicate check
      const exists = (data?.expenses || []).some(e => e.name === item.name && e.date === item.date && Math.abs(e.amount - item.amount) < 0.01) ||
        (data?.income || []).some(i => i.name === item.name && i.date === item.date && Math.abs(i.amount - item.amount) < 0.01);

      if (!exists) {
        // Link transaction to statement
        onSave({ ...item, statementId: pendingStmtId });
      }
    });
    setBulkItems([]);
    if (pendingStatement && pendingStmtId) {
      const stmtDate = pendingStatement.statementEndDate || pendingStatement.statementDate || new Date().toISOString().split('T')[0];
      const stmtLast4 = pendingStatement.last4 || '????';
      const stmtProvider = pendingStatement.provider || 'Unknown Provider';

      // Check for duplicate statement (same provider + last4 + date)
      const isDuplicateStatement = (data?.statements || []).some(
        s => s.provider === stmtProvider && s.last4 === stmtLast4 && s.date === stmtDate
      );

      if (!isDuplicateStatement) {
        const newStmt = {
          id: pendingStmtId, // Use the same ID
          provider: stmtProvider,
          last4: stmtLast4,
          date: stmtDate,
          uploadDate: new Date().toISOString(),
          transactionCount: bulkItems.length
        };
        onSaveStatement(newStmt);
      }
      setPendingStatement(null);
    }
    if (onCancel) onCancel();
  };

  if (bulkItems.length > 0) {
    return (
      <BulkReviewView
        items={bulkItems}
        onUpdate={handleBulkUpdate}
        onRemove={handleBulkRemove}
        onCancel={() => { setBulkItems([]); }} // Go back to single add
        onImport={handleBulkImport}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-in zoom-in-50 duration-300">

      {/* Top Controls: Type & Scan */}
      <div className="flex flex-col gap-3">
        {/* Toggle Type (Full Width) */}
        <div className="flex p-1 bg-background border border-border rounded-xl w-full">
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, isIncome: false }))}
            className={cn("flex-1 py-2 text-sm font-medium rounded-lg transition-all", !isIncome ? "bg-white/10 text-white shadow-sm" : "text-muted hover:text-white")}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, isIncome: true }))}
            className={cn("flex-1 py-2 text-sm font-medium rounded-lg transition-all", isIncome ? "bg-white/10 text-white shadow-sm" : "text-muted hover:text-white")}
          >
            Income
          </button>
        </div>

        {/* Scan Actions (New Row) */}
        <div className="flex gap-3 h-12 w-full">
          {/* Camera Button (Primary Action - Green) */}
          <div className="relative flex-[2]">
            <input
              type="file"
              capture="environment"
              accept="image/*"
              className="hidden"
              id="camera-input"
              onChange={handleFileUpload}
            />
            <label
              htmlFor="camera-input"
              className={cn(
                "h-full w-full flex items-center justify-center gap-2 bg-gradient-to-tr from-primary to-primary/80 rounded-xl cursor-pointer shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-black",
                aiFlash && "ring-2 ring-white scale-95",
                isAiLoading && "opacity-80 pointer-events-none cursor-wait"
              )}
            >
              {isAiLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span className="text-sm font-semibold">Processing...</span>
                </>
              ) : (
                <>
                  <Camera size={20} />
                  <span className="text-sm font-semibold">Scan Receipt</span>
                </>
              )}
            </label>
          </div>

          {/* Upload Button (Secondary - Subtle) */}
          <div className="relative flex-1">
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              id="file-upload"
              onChange={handleFileUpload}
            />
            <label
              htmlFor="file-upload"
              className={cn(
                "h-full w-full flex items-center justify-center bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 active:scale-95 transition-all text-muted hover:text-white",
                isAiLoading && "opacity-80 pointer-events-none cursor-wait"
              )}
            >
              {isAiLoading ? <Loader2 size={20} className="animate-spin text-primary" /> : <Upload size={20} />}
            </label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="relative w-full">
          <Input
            label="Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Netflix, Salary, etc."
          />
          {/* Visual Indicator for AI Status */}
          <div className="absolute right-3 top-[34px] flex items-center pointer-events-none">
            {isAiLoading ? (
              <Loader2 size={16} className="animate-spin text-primary" />
            ) : !localStorage.getItem('geminiApiKey') ? (
              <span className="text-[10px] text-muted opacity-50">AI Off</span>
            ) : (
              <Bot size={16} className="text-primary/20" />
            )}
          </div>
        </div>
        <Input
          label="Date"
          type="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          required
          max="2030-12-31" // Basic sanity check
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input label="Amount" name="amount" type="number" step="0.01" value={formData.amount} onChange={handleChange} required placeholder="0.00" />
        <Select
          className={aiClass}
          label="Frequency" name="frequency" value={formData.frequency} onChange={handleChange} options={[
            { value: 'one-time', label: 'One-Time' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'biweekly', label: 'Bi-Weekly' },
            { value: 'monthly', label: 'Monthly' },
            { value: 'quarterly', label: 'Quarterly' },
            { value: 'annual', label: 'Yearly' },
          ]} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          className={aiClass}
          label="Category" name="category" value={formData.category} onChange={handleChange} options={
            (formData.isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => ({ value: c, label: c }))
          } />

        {!formData.isIncome && (
          <Select
            className={aiClass}
            label="Expense Type" name="type" value={formData.type} onChange={handleChange} options={[
              { value: 'variable', label: 'Variable' },
              { value: 'bill', label: 'Bill' },
              { value: 'subscription', label: 'Subscription' },
            ]} />
        )}
      </div>

      <div className="pt-4 flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="flex-1">Save Item</Button>
      </div>
    </form >
  )
};

// HELPER: Formatted Amount Input for Review
const ReviewAmountInput = ({ value, onChange }) => {
  const [localValue, setLocalValue] = useState('');

  useEffect(() => {
    // Only update local value from parent if they are different (to avoid cursor jumps)
    const formatted = (value === undefined || value === '') ? '' : Number(value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    if (parseFloat(localValue.replace(/,/g, '')) !== parseFloat(value)) {
      setLocalValue(formatted);
    }
  }, [value]);

  const handleInputChange = (e) => {
    const raw = e.target.value.replace(/,/g, '').replace(/[^0-9.]/g, '');
    setLocalValue(e.target.value); // Keep typing feel
    onChange(raw);
  };

  const handleBlur = () => {
    const num = parseFloat(localValue.replace(/,/g, ''));
    const clean = isNaN(num) ? '0' : num.toString();
    const formatted = (clean === '0') ? '' : Number(clean).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    setLocalValue(formatted);
    onChange(clean);
  };

  return (
    <div className="relative w-32">
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted">$</span>
      <input
        type="text"
        className="w-full bg-white/10 border border-white/10 rounded px-2 pl-5 py-1 text-right text-sm font-bold focus:outline-none focus:border-primary"
        value={localValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
      />
    </div>
  );
};

// HELPER: Bulk Review UI
const BulkReviewView = ({ items, onUpdate, onRemove, onCancel, onImport }) => {
  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      <div className="flex justify-between items-center mb-4 sticky top-0 bg-[#0D1117] z-10 py-2">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Upload size={18} className="text-primary" />
          Review Import ({items.length})
        </h3>
        <span className="text-xs text-muted">Check details before importing</span>
      </div>

      <div className="overflow-y-auto flex-1 pr-2 space-y-3">
        {items.map((item, idx) => (
          <div key={idx} className="bg-white/5 rounded-lg p-3 border border-white/5 flex flex-col gap-3 group relative">
            <button
              onClick={() => onRemove(idx)}
              className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-danger/20 text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-all"
              title="Remove Item"
            >
              <Trash2 size={14} />
            </button>

            <div className="flex gap-2 items-center">
              <input
                type="date"
                className="bg-transparent border-b border-white/10 text-xs text-muted py-1 w-24 focus:outline-none focus:border-primary"
                value={item.date || ''}
                onChange={(e) => onUpdate(idx, 'date', e.target.value)}
              />
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  className="bg-transparent border-b border-white/10 text-sm font-medium flex-1 py-1 focus:outline-none focus:border-primary placeholder:text-white/20"
                  placeholder="Merchant Name"
                  value={item.name}
                  onChange={(e) => onUpdate(idx, 'name', e.target.value)}
                />
                {item.isRuleApplied && (
                  <Sparkles size={14} className="text-purple-400 animate-pulse" title="Applied your custom rule" />
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Expense/Income Toggle */}
              <button
                onClick={() => onUpdate(idx, 'isIncome', !item.isIncome)}
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded cursor-pointer select-none min-w-[64px] text-center",
                  item.isIncome ? "bg-primary/20 text-primary" : "bg-danger/20 text-danger"
                )}
              >
                {item.isIncome ? 'Income' : 'Expense'}
              </button>

              {/* Expense Type (Subscription Support) */}
              {!item.isIncome && (
                <select
                  className="bg-white/5 border border-white/10 rounded text-[10px] px-1 py-1 text-gray-400 focus:outline-none uppercase font-bold"
                  value={item.type || 'variable'}
                  onChange={(e) => {
                    onUpdate(idx, 'type', e.target.value);
                    // Auto-default to Monthly if switching to Bill/Sub and no freq set
                    if ((e.target.value === 'bill' || e.target.value === 'subscription') && (!item.frequency || item.frequency === 'one-time')) {
                      onUpdate(idx, 'frequency', 'monthly');
                    }
                  }}
                >
                  <option value="variable">Var</option>
                  <option value="bill">Bill</option>
                  <option value="subscription">Sub</option>
                </select>
              )}

              {/* Smart Frequency Badge (Bills/Subs only) */}
              {(!item.isIncome && (item.type === 'bill' || item.type === 'subscription')) && (
                <select
                  className="bg-white/5 border border-white/10 rounded text-[10px] px-1 py-1 text-primary focus:outline-none font-bold"
                  value={item.frequency || 'monthly'}
                  onChange={(e) => onUpdate(idx, 'frequency', e.target.value)}
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-Wkly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Qrtrly</option>
                  <option value="annual">Yearly</option>
                </select>
              )}

              {/* Category Select (Simplified) */}
              <select
                className="bg-white/5 border border-white/10 rounded text-xs px-2 py-1 flex-1 text-gray-300 focus:outline-none truncate"
                value={item.category}
                onChange={(e) => onUpdate(idx, 'category', e.target.value)}
              >
                {(item.isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                  <option key={c} value={c} className="bg-[#0D1117]">{c}</option>
                ))}
              </select>

              {/* Amount */}
              <ReviewAmountInput
                value={item.amount}
                onChange={(val) => onUpdate(idx, 'amount', val)}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 mt-2 border-t border-white/10 flex gap-3 sticky bottom-0 bg-[#0D1117] z-10">
        <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button className="flex-1 bg-primary text-black hover:bg-primary/90" onClick={onImport}>
          Import All ({items.length})
        </Button>
      </div>
    </div >
  );
};

