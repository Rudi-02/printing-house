const {
  PASSWORD_REGEX, MB_REGEX, PIB_REGEX, EMAIL_REGEX, PHONE_REGEX, ROLES
} = require('../config/constants');

function validateRegistration(body) {
  const errors = [];
  const { username, password, firstName, lastName, phone, email, role } = body;

  if (!username || username.trim().length < 3) errors.push('Korisničko ime mora imati bar 3 karaktera.');
  if (!PASSWORD_REGEX.test(password || ''))
    errors.push('Lozinka mora imati 8-12 karaktera, počinjati slovom i sadržati bar jedno veliko slovo, jedan broj i jedan specijalni karakter.');
  if (!firstName || !firstName.trim()) errors.push('Ime je obavezno.');
  if (!lastName || !lastName.trim()) errors.push('Prezime je obavezno.');
  if (!PHONE_REGEX.test(phone || '')) errors.push('Kontakt telefon nije ispravan.');
  if (!EMAIL_REGEX.test(email || '')) errors.push('I-mejl adresa nije ispravna.');
  if (![ROLES.INDIVIDUAL, ROLES.LEGAL, ROLES.PRINTER].includes(role))
    errors.push('Tip korisnika nije ispravan.');

  if (role === ROLES.LEGAL || role === ROLES.PRINTER) {
    const { institutionName, address, city, companyNumber, pib } = body;
    if (!institutionName || !institutionName.trim()) errors.push('Naziv institucije je obavezan.');
    if (!address || !address.trim()) errors.push('Adresa sedišta je obavezna.');
    if (!city || !city.trim()) errors.push('Grad je obavezan.');
    if (!MB_REGEX.test(companyNumber || '')) errors.push('Matični broj mora imati tačno 8 cifara.');
    if (!PIB_REGEX.test(pib || '')) errors.push('PIB mora imati 9 cifara i ne sme počinjati nulom.');
  }
  return errors;
}

const validatePassword = (p) => PASSWORD_REGEX.test(p || '');

module.exports = { validateRegistration, validatePassword };
