const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(session({
  secret: 'parrilla-vaca-inventory-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 8 }
}));

app.use(express.static(path.join(__dirname, '..', 'frontend')));

const { router: authRouter } = require('./routes/auth');

app.use('/api/auth',        authRouter);
app.use('/api/items',       require('./routes/items'));
app.use('/api/deliveries',  require('./routes/deliveries'));
app.use('/api/usage',       require('./routes/usage'));
app.use('/api/suppliers',   require('./routes/suppliers'));
app.use('/api/reports',     require('./routes/reports'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error.' });
});

app.listen(PORT, () => {
  console.log(`Parrilla Vaca inventory running at http://localhost:${PORT}`);
});