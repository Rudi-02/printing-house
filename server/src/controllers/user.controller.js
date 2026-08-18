const User = require('../models/User');
const { ROLES } = require('../config/constants');
const { EMAIL_REGEX, PHONE_REGEX } = require('../config/constants');

// Profil: pregled i azuriranje (korisnicko ime se NE menja)
exports.getProfile = async (req, res) => res.json(req.user.toPublic());

exports.updateProfile = async (req, res, next) => {
  try {
    const user = req.user;
    const b = req.body;

    if (b.email && b.email.toLowerCase() !== user.email) {
      if (!EMAIL_REGEX.test(b.email)) return res.status(400).json({ message: 'I-mejl nije ispravan.' });
      if (await User.findOne({ email: b.email.toLowerCase(), _id: { $ne: user._id } }))
        return res.status(409).json({ message: 'I-mejl adresa je već u upotrebi.' });
      user.email = b.email.toLowerCase();
    }
    if (b.phone) {
      if (!PHONE_REGEX.test(b.phone)) return res.status(400).json({ message: 'Telefon nije ispravan.' });
      user.phone = b.phone;
    }
    if (b.firstName) user.firstName = b.firstName;
    if (b.lastName) user.lastName = b.lastName;

    if (user.role === ROLES.LEGAL || user.role === ROLES.PRINTER) {
      if (b.institutionName) user.institutionName = b.institutionName;
      if (b.address) user.address = b.address;
      if (b.city) user.city = b.city;
      if (b.lat !== undefined && b.lat !== '') user.lat = Number(b.lat);
      if (b.lng !== undefined && b.lng !== '') user.lng = Number(b.lng);
    }

    if (req.file) user.profileImage = req.file.filename;

    await user.save();
    res.json({ message: 'Podaci su uspešno ažurirani.', user: user.toPublic() });
  } catch (e) { next(e); }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const { validatePassword } = require('../utils/validators');
    if (!(await req.user.comparePassword(oldPassword || '')))
      return res.status(400).json({ message: 'Stara lozinka nije ispravna.' });
    if (!validatePassword(newPassword))
      return res.status(400).json({ message: 'Nova lozinka ne zadovoljava pravila složenosti.' });
    req.user.password = newPassword;
    await req.user.save();
    res.json({ message: 'Lozinka je promenjena.' });
  } catch (e) { next(e); }
};
