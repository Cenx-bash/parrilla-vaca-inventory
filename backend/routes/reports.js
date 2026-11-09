const express = require('express');
const router = express.Router();
const { requireAuth } = require('./auth');
const { db } = require('../database/connection');

router.use(requireAuth);

router.get('/dashboard', (req, res) => {
  const items = db.items;
  const low   = items.filter(i => i.quantity > 0 && i.quantity <= i.reorder).length;
  const out   = items.filter(i => i.quantity <= 0).length;
  const totalValue = items.reduce((s, i) => s + i.quantity * i.unit_cost, 0);

  const today = new Date().toISOString().slice(0, 10);
  const deliveriesToday = db.deliveries.filter(d => d.date === today);
  const usageToday      = db.usage.filter(u => u.date === today);

  const lowItems = items
    .filter(i => i.quantity <= i.reorder)
    .sort((a, b) => (a.quantity / (a.reorder || 1)) - (b.quantity / (b.reorder || 1)))
    .slice(0, 8)
    .map(i => ({
      id: i.id, name: i.name, category: i.category,
      quantity: i.quantity, reorder: i.reorder, unit: i.unit,
      status: i.quantity <= 0 ? 'out' : 'low'
    }));

  // Category totals
  const catMap = {};
  items.forEach(i => {
    if (!catMap[i.category]) catMap[i.category] = { category: i.category, items: 0, value: 0 };
    catMap[i.category].items += 1;
    catMap[i.category].value += i.quantity * i.unit_cost;
  });
  const by_category = Object.values(catMap)
    .map(c => ({ ...c, value: +c.value.toFixed(2) }))
    .sort((a, b) => b.value - a.value);

  res.json({
    totals: {
      items: items.length,
      low,
      out,
      ok: items.length - low - out,
      total_value: +totalValue.toFixed(2)
    },
    today: {
      deliveries: deliveriesToday.length,
      deliveries_value: +deliveriesToday.reduce((s, d) => s + d.total, 0).toFixed(2),
      usage_entries: usageToday.length
    },
    low_items: lowItems,
    by_category
  });
});

router.get('/movement', (req, res) => {
  const { from, to } = req.query;
  let deliveries = db.deliveries.slice();
  let usage      = db.usage.slice();
  if (from) { deliveries = deliveries.filter(d => d.date >= from); usage = usage.filter(u => u.date >= from); }
  if (to)   { deliveries = deliveries.filter(d => d.date <= to);   usage = usage.filter(u => u.date <= to); }

  const byDate = {};
  deliveries.forEach(d => {
    if (!byDate[d.date]) byDate[d.date] = { date: d.date, in: 0, out: 0, in_value: 0 };
    byDate[d.date].in += 1;
    byDate[d.date].in_value += d.total;
  });
  usage.forEach(u => {
    if (!byDate[u.date]) byDate[u.date] = { date: u.date, in: 0, out: 0, in_value: 0 };
    byDate[u.date].out += 1;
  });

  const rows = Object.values(byDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(r => ({ ...r, in_value: +r.in_value.toFixed(2) }));

  res.json(rows);
});

module.exports = router;