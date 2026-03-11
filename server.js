require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files (mini app + admin)
app.use('/app', express.static(path.join(__dirname, 'public/app')));
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));

// Init Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Init Telegram Bot
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN);
const VENDOR_CHAT_ID = process.env.VENDOR_CHAT_ID;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'yukovape2026';

// ─────────────────────────────────────────
//  PRODUCTS API
// ─────────────────────────────────────────

// GET all products (public)
app.get('/api/products', async (req, res) => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET all products including inactive (admin)
app.get('/api/admin/products', async (req, res) => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST create product (admin)
app.post('/api/admin/products', async (req, res) => {
  const { name, description, image_url, flavors, tiers, active } = req.body;
  const { data, error } = await supabase
    .from('products')
    .insert([{ name, description, image_url, flavors, tiers, active: active ?? true }])
    .select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

// PUT update product (admin)
app.put('/api/admin/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, image_url, flavors, tiers, active } = req.body;
  const { data, error } = await supabase
    .from('products')
    .update({ name, description, image_url, flavors, tiers, active })
    .eq('id', id)
    .select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

// DELETE product (admin)
app.delete('/api/admin/products/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ─────────────────────────────────────────
//  ORDERS API
// ─────────────────────────────────────────

// POST new order
app.post('/api/orders', async (req, res) => {
  const { customer_name, customer_contact, country, items, total, notes } = req.body;

  // Save to DB
  const { data, error } = await supabase
    .from('orders')
    .insert([{
      customer_name,
      customer_contact,
      country,
      items,
      total,
      notes,
      status: 'nouveau'
    }])
    .select();

  if (error) return res.status(500).json({ error: error.message });

  const order = data[0];

  // Build Telegram message
  let msg = `🛒 *NOUVELLE COMMANDE #${order.id}*\n\n`;
  msg += `👤 *Client :* ${customer_name}\n`;
  msg += `📱 *Contact :* ${customer_contact}\n`;
  msg += `🌍 *Pays :* ${country}\n\n`;
  msg += `📦 *Produits commandés :*\n`;

  let totalCheck = 0;
  for (const item of items) {
    const lineTotal = item.qty * item.unit_price;
    totalCheck += lineTotal;
    msg += `  • ${item.product_name} — ${item.flavor}\n`;
    msg += `    ${item.qty} pcs × ${item.unit_price.toFixed(2)}€ = *${lineTotal.toFixed(2)}€*\n`;
  }

  msg += `\n💰 *TOTAL : ${total.toFixed(2)}€*\n`;
  if (notes) msg += `\n📝 *Notes :* ${notes}\n`;
  msg += `\n⏰ ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`;

  // Send to vendor
  await bot.sendMessage(VENDOR_CHAT_ID, msg, { parse_mode: 'Markdown' });

  res.json({ success: true, order_id: order.id });
});

// GET orders (admin)
app.get('/api/admin/orders', async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PATCH order status (admin)
app.patch('/api/admin/orders/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
    .select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

// ─────────────────────────────────────────
//  AUTH
// ─────────────────────────────────────────
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, token: Buffer.from(ADMIN_PASSWORD).toString('base64') });
  } else {
    res.status(401).json({ error: 'Mot de passe incorrect' });
  }
});

app.post('/api/admin/verify', (req, res) => {
  const { token } = req.body;
  const expected = Buffer.from(ADMIN_PASSWORD).toString('base64');
  res.json({ valid: token === expected });
});

// ─────────────────────────────────────────
//  START
// ─────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Yuko Vape Backend running on port ${PORT}`));
