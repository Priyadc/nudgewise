/**
 * Finance categories. `icon` is a lucide-react icon name (mapped in components/CategoryIcon.js).
 * Order matters for voice/text detection: the first category whose keyword matches wins.
 * Names are stored on transactions, so never rename an existing category — only add new ones.
 */
export const EXPENSE_CATEGORIES = [
  { name: 'Food & Dining', icon: 'Utensils', color: '#f97316', keywords: ['food', 'swiggy', 'zomato', 'restaurant', 'lunch', 'dinner', 'breakfast', 'pizza', 'biryani', 'hotel food'] },
  { name: 'Snacks & Coffee', icon: 'Coffee', color: '#b45309', keywords: ['coffee', 'tea', 'chai', 'snacks', 'cafe', 'starbucks', 'juice', 'ice cream'] },
  { name: 'Groceries', icon: 'ShoppingBasket', color: '#16a34a', keywords: ['grocery', 'groceries', 'vegetables', 'bigbasket', 'blinkit', 'zepto', 'milk', 'fruits', 'dmart', 'instamart'] },
  { name: 'Fuel', icon: 'Fuel', color: '#dc2626', keywords: ['fuel', 'petrol', 'diesel', 'cng', 'ev charging'] },
  { name: 'Transport', icon: 'Car', color: '#3b82f6', keywords: ['uber', 'ola', 'rapido', 'auto', 'cab', 'metro', 'bus', 'parking', 'toll', 'fastag'] },
  { name: 'Shopping', icon: 'ShoppingBag', color: '#ec4899', keywords: ['amazon', 'flipkart', 'meesho', 'shopping', 'ajio', 'nykaa'] },
  { name: 'Clothing', icon: 'Shirt', color: '#db2777', keywords: ['clothes', 'shirt', 'dress', 'saree', 'kurta', 'jeans', 'shoes', 'myntra'] },
  { name: 'Electronics & Gadgets', icon: 'Smartphone', color: '#0891b2', keywords: ['phone', 'laptop', 'headphones', 'earbuds', 'charger', 'gadget', 'electronics'] },
  { name: 'Mobile & Internet', icon: 'Wifi', color: '#0284c7', keywords: ['recharge', 'broadband', 'wifi', 'internet', 'jio', 'airtel', 'vi ', 'data pack'] },
  { name: 'Bills & Utilities', icon: 'Zap', color: '#ca8a04', keywords: ['electricity', 'bill', 'water', 'gas', 'lpg', 'cylinder', 'cable', 'dth'] },
  { name: 'Rent', icon: 'House', color: '#8b5cf6', keywords: ['rent', 'pg', 'hostel', 'deposit'] },
  { name: 'Household & Repairs', icon: 'Wrench', color: '#78716c', keywords: ['maintenance', 'repair', 'plumber', 'electrician', 'furniture', 'cleaning', 'laundry', 'utensils'] },
  { name: 'Domestic Help', icon: 'HandHelping', color: '#a16207', keywords: ['maid', 'cook', 'driver', 'house help', 'servant', 'nanny'] },
  { name: 'Insurance', icon: 'Shield', color: '#0ea5e9', keywords: ['insurance', 'lic', 'premium', 'policy'] },
  { name: 'Health', icon: 'HeartPulse', color: '#ef4444', keywords: ['doctor', 'medicine', 'pharmacy', 'hospital', 'health', 'clinic', 'lab test', 'dentist'] },
  { name: 'Fitness', icon: 'Dumbbell', color: '#e11d48', keywords: ['gym', 'yoga', 'fitness', 'protein', 'sports', 'cult'] },
  { name: 'Personal Care', icon: 'Sparkles', color: '#d946ef', keywords: ['salon', 'haircut', 'spa', 'cosmetics', 'skincare', 'parlour', 'grooming'] },
  { name: 'Entertainment', icon: 'Clapperboard', color: '#a855f7', keywords: ['movie', 'movies', 'cinema', 'concert', 'game', 'games', 'party', 'bookmyshow'] },
  { name: 'Subscriptions', icon: 'Repeat', color: '#6366f1', keywords: ['netflix', 'spotify', 'prime', 'hotstar', 'youtube', 'subscription', 'icloud', 'chatgpt', 'claude'] },
  { name: 'Education', icon: 'GraduationCap', color: '#14b8a6', keywords: ['course', 'books', 'book', 'fees', 'tuition', 'udemy', 'class', 'exam'] },
  { name: 'Kids & Family', icon: 'Baby', color: '#f472b6', keywords: ['kids', 'baby', 'diapers', 'toys', 'school', 'family', 'parents'] },
  { name: 'Pets', icon: 'PawPrint', color: '#92400e', keywords: ['pet', 'dog', 'cat', 'vet', 'pet food'] },
  { name: 'Travel', icon: 'Plane', color: '#06b6d4', keywords: ['flight', 'train', 'trip', 'travel', 'irctc', 'booking', 'makemytrip', 'hotel stay'] },
  { name: 'EMI & Loans', icon: 'Landmark', color: '#64748b', keywords: ['emi', 'loan', 'credit card bill', 'interest'] },
  { name: 'Investments & Savings', icon: 'PiggyBank', color: '#059669', keywords: ['sip', 'mutual fund', 'stocks', 'shares', 'fd', 'rd', 'ppf', 'nps', 'gold', 'invest'] },
  { name: 'Taxes & Fees', icon: 'Receipt', color: '#475569', keywords: ['tax', 'gst', 'challan', 'fine', 'penalty', 'bank charges', 'fees'] },
  { name: 'Lent to Someone', icon: 'HandCoins', color: '#7c3aed', keywords: ['lent', 'gave loan', 'borrowed by'] },
  { name: 'Gifts & Donations', icon: 'Gift', color: '#f43f5e', keywords: ['gift', 'donation', 'charity', 'birthday', 'wedding', 'temple'] },
  { name: 'Office & Work', icon: 'Briefcase', color: '#334155', keywords: ['office', 'stationery', 'printing', 'coworking', 'work'] },
  { name: 'Other', icon: 'CircleDashed', color: '#94a3b8', keywords: [] },
];

export const INCOME_CATEGORIES = [
  { name: 'Salary', icon: 'Briefcase', color: '#10b981', keywords: ['salary', 'paycheck', 'payroll', 'stipend'] },
  { name: 'Bonus & Incentives', icon: 'Trophy', color: '#16a34a', keywords: ['bonus', 'incentive', 'appraisal', 'award'] },
  { name: 'Freelance', icon: 'Laptop', color: '#3b82f6', keywords: ['freelance', 'client', 'project', 'gig'] },
  { name: 'Business', icon: 'Store', color: '#f59e0b', keywords: ['business', 'sales', 'shop', 'profit'] },
  { name: 'Side Hustle', icon: 'Rocket', color: '#8b5cf6', keywords: ['side hustle', 'youtube', 'instagram', 'reels', 'content', 'tuition fees received'] },
  { name: 'Rental Income', icon: 'Building2', color: '#0891b2', keywords: ['rent received', 'rental', 'tenant'] },
  { name: 'Interest & Dividends', icon: 'Percent', color: '#7c3aed', keywords: ['interest', 'dividend', 'fd interest', 'returns'] },
  { name: 'Investment Returns', icon: 'TrendingUp', color: '#059669', keywords: ['sold shares', 'redeemed', 'capital gain', 'mutual fund redemption'] },
  { name: 'Cashback & Rewards', icon: 'BadgePercent', color: '#06b6d4', keywords: ['cashback', 'reward', 'points', 'scratch card'] },
  { name: 'Refund', icon: 'RotateCcw', color: '#0ea5e9', keywords: ['refund', 'reimbursement', 'returned'] },
  { name: 'Gifts', icon: 'Gift', color: '#ec4899', keywords: ['gift', 'received from', 'shagun'] },
  { name: 'Pocket Money', icon: 'Wallet', color: '#f97316', keywords: ['pocket money', 'allowance'] },
  { name: 'Loan Received', icon: 'HandCoins', color: '#64748b', keywords: ['borrowed', 'loan received', 'repaid me', 'got back'] },
  { name: 'Sold Items', icon: 'Tag', color: '#ca8a04', keywords: ['sold', 'olx', 'resale'] },
  { name: 'Other Income', icon: 'CircleDashed', color: '#94a3b8', keywords: [] },
];

/** Icons people can pick for their own categories (all mapped in CategoryIcon.js) */
export const CUSTOM_ICON_CHOICES = [
  'Tag', 'Wallet', 'Coins', 'Banknote', 'PiggyBank', 'Gift', 'Heart', 'Star', 'House', 'Car', 'Bike', 'Bus',
  'Plane', 'Utensils', 'Coffee', 'Pizza', 'ShoppingBag', 'Shirt', 'Smartphone', 'Laptop', 'Gamepad2', 'Music',
  'Book', 'GraduationCap', 'Dumbbell', 'HeartPulse', 'Pill', 'Baby', 'PawPrint', 'Wrench', 'Leaf', 'Sparkles',
];

export const CUSTOM_COLOR_CHOICES = ['#8b5cf6', '#3b82f6', '#0891b2', '#059669', '#16a34a', '#ca8a04', '#f97316', '#dc2626', '#db2777', '#7c3aed', '#475569', '#92400e'];

/* ── Custom categories registry ─────────────────────────────
   The app loads the signed-in user's own categories once and registers them here,
   so every picker, filter, chart and icon can find them without prop drilling. */
let customCategories = [];

export function setCustomCategories(list) {
  customCategories = Array.isArray(list) ? list : [];
}

export function getCustomCategories(type) {
  return type ? customCategories.filter((c) => c.type === type) : customCategories;
}

/** Built-in + the user's own categories for 'expense' or 'income' */
export function getCategories(type) {
  const builtIn = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const custom = getCustomCategories(type).map((c) => ({ ...c, custom: true, keywords: [] }));
  // Keep "Other" last
  const other = builtIn[builtIn.length - 1];
  return [...builtIn.slice(0, -1), ...custom, other];
}

export function categoryMeta(name) {
  return (
    customCategories.find((c) => c.name === name) ||
    EXPENSE_CATEGORIES.find((c) => c.name === name) ||
    INCOME_CATEGORIES.find((c) => c.name === name) || { name, icon: 'CircleDashed', color: '#94a3b8' }
  );
}

export const PAYMENT_METHODS = [
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank transfer' },
  { value: 'other', label: 'Other' },
];

export const LIST_COLORS = ['#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#eab308', '#f97316', '#ef4444', '#ec4899', '#64748b'];
export const LIST_ICONS = ['📋', '💼', '🏠', '🛒', '🎯', '📚', '💪', '✈️', '🎉', '💡', '🧾', '❤️'];
