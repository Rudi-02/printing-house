const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const PasswordReset = require('../models/PasswordReset');
const { ROLES, USER_STATUS } = require('../config/constants');
const { validateRegistration, validatePassword } = require('../utils/validators');
const { sendMail } = require('../utils/mailer');

function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, username: user.username },
    process.env.JWT_SECRET || 'pia_super_secret_change_me',
    { expiresIn: process.env.JWT_EXPIRES || '2h' }
  );
}

exports.register = async (req, res, next) => {
  try {
    const errors = validateRegistration(req.body);
    if (errors.length) return res.status(400).json({ message: errors.join(' ') });

    const { username, email, role } = req.body;
    if (await User.findOne({ username }))
      return res.status(409).json({ message: 'Korisničko ime je već zauzeto.' });
    if (await User.findOne({ email: email.toLowerCase() }))
      return res.status(409).json({ message: 'Već postoji nalog sa ovom i-mejl adresom.' });

    const isLegalOrPrinter = role === ROLES.LEGAL || role === ROLES.PRINTER;
    if (isLegalOrPrinter) {
      if (await User.findOne({ companyNumber: req.body.companyNumber }))
        return res.status(409).json({ message: 'Matični broj već postoji u sistemu.' });
      if (await User.findOne({ pib: req.body.pib }))
        return res.status(409).json({ message: 'PIB već postoji u sistemu.' });
    }

    const user = new User({
      username: username.trim(),
      password: req.body.password,
      firstName: req.body.firstName.trim(),
      lastName: req.body.lastName.trim(),
      phone: req.body.phone.trim(),
      email: email.toLowerCase().trim(),
      role,
      profileImage: req.file ? req.file.filename : 'default_profile_image.jpg',
      // fizicko lice je odmah aktivno; pravna lica i stamparije cekaju odobrenje
      status: role === ROLES.INDIVIDUAL ? USER_STATUS.APPROVED : USER_STATUS.PENDING
    });

    if (isLegalOrPrinter) {
      user.institutionName = req.body.institutionName.trim();
      user.address = req.body.address.trim();
      user.city = req.body.city.trim();
      user.companyNumber = req.body.companyNumber;
      user.pib = req.body.pib;
      if (req.body.lat) user.lat = Number(req.body.lat);
      if (req.body.lng) user.lng = Number(req.body.lng);
    }

    await user.save();

    res.status(201).json({
      message: user.status === USER_STATUS.APPROVED
        ? 'Registracija je uspešna. Možete se prijaviti.'
        : 'Zahtev za registraciju je poslat. Sačekajte odobrenje administratora.',
      status: user.status
    });
  } catch (e) { next(e); }
};

async function doLogin(req, res, expectAdmin) {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: 'Unesite korisničko ime i lozinku.' });

  const user = await User.findOne({ $or: [{ username }, { email: String(username).toLowerCase() }] });
  if (!user || !(await user.comparePassword(password)))
    return res.status(401).json({ message: 'Pogrešno korisničko ime ili lozinka.' });

  if (expectAdmin && user.role !== ROLES.ADMIN)
    return res.status(403).json({ message: 'Pogrešno korisničko ime ili lozinka.' });
  if (!expectAdmin && user.role === ROLES.ADMIN)
    return res.status(403).json({ message: 'Administrator se prijavljuje na posebnoj adresi.' });

  if (user.status === USER_STATUS.PENDING)
    return res.status(403).json({ message: 'Vaš zahtev za registraciju još uvek čeka odobrenje administratora.' });
  if (user.status === USER_STATUS.REJECTED)
    return res.status(403).json({ message: 'Vaš zahtev za registraciju je odbijen.' });

  res.json({ token: signToken(user), user: user.toPublic() });
}

exports.login = (req, res, next) => doLogin(req, res, false).catch(next);
exports.adminLogin = (req, res, next) => doLogin(req, res, true).catch(next);

exports.me = async (req, res) => res.json(req.user.toPublic());

exports.forgotPassword = async (req, res, next) => {
  try {
    const { identifier } = req.body;
    if (!identifier) return res.status(400).json({ message: 'Unesite korisničko ime ili i-mejl.' });

    const user = await User.findOne({
      $or: [{ username: identifier }, { email: String(identifier).toLowerCase() }]
    });

    // uvek isti odgovor - ne otkrivamo da li nalog postoji
    const generic = { message: 'Ukoliko nalog postoji, poslali smo link za poništavanje lozinke na i-mejl.' };
    if (!user) return res.json(generic);

    const ttl = Number(process.env.RESET_TOKEN_TTL_MINUTES || 5);
    const token = crypto.randomBytes(32).toString('hex');
    await PasswordReset.create({
      user: user._id, token, expiresAt: new Date(Date.now() + ttl * 60 * 1000)
    });

    const link = `${process.env.CLIENT_URL || 'http://localhost:4200'}/reset-password/${token}`;
    await sendMail({
      to: user.email,
      subject: 'Poništavanje lozinke - Printing House',
      html: `<p>Poštovani ${user.firstName},</p>
             <p>Kliknite na link ispod da postavite novu lozinku. Link važi <b>${ttl} minuta</b>.</p>
             <p><a href="${link}">${link}</a></p>
             <p>Ako niste vi zatražili promenu, ignorišite ovu poruku.</p>`
    });
    res.json({ ...generic, devLink: link });
  } catch (e) { next(e); }
};

exports.validateResetToken = async (req, res, next) => {
  try {
    const pr = await PasswordReset.findOne({ token: req.params.token });
    const valid = !!pr && !pr.used && pr.expiresAt > new Date();
    res.json({ valid, message: valid ? 'Link je važeći.' : 'Link je istekao ili je već iskorišćen.' });
  } catch (e) { next(e); }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!validatePassword(password))
      return res.status(400).json({ message: 'Lozinka ne zadovoljava pravila složenosti.' });

    const pr = await PasswordReset.findOne({ token });
    if (!pr || pr.used || pr.expiresAt <= new Date())
      return res.status(400).json({ message: 'Link za poništavanje lozinke je istekao (važi 5 minuta).' });

    const user = await User.findById(pr.user);
    if (!user) return res.status(404).json({ message: 'Korisnik ne postoji.' });

    user.password = password;
    await user.save();
    pr.used = true;
    await pr.save();

    res.json({ message: 'Lozinka je uspešno promenjena. Možete se prijaviti.' });
  } catch (e) { next(e); }
};
