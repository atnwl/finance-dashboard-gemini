import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import {
  Plus, Trash2, Edit2, TrendingUp, TrendingDown, CreditCard,
  DollarSign, Activity, Wallet, Bell, Search, LayoutDashboard,
  MessageSquare, Send, X, Settings, Sparkles, User, Bot, AlertCircle
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GoogleGenerativeAI } from "@google/generative-ai";
import ReactMarkdown from 'react-markdown';

// --- Utils ---
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const INCOME_CATEGORIES = [
  'Salary', 'Freelance', 'Investments', 'Gift', 'Refund', 'Other'
];

const EXPENSE_CATEGORIES = [
  'Housing', 'Food', 'Transport', 'Utilities', 'Entertainment', 'Health', 'Shopping', 'Personal', 'Other'
];

const COLORS = ['#4ADE80', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#10B981', '#6B7280', '#6366f1'];

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
          "w-full bg-background border border-border rounded-xl px-4 py-3 text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none transition-all cursor-pointer",
          props.className
        )}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
      </div>
    </div>
  </div>
);

// --- Chat Component ---
const ChatWindow = ({ isOpen, onClose, data, financials }) => {
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
    setMessages(prev => [...prev, userMsg]);
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
      `;

      const chat = model.startChat({
        history: messages.map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }]
        })).slice(-10), // keep some history context, but limited
      });

      const result = await chat.sendMessage(context + "\n\nUser Question: " + input);
      const response = await result.response;
      const text = response.text();

      setMessages(prev => [...prev, { role: 'model', text }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: "Error: Could not connect to Gemini. Please check your API Key." }]);
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
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Online
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
      {showSettings && (
        <div className="absolute inset-0 bg-card/95 backdrop-blur z-20 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <Settings size={48} className="text-muted mb-4" />
          <h3 className="font-bold text-lg mb-2">Configuration</h3>
          <p className="text-sm text-muted mb-6">Enter your Gemini API Key to enable AI features. Your key is stored locally.</p>
          <Input
            placeholder="AIzaSy..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            type="password"
          />
          <div className="flex gap-2 w-full mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setShowSettings(false)}>Back</Button>
            <Button className="flex-1" onClick={() => handleSaveKey(apiKey)}>Save Key</Button>
          </div>
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
  // State
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, transactions, subscriptions
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem('financeData');
    return saved ? JSON.parse(saved) : { income: [], expenses: [] };
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Persistence & Migration (Add IDs if missing)
  useEffect(() => {
    let hasChanges = false;
    const migrate = (arr) => arr.map(item => {
      if (!item.id) {
        hasChanges = true;
        return { ...item, id: crypto.randomUUID() };
      }
      return item;
    });

    const newIncome = migrate(data.income);
    const newExpenses = migrate(data.expenses);

    if (hasChanges) {
      setData({ income: newIncome, expenses: newExpenses });
    } else {
      localStorage.setItem('financeData', JSON.stringify(data));
    }
  }, [data]);

  // Derived Data
  const normalizeToMonthly = (amount, frequency) => {
    const amt = parseFloat(amount);
    if (isNaN(amt)) return 0;
    const map = {
      'weekly': 52 / 12,
      'biweekly': 26 / 12,
      'monthly': 1,
      'annual': 1 / 12,
      'one-time': 1 // Assuming one-time expenses count fully against the current month's budget
    };
    return amt * (map[frequency] || 0);
  };

  const financials = useMemo(() => {
    const totalIncome = data.income.reduce((acc, item) => acc + normalizeToMonthly(item.amount, item.frequency), 0);
    const totalExpenses = data.expenses.reduce((acc, item) => acc + normalizeToMonthly(item.amount, item.frequency), 0);
    const net = totalIncome - totalExpenses;

    // Group expenses by category
    const byCategory = data.expenses.reduce((acc, item) => {
      const amt = normalizeToMonthly(item.amount, item.frequency);
      acc[item.category] = (acc[item.category] || 0) + amt;
      return acc;
    }, {});

    return { totalIncome, totalExpenses, net, byCategory };
  }, [data]);

  // Handlers
  const handleDelete = (type, id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    setData(prev => ({
      ...prev,
      [type]: prev[type].filter(item => item.id !== id)
    }));
  };

  const handleSave = (item) => {
    const newData = { ...data };
    const type = item.isIncome ? 'income' : 'expenses';
    // Remove transient UI flags
    const cleanItem = { ...item };
    delete cleanItem.isIncome;
    delete cleanItem.originalIndex;

    // Ensure ID
    if (!cleanItem.id) cleanItem.id = crypto.randomUUID();

    if (editingItem) {
      // Find and update by ID in the correct array
      // Note: Type might have changed (Expense -> Income), so we need to handle moving
      const originalType = editingItem.type; // 'income' or 'expenses' (passed from modal open)

      if (originalType === type) {
        // Same list update
        newData[type] = newData[type].map(x => x.id === cleanItem.id ? cleanItem : x);
      } else {
        // Move logic: remove from old, add to new
        newData[originalType] = newData[originalType].filter(x => x.id !== cleanItem.id);
        newData[type].push(cleanItem);
      }
    } else {
      newData[type].push(cleanItem);
    }

    // Update Intelligence Cache with User's Truth
    if (cleanItem.name && cleanItem.name.length >= 3) {
      const cache = JSON.parse(localStorage.getItem('intelligenceCache') || '{}');
      cache[cleanItem.name.toLowerCase().trim()] = {
        category: cleanItem.category,
        frequency: cleanItem.frequency,
        isIncome: cleanItem.isIncome,
        type: cleanItem.type
      };
      localStorage.setItem('intelligenceCache', JSON.stringify(cache));
    }

    setData(newData);
    setIsFormOpen(false);
    setEditingItem(null);
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-card to-card/50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp size={48} />
          </div>
          <h3 className="text-muted text-sm font-medium">Monthly Income</h3>
          <p className="text-3xl font-bold mt-2 text-primary">${financials.totalIncome.toFixed(2)}</p>
          <div className="mt-4 text-xs text-primary/80 flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Active
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingDown size={48} />
          </div>
          <h3 className="text-muted text-sm font-medium">Monthly Expenses</h3>
          <p className="text-3xl font-bold mt-2 text-white">${financials.totalExpenses.toFixed(2)}</p>
          <div className="mt-4 text-xs text-muted flex items-center gap-1">
            Total recurring
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet size={48} />
          </div>
          <h3 className="text-muted text-sm font-medium">Net Cash Flow</h3>
          <p className={cn("text-3xl font-bold mt-2", financials.net >= 0 ? "text-primary" : "text-red-400")}>
            ${financials.net.toFixed(2)}
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
            {data.expenses.filter(e => e.type === 'subscription').length}
          </p>
          <div className="mt-4 text-xs text-muted flex items-center gap-1">
            Active services
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 min-h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Financial Overview</h3>
            <select className="bg-background border border-border text-xs rounded-lg px-2 py-1">
              <option>This Year</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Jan', income: financials.totalIncome, expenses: financials.totalExpenses },
                { name: 'Feb', income: financials.totalIncome, expenses: financials.totalExpenses * 1.05 },
                { name: 'Mar', income: financials.totalIncome, expenses: financials.totalExpenses * 0.9 },
                { name: 'Apr', income: financials.totalIncome, expenses: financials.totalExpenses * 1.1 },
                { name: 'May', income: financials.totalIncome, expenses: financials.totalExpenses },
                { name: 'Jun', income: financials.totalIncome, expenses: financials.totalExpenses },
              ]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#161B21', borderColor: '#374151', borderRadius: '8px' }}
                  itemStyle={{ color: '#E5E7EB' }}
                />
                <Bar dataKey="income" fill="#4ADE80" radius={[4, 4, 0, 0]} barSize={30} />
                <Bar dataKey="expenses" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={30} />
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
                    <Cell key={`cell-\${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#161B21', borderColor: '#374151', borderRadius: '8px' }}
                  itemStyle={{ color: '#E5E7EB' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <span className="text-xs text-muted">Total</span>
              <p className="font-bold text-white">${financials.totalExpenses.toFixed(0)}</p>
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

  const renderContent = () => {
    if (activeTab === 'dashboard') return renderDashboard();

    // Transactions / Subscriptions Views
    const isSubView = activeTab === 'subscriptions';
    const items = isSubView
      ? data.expenses.filter(e => e.type === 'subscription').map(x => ({ ...x, _type: 'expenses' }))
      : [...data.income.map(x => ({ ...x, _type: 'income' })), ...data.expenses.map(x => ({ ...x, _type: 'expenses' }))];

    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">{isSubView ? 'Subscriptions' : 'All Transactions'}</h2>
            <Button onClick={openAddModal} variant="primary">
              <Plus size={18} className="mr-2" /> Add New
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border text-muted text-sm">
                  <th className="pb-4 pl-4 font-medium">Name</th>
                  <th className="pb-4 font-medium">Category</th>
                  <th className="pb-4 font-medium">Amount</th>
                  <th className="pb-4 font-medium">Frequency</th>
                  <th className="pb-4 font-medium">Monthly</th>
                  <th className="pb-4 pr-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted">
                      No items found. Add your first transaction!
                    </td>
                  </tr>
                ) : items.map((item, i) => {
                  const realIndex = item._type === 'income'
                    ? data.income.indexOf(item)
                    : data.expenses.indexOf(item);

                  return (
                    <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors group">
                      <td className="py-4 pl-4 font-medium text-white flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center bg-opacity-20",
                          item._type === 'income' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                        )}>
                          {item._type === 'income' ? <TrendingUp size={18} /> : <CreditCard size={18} />}
                        </div>
                        {item.name}
                      </td>
                      <td className="py-4 text-sm text-muted">
                        <span className="px-2 py-1 rounded-md bg-white/5 border border-white/5">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-4 font-bold text-white">${parseFloat(item.amount).toFixed(2)}</td>
                      <td className="py-4 text-sm text-gray-400 capitalize">{item.frequency}</td>
                      <td className="py-4 text-sm text-gray-400 font-mono">
                        ~${normalizeToMonthly(item.amount, item.frequency).toFixed(0)}/mo
                      </td>
                      <td className="py-4 pr-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" className="p-2 h-auto" onClick={() => openEditModal(item, item._type)}>
                            <Edit2 size={16} />
                          </Button>
                          <Button variant="ghost" className="p-2 h-auto text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={() => handleDelete(item._type, item.id)}>
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
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
            />
          </div>
        </div>
      )}
    </div>
  );
}

// --- Sub-components ---

const NavTab = ({ label, active, onClick, icon: Icon }) => (
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

const MobileNavItem = ({ icon: Icon, label, active, onClick }) => (
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

const TransactionForm = ({ initialData, onSave, onCancel }) => {
  const [formData, setFormData] = useState(initialData || {
    name: '',
    amount: '',
    frequency: 'monthly',
    category: 'Food', // Default, will change via effect
    type: 'variable',
    isIncome: false
  });
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiFlash, setAiFlash] = useState(false); // Visual cue for AI actions

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
      const cache = JSON.parse(localStorage.getItem('intelligenceCache') || '{}');
      if (cache[lowerName]) {
        console.log("Memory Hit:", lowerName);
        setFormData(prev => ({ ...prev, ...cache[lowerName] }));
        triggerAiFlash();
        return;
      }

      // 2. Ask Gemini
      const apiKey = localStorage.getItem('geminiApiKey');
      if (!apiKey) return; // Cannot use AI without key

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

  const aiClass = aiFlash ? "ring-2 ring-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)] transition-all duration-1000" : "";

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div className="grid grid-cols-2 gap-2 bg-background p-1 rounded-xl mb-4">
        <button
          type="button"
          onClick={() => setFormData(prev => ({ ...prev, isIncome: false }))}
          className={cn("py-2 rounded-lg text-sm font-medium transition-all", !formData.isIncome ? "bg-card shadow text-white" : "text-muted hover:text-white")}
        >
          Expense
        </button>
        <button
          type="button"
          onClick={() => setFormData(prev => ({ ...prev, isIncome: true }))}
          className={cn("py-2 rounded-lg text-sm font-medium transition-all", formData.isIncome ? "bg-card shadow text-white" : "text-muted hover:text-white")}
        >
          Income
        </button>
      </div>

      <div className="relative">
        <Input label="Name" name="name" value={formData.name} onChange={handleChange} required placeholder="e.g. Netflix" autoFocus />
        {isAiLoading && (
          <div className="absolute right-3 top-[34px] animate-pulse text-primary">
            <Bot size={16} />
          </div>
        )}
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
    </form>
  )
}
