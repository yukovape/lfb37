-- ================================================
-- YUKO VAPE — Supabase SQL Schema
-- Colle ce code dans Supabase > SQL Editor > Run
-- ================================================

-- Table products
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  flavors JSONB DEFAULT '[]',
  tiers JSONB DEFAULT '[]',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table orders
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_contact TEXT NOT NULL,
  country TEXT,
  items JSONB NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'nouveau',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS (Row Level Security) for simplicity
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

-- ================================================
-- Exemple de produit (optionnel, pour tester)
-- ================================================
INSERT INTO products (name, description, flavors, tiers, active) VALUES (
  'Razz Bar 30K',
  'Top ventes - 30 000 Puffs',
  '["Triple Melon", "Strawberry Ice", "Sour Apple", "Mango Peach Watermelon", "Strawberry Banana", "Blueberry Ice", "Watermelon Ice", "Blue Razz Ice", "Lemon Lime", "Cola Ice"]',
  '[{"qty": 30, "label": "30+ pcs", "price": 6.70}, {"qty": 50, "label": "50+ pcs", "price": 6.10}, {"qty": 70, "label": "70+ pcs", "price": 5.20}]',
  true
);
