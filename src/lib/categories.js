/**
 * Finance categories. `icon` is a lucide-react icon name (mapped in components/CategoryIcon.js).
 */
export const EXPENSE_CATEGORIES = [
  { name: 'Food & Dining', icon: 'Utensils', color: '#f97316', keywords: ['food', 'swiggy', 'zomato', 'restaurant', 'lunch', 'dinner', 'breakfast', 'coffee', 'tea', 'snacks', 'pizza', 'cafe'] },
  { name: 'Groceries', icon: 'ShoppingBasket', color: '#16a34a', keywords: ['grocery', 'groceries', 'vegetables', 'bigbasket', 'blinkit', 'zepto', 'milk', 'fruits', 'dmart'] },
  { name: 'Transport', icon: 'Car', color: '#3b82f6', keywords: ['uber', 'ola', 'rapido', 'auto', 'cab', 'metro', 'bus', 'fuel', 'petrol', 'diesel', 'parking', 'toll'] },
  { name: 'Shopping', icon: 'ShoppingBag', color: '#ec4899', keywords: ['amazon', 'flipkart', 'myntra', 'shopping', 'clothes', 'shoes', 'ajio'] },
  { name: 'Bills & Utilities', icon: 'Zap', color: '#ca8a04', keywords: ['electricity', 'bill', 'water', 'gas', 'recharge', 'broadband', 'wifi', 'internet', 'mobile', 'cable', 'dth'] },
  { name: 'Rent', icon: 'House', color: '#8b5cf6', keywords: ['rent', 'house', 'pg', 'hostel', 'maintenance'] },
  { name: 'Insurance', icon: 'Shield', color: '#0ea5e9', keywords: ['insurance', 'lic', 'premium', 'policy'] },
  { name: 'Entertainment', icon: 'Clapperboard', color: '#a855f7', keywords: ['movie', 'movies', 'cinema', 'concert', 'game', 'games', 'party'] },
  { name: 'Subscriptions', icon: 'Repeat', color: '#6366f1', keywords: ['netflix', 'spotify', 'prime', 'hotstar', 'youtube', 'subscription', 'icloud'] },
  { name: 'Health', icon: 'HeartPulse', color: '#ef4444', keywords: ['doctor', 'medicine', 'pharmacy', 'hospital', 'gym', 'health', 'clinic'] },
  { name: 'Education', icon: 'GraduationCap', color: '#14b8a6', keywords: ['course', 'books', 'book', 'fees', 'tuition', 'udemy', 'class'] },
  { name: 'Travel', icon: 'Plane', color: '#06b6d4', keywords: ['flight', 'train', 'hotel', 'trip', 'travel', 'irctc', 'booking'] },
  { name: 'EMI & Loans', icon: 'Landmark', color: '#64748b', keywords: ['emi', 'loan', 'credit card', 'interest'] },
  { name: 'Gifts & Donations', icon: 'Gift', color: '#f43f5e', keywords: ['gift', 'donation', 'charity', 'birthday'] },
  { name: 'Personal Care', icon: 'Sparkles', color: '#d946ef', keywords: ['salon', 'haircut', 'spa', 'cosmetics', 'skincare'] },
  { name: 'Other', icon: 'CircleDashed', color: '#94a3b8', keywords: [] },
];

export const INCOME_CATEGORIES = [
  { name: 'Salary', icon: 'Briefcase', color: '#10b981', keywords: ['salary', 'paycheck', 'payroll', 'stipend'] },
  { name: 'Freelance', icon: 'Laptop', color: '#3b82f6', keywords: ['freelance', 'client', 'project', 'gig'] },
  { name: 'Business', icon: 'Store', color: '#f59e0b', keywords: ['business', 'sales', 'shop'] },
  { name: 'Interest & Dividends', icon: 'Percent', color: '#8b5cf6', keywords: ['interest', 'dividend', 'fd', 'returns'] },
  { name: 'Gifts', icon: 'Gift', color: '#ec4899', keywords: ['gift', 'received from'] },
  { name: 'Refund', icon: 'RotateCcw', color: '#06b6d4', keywords: ['refund', 'cashback', 'reimbursement'] },
  { name: 'Other Income', icon: 'CircleDashed', color: '#94a3b8', keywords: [] },
];

const ALL = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export function categoryMeta(name) {
  return ALL.find((c) => c.name === name) || { name, icon: 'CircleDashed', color: '#94a3b8' };
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
