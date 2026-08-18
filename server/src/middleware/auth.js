const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { USER_STATUS } = require('../config/constants');

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Niste prijavljeni.' });

    const payload = jwt.verify(token, process.env.JWT_SECRET || 'pia_super_secret_change_me');
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: 'Korisnik ne postoji.' });
    if (user.status !== USER_STATUS.APPROVED)
      return res.status(403).json({ message: 'Nalog nije odobren.' });

    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Sesija je istekla ili token nije validan.' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Niste prijavljeni.' });
    if (!roles.includes(req.user.role))
      return res.status(403).json({ message: 'Nemate privilegije za ovu akciju.' });
    next();
  };
}

// opciona autentikacija - javne rute koje daju vise podataka prijavljenom korisniku
async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return next();
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET || 'pia_super_secret_change_me');
    req.user = await User.findById(payload.sub);
  } catch (_) { /* ignorisemo */ }
  next();
}

module.exports = { authenticate, authorize, optionalAuth };
