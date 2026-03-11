require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/app', express.static(path.join(__dirname, 'public/app')));
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const VENDOR_CHAT_ID = process.env.VENDOR_CHAT_ID;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'yukovape2026';

// HELPERS
const startTime = Date.now();
function getUptime() {
  const s = Math.floor((Date.now() - startTime) / 1000);
  return `${Math.floor(s/86400)}j ${Math.floor((s%86400)/3600)}h ${Math.floor((s%3600)/60)}m`;
}
function getMemory() {
  const mem = process.memoryUsage();
  const used = Math.round(mem.rss/1024/1024);
  const total = Math.round(mem.heapTotal/1024/1024)+20;
  return { used, total, pct: Math.round((used/total)*100) };
}
function miniBar(val, max, len=30) {
  const f = Math.round((val/Math.max(max,1))*len);
  return '█'.repeat(f)+'░'.repeat(len-f);
}
function sparkline(vals) {
  const chars = ['▁','▂','▃','▄','▅','▆','▇','█'];
  const max = Math.max(...vals,1);
  return vals.map(v => chars[Math.min(Math.round((v/max)*7),7)]).join('');
}

// BOT COMMANDS
bot.onText(/\/start/, (msg) => {
  const name = msg.from?.first_name || 'là';
  bot.sendMessage(msg.chat.id, `👋 Salut *${name}* !\n\nBienvenue sur *YUKO VAPE* — Grossiste Puff B2B 🚀\n\nUtilise le bouton ci-dessous pour passer commande 👇`, { parse_mode: 'Markdown' });
});

bot.onText(/\/panel/, async (msg) => {
  const chatId = String(msg.chat.id);
  if (chatId !== String(VENDOR_CHAT_ID)) return bot.sendMessage(chatId, '❌ Accès refusé.');
  try {
    const [{ data: orders }, { data: products }] = await Promise.all([
      supabase.from('orders').select('*'),
      supabase.from('products').select('*')
    ]);
    const total = orders?.length||0;
    const pending = orders?.filter(o=>o.status==='nouveau').length||0;
    const paid = orders?.filter(o=>o.status==='payé').length||0;
    const shipped = orders?.filter(o=>o.status==='expédié').length||0;
    const done = orders?.filter(o=>o.status==='terminé').length||0;
    const revenue = orders?.reduce((s,o)=>s+parseFloat(o.total||0),0)||0;
    const avgCart = total>0?(revenue/total).toFixed(2):'0.00';
    const successRate = total>0?Math.round((done/total)*100):0;
    const activeProd = products?.filter(p=>p.active).length||0;
    const totalProd = products?.length||0;

    const countryCounts = {};
    orders?.forEach(o=>{ if(o.country) countryCounts[o.country]=(countryCounts[o.country]||0)+1; });
    const topC = Object.entries(countryCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const flags = {'France':'🇫🇷','Belgique':'🇧🇪','Suisse':'🇨🇭','Luxembourg':'🇱🇺'};

    const dayNames = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
    const trend = [];
    for(let i=6;i>=0;i--) {
      const d=new Date(); d.setDate(d.getDate()-i);
      const ds=d.toISOString().split('T')[0];
      trend.push({day:dayNames[d.getDay()],count:orders?.filter(o=>o.created_at?.startsWith(ds)).length||0});
    }
    const spark = sparkline(trend.map(t=>t.count));
    const trendLine = trend.map(t=>`${t.day}:${t.count}`).join(' │ ');
    const mem = getMemory();
    const now = new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris',weekday:'short',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'});

    const panel =
`╔═══════════════════════════════════════╗
║      👑 YUKO VAPE PANEL 2026 👑       ║
║        Intelligence Dashboard         ║
╚═══════════════════════════════════════╝

⚡ SYSTÈME
├─ ⏱️ Uptime: ${getUptime()}
├─ 💾 Mémoire: ${mem.used}/${mem.total} MB (${mem.pct}%)
├─ 📦 Produits: ${activeProd} actifs / ${totalProd} total
└─ 🌐 API: ✅ Online

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 COMMANDES • Total: ${total} • Succès: ${successRate}%
┌─────────────────────────────────────┐
│ ⏳ En attente  │ ${pending}
│ 💳 Payées      │ ${paid}
│ 📦 Expédiées   │ ${shipped}
│ ✅ Terminées   │ ${done}
└─────────────────────────────────────┘

💰 REVENUS
├─ 💵 Total: ${revenue.toFixed(2)}€
├─ 📊 Panier moyen: ${avgCart}€
└─ 🔄 Taux succès: ${successRate}%

🌍 TOP PAYS
┌─────────────────────────────────────┐
${topC.length ? topC.map((c,i)=>`│ ${i+1}. ${flags[c[0]]||'🌍'} ${c[0]}: ${c[1]} cmd`).join('\n') : '│ Aucune commande encore'}
└─────────────────────────────────────┘

📈 TENDANCE 7J ${spark}
┌─────────────────────────────────────┐
│ ${trendLine}
└─────────────────────────────────────┘

💾 MÉMOIRE
┌─────────────────────────────────────┐
│ ${miniBar(mem.used,mem.total)} ${mem.pct}%
└─────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏰ ${now}
💡 Panel Yuko Vape • Version 1.0.2026`;

    bot.sendMessage(chatId, '```\n'+panel+'\n```', { parse_mode: 'Markdown' });
  } catch(err) {
    bot.sendMessage(chatId, `❌ Erreur: ${err.message}`);
  }
});

bot.onText(/\/commandes/, async (msg) => {
  const chatId = String(msg.chat.id);
  if (chatId !== String(VENDOR_CHAT_ID)) return bot.sendMessage(chatId, '❌ Accès refusé.');
  const { data } = await supabase.from('orders').select('*').eq('status','nouveau').order('created_at',{ascending:false}).limit(5);
  if (!data?.length) return bot.sendMessage(chatId, '✅ Aucune nouvelle commande en attente.');
  let m = `📋 *NOUVELLES COMMANDES (${data.length})*\n\n`;
  data.forEach(o => { m += `🔹 *#${o.id}* — ${o.customer_name}\n   💰 ${parseFloat(o.total).toFixed(2)}€ · ${o.country}\n   📱 ${o.customer_contact}\n\n`; });
  bot.sendMessage(chatId, m, { parse_mode: 'Markdown' });
});

bot.onText(/\/help/, (msg) => {
  const chatId = String(msg.chat.id);
  if (chatId !== String(VENDOR_CHAT_ID)) return;
  bot.sendMessage(chatId, `📖 *COMMANDES*\n\n/panel — Dashboard\n/commandes — Nouvelles commandes\n/help — Aide`, { parse_mode: 'Markdown' });
});

// PRODUCTS API
app.get('/api/products', async (req, res) => {
  const { data, error } = await supabase.from('products').select('*').eq('active',true).order('created_at',{ascending:true});
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
app.get('/api/admin/products', async (req, res) => {
  const { data, error } = await supabase.from('products').select('*').order('created_at',{ascending:true});
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
app.post('/api/admin/products', async (req, res) => {
  const { name, description, image_url, flavors, tiers, active } = req.body;
  const { data, error } = await supabase.from('products').insert([{ name, description, image_url, flavors, tiers, active: active??true }]).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});
app.put('/api/admin/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, image_url, flavors, tiers, active } = req.body;
  const { data, error } = await supabase.from('products').update({ name, description, image_url, flavors, tiers, active }).eq('id',id).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});
app.delete('/api/admin/products/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('products').delete().eq('id',id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ORDERS API
app.post('/api/orders', async (req, res) => {
  const { customer_name, customer_contact, country, items, total, notes } = req.body;
  const { data, error } = await supabase.from('orders').insert([{ customer_name, customer_contact, country, items, total, notes, status:'nouveau' }]).select();
  if (error) return res.status(500).json({ error: error.message });
  const order = data[0];
  let msg = `🛒 *NOUVELLE COMMANDE #${order.id}*\n\n👤 *Client :* ${customer_name}\n📱 *Contact :* ${customer_contact}\n🌍 *Pays :* ${country}\n\n📦 *Produits :*\n`;
  for (const item of items) {
    const lt = item.qty * item.unit_price;
    msg += `  • ${item.product_name} — ${item.flavor}\n    ${item.qty} pcs × ${item.unit_price.toFixed(2)}€ = *${lt.toFixed(2)}€*\n`;
  }
  msg += `\n💰 *TOTAL : ${parseFloat(total).toFixed(2)}€*\n`;
  if (notes) msg += `\n📝 *Notes :* ${notes}\n`;
  msg += `\n⏰ ${new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'})}`;
  await bot.sendMessage(VENDOR_CHAT_ID, msg, { parse_mode: 'Markdown' });
  res.json({ success: true, order_id: order.id });
});
app.get('/api/admin/orders', async (req, res) => {
  const { data, error } = await supabase.from('orders').select('*').order('created_at',{ascending:false});
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
app.patch('/api/admin/orders/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const { data, error } = await supabase.from('orders').update({ status }).eq('id',id).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

// AUTH
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) res.json({ success: true, token: Buffer.from(ADMIN_PASSWORD).toString('base64') });
  else res.status(401).json({ error: 'Mot de passe incorrect' });
});
app.post('/api/admin/verify', (req, res) => {
  const { token } = req.body;
  res.json({ valid: token === Buffer.from(ADMIN_PASSWORD).toString('base64') });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Yuko Vape Backend running on port ${PORT}`));
