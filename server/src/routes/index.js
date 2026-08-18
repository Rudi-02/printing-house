const router = require('express').Router();

const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { uploadProfile, uploadProduct, uploadPrint, uploadJson, validateProfileImage } = require('../middleware/upload');
const { ROLES } = require('../config/constants');

const auth = require('../controllers/auth.controller');
const users = require('../controllers/user.controller');
const cats = require('../controllers/category.controller');
const products = require('../controllers/product.controller');
const cart = require('../controllers/cart.controller');
const orders = require('../controllers/order.controller');
const tenders = require('../controllers/tender.controller');
const admin = require('../controllers/admin.controller');

const CLIENTS = [ROLES.INDIVIDUAL, ROLES.LEGAL];
const productImages = uploadProduct.fields([
  { name: 'mainImage', maxCount: 1 },
  { name: 'images', maxCount: 3 }
]);

/* ---------------- AUTH ---------------- */
router.post('/auth/register', uploadProfile.single('profileImage'), validateProfileImage, auth.register);
router.post('/auth/login', auth.login);
router.post('/auth/admin/login', auth.adminLogin);
router.get('/auth/me', authenticate, auth.me);
router.post('/auth/forgot-password', auth.forgotPassword);
router.get('/auth/reset-password/:token', auth.validateResetToken);
router.post('/auth/reset-password', auth.resetPassword);

/* ---------------- JAVNO ---------------- */
router.get('/public/stats', products.publicStats);
router.get('/public/categories', cats.listActive);
router.get('/public/products', products.search);
router.get('/public/products/:id', optionalAuth, products.details);

/* ---------------- PROFIL ---------------- */
router.get('/profile', authenticate, users.getProfile);
router.put('/profile', authenticate, uploadProfile.single('profileImage'), validateProfileImage, users.updateProfile);
router.put('/profile/password', authenticate, users.changePassword);

/* ---------------- KATEGORIJE ---------------- */
router.get('/categories', authenticate, cats.list);
router.post('/categories', authenticate, authorize(ROLES.ADMIN), cats.create);
router.put('/categories/:id', authenticate, authorize(ROLES.ADMIN), cats.update);
router.delete('/categories/:id', authenticate, authorize(ROLES.ADMIN), cats.remove);
router.post('/categories/:id/subcategories', authenticate, authorize(ROLES.ADMIN), cats.addSubcategory);

/* ---------------- STAMPAR: PROIZVODI ---------------- */
router.get('/printer/products', authenticate, authorize(ROLES.PRINTER), products.myProducts);
router.post('/printer/products', authenticate, authorize(ROLES.PRINTER), productImages, products.create);
router.put('/printer/products/:id', authenticate, authorize(ROLES.PRINTER), productImages, products.update);
router.patch('/printer/products/:id/quantity', authenticate, authorize(ROLES.PRINTER), products.updateQuantity);
router.post('/printer/products/:id/images', authenticate, authorize(ROLES.PRINTER), productImages, products.uploadImages);
router.delete('/printer/products/:id', authenticate, authorize(ROLES.PRINTER), products.remove);
router.post('/printer/products/import', authenticate, authorize(ROLES.PRINTER), uploadJson.single('file'), products.importJson);

/* ---------------- STAMPAR: NARUDZBINE I LICITACIJE ---------------- */
router.get('/printer/orders', authenticate, authorize(ROLES.PRINTER), orders.printerOrders);
router.patch('/printer/orders/:id/status', authenticate, authorize(ROLES.PRINTER), orders.advanceStatus);
router.get('/printer/tenders', authenticate, authorize(ROLES.PRINTER), tenders.openTenders);
router.get('/printer/tenders/mine', authenticate, authorize(ROLES.PRINTER), tenders.myBids);
router.post('/printer/tenders/:id/bid', authenticate, authorize(ROLES.PRINTER), tenders.submitBid);

/* ---------------- KLIJENT: KORPA ---------------- */
router.get('/cart', authenticate, authorize(...CLIENTS), cart.getCart);
router.post('/cart', authenticate, authorize(...CLIENTS), uploadPrint.single('customImage'), cart.addItem);
router.delete('/cart/:itemId', authenticate, authorize(...CLIENTS), cart.removeItem);
router.delete('/cart', authenticate, authorize(...CLIENTS), cart.clear);

/* ---------------- KLIJENT: NARUDZBINE ---------------- */
router.post('/orders/checkout', authenticate, authorize(ROLES.INDIVIDUAL), orders.checkout);
router.post('/orders/pay', authenticate, authorize(ROLES.INDIVIDUAL), orders.pay);
router.get('/orders', authenticate, authorize(...CLIENTS), orders.myInvoices);
router.delete('/orders/:id', authenticate, authorize(...CLIENTS), orders.cancel);
router.get('/orders/:id/pdf', authenticate, orders.invoicePdf);
router.get('/archive', authenticate, authorize(...CLIENTS), orders.archive);
router.patch('/orders/:id/received', authenticate, authorize(...CLIENTS), orders.markReceived);
router.post('/ratings', authenticate, authorize(...CLIENTS), orders.rateProduct);

/* ---------------- KLIJENT (PRAVNO LICE): JAVNE NABAVKE ---------------- */
router.post('/tenders', authenticate, authorize(ROLES.LEGAL), tenders.openTender);
router.get('/tenders', authenticate, authorize(ROLES.LEGAL), tenders.myTenders);
router.get('/tenders/:id/report', authenticate, authorize(ROLES.LEGAL), tenders.tenderReport);

/* ---------------- ADMINISTRATOR ---------------- */
router.get('/admin/users', authenticate, authorize(ROLES.ADMIN), admin.listUsers);
router.get('/admin/users/pending', authenticate, authorize(ROLES.ADMIN), admin.pendingUsers);
router.patch('/admin/users/:id/approve', authenticate, authorize(ROLES.ADMIN), admin.approveUser);
router.patch('/admin/users/:id/reject', authenticate, authorize(ROLES.ADMIN), admin.rejectUser);
router.put('/admin/users/:id', authenticate, authorize(ROLES.ADMIN), admin.updateUser);
router.delete('/admin/users/:id', authenticate, authorize(ROLES.ADMIN), admin.deleteUser);
router.get('/admin/stats/overview', authenticate, authorize(ROLES.ADMIN), admin.overview);
router.get('/admin/stats/revenue', authenticate, authorize(ROLES.ADMIN), admin.revenueByPrinter);
router.get('/admin/stats/top-products', authenticate, authorize(ROLES.ADMIN), admin.topProducts);
router.get('/admin/stats/rating-trend', authenticate, authorize(ROLES.ADMIN), admin.ratingTrend);

module.exports = router;
