const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/password', require('./routes/password'));
app.use('/api/network', require('./routes/network'));
app.use('/api/fusion', require('./routes/fusion'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/patterns', require('./routes/patterns'));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, '../frontend/dashboard.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🛡️  SCDS running on http://localhost:${PORT}`));