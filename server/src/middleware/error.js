function notFound(_req, res) {
  res.status(404).json({ message: 'Ruta nije pronađena.' });
}

function errorHandler(err, _req, res, _next) {
  console.error('[error]', err.message);
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'vrednost';
    return res.status(409).json({ message: `Vrednost za polje "${field}" već postoji u sistemu.` });
  }
  if (err.name === 'ValidationError')
    return res.status(400).json({ message: Object.values(err.errors).map(e => e.message).join(' ') });
  res.status(err.status || 500).json({ message: err.message || 'Greška na serveru.' });
}

module.exports = { notFound, errorHandler };
