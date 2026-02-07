import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine
} from 'recharts';
import {
  Plus, Trash2, Edit2, TrendingUp, TrendingDown, CreditCard,
  DollarSign, Activity, Wallet, Bell, Search, LayoutDashboard,
  MessageSquare, Send, X, Settings, Sparkles, User, Bot, AlertCircle, Camera, Loader2,
  Cloud, Upload, Download, LogOut, FileText, ChevronLeft, ChevronRight, FileX, Copy, Calendar, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, RefreshCcw, Check,
  Tv, Music, Globe, Smartphone, Wifi, Zap, ShoppingBag, Briefcase, Server, Facebook, Instagram, Linkedin, Twitter, Youtube, Github, Chrome, Twitch, Gamepad2, Coffee, Headphones, Film, Car, PenTool, Image, Pencil
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

const formatAccounting = (val) => {
  const isNeg = val < 0;
  const absVal = Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return isNeg ? `-$${absVal}` : `$${absVal}`;
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const INCOME_CATEGORIES = [
  'Freelance', 'Gift', 'Interest', 'Investments', 'Other', 'Refund', 'Salary', 'Transfer'
];

const EXPENSE_CATEGORIES = [
  'Alcohol', 'Amazon', 'BNPL', 'Credit Card Payment', 'Entertainment', 'Fees', 'Furnishings', 'Gas', 'Gifts', 'Groceries', 'Health', 'Housing', 'Insurance', 'Investments',
  'Kids: Activities', 'Kids: Clothes', 'Kids: Health', 'Kids: Toys', 'Other', 'Personal', 'Restaurants', 'Shopping', 'Software', 'Student Loans', 'Taxes', 'Transfer', 'Travel', 'Utilities'
];

const COLORS = ['#8DAA7F', '#88A0AF', '#D67C7C', '#D4A373', '#6B705C', '#A5A58D', '#9B8AA5', '#D4A5A5', '#7AA67A'];

const isRecurring = (item) => item.frequency !== 'one-time';

const getCategoryIcon = (category) => {
  const map = {
    'Amazon': '📦', 'Alcohol': '🍺', 'Software': '💻', 'Fees': '💸', 'Furnishings': '🛋️', 'Gifts': '🎁', 'Insurance': '🛡️', 'Taxes': '🏛️', 'Travel': '✈️',
    'Housing': '🏠', 'Groceries': '🛒', 'Restaurants': '🍔', 'Gas': '⛽', 'Utilities': '💡',
    'Entertainment': '🎬', 'Health': '❤️', 'Shopping': '🛍️', 'Personal': '👤',
    'Kids: Clothes': '👕', 'Kids: Toys': '🧸', 'Kids: Activities': '🎨', 'Kids: Health': '🩹',
    'Student Loans': '🎓', 'BNPL': '💳', 'Credit Card Payment': '💳',
    'Transfer': '🔄',
    'Salary': '💵', 'Freelance': '💻', 'Interest': '💰', 'Investments': '📈', 'Other': '📦'
  };
  return map[category] || '📦';
};

const getBrandIcon = (name) => {
  const n = name.toLowerCase();
  if (n.includes('netflix')) return <Tv size={24} />;
  if (n.includes('spotify') || n.includes('music') || n.includes('audio') || n.includes('pandora') || n.includes('tidal')) return <Headphones size={24} />;
  if (n.includes('youtube') || n.includes('google *youtube') || n.includes('video')) return <Youtube size={24} />;
  if (n.includes('prime') || n.includes('amazon')) return <ShoppingBag size={24} />;
  if (n.includes('apple') || n.includes('icloud') || n.includes('itunes')) return <Smartphone size={24} />;
  if (n.includes('adobe') || n.includes('photoshop') || n.includes('creative cloud')) return <Image size={24} />;
  if (n.includes('figma') || n.includes('design')) return <PenTool size={24} />;
  if (n.includes('github') || n.includes('gitlab')) return <Github size={24} />;
  if (n.includes('vercel') || n.includes('netlify')) return <Server size={24} />;
  if (n.includes('heroku') || n.includes('digitalocean') || n.includes('aws') || n.includes('cloud')) return <Cloud size={24} />;
  if (n.includes('hbo') || n.includes('hulu') || n.includes('disney') || n.includes('peacock') || n.includes('paramount') || n.includes('tv')) return <Film size={24} />;
  if (n.includes('uber') || n.includes('lyft')) return <Car size={24} />;
  if (n.includes('steam') || n.includes('game') || n.includes('nintendo') || n.includes('playstation') || n.includes('xbox')) return <Gamepad2 size={24} />;
  if (n.includes('chatgpt') || n.includes('openai') || n.includes('notion') || n.includes('claude') || n.includes('ai ')) return <Sparkles size={24} />;
  if (n.includes('google') || n.includes('gsuite') || n.includes('workspace')) return <Chrome size={24} />;
  if (n.includes('twitter') || n.includes('x.com') || n.includes('x corp')) return <Twitter size={24} />;
  if (n.includes('linkedin')) return <Linkedin size={24} />;
  if (n.includes('facebook') || n.includes('meta')) return <Facebook size={24} />;
  if (n.includes('instagram')) return <Instagram size={24} />;
  if (n.includes('twitch')) return <Twitch size={24} />;
  if (n.includes('starbucks') || n.includes('coffee')) return <Coffee size={24} />;
  if (n.includes('internet') || n.includes('wifi') || n.includes('broadband')) return <Wifi size={24} />;
  if (n.includes('electric') || n.includes('power') || n.includes('energy') || n.includes('utility')) return <Zap size={24} />;
  if (n.includes('mobile') || n.includes('phone') || n.includes('cell') || n.includes('verizon') || n.includes('t-mobile') || n.includes('at&t')) return <Smartphone size={24} />;

  return null;
};

// --- Components ---

const Card = ({ children, className, ...props }) => (
  <div className={cn("bg-card border border-border rounded-2xl p-6 shadow-sm", className)} {...props}>
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

const Select = ({ label, options, value, onChange, name, className, ...props }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel = options.find(opt => opt.value === value)?.label || value;

  const handleSelect = (newValue) => {
    // Mimic native event for compatibility with existing handleChange
    onChange({ target: { name, value: newValue } });
    setIsOpen(false);
  };

  return (
    <div className="flex flex-col gap-1.5 w-full" ref={containerRef}>
      {label && <label className="text-xs font-semibold text-muted uppercase tracking-wider">{label}</label>}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full bg-[#0F1115] border border-border rounded-xl px-4 py-3 text-left focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all flex items-center justify-between",
            className
          )}
        >
          <span className={cn("block truncate", !value && "text-muted")}>
            {selectedLabel}
          </span>
          <ChevronRight size={16} className={cn("text-muted transition-transform", isOpen ? "rotate-90" : "rotate-0")} />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-[#161B21] border border-border rounded-xl shadow-2xl max-h-60 overflow-auto py-1 animate-in fade-in zoom-in-95 duration-200">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  "w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-white/5",
                  opt.value === value ? "text-primary font-medium bg-primary/10" : "text-gray-300"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Chat Component ---
const ChatWindow = ({ isOpen, onClose, data, financials, onAddItem, user, onLogin, onLogout, onSync, onRestore, syncStatus, isDesktopPanel = false }) => {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('chatHistory');
    return saved ? JSON.parse(saved) : [{ role: 'model', text: "Hi! I'm your finance assistant. Ask me anything about your dashboard data." }];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('geminiApiKey') || '');
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll on open AND on new messages
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 0);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
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
        You are Lume, a helpful financial assistant analyzing the user's Lume dashboard.
        
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

  // Desktop panel vs mobile modal styling
  const containerClass = isDesktopPanel
    ? "fixed top-16 right-0 w-[420px] h-[calc(100vh-4rem)] bg-card border-l border-border flex flex-col z-30 animate-in slide-in-from-right-10 fade-in duration-300"
    : "fixed bottom-4 right-4 w-[90vw] md:w-[400px] h-[600px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col z-50 animate-in slide-in-from-bottom-10 fade-in duration-300";

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="p-4 border-b border-border flex justify-between items-center bg-card rounded-t-2xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-secondary/50 flex items-center justify-center">
            <Sparkles size={16} className="text-black fill-current" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Lume Assistant</h3>
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
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (window.confirm('Clear chat history?')) {
                  setMessages([{ role: 'model', text: "History cleared. How can I help?" }]);
                  localStorage.removeItem('chatHistory');
                }
              }}
              className="p-2 hover:bg-white/5 rounded-lg text-muted hover:text-danger warning transition-colors mr-1"
              title="Clear History"
            >
              <Trash2 size={18} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-muted hover:text-text transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={cn("flex gap-2 items-end group", msg.role === 'user' ? "flex-row-reverse" : "")}>
            {/* Avatar */}
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center shrink-0 self-start mt-1",
              msg.role === 'user' ? "bg-muted text-black" : "bg-primary/20 text-primary"
            )}>
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>

            {/* Message Bubble */}
            <div className={cn(
              "p-3 rounded-2xl text-sm max-w-[75%]",
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

            {/* Copy Button (Outside Bubble, Bottom-Aligned) */}
            <button
              onClick={() => handleCopy(msg.text)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted hover:text-white shrink-0 mb-1"
              title="Copy to clipboard"
            >
              <Copy size={14} />
            </button>
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
    </div >

  );
};


// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [subscriptionFilter, setSubscriptionFilter] = useState(null);

  // Handle Android Back Gesture / Browser History
  useEffect(() => {
    // Handle initial load
    const currentHash = window.location.hash.replace('#', '');
    if (currentHash && ['dashboard', 'transactions', 'subscriptions', 'statements'].includes(currentHash)) {
      setActiveTab(currentHash);
    }

    const handlePopState = (event) => {
      // If state exists, use it. Otherwise rely on hash or fallback to dashboard.
      if (event.state && event.state.tab) {
        setActiveTab(event.state.tab);
      } else {
        // Fallback for direct hash navigation or empty state
        const hash = window.location.hash.replace('#', '');
        if (hash) {
          setActiveTab(hash);
        } else {
          setActiveTab('dashboard');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigation = (tabName) => {
    if (activeTab === tabName) return;
    setActiveTab(tabName);
    window.history.pushState({ tab: tabName }, '', `#${tabName}`);
  };

  const [viewMode, setViewMode] = useState('cashflow'); // 'cashflow' | 'credit'
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [transactionFilter, setTransactionFilter] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBalanceFormOpen, setIsBalanceFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingBalanceTransfer, setEditingBalanceTransfer] = useState(null);
  const [data, setData] = useState({ income: [], expenses: [], statements: [], balanceTransfers: [] });

  // Date Filtering State
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Force reset to current month on mount (page refresh)
  useEffect(() => {
    const now = new Date();
    setSelectedMonth(now.getMonth());
    setSelectedYear(now.getFullYear());
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingStatement, setPendingStatement] = useState(null);

  const [isLoaded, setIsLoaded] = useState(false);

  // Demo Mode State
  const [demoFinancials, setDemoFinancials] = useState(null);
  const [demoToggle, setDemoToggle] = useState(false); // Alternates between positive/negative

  const toggleDemo = (forceRefresh = false) => {
    if (demoFinancials && !forceRefresh) {
      setDemoFinancials(null);
    } else {
      const nextShouldBeNegative = !demoToggle;
      setDemoToggle(nextShouldBeNegative);

      // Randomize Month for Demo Mode (Every Refresh)
      const newDemoMonth = Math.floor(Math.random() * 12);
      setSelectedMonth(newDemoMonth);

      let income, expenses;
      if (nextShouldBeNegative) {
        // Force Negative: Expenses > Income
        income = Math.floor(Math.random() * 2000) + 2000;
        expenses = income + Math.floor(Math.random() * 1000) + 500;
      } else {
        // Force Positive: Income > Expenses
        income = Math.floor(Math.random() * 3000) + 4000;
        expenses = income - Math.floor(Math.random() * 2000) - 1000;
      }

      const subs = Math.floor(Math.random() * 200) + 50;
      const count = Math.floor(Math.random() * 7) + 3;
      const cc = Math.floor(Math.random() * 1000) + 200;
      const recurring = Math.floor(expenses * 0.6);

      const yearlyData = MONTHS.map((m, i) => {
        // Use NEW demo month for forced values
        const mInc = (i === newDemoMonth) ? income : (Math.floor(Math.random() * 4000) + 2000);
        const mExp = (i === newDemoMonth) ? expenses : (Math.floor(Math.random() * 3500) + 1500);

        return {
          name: m.slice(0, 3),
          year: selectedYear,
          income: mInc,
          expenses: mExp,
          net: mInc - mExp,
          hasData: true,
          byCategory: {
            'Housing': mExp * 0.4,
            'Transport': mExp * 0.15,
            'Food': mExp * 0.2,
            'Utilities': mExp * 0.1,
            'Entertainment': mExp * 0.15
          }
        };
      });

      setDemoFinancials({
        totalSubscriptionsCost: subs,
        activeSubscriptionCount: count,
        totalCcPayments: cc,
        yearlyData,
        totalRecurringExpenses: recurring,
        demoAccounts: [
          { provider: 'Chase Sapphire', last4: '4456', latestBalance: Math.floor(Math.random() * 3000) + 500, type: 'credit_card', latestDate: '2026-01-28', transactionCount: Math.floor(Math.random() * 30) + 20 },
          { provider: 'Amex Platinum', last4: '1002', latestBalance: Math.floor(Math.random() * 5000) + 1000, type: 'credit_card', latestDate: '2026-01-15', transactionCount: Math.floor(Math.random() * 40) + 25 },
          { provider: 'Citi Custom', last4: '8834', latestBalance: Math.random() > 0.5 ? Math.floor(Math.random() * 1500) : 0, type: 'credit_card', latestDate: '2026-01-31', transactionCount: Math.floor(Math.random() * 10) + 5 },
          { provider: 'Fidelity Rewards', last4: '2341', latestBalance: Math.floor(Math.random() * 2000) + 100, type: 'credit_card', latestDate: '2026-01-20', transactionCount: Math.floor(Math.random() * 25) + 12 },
          { provider: 'Fold', last4: '7721', latestBalance: Math.floor(Math.random() * 12000) + 5000, type: 'bank_account', latestDate: '2026-02-01', transactionCount: Math.floor(Math.random() * 60) + 40 },
        ],
        demoTransfers: [
          {
            id: 'demo-bt1',
            name: 'Citi Diamond',
            amount: Math.floor(Math.random() * 8000) + 4000,
            startDate: '2025-01-15',
            aprEndDate: '2026-06-30'
          },
          {
            id: 'demo-bt2',
            name: 'Wells Fargo',
            amount: Math.floor(Math.random() * 4000) + 2000,
            startDate: '2025-08-01',
            aprEndDate: '2026-11-15'
          }
        ],
        demoSubscriptions: [
          { name: 'Netflix', category: 'Entertainment', amount: 15.99, type: 'subscription' },
          { name: 'Spotify', category: 'Entertainment', amount: 9.99, type: 'subscription' },
          { name: 'ChatGPT Plus', category: 'Education', amount: 20.00, type: 'subscription' },
          { name: 'iCloud', category: 'Utilities', amount: 9.99, type: 'subscription' },
          { name: 'Adobe CC', category: 'Work', amount: 52.99, type: 'subscription' },
          { name: 'Gym Membership', category: 'Health', amount: 45.00, type: 'subscription' },
          { name: 'Amazon Prime', category: 'Shopping', amount: 14.99, type: 'subscription' },
          { name: 'YouTube Premium', category: 'Entertainment', amount: 11.99, type: 'subscription' }
        ].slice(0, count).map((sub, i, arr) => {
          // Scale to match 'subs' exactly
          // Use a closure or careful reduce to ensure we track the *assigned* rounded amounts
          const baseTotal = arr.reduce((acc, s) => acc + s.amount, 0);

          // Re-calculate previous items' ASSIGNED amounts to ensure the last item picks up the matching residual
          const getAssignedAmount = (index) => {
            if (index === arr.length - 1) {
              // Verify this logic inside map:
              // This implies we need to calculate all previous values again. 
              // Better is to pre-calculate, but inside map we can do it iteratively or redundant calculation.
              let previousSum = 0;
              for (let k = 0; k < index; k++) {
                const raw = (arr[k].amount * (subs / baseTotal));
                // Use rounding to 2 decimals to match display
                previousSum += (Math.round(raw * 100) / 100);
              }
              // Last item takes the remainder
              return (Math.round((subs - previousSum) * 100) / 100);
            }
            const raw = (arr[index].amount * (subs / baseTotal));
            return (Math.round(raw * 100) / 100);
          };

          const assignedAmount = getAssignedAmount(i);

          return {
            ...sub,
            id: `demo-sub-${i}`,
            amount: assignedAmount, // Use the exact calculated share
            date: `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-05`,
            frequency: 'monthly',
            nextPaymentDate: `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-05`
          };
        }),
        demoTransactions: [
          { name: 'Salary Paycheck', amount: income * 0.6, category: 'Income', isIncome: true, _type: 'income' },
          { name: 'Freelance Gig', amount: income * 0.4, category: 'Income', isIncome: true, _type: 'income' },
          { name: 'Rent Payment', amount: expenses * 0.4, category: 'Housing', isIncome: false, _type: 'expenses' },
          { name: 'Car Payment', amount: expenses * 0.1, category: 'Transport', isIncome: false, _type: 'expenses' },
          { name: 'Whole Foods', amount: expenses * 0.15, category: 'Food', isIncome: false, _type: 'expenses' },
          { name: 'Gas Station', amount: expenses * 0.05, category: 'Transport', isIncome: false, _type: 'expenses' },
          { name: 'Electric Bill', amount: expenses * 0.1, category: 'Utilities', isIncome: false, _type: 'expenses' },
          { name: 'AMC Theatres', amount: expenses * 0.1, category: 'Entertainment', isIncome: false, _type: 'expenses' },
          { name: 'Internet Bill', amount: expenses * 0.1, category: 'Utilities', isIncome: false, _type: 'expenses' },
        ].map((t, i) => ({
          ...t,
          id: `demo-txn-${i}`,
          date: `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 25) + 1).padStart(2, '0')}`
        }))
      });

    }
  };
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
      setData({ income: [], expenses: [], statements: [], balanceTransfers: [] }); // Reset state
      localStorage.setItem('hasWipedLegacyData_v2', 'true');
      console.log("Legacy data wiped for fresh start.");
    } else {
      // Load data normally if already wiped
      const saved = localStorage.getItem('financeData');
      if (saved) {
        try {
          setData({ income: [], expenses: [], statements: [], balanceTransfers: [], ...JSON.parse(saved) });
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

  const subscriptionItems = useMemo(() => {
    const isSub = activeTab === 'subscriptions';
    const raw = isSub ? (demoFinancials ? demoFinancials.demoSubscriptions : data.expenses.filter(e => e.type === 'subscription')) : [];
    const uniqueSubs = new Map();
    raw.forEach(item => {
      const key = item.name.toLowerCase().trim();
      const existing = uniqueSubs.get(key);
      if (!existing || new Date(item.date) > new Date(existing.date)) {
        uniqueSubs.set(key, item);
      }
    });
    return Array.from(uniqueSubs.values())
      .map(x => ({ ...x, _type: 'expenses' }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [data.expenses, demoFinancials, activeTab]);

  const availableFrequencies = useMemo(() => {
    const freqs = new Set(subscriptionItems.map(i => i.frequency || 'Monthly'));
    return Array.from(freqs).map(f => f.charAt(0).toUpperCase() + f.slice(1).toLowerCase()).sort();
  }, [subscriptionItems]);

  const calculatedFinancials = useMemo(() => {
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
    // Use deduplicated active recurring + one-time expenses for consistency with chart
    const oneTimeExpensesTotal = oneTimeExpenses.reduce((acc, item) => acc + parseFloat(item.amount || 0), 0);
    const totalExpenses = totalRecurringExpenses + oneTimeExpensesTotal;
    const net = totalIncome - totalExpenses;



    // CC Payments: Deduplicate by amount + date proximity
    // When importing from multiple sources (e.g., Fold bank + Chase card), the same payment
    // appears on both statements. We dedupe by grouping same amounts within 5 days.
    const ccPaymentItems = data.expenses
      .filter(e => e.category === 'Credit Card Payment' && filterByDate(e))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const seenPayments = []; // { amount, date }
    const uniqueCcPayments = ccPaymentItems.filter(item => {
      const amt = parseFloat(item.amount);
      const itemDate = new Date(item.date);

      // Check if we've already seen this amount within 5 days
      const isDuplicate = seenPayments.some(seen => {
        if (Math.abs(seen.amount - amt) > 0.01) return false; // Different amount
        const daysDiff = Math.abs(itemDate - seen.date) / (1000 * 60 * 60 * 24);
        return daysDiff <= 5; // Same amount within 5 days = duplicate
      });

      if (!isDuplicate) {
        seenPayments.push({ amount: amt, date: itemDate });
        return true;
      }
      return false;
    });

    const totalCcPayments = uniqueCcPayments.reduce((acc, item) => acc + parseFloat(item.amount || 0), 0);

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

  const financials = useMemo(() => {
    if (!demoFinancials) return calculatedFinancials;

    // In demo mode, select the current month's data from yearlyData
    const monthData = demoFinancials.yearlyData[selectedMonth];
    return {
      ...demoFinancials,
      totalIncome: monthData.income,
      totalExpenses: monthData.expenses,
      net: monthData.net,
      byCategory: monthData.byCategory
    };
  }, [demoFinancials, calculatedFinancials, selectedMonth]);

  // Handlers
  const handleDelete = (type, id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    setData(prev => ({
      ...prev,
      [type]: prev[type].filter(item => item.id !== id)
    }));
  };

  const handleUpdateStatement = (id, updates) => {
    setData(prev => ({
      ...prev,
      statements: prev.statements.map(s => s.id === id ? { ...s, ...updates } : s)
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

  // --- Balance Transfer Handlers ---
  const handleSaveBalanceTransfer = (newItem) => {
    setData(prev => {
      const items = prev.balanceTransfers || [];
      if (newItem.id) {
        return { ...prev, balanceTransfers: items.map(i => i.id === newItem.id ? newItem : i) };
      }
      return { ...prev, balanceTransfers: [...items, { ...newItem, id: crypto.randomUUID() }] };
    });
    setIsBalanceFormOpen(false);
    setEditingBalanceTransfer(null);
  };

  const handleDeleteBalanceTransfer = (id) => {
    setData(prev => ({
      ...prev,
      balanceTransfers: (prev.balanceTransfers || []).filter(i => i.id !== id)
    }));
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
  const renderDashboard = () => {
    const chartData = financials.yearlyData;
    const spendingByCat = Object.entries(financials.byCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // --- Credit Card Balances Data Preparation ---
    const creditCardAccounts = (data.statements || []).reduce((acc, s) => {
      const key = `${s.provider}-${s.last4 || 'unknown'}`;
      if (!acc[key]) {
        acc[key] = { provider: s.provider, last4: s.last4, latestDate: s.date, latestBalance: s.balance, type: s.type };
      } else {
        // Update if this statement is newer
        if (new Date(s.date) > new Date(acc[key].latestDate)) {
          acc[key].latestDate = s.date;
          acc[key].latestBalance = s.balance;
        }
      }
      return acc;
    }, {});

    const accountList = demoFinancials ? demoFinancials.demoAccounts : Object.values(creditCardAccounts).sort((a, b) => new Date(b.latestDate) - new Date(a.latestDate));
    const totalCreditBalance = accountList.reduce((sum, acc) => {
      // Exclude Bank Accounts from Total Debt Calculation
      if (acc.provider.toLowerCase().includes('fold') || acc.type === 'bank_account') return sum;
      return sum + (parseFloat(acc.latestBalance) || 0);
    }, 0);
    const totalBalanceTransferAmount = demoFinancials
      ? demoFinancials.demoTransfers.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0)
      : (data.balanceTransfers || []).reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

    const renderAccountList = () => {
      // Filter to only accounts WITH balance data
      // Filter out Fold and explicitly marked bank accounts
      const accountsWithBalance = accountList
        .filter(acc =>
          acc.latestBalance !== undefined &&
          acc.latestBalance !== null &&
          !acc.provider.toLowerCase().includes('fold') &&
          acc.type !== 'bank_account'
        )
        // Sort by Balance Descending (High to Low)
        .sort((a, b) => (parseFloat(b.latestBalance) || 0) - (parseFloat(a.latestBalance) || 0));

      if (accountsWithBalance.length === 0) {
        return <p className="text-[10px] text-muted/70 italic mt-1">Re-import statements to capture balances.</p>;
      }
      return (
        <div className="grid grid-cols-2 gap-x-3 lg:gap-x-8 xl:gap-x-12 gap-y-1.5 mt-2">
          {accountsWithBalance.slice(0, 6).map((acc, idx) => (
            <div key={idx} className="flex justify-between items-center text-[11px]">
              <span className="text-muted truncate mr-1" title={`${acc.provider} ...${acc.last4}`}>
                {acc.provider} <span className="opacity-50">...{acc.last4}</span>
              </span>
              <span className={cn(
                "font-mono font-semibold whitespace-nowrap",
                (parseFloat(acc.latestBalance) || 0) > 0
                  ? (acc.type === 'bank_account' ? "text-primary" : "text-danger")
                  : (parseFloat(acc.latestBalance) || 0) < 0
                    ? (acc.type === 'bank_account' ? "text-danger" : "text-primary")
                    : "text-[#E8F5E9]"
              )}>
                {formatAccounting(parseFloat(acc.latestBalance) || 0).replace('(', '-').replace(')', '')}
              </span>
            </div>
          ))}
          {accountsWithBalance.length > 6 && (
            <p className="col-span-2 text-[9px] text-muted/50 italic text-center mt-1">
              + {accountsWithBalance.length - 6} more
            </p>
          )}
          {accountsWithBalance.length > 1 && (
            <div className="col-span-2 flex justify-between items-center text-[11px] border-t border-white/10 pt-2 mt-1 font-bold">
              <span className="text-white/70">Total</span>
              <span className={totalCreditBalance > 0 ? "text-danger" : "text-[#E8F5E9]"}>
                {formatAccounting(totalCreditBalance).replace('(', '-').replace(')', '')}
              </span>
            </div>
          )}
        </div>
      );
    };

    const renderBalanceTransferList = () => {
      const activeTransfers = demoFinancials ? demoFinancials.demoTransfers : (data.balanceTransfers || []);
      const sorted = [...activeTransfers].sort((a, b) => {
        const now = new Date();
        const daysLeftA = (new Date(a.aprEndDate) - now);
        const daysLeftB = (new Date(b.aprEndDate) - now);
        return daysLeftA - daysLeftB;
      });

      return (
        <div className="flex-1 overflow-y-auto space-y-2 max-h-[72px] scrollbar-hide relative z-10 snap-y snap-mandatory pr-1">
          {sorted.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted/50 text-[10px] italic mt-4">
              <span>No active transfers</span>
            </div>
          ) : (
            sorted.map(bt => {
              const start = new Date(bt.startDate);
              const end = new Date(bt.aprEndDate);
              const now = new Date();
              const totalDuration = end - start;
              const elapsed = now - start;
              const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

              const diffTime = end - now;
              const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              let progressColor = "bg-primary";
              if (daysLeft < 30) progressColor = "bg-danger";
              else if (daysLeft < 90) progressColor = "bg-warning";

              return (
                <div
                  key={bt.id}
                  className="p-2 rounded-lg bg-black/20 hover:bg-black/30 cursor-pointer transition-colors group/item snap-start"
                  onClick={() => { setEditingBalanceTransfer(bt); setIsBalanceFormOpen(true); }}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-[10px] truncate max-w-[120px] text-white/90" title={bt.name}>{bt.name}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-white/80">${Number(bt.amount).toLocaleString()}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteBalanceTransfer(bt.id); }}
                        className="text-danger opacity-0 group-hover/item:opacity-100 hover:bg-danger/10 p-1 rounded transition-all"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mb-1">
                    <div className={cn("h-full transition-all duration-500", progressColor)} style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex justify-between text-[9px] text-muted font-medium">
                    <span>{daysLeft > 0 ? `${daysLeft}d left` : 'Expired'}</span>
                    <span className="text-white/30">{new Date(bt.aprEndDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      );
    };


    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex justify-between items-center mb-8">
          {/* View Toggle - Hidden on desktop, all cards shown together */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide lg:hidden">
            <button
              onClick={() => setViewMode('cashflow')}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                viewMode === 'cashflow'
                  ? "bg-primary text-black shadow-lg shadow-primary/20"
                  : "bg-card border border-white/10 text-muted hover:bg-white/5"
              )}
            >
              Cash Flow
            </button>
            <button
              onClick={() => setViewMode('credit')}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                viewMode === 'credit'
                  ? "bg-secondary text-black shadow-lg shadow-secondary/20"
                  : "bg-card border border-white/10 text-muted hover:bg-white/5"
              )}
            >
              Credit
            </button>
          </div>
          {/* Desktop: Just show month label */}
          <div className="hidden lg:flex items-center gap-4 w-full">
            <h2 className="text-lg font-bold text-white tracking-wide shrink-0">{MONTHS[selectedMonth]} Overview</h2>
            <div className="h-[2px] flex-1 bg-gradient-to-r from-primary/50 via-primary/10 to-transparent rounded-full" />
          </div>

          <div className="flex items-center gap-2">
            {demoFinancials && (
              <button
                onClick={() => toggleDemo(true)}
                className="p-2 bg-white/5 border border-white/10 rounded-full text-muted hover:text-white hover:bg-white/10 transition-all active:rotate-180 duration-500"
                title="Refresh Demo Data"
              >
                <RefreshCcw size={14} />
              </button>
            )}
            <button
              onClick={() => toggleDemo(false)}
              className={cn(
                "text-[10px] font-bold px-4 py-1.5 rounded-full border transition-all uppercase tracking-wider whitespace-nowrap",
                demoFinancials
                  ? "bg-purple-500 text-white border-purple-400 shadow-lg shadow-purple-500/20"
                  : "bg-white/5 text-muted border-white/10 hover:bg-white/10"
              )}
            >
              {demoFinancials ? "Demo Active" : "Demo"}
            </button>

            {/* Prominent Add Button Removed */}
          </div>
        </div>
        {/* Desktop: Unified grid matching wireframe layout (8-col for equal widths) */}
        <div className="hidden lg:grid grid-cols-12 grid-rows-[auto_auto_auto] gap-4 mb-8">
          {/* Row 1-2: Cash Flow Hero (left, spans 2 rows) */}
          {(() => {
            const isNegative = financials.net < 0;
            return (
              <Card className={cn(
                "col-span-6 row-span-2 p-0 relative overflow-hidden border-none min-h-[220px] flex flex-col justify-between transition-colors duration-500 text-black",
                isNegative ? "bg-danger shadow-xl shadow-danger/20" : "bg-primary shadow-xl shadow-primary/20"
              )}>
                <div className="p-4 flex-1 relative z-10 flex flex-col">
                  {/* Top Row: Month badge, centered title, TBD pills */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-0.5 -ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedMonth === 0) {
                            setSelectedMonth(11);
                            setSelectedYear(selectedYear - 1);
                          } else {
                            setSelectedMonth(selectedMonth - 1);
                          }
                        }}
                        className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-black/10 transition-colors"
                        title="Previous Month"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="text-sm font-bold px-3 py-1 rounded-full backdrop-blur-sm bg-black/10">
                        {MONTHS[selectedMonth]}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedMonth === 11) {
                            setSelectedMonth(0);
                            setSelectedYear(selectedYear + 1);
                          } else {
                            setSelectedMonth(selectedMonth + 1);
                          }
                        }}
                        className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-black/10 transition-colors"
                        title="Next Month"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>

                    {/* Centered Title */}
                    <h3 className="absolute left-1/2 -translate-x-1/2 text-sm font-bold uppercase tracking-[0.2em] text-black/50">
                      Cash Flow
                    </h3>

                    {/* Small TBD Pills */}
                    <div className="flex rounded-full p-0.5 backdrop-blur-md bg-black/10">
                      <div className="px-3 py-1 rounded-full text-[10px] font-bold bg-black/10 opacity-60">TBD</div>
                      <div className="px-3 py-1 rounded-full text-[10px] font-bold opacity-40">TBD</div>
                    </div>
                  </div>

                  {/* Centered Amount */}
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-6xl font-display font-bold tracking-tight">
                      {formatAccounting(financials.net)}
                    </p>
                  </div>
                </div>

                {/* Bottom TBD Action Buttons */}
                <div className="p-3 grid grid-cols-2 gap-2">
                  <button className="py-3 rounded-xl text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 backdrop-blur-sm shadow-sm border bg-black/10 hover:bg-black/20 border-black/5 transition-colors">
                    <span>TBD</span>
                  </button>
                  <button className="py-3 rounded-xl text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 backdrop-blur-sm shadow-sm border bg-black/10 hover:bg-black/20 border-black/5 transition-colors">
                    <span>TBD</span>
                  </button>
                </div>

                <ArrowRightLeft size={140} className="absolute bottom-[-20px] right-[-20px] rotate-[-15deg] pointer-events-none text-black/5" />
              </Card>
            );
          })()}

          {/* Row 1 Right: Income */}
          <Card
            onClick={() => { setTransactionFilter('income'); handleNavigation('transactions'); }}
            className="col-span-3 p-4 bg-gradient-to-br from-card to-card/50 relative overflow-hidden group border-primary/20 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/10 flex flex-col justify-center"
          >
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <ArrowDownLeft size={36} />
            </div>
            <h3 className="text-muted text-xs font-medium uppercase tracking-wide">Income</h3>
            <p className="text-2xl font-display font-bold mt-2 text-primary tracking-tight">${financials.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </Card>

          {/* Row 1 Right: Expenses - equal width with Income */}
          <Card
            onClick={() => { setTransactionFilter('expenses'); handleNavigation('transactions'); }}
            className="col-span-3 p-4 bg-gradient-to-br from-card to-card/50 relative overflow-hidden group border-danger/20 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-danger/10 flex flex-col justify-center"
          >
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <ArrowUpRight size={36} />
            </div>
            <h3 className="text-muted text-xs font-medium uppercase tracking-wide">Expenses</h3>
            <p className="text-2xl font-display font-bold mt-2 text-danger tracking-tight">${financials.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </Card>

          {/* Row 2 Right: Subscriptions - spans same width as Income+Expenses combined */}
          <Card
            onClick={() => handleNavigation('subscriptions')}
            className="col-span-6 p-4 bg-gradient-to-br from-card to-card/50 relative overflow-hidden group border-warning/20 cursor-pointer transition-all hover:scale-[1.01] hover:shadow-lg hover:shadow-warning/10 flex items-center justify-between"
          >
            <div>
              <h3 className="text-muted text-xs font-medium uppercase tracking-wide">Subscriptions ({financials.activeSubscriptionCount})</h3>
              <p className="text-2xl font-display font-bold mt-2 text-warning tracking-tight">
                ${financials.totalSubscriptionsCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<span className="text-sm font-normal text-muted ml-1">per month</span>
              </p>
            </div>
            <Calendar size={28} className="text-warning opacity-40" />
          </Card>

          {/* Row 3: Credit Card Payments */}
          <Card
            onClick={() => { setTransactionFilter('cc-payments'); handleNavigation('transactions'); }}
            className="col-span-3 p-4 bg-gradient-to-br from-card to-card/50 relative overflow-hidden group border-secondary/20 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-secondary/10 flex flex-col justify-center"
          >
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <CreditCard size={36} />
            </div>
            <h3 className="text-muted text-xs font-medium uppercase tracking-wide">Credit Card Payments</h3>
            <p className="text-2xl font-display font-bold mt-2 text-secondary tracking-tight">${financials.totalCcPayments.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </Card>

          {/* Row 3: Credit Card Balances */}
          <Card
            onClick={() => { handleNavigation('statements'); }}
            className="col-span-5 p-3 bg-card/30 border-border/50 relative overflow-hidden group hover:bg-card/40 transition-colors cursor-pointer"
          >
            <h3 className="text-muted text-[10px] font-medium uppercase tracking-wide flex items-center gap-1.5">
              <CreditCard size={12} className="text-muted" />
              Card Balances
            </h3>

            {/* Compact List of Balances */}
            {renderAccountList()}
          </Card>

          {/* Row 3: Balance Transfers */}
          <Card className="col-span-4 p-4 bg-card/30 border-border/50 relative overflow-hidden group hover:bg-card/40 transition-colors flex flex-col">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-muted text-xs font-medium uppercase tracking-wide">
                Balance Transfers
                {totalBalanceTransferAmount > 0 && <span className="text-danger ml-2">${totalBalanceTransferAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>}
              </h3>
              <button
                onClick={() => { setEditingBalanceTransfer(null); setIsBalanceFormOpen(true); }}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-white/5 hover:bg-primary/20 hover:text-primary transition-colors z-20"
              >
                <Plus size={14} />
              </button>
            </div>

            {renderBalanceTransferList()}

            <TrendingDown size={100} className="absolute bottom-[-30px] right-[-20px] text-muted opacity-[0.03] rotate-[-15deg] pointer-events-none" />
          </Card>
        </div>

        {/* Mobile: Conditional view based on toggle */}
        <div className={cn("lg:hidden grid gap-3 md:gap-4 mb-8", viewMode === 'cashflow' ? "grid-cols-2" : "grid-cols-1 md:grid-cols-3")}>

          {viewMode === 'cashflow' && (
            <>
              {/* Hero Card - Cash Flow Style */}
              {(() => {
                const isNegative = financials.net < 0;
                return (
                  <Card className={cn(
                    "col-span-2 p-0 relative overflow-hidden border-none min-h-[220px] flex flex-col justify-between transition-colors duration-500 text-black",
                    isNegative ? "bg-danger shadow-xl shadow-danger/20" : "bg-primary"
                  )}>
                    <div className="p-5 flex-1 relative z-10">
                      <div className="flex justify-between items-center mb-2 relative">
                        <div className="z-20 flex items-center gap-0.5 -ml-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (selectedMonth === 0) {
                                setSelectedMonth(11);
                                setSelectedYear(selectedYear - 1);
                              } else {
                                setSelectedMonth(selectedMonth - 1);
                              }
                            }}
                            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-black/10 transition-colors"
                            title="Previous Month"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="text-sm font-bold px-3 py-1 rounded-full backdrop-blur-sm bg-black/10">
                            {MONTHS[selectedMonth]}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (selectedMonth === 11) {
                                setSelectedMonth(0);
                                setSelectedYear(selectedYear + 1);
                              } else {
                                setSelectedMonth(selectedMonth + 1);
                              }
                            }}
                            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-black/10 transition-colors"
                            title="Next Month"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                        <div className="absolute left-1/2 -translate-x-1/2 top-1.5 z-10 w-full text-center">
                          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/60">Cash Flow</h3>
                        </div>
                        <div className="flex rounded-full p-0.5 backdrop-blur-md z-20 bg-black/10">
                          <div className="px-3 py-1 rounded-full text-[10px] font-bold bg-black/10 opacity-50">TBD</div>
                          <div className="px-3 py-1 rounded-full text-[10px] font-bold opacity-30">TBD</div>
                        </div>
                      </div>
                      <div className="mt-8 text-center flex flex-col items-center justify-center flex-1">
                        <p className="text-6xl font-display font-bold tracking-tight">
                          {formatAccounting(financials.net)}
                        </p>
                      </div>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-3 mt-auto">
                      <button className="py-3 rounded-xl transition-all text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 backdrop-blur-sm shadow-sm border bg-black/10 hover:bg-black/20 border-black/5">
                        <span>TBD</span>
                      </button>
                      <button className="py-3 rounded-xl transition-all text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 backdrop-blur-sm shadow-sm border bg-black/10 hover:bg-black/20 border-black/5">
                        <span>TBD</span>
                      </button>
                    </div>
                    <ArrowRightLeft size={160} className="absolute bottom-[-20px] right-[-20px] rotate-[-15deg] pointer-events-none transition-colors text-black/5" />
                  </Card>
                );
              })()}

              {/* Income Card */}
              <Card
                onClick={() => { setTransactionFilter('income'); handleNavigation('transactions'); }}
                className="col-span-1 p-4 md:p-6 bg-gradient-to-br from-card to-card/50 relative overflow-hidden group border-primary/10 cursor-pointer transition-all hover:scale-[1.01] hover:shadow-lg hover:shadow-primary/10 flex flex-col justify-center"
              >
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <ArrowDownLeft size={40} />
                </div>
                <h3 className="text-muted text-xs font-medium">Income</h3>
                <p className="text-xl md:text-2xl font-display font-bold mt-1 text-primary tracking-tight">${financials.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </Card>

              {/* Expenses Card */}
              <Card
                onClick={() => { setTransactionFilter('expenses'); handleNavigation('transactions'); }}
                className="col-span-1 p-4 md:p-6 bg-gradient-to-br from-card to-card/50 relative overflow-hidden group border-secondary/10 cursor-pointer transition-all hover:scale-[1.01] hover:shadow-lg hover:shadow-secondary/10 flex flex-col justify-center"
              >
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <ArrowUpRight size={40} />
                </div>
                <h3 className="text-muted text-xs font-medium">Expenses</h3>
                <p className="text-xl md:text-2xl font-display font-bold mt-1 text-secondary tracking-tight">${financials.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </Card>

              {/* Subscriptions Card */}
              <Card
                onClick={() => handleNavigation('subscriptions')}
                className="col-span-2 p-4 md:p-6 bg-gradient-to-br from-card to-card/50 relative overflow-hidden group border-warning/10 cursor-pointer transition-all hover:scale-[1.01] hover:shadow-lg hover:shadow-warning/10 flex items-center justify-between"
              >
                <div>
                  <h3 className="text-muted text-xs font-medium">Subscriptions ({financials.activeSubscriptionCount})</h3>
                  <p className="text-xl font-display font-bold mt-1 text-white tracking-tight">
                    ${financials.totalSubscriptionsCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<span className="text-sm font-normal text-muted/70 ml-1">per month</span>
                  </p>
                </div>
                <Calendar size={24} className="text-warning opacity-50" />
              </Card>
            </>
          )}

          {viewMode === 'credit' && (
            <>
              <div
                onClick={() => { setTransactionFilter('cc-payments'); handleNavigation('transactions'); }}
                className="bg-card/30 border border-border/50 rounded-xl p-6 flex flex-col justify-between group hover:border-secondary/30 transition-all cursor-pointer hover:bg-card/50 relative overflow-hidden min-h-[140px]"
              >
                <div>
                  <h4 className="text-muted text-xs font-semibold uppercase tracking-wider mb-2">CC Payments</h4>
                  <p className="text-3xl font-display font-bold text-secondary/90 tracking-tight">${financials.totalCcPayments.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <CreditCard size={48} className="absolute bottom-[-10px] right-[-10px] text-secondary opacity-10 group-hover:opacity-20 transition-opacity rotate-[-15deg]" />
              </div>

              <div
                onClick={() => { handleNavigation('statements'); }}
                className="bg-card/30 border border-border/50 rounded-xl p-4 flex flex-col group hover:border-secondary/30 transition-colors relative overflow-hidden cursor-pointer">
                <div>
                  <h4 className="text-muted text-[10px] font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
                    <CreditCard size={12} />
                    Card Balances
                  </h4>
                  {/* Mobile List View - Only show if balance data exists */}
                  {renderAccountList()}
                </div>
              </div>

              <div className="bg-card/30 border border-border/50 rounded-xl p-4 flex flex-col group hover:border-secondary/30 transition-all relative overflow-hidden cursor-pointer">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="text-muted text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingDown size={12} />
                    Transfers
                    {totalBalanceTransferAmount > 0 && <span className="text-danger ml-1">${totalBalanceTransferAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>}
                  </h4>
                  <button
                    onClick={() => { setEditingBalanceTransfer(null); setIsBalanceFormOpen(true); }}
                    className="w-6 h-6 flex items-center justify-center rounded-full bg-white/5 hover:bg-primary/20 hover:text-primary transition-colors z-20"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                {renderBalanceTransferList()}
                <TrendingDown size={48} className="absolute bottom-[-10px] right-[-10px] text-muted opacity-[0.03] rotate-[-15deg] pointer-events-none" />
              </div>
            </>
          )}
        </div>

        {/* Charts Section - Visible on Dashboard mainly */}
        <div className="flex items-center gap-4 px-2 mb-4 mt-2">
          <h3 className="text-lg font-bold text-white tracking-wide shrink-0">Analytics</h3>
          <div className="h-[2px] flex-1 bg-gradient-to-r from-primary/50 via-primary/10 to-transparent rounded-full" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 min-h-[300px] md:min-h-[400px]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-medium text-muted">Income vs Expenses</h3>
              {/* Chart controls (year/month) - Simplified for mobile */}
              <div className="flex gap-2">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-background border border-border text-xs rounded-lg px-2 py-1 outline-none focus:border-primary"
                >
                  {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
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
                                <span style={{ color: entry.dataKey === 'income' ? '#8DAA7F' : '#D67C7C' }}>
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
                    label={({ viewBox }) => {
                      const lineRightX = viewBox.x + viewBox.width;
                      const lineY = viewBox.y;
                      return (
                        <g>
                          <text x={lineRightX} y={lineY} dy={-6} fill="#D4A373" fontSize={10} textAnchor="end">Recurring:</text>
                          <text x={lineRightX} y={lineY} dy={14} fill="#D4A373" fontSize={12} fontWeight="bold" textAnchor="end">${financials.totalRecurringExpenses.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</text>
                        </g>
                      );
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
                      // In Demo Mode, the "Current Date" is simulated as the selected month
                      const effectiveCurrentMonth = demoFinancials ? selectedMonth : today.getMonth();
                      const effectiveCurrentYear = demoFinancials ? selectedYear : today.getFullYear();

                      const isPast = selectedYear < effectiveCurrentYear || (selectedYear === effectiveCurrentYear && index < effectiveCurrentMonth);
                      const isCurrent = selectedYear === effectiveCurrentYear && index === effectiveCurrentMonth;
                      const isFuture = selectedYear > effectiveCurrentYear || (selectedYear === effectiveCurrentYear && index > effectiveCurrentMonth);

                      const isSelected = index === selectedMonth;

                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={isFuture ? "#374151" : (isPast || isCurrent ? "#8DAA7F" : "#8DAA7F99")} // Primary (Moss Green) or Grey for Future
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
                      // In Demo Mode, the "Current Date" is simulated as the selected month
                      const effectiveCurrentMonth = demoFinancials ? selectedMonth : today.getMonth();
                      const effectiveCurrentYear = demoFinancials ? selectedYear : today.getFullYear();

                      const isPast = selectedYear < effectiveCurrentYear || (selectedYear === effectiveCurrentYear && index < effectiveCurrentMonth);
                      const isCurrent = selectedYear === effectiveCurrentYear && index === effectiveCurrentMonth;
                      const isFuture = selectedYear > effectiveCurrentYear || (selectedYear === effectiveCurrentYear && index > effectiveCurrentMonth);

                      const isSelected = index === selectedMonth;

                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={isFuture ? "#374151" : (isPast || isCurrent ? "#D67C7C" : "#D67C7C99")} // Danger (Terracotta) or Grey for Future
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
                    isAnimationActive={false}
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
            <div className="mt-4 flex gap-4 text-xs">
              {(() => {
                const sortedItems = Object.entries(financials.byCategory).sort(([, a], [, b]) => b - a);
                const mid = Math.ceil(sortedItems.length / 2);
                const left = sortedItems.slice(0, mid);
                const right = sortedItems.slice(mid);

                const renderColumn = (items, offsetIndex) => (
                  <div className="flex-1 space-y-2">
                    {items.map(([name, value], i) => {
                      const actualIdx = offsetIndex + i;
                      return (
                        <div key={name} className="flex items-center gap-2 group relative cursor-help">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[actualIdx % COLORS.length] }} />
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
                      );
                    })}
                  </div>
                );

                return (
                  <>
                    {renderColumn(left, 0)}
                    {renderColumn(right, mid)}
                  </>
                );
              })()}
            </div>
          </Card>
        </div>
      </div >
    );
  };

  // --- Virtual Transactions Helper ---

  const getMonthlyItems = useMemo(() => {
    if (demoFinancials) return [...demoFinancials.demoTransactions].sort((a, b) => new Date(b.date) - new Date(a.date));

    const today = new Date();
    const currentMonthIndex = today.getMonth();
    const currentYear = today.getFullYear();

    // Filter items for this specific month/year
    const monthFilter = (item) => {
      if (!item.date) return false;
      const [y, m] = item.date.split('-').map(Number);
      return (m - 1) === selectedMonth && y === selectedYear;
    };

    // ONLY show actual transactions from data (no virtual/assumed items)
    const incomeItems = data.income.filter(monthFilter).map(i => ({ ...i, _type: 'income', isVirtual: false }));
    const expenseItems = data.expenses.filter(monthFilter).map(e => ({ ...e, _type: 'expenses', isVirtual: false }));

    const allItems = [...incomeItems, ...expenseItems];

    // Sort by Date Descending
    return allItems.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [data, demoFinancials, selectedMonth, selectedYear]);

  // --- Render Functions ---

  const renderContent = () => {
    const isSearchActive = searchQuery.length >= 2;
    if (!isSearchActive && activeTab === 'dashboard') return renderDashboard();

    if (!isSearchActive && activeTab === 'statements') {
      // Group by unique account (provider + last4)
      const grouped = (data.statements || []).reduce((acc, s) => {
        const key = `${s.provider}-${s.last4 || 'unknown'}`;
        // Fold is always a bank account
        const resolvedType = (s.provider?.toLowerCase() === 'fold' || s.type === 'bank_account') ? 'bank_account' : 'credit_card';
        acc[key] = acc[key] || { provider: s.provider, last4: s.last4, type: resolvedType, statements: [] };
        acc[key].statements.push(s);
        return acc;
      }, {});

      // Sort accounts by most recent statement date
      const sortedAccounts = demoFinancials ? demoFinancials.demoAccounts.map(acc => ({
        ...acc,
        statements: [{
          id: `demo-${acc.provider}`,
          date: acc.latestDate,
          balance: acc.latestBalance,
          transactionCount: acc.transactionCount
        }]
      })) : Object.values(grouped).sort((a, b) => {
        const latestA = Math.max(...a.statements.map(s => new Date(s.date)));
        const latestB = Math.max(...b.statements.map(s => new Date(s.date)));
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
              Upload Statement / Screenshot
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
                  onUpdate={handleUpdateStatement}
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
      const matchesCategory = item.category && item.category.toLowerCase().includes(q);
      const matchesAmount = !isNaN(parseFloat(searchQuery)) && Math.abs(parseFloat(item.amount) - parseFloat(searchQuery)) < 0.01;
      return matchesName || matchesCategory || matchesAmount;
    }).sort((a, b) => new Date(b.date) - new Date(a.date)) : [];



    let items = isSearchActive ? searchItems : (isSubView
      ? subscriptionItems.filter(i => !subscriptionFilter || (i.frequency || 'Monthly').toLowerCase() === subscriptionFilter.toLowerCase())
      : getMonthlyItems);

    if (transactionFilter && !isSearchActive && !isSubView) {
      if (transactionFilter === 'income') {
        items = items.filter(i => i._type === 'income');
      } else if (transactionFilter === 'expenses') {
        items = items.filter(i => i._type === 'expenses' && i.category !== 'Credit Card Payment');
      } else if (transactionFilter === 'cc-payments') {
        items = items.filter(i => i.category === 'Credit Card Payment');
      }
    }

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const isFutureMonth = selectedYear > currentYear || (selectedYear === currentYear && selectedMonth > currentMonth);

    // If Sub View, strictly showing list of services (no virtual logic needed usually, but keeping simple)
    // Actually for Sub View, user checks specific list.
    // For Main View, we use the Calculated Monthly Items.

    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 md:pb-0">
        <Card className="p-0 overflow-hidden border-border/50 bg-background md:bg-card border-none md:border">
          {/* Header */}
          <div className="px-4 py-6 border-b border-white/5 flex items-center justify-between sticky top-16 z-30 bg-background/95 backdrop-blur-md md:static md:bg-transparent">
            <div className="flex items-center gap-3">
              {/* X Button for Search */}
              {isSearchActive && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-white/5 active:scale-95 transition-all text-text"
                >
                  <X size={20} />
                </button>
              )}
              {isSubView ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary border border-secondary/20">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <h2 className="font-bold text-xl">Subscriptions</h2>
                    <p className="text-xs text-muted leading-none mt-1">Active recurring charges</p>
                  </div>
                </div>
              ) : (
                <h2 className="font-bold text-xl">Transaction History</h2>
              )}
            </div>
          </div>

          {/* Filter Pills */}
          {!isSearchActive && (
            <div className="px-4 pb-4 border-b border-white/5 flex gap-2 overflow-x-auto scrollbar-hide">
              {!isSubView ? (
                <>
                  <button
                    onClick={() => setTransactionFilter(null)}
                    className={cn(
                      "px-5 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap",
                      !transactionFilter ? "bg-primary text-black" : "bg-card border border-white/10 text-muted hover:text-white"
                    )}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setTransactionFilter('expenses')}
                    className={cn(
                      "px-5 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap",
                      transactionFilter === 'expenses' ? "bg-secondary text-black" : "bg-card border border-white/10 text-muted hover:text-white"
                    )}
                  >
                    Expenses
                  </button>
                  <button
                    onClick={() => setTransactionFilter('income')}
                    className={cn(
                      "px-5 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap",
                      transactionFilter === 'income' ? "bg-primary text-black" : "bg-card border border-white/10 text-muted hover:text-white"
                    )}
                  >
                    Income
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setSubscriptionFilter(null)}
                    className={cn(
                      "px-5 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap capitalize",
                      !subscriptionFilter ? "bg-primary text-black" : "bg-card border border-white/10 text-muted hover:text-white"
                    )}
                  >
                    All
                  </button>
                  {availableFrequencies.map(freq => (
                    <button
                      key={freq}
                      onClick={() => setSubscriptionFilter(freq)}
                      className={cn(
                        "px-5 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap capitalize",
                        subscriptionFilter === freq ? "bg-secondary text-black" : "bg-card border border-white/10 text-muted hover:text-white"
                      )}
                    >
                      {freq}
                    </button>
                  ))}
                </>
              )}
            </div>
          )}

          {/* List View or Empty State */}
          {items.length === 0 ? (
            <div className="text-center py-12 text-muted">
              <div className="bg-card w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                <Search size={24} opacity={0.5} />
              </div>
              <p>No transactions found for {MONTHS[selectedMonth]} {selectedYear}.</p>
            </div>
          ) : (
            <div className="space-y-px bg-white/5">
              {items.map((item, index) => {
                // Parse original date
                const [y, m, d] = item.date.split('-').map(Number);
                const originalDateObj = new Date(y, m - 1, d);

                // Search Grouping Header
                let monthHeader = null;
                if (isSearchActive) {
                  const currentMonthKey = `${y}-${m}`;
                  const prevItem = items[index - 1];
                  let prevMonthKey = null;
                  if (prevItem) {
                    const [py, pm] = prevItem.date.split('-').map(Number);
                    prevMonthKey = `${py}-${pm}`;
                  }

                  if (currentMonthKey !== prevMonthKey) {
                    monthHeader = (
                      <div className="px-4 py-2 bg-white/5 text-xs font-bold text-muted uppercase tracking-widest border-b border-white/5 flex items-center gap-2">
                        <Calendar size={12} className="opacity-50" />
                        {MONTHS[m - 1]} {y}
                      </div>
                    );
                  }
                }

                let dateObj = originalDateObj;
                let nextPaymentText = null;
                let frequency = item.frequency; // e.g. 'monthly', 'weekly'

                if (isSubView && frequency) {
                  // Calculate "Next" Text (e.g. "15th")
                  const day = d;
                  const suffix = (val) => {
                    if (val > 3 && val < 21) return 'th';
                    switch (val % 10) {
                      case 1: return "st";
                      case 2: return "nd";
                      case 3: return "rd";
                      default: return "th";
                    }
                  };
                  nextPaymentText = `${day}${suffix(day)}`;
                }

                const isIncome = item._type === 'income';
                const sourceStatement = (data.statements || []).find(s => s.id === item.statementId);
                const sourceText = sourceStatement
                  ? `${sourceStatement.provider} ****${sourceStatement.last4}`
                  : (isIncome ? 'Income' : 'Expense');

                // Determine frequency badge styling
                let freqStyle = "bg-[#88A0AF] text-[#0F1115]"; // Default (Monthly)
                if (frequency) {
                  const f = frequency.toLowerCase();
                  if (f.includes('week')) freqStyle = "bg-[#D4A373] text-[#0F1115]"; // High frequency -> Warm color
                  else if (f.includes('year') || f.includes('annual')) freqStyle = "bg-[#8DAA7F] text-[#0F1115]"; // Low frequency -> Green/Good
                }

                return (
                  <React.Fragment key={item.id}>
                    {monthHeader}
                    <div
                      onClick={() => { setEditingItem(item); setIsFormOpen(true); }}
                      className="bg-background p-4 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors border-b border-border/10 last:border-0 gap-3"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        {/* Icon Circle */}
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-sm shrink-0",
                          isSubView
                            ? "bg-secondary/10 text-secondary border border-secondary/20"
                            : (isIncome ? "bg-[#34D399] text-white" : "bg-[#F87171] text-white")
                        )}>
                          {getBrandIcon(item.name) || (isIncome ? <TrendingDown size={24} className="rotate-180" /> : <TrendingUp size={24} />)}
                        </div>

                        {/* Text Info */}
                        <div className="min-w-[80px] shrink flex-1">
                          <h4 className="font-bold text-base text-white truncate">{item.name}</h4>

                          {isSubView ? (
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide",
                                freqStyle
                              )}>
                                {item.frequency || 'Monthly'}
                              </span>
                              <span className="text-xs text-muted font-medium flex items-center gap-2">
                                <span>on {nextPaymentText}</span>
                                <span className="opacity-50">|</span>
                                {(() => {
                                  const isPaidThisMonth = dateObj.getMonth() === new Date().getMonth() && dateObj.getFullYear() === new Date().getFullYear();
                                  return (
                                    <span className={cn("flex items-center gap-1.5", isPaidThisMonth ? "text-[#8DAA7F] font-bold" : "text-muted")}>
                                      {isPaidThisMonth && <Check size={12} strokeWidth={3} />}
                                      <span>{isPaidThisMonth ? "Paid" : "Last Paid"}: {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                    </span>
                                  );
                                })()}
                              </span>
                            </div>
                          ) : (
                            <p className="text-xs text-muted font-medium mt-0.5 flex flex-wrap items-center gap-1.5">
                              <span>{dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'long' })}</span>
                              <span>•</span>
                              <span className="capitalize truncate max-w-[120px]">
                                {sourceText}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Amount */}
                      <div className={cn(
                        "text-right font-bold text-base shrink-0 min-w-[70px]",
                        isIncome ? "text-[#34D399]" : "text-[#F87171]"
                      )}>
                        {isIncome ? '+' : '-'}${parseFloat(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    );
  };




  return (
    <div className="min-h-screen bg-background text-text flex flex-col relative selection:bg-primary/20">
      {/* Sidebar */}
      {/* Top Navigation (Desktop) & Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="w-full max-w-none px-4 md:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0 flex-1 justify-start">
            <div
              className="flex items-center gap-1.5 group cursor-pointer select-none"
              onClick={() => handleNavigation('dashboard')}
            >
              <h1 className="text-3xl font-bold tracking-tighter bg-gradient-to-b from-[#A5C196] via-[#8DAA7F] to-[#738965] bg-clip-text text-transparent transition-all duration-300 group-hover:brightness-110 drop-shadow-sm">
                Lume
              </h1>
              <div className="w-1.5 h-1.5 rounded-full bg-primary mb-1 mt-1 opacity-0 group-hover:opacity-100 transition-all duration-500 scale-0 group-hover:scale-100 shadow-[0_0_10px_#8DAA7F]"></div>
            </div>
            {/* Desktop Add Button */}
            <button
              onClick={openAddModal}
              className="hidden md:flex items-center justify-center w-10 h-10 bg-primary/20 hover:bg-primary text-primary hover:text-black rounded-full shadow-lg hover:shadow-primary/20 hover:scale-105 active:scale-95 transition-all ml-1"
              title="Add New Transaction"
            >
              <Plus size={24} strokeWidth={3} />
            </button>
          </div>

          <nav className="hidden md:flex items-center gap-1 mx-auto px-2 shrink-0 overflow-x-auto whitespace-nowrap scrollbar-hide max-w-[50vw]">
            <NavTab label="Dashboard" active={activeTab === 'dashboard'} onClick={() => { handleNavigation('dashboard'); setTransactionFilter(null); }} disabled={searchQuery.length >= 2} />
            <NavTab label="Transactions" active={activeTab === 'transactions'} onClick={() => { handleNavigation('transactions'); setTransactionFilter(null); }} disabled={searchQuery.length >= 2} />
            <NavTab label="Subscriptions" active={activeTab === 'subscriptions'} onClick={() => { handleNavigation('subscriptions'); setTransactionFilter(null); }} disabled={searchQuery.length >= 2} />
            <NavTab label="Statements" active={activeTab === 'statements'} onClick={() => { handleNavigation('statements'); setTransactionFilter(null); }} disabled={searchQuery.length >= 2} />
          </nav>

          <div className="flex items-center gap-3 shrink-0 flex-1 justify-end">
            <div className="relative flex-1 max-w-[160px] sm:max-w-[200px]">
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
                className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 border border-white/10 hover:ring-2 hover:ring-purple-500/50 transition-all flex items-center justify-center text-white shadow-lg shadow-purple-500/20"
              >
                <User size={18} />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-12 w-72 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                  {/* User Info Row */}
                  <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white">
                        <User size={16} />
                      </div>
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

                        {/* Reset AI Learning */}
                        <button
                          onClick={() => {
                            if (window.confirm('Reset AI categorization learning?')) {
                              localStorage.removeItem('intelligenceCache');
                              setSyncStatus('AI memory cleared');
                              setTimeout(() => setSyncStatus(''), 2000);
                            }
                          }}
                          className="w-full px-4 py-2 flex items-center gap-2 text-xs text-muted hover:text-white hover:bg-white/5 transition-colors border-t border-border/20"
                        >
                          <Sparkles size={14} />
                          Reset AI Learning
                        </button>

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
      <main className={cn(
        "flex-1 w-full mx-auto p-4 md:p-6 pb-24 md:pb-32 animate-in fade-in duration-500 transition-all duration-300",
        "max-w-7xl lg:max-w-none lg:px-8 xl:px-12",
        isChatOpen && "lg:pr-[440px]"
      )}>


        {renderContent()}

      </main>

      {/* Mobile Bottom Navigation */}

      {/* AI Floating Action Button - Visible on all screen sizes */}
      <div className={cn(
        "fixed z-50 pointer-events-none transition-all duration-300",
        "bottom-24 right-4 md:bottom-8 md:right-8",
        isChatOpen && "lg:right-[440px]"
      )}>
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="pointer-events-auto w-20 h-20 bg-purple-500 rounded-full flex items-center justify-center text-white shadow-2xl shadow-purple-500/40 active:scale-95 transition-all animate-in zoom-in slide-in-from-bottom-8 duration-500 hover:scale-105"
        >
          <div className="absolute inset-0 rounded-full bg-purple-500/30 animate-ping opacity-75"></div>
          <span className="relative z-10"><Bot size={40} /></span>
        </button>
      </div>

      {/* Mobile: Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur-lg pb-safe z-40">
        <div className="flex justify-around items-center h-16">
          <MobileNavItem icon={LayoutDashboard} label="Home" active={activeTab === 'dashboard'} onClick={() => { handleNavigation('dashboard'); setTransactionFilter(null); }} disabled={searchQuery.length >= 2} />
          <MobileNavItem icon={ArrowRightLeft} label="Txns" active={activeTab === 'transactions'} onClick={() => { handleNavigation('transactions'); setTransactionFilter(null); }} disabled={searchQuery.length >= 2} />

          <button
            onClick={openAddModal}
            className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-black shadow-lg shadow-white/10 -translate-y-5 border-4 border-background hover:scale-110 transition-transform active:scale-95"
          >
            <Plus size={28} strokeWidth={3} />
          </button>

          <MobileNavItem icon={Calendar} label="Subs" active={activeTab === 'subscriptions'} onClick={() => { handleNavigation('subscriptions'); setTransactionFilter(null); }} disabled={searchQuery.length >= 2} />
          <MobileNavItem icon={FileText} label="Docs" active={activeTab === 'statements'} onClick={() => { handleNavigation('statements'); setTransactionFilter(null); }} disabled={searchQuery.length >= 2} />
        </div>
      </div>

      {/* Mobile: Chat overlay modal */}
      <div className="lg:hidden">
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
      </div>

      {/* Desktop: Slide-in right panel */}
      <div className="hidden lg:block">
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
          isDesktopPanel={true}
        />
      </div>

      {/* Transaction Modal */}
      {isBalanceFormOpen && (
        <BalanceTransferForm
          initialData={editingBalanceTransfer}
          onSave={handleSaveBalanceTransfer}
          onCancel={() => setIsBalanceFormOpen(false)}
        />
      )}

      {/* Transaction Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-visible animate-in fade-in zoom-in-95 duration-200">
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
              onSaveBalanceTransfer={handleSaveBalanceTransfer}
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

// --- Sub-components ---

function NavTab({ label, active, onClick, icon: Icon, disabled }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        "px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
        active
          ? "bg-white text-black shadow-sm"
          : "text-muted hover:text-white hover:bg-white/5",
        disabled && "opacity-30 cursor-not-allowed hover:bg-transparent hover:text-muted"
      )}
    >
      {Icon && <Icon size={16} />}
      {label}
    </button>
  );
}

function MobileNavItem({ icon: Icon, label, active, onClick, disabled }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        "flex-1 flex flex-col items-center justify-center gap-1 h-full",
        active ? "text-primary" : "text-muted hover:text-text",
        disabled && "opacity-30 cursor-not-allowed hover:text-muted text-muted"
      )}
    >
      <Icon size={24} />
      {/* <span className="text-[10px] font-medium">{label}</span> */}
    </button>
  );
}

function AccountCard({ account, onDelete, onUpdate }) {
  const sortedStmts = account.statements.sort((a, b) => new Date(b.date) - new Date(a.date));
  const latest = sortedStmts[0];
  const [isEditing, setIsEditing] = useState(false);
  const [editBalance, setEditBalance] = useState('');

  // Helper to avoid timezone shifts (parse YYYY-MM-DD as local date)
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatBalance = (val) => {
    if (val === undefined || val === null || val === '') return '—';
    const num = parseFloat(val);
    const amount = `$${Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return num < 0 ? `-${amount}` : amount;
  };

  const handleSaveBalance = () => {
    onUpdate(latest.id, { balance: editBalance });
    setIsEditing(false);
  };

  return (
    <Card className="p-4 border-border/50">
      {/* Header: Hero Balance & Name */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <CreditCard size={24} />
          </div>
          <div>
            <h3 className="font-bold text-lg">{account.provider}</h3>
            <p className="text-sm text-muted">Ending in ••••{account.last4 || '????'}</p>
          </div>
        </div>

        {/* Balance Display / Edit */}
        <div className="text-right">
          <span className="text-[10px] text-muted font-bold tracking-wider uppercase block mb-0.5">Statement Balance</span>

          {isEditing ? (
            <div className="flex items-center gap-2 justify-end animate-in fade-in zoom-in-95">
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                className="w-24 bg-white/5 border border-white/10 rounded px-2 py-1 text-right text-sm font-bold focus:outline-none focus:border-primary"
                value={editBalance}
                onChange={(e) => setEditBalance(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveBalance();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
              />
              <button onClick={handleSaveBalance} className="p-1 hover:text-primary"><Check size={14} /></button>
              <button onClick={() => setIsEditing(false)} className="p-1 hover:text-danger"><X size={14} /></button>
            </div>
          ) : (
            <div
              onClick={() => {
                setEditBalance(latest.balance || '');
                setIsEditing(true);
              }}
              className="group/balance cursor-pointer flex items-center justify-end gap-2"
              title="Click to edit balance"
            >
              <span className={cn(
                "text-2xl font-bold group-hover/balance:opacity-80 transition-opacity",
                account.type === 'bank_account'
                  ? (parseFloat(latest.balance) >= 0 ? "text-primary" : "text-danger")
                  : (parseFloat(latest.balance) > 0 ? "text-danger" : (parseFloat(latest.balance) < 0 ? "text-primary" : "text-[#E8F5E9]"))
              )}>
                {latest.balance === undefined || latest.balance === null || latest.balance === '' ? '—' : formatBalance(latest.balance)}
              </span>
              <Pencil size={12} className="opacity-0 group-hover/balance:opacity-50 transition-opacity text-muted" />
            </div>
          )}
        </div>
      </div>

      {/* Last Statement Uploaded */}
      <div className="mt-4">
        <div className="text-[10px] text-muted uppercase tracking-wider font-bold px-1 mb-1">Last statement uploaded</div>
        <div className="rounded-xl p-3 flex items-center justify-between transition-all border bg-primary/5 border-primary/20 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <div className="font-bold text-white text-sm">{formatDate(latest.date)}</div>
            </div>

            <div className="ml-4 pl-4 border-l border-white/10">
              <div className="text-[9px] text-muted uppercase font-bold mb-0.5">Transactions</div>
              <div className="text-xs font-mono font-medium text-white/80">{latest.transactionCount || 0}</div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(latest.id, false); }}
              className="p-2 text-muted hover:text-orange-400 hover:bg-orange-400/10 rounded-lg transition-colors group/btn"
              title="Remove record only"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(latest.id, true); }}
              className="p-2 text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors group/btn"
              title="Delete record AND transactions"
            >
              <FileX size={16} />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function BalanceTransferForm({ initialData, onSave, onCancel }) {
  const [formData, setFormData] = useState(
    initialData ? { ...initialData } : {
      name: '',
      amount: '',
      startDate: new Date().toISOString().split('T')[0],
      aprEndDate: ''
    }
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl relative overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center bg-white/5">
          <h2 className="text-lg font-bold">{initialData ? 'Edit' : 'Add'} Balance Transfer</h2>
          <button onClick={onCancel} className="text-muted hover:text-white">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input
            label="Card Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. Chase Slate"
            required
            autoFocus
          />
          <Input
            label="Transfer Amount"
            name="amount"
            type="number"
            value={formData.amount}
            onChange={handleChange}
            placeholder="0.00"
            required
            step="0.01"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              name="startDate"
              type="date"
              value={formData.startDate}
              onChange={handleChange}
              required
            />
            <Input
              label="0% End Date"
              name="aprEndDate"
              type="date"
              value={formData.aprEndDate}
              onChange={handleChange}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors text-muted hover:text-white"
            >
              Cancel
            </button>
            <Button type="submit">
              Save Transfer
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TransactionForm({ initialData, data, setPendingStatement, pendingStatement, onSaveStatement, onSaveBalanceTransfer, onSave, onCancel, onOpenSettings }) {
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
      statementId: null,
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
            prediction.category = 'Other'; // Safer default than index 0 (which might be Alcohol)
          }

          const suggestion = {
            category: prediction.category,
            frequency: prediction.frequency,
            isIncome: prediction.isIncome,
            type: prediction.type || 'variable'
          };

          if (!suggestion.category) {
            suggestion.category = suggestion.isIncome ? INCOME_CATEGORIES[0] : 'Other';
          }

          setFormData(prev => ({ ...prev, ...suggestion }));
          triggerAiFlash();

          // NOTE: We do NOT save to cache here anymore. 
          // We only learn when the user explicitly SAVES the form.
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
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

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
    setTimeout(async () => {
      try {
        // Calculate file-based date (oldest modification time found)
        const fileTimestamps = files.map(f => f.lastModified).filter(Boolean);
        const minTimestamp = fileTimestamps.length ? Math.min(...fileTimestamps) : Date.now();
        const fileDate = new Date(minTimestamp).toISOString().split('T')[0];

        // Helper: Convert File to Gemini InlineData Part
        const fileToPart = (file) => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve({
            inlineData: {
              data: reader.result.split(',')[1],
              mimeType: file.type
            }
          });
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Convert all files to parts
        const imageParts = await Promise.all(files.map(fileToPart));

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Fetch Intelligence Cache to teach Gemini user's preferences
        const cache = JSON.parse(localStorage.getItem('intelligenceCache') || '{}');
        const knownRules = Object.entries(cache)
          .map(([name, data]) => `- ${name}: ${data.category}`)
          .slice(-40) // Pick last 40 most recent/relevant rules to avoid over-bloating prompt
          .join('\n');

        const prompt = `
    Analyze the provided images/documents. They may be multiple pages of a single statement, or multiple receipts.
    
    EXTRACT ALL distinct transactions found across ALL files.
    - Ignore headers, footers, account summaries, or balances.
    - If it's a statement, handle various layouts (tables, lists, blocks).
    
    IMPORTANT - DETECTING DOCUMENT TYPE:
    - If this is a CREDIT CARD STATEMENT (you see card numbers, APR, minimum payment due, etc.):
      - Charges/purchases = EXPENSES (isIncome: false)
      - Payments/credits TO the card = SKIP THESE ENTIRELY (do NOT include in transactions array)
        Why: These are just the receiving end of payments that originated from a bank account.
        The actual CC payment will be captured when importing the bank statement.
    - If this is a BANK STATEMENT:
      - Deposits = INCOME (isIncome: true)
      - Withdrawals/debits = EXPENSES (isIncome: false)
      - Payments TO credit cards = category "Credit Card Payment", isIncome: false
      - NOTE: "Fold" is always a BANK ACCOUNT.
    
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
        "type": "credit_card" OR "bank_account", 
        "provider": "Chase",
        "balance": "1240.50"
      },
      "transactions": [
        {"name": "Merchant", "date": "2026-01-15", "amount": 10.50, "isIncome": false, "category": "Food", "type": "variable"},
        ...
      ]
    }
    
    IMPORTANT for metadata:
    - type: "credit_card" or "bank_account". Use the rules above (e.g. Fold = bank_account).
    - provider: The bank/card issuer name (Chase, Fidelity, Amex, Fold, Robinhood, etc.). LOOK FOR THE LOGO explicitly.
    - balance: Look for "New Balance", "Ending Balance" or just "Total" summary.
      Credit Cards: positive number. Bank Accounts: positive number.
      If NOT CLEARLY VISIBLE in the image, return null or omit.
    - DO NOT extract accounts numbers or dates. Focus on Provider Name and Balance only.
    `;

        const result = await model.generateContent([prompt, ...imageParts]);

        const responseText = result.response.text().replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(responseText);

        let rawItems = [];
        let metadata = null;

        if (Array.isArray(parsed)) {
          rawItems = parsed;
        } else if (parsed.transactions && Array.isArray(parsed.transactions)) {
          rawItems = parsed.transactions;
          metadata = parsed.metadata || {};
          metadata.transactions = undefined; // cleanup
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
          // 1. Resolve Statement ID / Last 4
          const provider = metadata?.provider || 'Unknown';
          const stmtDate = fileDate; // Use file date as source of truth

          // Find existing accounts for this provider
          const existingStatements = data.statements.filter(s => s.provider && s.provider.toLowerCase() === provider.toLowerCase());
          const distinctLast4s = [...new Set(existingStatements.map(s => s.last4))].filter(Boolean);

          let resolvedLast4 = '';
          let possibleLast4s = [];

          if (distinctLast4s.length === 1) {
            resolvedLast4 = distinctLast4s[0]; // Auto-match single account
          } else if (distinctLast4s.length > 1) {
            possibleLast4s = distinctLast4s; // Ambiguous - user must choose
          }

          setPendingStatement({
            provider,
            last4: resolvedLast4,
            date: stmtDate,
            type: metadata?.type || 'credit_card',
            balance: metadata?.balance || null, // Use extracted balance if found, else null (---)
            possibleLast4s // Pass choices to UI
          });

          setBulkItems(items.map(i => ({
            ...i,
            id: Math.random().toString(36).substr(2, 9),
            isIncome: i.isIncome ?? false,
            type: i.type || 'variable',
            frequency: i.frequency || ((i.type === 'bill' || i.type === 'subscription') ? 'monthly' : 'one-time')
          })));
        }

      } catch (err) {
        console.error("Receipt scanning failed:", err);
        // ... error handling ...
        let errorMessage = "Failed to scan receipt. ";
        if (err.message?.includes("API key")) {
          errorMessage += "API key issue - check your Gemini API key.";
        } else if (err.message?.includes("JSON") || err.name === "SyntaxError") {
          errorMessage += "Could not parse AI response. The image might be unclear.";
        } else if (err.message?.includes("quota") || err.message?.includes("rate")) {
          errorMessage += "API rate limit reached. Try again in a minute.";
        } else {
          errorMessage += err.message || "Unknown error occurred.";
        }
        alert(errorMessage);
      } finally {
        setIsAiLoading(false);
        e.target.value = '';
      }
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
    // 1. Resolve Statement ID
    let finalStmtId = null;

    if (pendingStatement) {
      const stmtDate = pendingStatement.statementEndDate || pendingStatement.statementDate || pendingStatement.date || new Date().toISOString().split('T')[0];
      const stmtLast4 = pendingStatement.last4 || '????';
      const stmtProvider = pendingStatement.provider || 'Unknown Provider';

      // Check if this statement already exists
      const existingStmt = (data?.statements || []).find(
        s => s.provider === stmtProvider && s.last4 === stmtLast4 && s.date === stmtDate
      );

      if (existingStmt) {
        finalStmtId = existingStmt.id;
      } else {
        // Create new statement
        finalStmtId = Math.random().toString(36).substr(2, 9);
        const newStmt = {
          id: finalStmtId,
          provider: stmtProvider,
          last4: stmtLast4,
          date: stmtDate,
          type: pendingStatement.type || 'credit_card', // Default to credit_card if missing
          balance: pendingStatement.balance || null, // Save balance
          uploadDate: new Date().toISOString(),
          transactionCount: bulkItems.length
        };
        onSaveStatement(newStmt);
      }

      // 1.5 Save Balance Transfer if Detected
      if (pendingStatement.balanceTransferOffer && pendingStatement.balanceTransferOffer.amount) {
        // Basic validation
        if (onSaveBalanceTransfer) {
          onSaveBalanceTransfer({
            name: `${stmtProvider} Transfer (${stmtLast4})`,
            amount: pendingStatement.balanceTransferOffer.amount,
            startDate: stmtDate, // Assuming started on statement date if not specified
            aprEndDate: pendingStatement.balanceTransferOffer.promoEndDate || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0] // Default 1 yr if missing
          });
        }
      }
    }

    // 2. Save Transactions linked to that ID (or update orphaned ones)
    let savedCount = 0;
    let updatedCount = 0;
    bulkItems.forEach(item => {
      // Check if this transaction already exists
      const matchingExpense = (data?.expenses || []).find(e => e.name === item.name && e.date === item.date && Math.abs(e.amount - item.amount) < 0.01);
      const matchingIncome = (data?.income || []).find(i => i.name === item.name && i.date === item.date && Math.abs(i.amount - item.amount) < 0.01);
      const existingItem = matchingExpense || matchingIncome;

      if (!existingItem) {
        // New transaction - save it
        const itemToSave = { ...item, statementId: finalStmtId };
        onSave(itemToSave);
        savedCount++;
      } else if (!existingItem.statementId && finalStmtId) {
        // Existing transaction WITHOUT statementId - UPDATE it.
        // CRITICAL: We must apply the USER'S EDITS (category, frequency, etc.) from 'item' 
        // effectively overwriting the stale existing data, while preserving the ID.
        const updatedItem = {
          ...existingItem,
          // Apply edits from Bulk Review
          category: item.category,
          frequency: item.frequency,
          type: item.type,
          isIncome: item.isIncome,
          name: item.name,
          // Link statement
          statementId: finalStmtId
        };
        onSave(updatedItem);
        updatedCount++;
      }
      // If existingItem already has a statementId, we truly skip it
    });
    console.log(`Import complete: ${savedCount} new, ${updatedCount} updated with statementId`);

    setBulkItems([]);
    setPendingStatement(null);
    if (onCancel) onCancel();
  };

  if (bulkItems.length > 0) {
    return (
      <BulkReviewView
        items={bulkItems}
        pendingStatement={pendingStatement}
        setPendingStatement={setPendingStatement}
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
              multiple
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
              multiple
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
const BulkReviewView = ({ items, pendingStatement, setPendingStatement, onUpdate, onRemove, onCancel, onImport }) => {
  // Ensure we have a defined object to edit
  const stmt = pendingStatement || { provider: '', last4: '', date: new Date().toISOString().split('T')[0] };

  const updateStmt = (field, val) => {
    setPendingStatement({ ...stmt, [field]: val });
  };

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      <div className="flex flex-col gap-3 mb-4 sticky top-0 bg-[#0D1117] z-10 py-2 border-b border-white/5">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Upload size={18} className="text-primary" />
            Review Import ({items.length})
          </h3>
          <span className="text-xs text-muted">Check details before importing</span>
        </div>

        {/* Statement Metadata Editor */}
        <div className="bg-white/5 p-3 rounded-xl border border-white/10 grid grid-cols-4 gap-2">
          <div className="col-span-1">
            <label className="text-[10px] text-muted uppercase font-bold px-1">Provider</label>
            <input
              type="text"
              className="w-full bg-transparent border-b border-white/10 text-xs py-1 focus:outline-none focus:border-primary placeholder:text-muted/30"
              placeholder="Bank Name"
              value={stmt.provider || ''}
              onChange={(e) => updateStmt('provider', e.target.value)}
            />
          </div>
          <div className="col-span-1">
            <label className="text-[10px] text-muted uppercase font-bold px-1">Last 4</label>
            {stmt.possibleLast4s && stmt.possibleLast4s.length > 0 ? (
              <select
                className="w-full bg-[#161B21] border-b border-white/10 text-xs py-1 focus:outline-none focus:border-primary text-white"
                value={stmt.last4 || ''}
                onChange={(e) => {
                  if (e.target.value === 'NEW') {
                    setPendingStatement({ ...stmt, possibleLast4s: null, last4: '' });
                  } else {
                    updateStmt('last4', e.target.value);
                  }
                }}
              >
                <option value="" disabled>Select Account</option>
                {stmt.possibleLast4s.map(l4 => (
                  <option key={l4} value={l4}>{l4}</option>
                ))}
                <option value="NEW">+ New Account</option>
              </select>
            ) : (
              <input
                type="text"
                className="w-full bg-transparent border-b border-white/10 text-xs py-1 focus:outline-none focus:border-primary placeholder:text-muted/30"
                placeholder="1234"
                value={stmt.last4 || ''}
                onChange={(e) => updateStmt('last4', e.target.value)}
              />
            )}
          </div>
          <div className="col-span-1">
            <label className="text-[10px] text-muted uppercase font-bold px-1">Balance</label>
            <input
              type="number"
              step="0.01"
              className="w-full bg-transparent border-b border-white/10 text-xs py-1 focus:outline-none focus:border-primary placeholder:text-muted/30"
              placeholder="---"
              value={stmt.balance || ''}
              onChange={(e) => updateStmt('balance', e.target.value)}
            />
          </div>
          <div className="col-span-1">
            <label className="text-[10px] text-muted uppercase font-bold px-1">Closing Date</label>
            <input
              type="text"
              readOnly
              className="w-full bg-transparent border-b border-white/10 text-xs py-1 focus:outline-none focus:border-primary text-muted cursor-not-allowed"
              value={stmt.statementEndDate || stmt.statementDate || stmt.date || ''}
            />
          </div>
        </div>
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

