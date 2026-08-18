const ROLES = {
  INDIVIDUAL: 'INDIVIDUAL',   // klijent - fizicko lice
  LEGAL: 'LEGAL',             // klijent - pravno lice
  PRINTER: 'PRINTER',         // stampar
  ADMIN: 'ADMIN'
};

const USER_STATUS = { PENDING: 'PENDING', APPROVED: 'APPROVED', REJECTED: 'REJECTED' };

const ORDER_STATUS = {
  ORDERED: 'naruceno',
  PAID: 'placeno',
  PRINTING: 'u stampi',
  DELIVERED: 'isporuceno',
  RECEIVED: 'primljeno'
};

const ORDER_FLOW = [
  ORDER_STATUS.ORDERED,
  ORDER_STATUS.PAID,
  ORDER_STATUS.PRINTING,
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.RECEIVED
];

const TENDER_STATUS = { OPEN: 'OPEN', CLOSED: 'CLOSED', FAILED: 'FAILED' };

// minimalno 8, maksimalno 12 karaktera, bar jedno veliko slovo, jedan broj,
// jedan specijalni karakter, mora poceti slovom
const PASSWORD_REGEX =
  /^(?=[A-Za-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[\]{};:'",.<>\/?\\|`~]).{8,12}$/;

const MB_REGEX = /^\d{8}$/;            // maticni broj: tacno 8 cifara
const PIB_REGEX = /^[1-9]\d{8}$/;      // PIB: 9 cifara, ne pocinje nulom
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_REGEX = /^[+]?[0-9\s\-/()]{6,20}$/;

module.exports = {
  ROLES, USER_STATUS, ORDER_STATUS, ORDER_FLOW, TENDER_STATUS,
  PASSWORD_REGEX, MB_REGEX, PIB_REGEX, EMAIL_REGEX, PHONE_REGEX
};
