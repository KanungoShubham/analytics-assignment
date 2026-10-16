export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'Starters' | 'Mains' | 'Desserts';
  tag?: string;
}

export const CATEGORIES = [
  { name: 'Starters', note: 'To share while the oven heats up.' },
  { name: 'Mains', note: 'Pasta rolled this morning, pizza from the wood oven.' },
  { name: 'Desserts', note: 'Made in house, every day.' },
] as const;

export const MENU: MenuItem[] = [
  { id: 'bruschetta', name: 'Bruschetta', description: 'Grilled sourdough, ripe tomatoes, basil, olive oil', price: 8, category: 'Starters', tag: 'Vegan' },
  { id: 'burrata', name: 'Burrata', description: 'Creamy burrata with roasted cherry tomatoes', price: 11, category: 'Starters' },
  { id: 'margherita', name: 'Margherita Pizza', description: 'San Marzano tomato, mozzarella, basil', price: 12.5, category: 'Mains', tag: 'Most ordered' },
  { id: 'carbonara', name: 'Spaghetti Carbonara', description: 'Guanciale, egg yolk, pecorino, black pepper', price: 14, category: 'Mains' },
  { id: 'risotto', name: 'Mushroom Risotto', description: 'Arborio rice, porcini, parmesan', price: 15, category: 'Mains', tag: 'Vegetarian' },
  { id: 'tiramisu', name: 'Tiramisu', description: 'Mascarpone, espresso, cocoa', price: 7, category: 'Desserts' },
  { id: 'panna-cotta', name: 'Panna Cotta', description: 'Vanilla cream with berry coulis', price: 6.5, category: 'Desserts' },
];

export const findMenuItem = (id: string) => MENU.find((item) => item.id === id);

export const formatPrice = (n: number) => `$${n.toFixed(2)}`;
