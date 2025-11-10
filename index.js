// index.js
const express = require('express');
const app = express();
const cors = require('cors');
const crypto = require('crypto');

require('dotenv').config();

app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false })); // body parsing for form data

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

/**
 * In-memory storage
 * users: [{ username, _id, log: [{ description, duration, date }] }]
 */
const users = [];

// helper: generate 24-hex id (like Mongo ObjectId)
function genId() {
  return crypto.randomBytes(12).toString('hex');
}

// ========== Create new user ==========
// POST /api/users with form-data: username
app.post('/api/users', (req, res) => {
  const username = req.body.username;
  if (!username) return res.status(400).json({ error: 'username required' });

  const _id = genId();
  const user = { username, _id, log: [] };
  users.push(user);

  res.json({ username: user.username, _id: user._id });
});

// ========== Get all users ==========
// GET /api/users
app.get('/api/users', (req, res) => {
  // return array of { username, _id }
  const out = users.map(u => ({ username: u.username, _id: u._id }));
  res.json(out);
});

// ========== Add exercise ==========
// POST /api/users/:_id/exercises with form-data: description, duration, (optional) date
app.post('/api/users/:_id/exercises', (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;

  const user = users.find(u => u._id === _id);
  if (!user) return res.status(400).json({ error: 'unknown user id' });

  if (!description || !duration) {
    return res.status(400).json({ error: 'description and duration are required' });
  }

  const durationNum = Number(duration);
  if (Number.isNaN(durationNum)) {
    return res.status(400).json({ error: 'duration must be a number' });
  }

  let dateObj;
  if (date) {
    dateObj = new Date(date);
    if (dateObj.toString() === 'Invalid Date') {
      return res.status(400).json({ error: 'Invalid Date' });
    }
  } else {
    dateObj = new Date();
  }

  const exercise = {
    description: String(description),
    duration: durationNum,
    date: dateObj.toDateString()
  };

  user.log.push({
    description: exercise.description,
    duration: exercise.duration,
    date: exercise.date
  });

  // Response should be the user object with exercise fields added
  res.json({
    username: user.username,
    description: exercise.description,
    duration: exercise.duration,
    date: exercise.date,
    _id: user._id
  });
});

// ========== Get user logs ==========
// GET /api/users/:_id/logs?[from][&to][&limit]
app.get('/api/users/:_id/logs', (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  const user = users.find(u => u._id === _id);
  if (!user) return res.status(400).json({ error: 'unknown user id' });

  // Start with full log
  let log = user.log.map(e => ({ description: e.description, duration: e.duration, date: e.date }));

  // Apply from / to (they are yyyy-mm-dd)
  if (from) {
    const fromDate = new Date(from);
    if (fromDate.toString() === 'Invalid Date') {
      return res.status(400).json({ error: 'Invalid from date' });
    }
    log = log.filter(e => new Date(e.date) >= fromDate);
  }
  if (to) {
    const toDate = new Date(to);
    if (toDate.toString() === 'Invalid Date') {
      return res.status(400).json({ error: 'Invalid to date' });
    }
    log = log.filter(e => new Date(e.date) <= toDate);
  }

  // Apply limit
  if (limit) {
    const lim = Number(limit);
    if (!Number.isNaN(lim) && lim >= 0) {
      log = log.slice(0, lim);
    }
  }

  res.json({
    username: user.username,
    count: log.length,
    _id: user._id,
    log: log
  });
});

// Listen
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});

module.exports = app;
