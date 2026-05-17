const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const { phoneRegex } = require('./phone');

module.exports = { emailRegex, phoneRegex };
