const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sizeOf = require('image-size');

const ALLOWED = ['image/jpeg', 'image/png', 'image/gif'];

function makeStorage(folder) {
  const dir = path.join(__dirname, '..', '..', 'uploads', folder);
  fs.mkdirSync(dir, { recursive: true });
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`);
    }
  });
}

function imageFilter(_req, file, cb) {
  if (!ALLOWED.includes(file.mimetype))
    return cb(new Error('Dozvoljeni su samo JPG, PNG i GIF formati.'));
  cb(null, true);
}

const uploadProfile = multer({
  storage: makeStorage('profiles'), fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});
const uploadProduct = multer({
  storage: makeStorage('products'), fileFilter: imageFilter,
  limits: { fileSize: 8 * 1024 * 1024 }
});
const uploadPrint = multer({
  storage: makeStorage('prints'), fileFilter: imageFilter,
  limits: { fileSize: 8 * 1024 * 1024 }
});
const uploadJson = multer({
  storage: makeStorage('json'),
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/json' && !file.originalname.endsWith('.json'))
      return cb(new Error('Očekuje se JSON fajl.'));
    cb(null, true);
  },
  limits: { fileSize: 2 * 1024 * 1024 }
});

// Serverska provera dimenzija profilne slike: 100x100 - 250x250 px
function validateProfileImage(req, res, next) {
  if (!req.file) return next();
  try {
    const dim = sizeOf(req.file.path);
    const ok = dim.width >= 100 && dim.height >= 100 && dim.width <= 250 && dim.height <= 250;
    if (!ok) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({
        message: `Profilna slika mora biti između 100x100 i 250x250 px (poslato ${dim.width}x${dim.height}).`
      });
    }
    next();
  } catch (e) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ message: 'Slika nije ispravna.' });
  }
}

module.exports = { uploadProfile, uploadProduct, uploadPrint, uploadJson, validateProfileImage };
