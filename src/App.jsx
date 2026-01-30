import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine
} from 'recharts';
import {
  Plus, Trash2, Edit2, TrendingUp, TrendingDown, CreditCard,
  DollarSign, Activity, Wallet, Bell, Search, LayoutDashboard,
  MessageSquare, Send, X, Settings, Sparkles, User, Bot, AlertCircle, Camera, Loader2,
  Cloud, Upload, Download, LogOut
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
  'Salary', 'Freelance', 'Investments', 'Gift', 'Refund', 'Transfer', 'Other'
];

const EXPENSE_CATEGORIES = [
  'Housing', 'Groceries', 'Restaurants', 'Transport', 'Utilities', 'Entertainment', 'Health', 'Shopping', 'Personal',
  'Kids: Clothes', 'Kids: Toys', 'Kids: Activities', 'Global Entry / Travel',
  'Student Loans', 'Buy Now Pay Later', 'Credit Card Payment', 'Transfer', 'Other'
];

const COLORS = ['#4ADE80', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#10B981', '#6B7280', '#6366f1'];

const isRecurring = (item) => item.frequency !== 'one-time';

const getCategoryIcon = (category) => {
  const map = {
    'Housing': '🏠', 'Groceries': '🛒', 'Restaurants': '🍔', 'Transport': '🚗', 'Utilities': '💡',
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
    danger: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
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
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-blue-500 flex items-center justify-center">
            <Sparkles size={16} className="text-black fill-current" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Gemini Assistant</h3>
            <p className="text-[10px] text-muted flex items-center gap-1">
              {localStorage.getItem('geminiApiKey') ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Online
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Offline (Missing Key)
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
        <div className="absolute inset-0 bg-card/95 backdrop-blur z-20 flex flex-col items-center p-6 text-center animate-in fade-in overflow-y-auto">
          <Settings size={32} className="text-muted mb-4" />
          <h3 className="font-bold text-lg mb-6">Settings</h3>

          {/* AI Section */}
          <div className="w-full bg-white/5 rounded-xl p-4 mb-4 text-left">
            <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
              <Bot size={12} /> Gemini Intelligence
            </h4>
            <p className="text-xs text-muted mb-3">API Key for AI insights & receipt scanning.</p>
            <Input
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              type="password"
              className="mb-2"
            />
            <Button className="w-full" size="sm" onClick={() => handleSaveKey(apiKey)}>Save AI Key</Button>
          </div>

          {/* Cloud Sync Section */}
          <div className="w-full bg-white/5 rounded-xl p-4 mb-4 text-left">
            <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
              <Cloud size={12} /> Cloud Backup
            </h4>

            {!user ? (
              <div className="text-center py-2">
                <p className="text-xs text-muted mb-3">Sign in to sync your data across devices.</p>
                <Button onClick={onLogin} className="w-full bg-[#24292F] hover:bg-[#24292F]/90 text-white gap-2">
                  <User size={14} /> Login with GitHub
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted bg-black/20 p-2 rounded-lg">
                  <span className="truncate max-w-[150px]">{user.email || 'Logged In'}</span>
                  <button onClick={onLogout} className="text-red-400 hover:text-red-300 flex items-center gap-1">
                    <LogOut size={10} /> Logout
                  </button>
                </div>

                <p className="text-[10px] text-muted leading-tight">
                  Enter a <strong>Sync Password</strong>. This encrypts your data before upload.
                  <span className="text-red-400 block mt-1">If you lose this password, your cloud data is lost forever.</span>
                </p>

                <Input
                  placeholder="Encryption Password"
                  id="sync-pass" // simple ID to grab value ref-style or just use an uncontrolled input for safety? 
                // Better: simple state in this component?
                // No, let's use a ref to avoid re-renders or stealing focus? 
                // Actually controlled state is fine if we clear it.
                />

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="text-xs gap-1" onClick={() => {
                    const pass = document.getElementById('sync-pass').value;
                    if (!pass) return alert('Enter a password!');
                    onSync(pass);
                  }}>
                    <Upload size={12} /> Backup
                  </Button>
                  <Button variant="outline" className="text-xs gap-1" onClick={() => {
                    const pass = document.getElementById('sync-pass').value;
                    if (!pass) return alert('Enter a password!');
                    onRestore(pass);
                  }}>
                    <Download size={12} /> Restore
                  </Button>
                </div>

                {syncStatus && (
                  <div className={cn("text-xs p-2 rounded border",
                    syncStatus.includes('Success') ? "bg-green-500/10 border-green-500/20 text-green-400" :
                      syncStatus.includes('Error') ? "bg-red-500/10 border-red-500/20 text-red-400" :
                        "bg-blue-500/10 border-blue-500/20 text-blue-400"
                  )}>
                    {syncStatus}
                  </div>
                )}
              </div>
            )}
          </div>

          <Button variant="ghost" className="w-full" onClick={() => setShowSettings(false)}>Close Settings</Button>
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
  const [data, setData] = useState({ income: [], expenses: [] });

  // Date Filtering State
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState(null);
  const [syncStatus, setSyncStatus] = useState('');

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
      setData({ income: [], expenses: [] }); // Reset state
      localStorage.setItem('hasWipedLegacyData_v2', 'true');
      console.log("Legacy data wiped for fresh start.");
    } else {
      // Load data normally if already wiped
      const saved = localStorage.getItem('financeData');
      if (saved) {
        try {
          setData(JSON.parse(saved));
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

    // Expenses
    const recurringExpenses = data.expenses.filter(e => isRecurring(e) && notSpecial(e));
    const oneTimeExpenses = data.expenses.filter(e => !isRecurring(e) && filterByDate(e) && notSpecial(e));
    const effectiveExpenses = [...recurringExpenses, ...oneTimeExpenses];

    const totalIncome = effectiveIncome.reduce((acc, item) => acc + normalizeToMonthly(item.amount, item.frequency), 0);
    const totalExpenses = effectiveExpenses.reduce((acc, item) => acc + normalizeToMonthly(item.amount, item.frequency), 0);
    const net = totalIncome - totalExpenses;

    const totalSubscriptionsCost = data.expenses
      .filter(e => e.type === 'subscription' && notSpecial(e))
      .reduce((acc, item) => acc + normalizeToMonthly(item.amount, item.frequency), 0);

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
      const mRecurringExp = data.expenses.filter(e => isRecurring(e) && notSpecial(e)).reduce((acc, e) => acc + normalizeToMonthly(e.amount, e.frequency), 0);

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

    // Calculate Total Recurring for Budget Line
    const totalRecurringExpenses = data.expenses
      .filter(e => isRecurring(e) && notSpecial(e))
      .reduce((acc, item) => acc + normalizeToMonthly(item.amount, item.frequency), 0);

    return { totalIncome, totalExpenses, totalCcPayments, net, byCategory, totalSubscriptionsCost, yearlyData, totalRecurringExpenses };
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

  // --- Auth & Sync Handlers ---
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: window.location.origin }
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

      const { error } = await supabase
        .from('sync_store')
        .upsert({
          id: user.id,
          encrypted_blob: JSON.stringify(encrypted)
        });

      if (error) throw error;
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
        .select('encrypted_blob')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (!rows) throw new Error("No backup found");

      setSyncStatus('Decrypting...');
      const decrypted = await decryptData(JSON.parse(rows.encrypted_blob), password);

      setData(decrypted);
      localStorage.setItem('financeData', JSON.stringify(decrypted));

      setSyncStatus('Success: Data Restored');
      setTimeout(() => setSyncStatus(''), 3000);
      window.location.reload();
    } catch (err) {
      console.error(err);
      setSyncStatus('Error: ' + err.message);
    }
  };

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
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-card to-card/50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp size={48} />
          </div>
          <h3 className="text-muted text-sm font-medium">Monthly Income</h3>
          <p className="text-3xl font-bold mt-2 text-primary">${financials.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <div className="mt-4 text-xs text-primary/80 flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Active
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingDown size={48} />
          </div>
          <h3 className="text-muted text-sm font-medium">Monthly Expenses</h3>
          <p className="text-3xl font-bold mt-2 text-[#3B82F6]">${financials.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <div className="mt-4 text-xs text-muted flex items-center gap-1">
            Excl. CC Payments
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <CreditCard size={48} />
          </div>
          <h3 className="text-muted text-sm font-medium">CC Payments</h3>
          <p className="text-3xl font-bold mt-2 text-amber-400">${financials.totalCcPayments.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <div className="mt-4 text-xs text-muted flex items-center gap-1">
            Internal Transfers
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet size={48} />
          </div>
          <h3 className="text-muted text-sm font-medium">Net Cash Flow</h3>
          <p className={cn("text-3xl font-bold mt-2", financials.net >= 0 ? "text-primary" : "text-red-400")}>
            ${financials.net.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="mt-4 text-xs text-muted flex items-center gap-1">
            Available
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity size={48} />
          </div>
          <h3 className="text-muted text-sm font-medium">Subscriptions</h3>
          <p className="text-3xl font-bold mt-2 text-white">
            ${financials.totalSubscriptionsCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="mt-4 text-xs text-muted flex items-center gap-1">
            {data.expenses.filter(e => e.type === 'subscription').length} active services
          </div>
        </Card>
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
              <Button onClick={() => setEditingItem(null) || setIsFormOpen(true)} className="w-8 h-8 !p-0 rounded-full flex items-center justify-center bg-primary text-black hover:scale-110 shadow-lg shadow-primary/25 ml-2">
                <Plus size={18} />
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
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
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
                  stroke="#F59E0B"
                  strokeDasharray="3 3"
                  label={{ value: "Recurring", fill: "#F59E0B", fontSize: 10, position: "insideTopRight" }}
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
                        fill={isPast ? "#334155" : isCurrent ? "#4ADE80" : "#22c55e"} // Past=Dark, Current=Bright, Future=MutedGreen
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
                        fill={isPast ? "#334155" : isCurrent ? "#3B82F6" : "#2563eb"} // Past=Dark, Current=Bright, Future=MutedBlue
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
                  data={Object.entries(financials.byCategory).map(([name, value]) => ({ name, value }))}
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
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            {Object.entries(financials.byCategory).map(([name, value], idx) => (
              <div key={name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="text-muted truncate">{name}</span>
                <span className="ml-auto text-white font-medium">{Math.round(value / financials.totalExpenses * 100)}%</span>
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
    if (activeTab === 'dashboard') return renderDashboard();

    // Transactions / Subscriptions Views
    const isSubView = activeTab === 'subscriptions';
    const items = isSubView
      ? data.expenses.filter(e => e.type === 'subscription').map(x => ({ ...x, _type: 'expenses' }))
      : getMonthlyItems;

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
            <h2 className="font-semibold text-lg">
              {isSubView ? 'Subscriptions' : `Transactions - ${MONTHS[Number(selectedMonth)]} ${selectedYear}`}
            </h2>
            {!isSubView && (
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
                  <th className="px-6 py-4 text-left">Date</th>
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
                          item._type === 'income' ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500"
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
                        return dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 text-gray-400 border border-white/5 whitespace-nowrap">
                        {item.category}
                      </span>
                    </td>
                    <td className={cn("px-6 py-4 text-right font-medium", item._type === 'income' ? "text-emerald-400" : "text-text")}>
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
                          className="p-1.5 hover:bg-white/10 rounded-lg text-blue-400 transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item._type, item.id);
                          }}
                          className="p-1.5 hover:bg-white/10 rounded-lg text-red-400 transition-colors"
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
            <NavTab label="Ask AI" active={isChatOpen} onClick={() => setIsChatOpen(!isChatOpen)} icon={MessageSquare} />
          </nav>

          <div className="flex items-center gap-3 flex-1 md:flex-none justify-end">
            <div className="relative w-full max-w-[200px] hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
              <input
                placeholder="Search..."
                className="w-full bg-card/50 border-none rounded-full py-1.5 pl-9 pr-4 text-sm focus:ring-1 focus:ring-primary h-9 transition-all"
              />
            </div>
            <button className="p-2 text-muted hover:text-white relative">
              <Bell size={20} />
              <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full border border-background"></div>
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-blue-500 border border-white/10"></div>
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
            className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-black shadow-lg shadow-primary/30 -translate-y-4 border-4 border-background"
          >
            <Plus size={24} />
          </button>
          <MobileNavItem icon={Activity} label="Subs" active={activeTab === 'subscriptions'} onClick={() => setActiveTab('subscriptions')} />
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

function TransactionForm({ initialData, onSave, onCancel, onOpenSettings }) {
  const [formData, setFormData] = useState(
    initialData || {
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
    Analyze this image (receipt or bank statement). It may be a single receipt or a list of transactions.
    
    EXTRACT ALL distinct transactions found in the document.
    - Ignore headers, footers, account summaries, or balances.
    - If it's a statement, handle various layouts (tables, lists, blocks).
    
    For EACH transaction, extract:
    - Merchant Name (name) - Clean up (remove dates/IDs from name if possible)
    - Date (date) in YYYY-MM-DD format
    - Amount (amount) - number only (absolute value)
    - Is Income (isIncome) - boolean. Determine if it's a deposit/credit (true) or withdrawal/debit (false). Look for minus signs, "DR/CR" labels, or separate columns.
    - Category (category) - best guess from: ${INCOME_CATEGORIES.join(', ')}, ${EXPENSE_CATEGORIES.join(', ')}
    
    USER CATEGORIZATION RULES (PRIORITIZE THESE IF MERCHANT MATCHES):
    ${knownRules || 'No custom rules set yet.'}

    Return STRICT JSON Array: 
    [
      {"name": "Merchant", "date": "2024-01-01", "amount": 10.50, "isIncome": false, "category": "Food"},
      ...
    ]
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
          const rawItems = Array.isArray(parsed) ? parsed : [parsed];

          // Apply local cache as a secondary "Guarantee" layer
          const items = rawItems.map(item => {
            const lowerName = item.name.toLowerCase().trim();
            if (cache[lowerName]) {
              return {
                ...item,
                category: cache[lowerName].category,
                isIncome: cache[lowerName].isIncome,
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
              prediction.category = validCats[0];
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
            setBulkItems(items.map(i => ({
              ...i,
              id: Math.random().toString(36).substr(2, 9),
              isIncome: i.isIncome ?? false,
              type: 'variable',
              frequency: 'one-time'
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
    bulkItems.forEach(item => {
      onSave(item);
    });
    setBulkItems([]);
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
                "h-full w-full flex items-center justify-center gap-2 bg-gradient-to-tr from-green-500 to-emerald-600 rounded-xl cursor-pointer shadow-lg shadow-green-500/20 hover:scale-[1.02] active:scale-95 transition-all text-black",
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
              className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-red-500/20 text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
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
                  "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded cursor-pointer select-none",
                  item.isIncome ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-400"
                )}
              >
                {item.isIncome ? 'Income' : 'Expense'}
              </button>

              {/* Category Select (Simplified) */}
              <select
                className="bg-white/5 border border-white/10 rounded text-xs px-2 py-1 flex-1 text-gray-300 focus:outline-none"
                value={item.category}
                onChange={(e) => onUpdate(idx, 'category', e.target.value)}
              >
                {(item.isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                  <option key={c} value={c} className="bg-[#0D1117]">{c}</option>
                ))}
              </select>

              {/* Amount */}
              <div className="relative w-24">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted">$</span>
                <input
                  type="number"
                  className="w-full bg-white/5 border border-white/10 rounded px-2 pl-5 py-1 text-right text-sm font-bold focus:outline-none"
                  value={item.amount}
                  onChange={(e) => onUpdate(idx, 'amount', e.target.value)}
                />
              </div>
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
    </div>
  );
};

