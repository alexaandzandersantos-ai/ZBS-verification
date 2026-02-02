module.exports = function detectCountry(phone) {
  if (phone.startsWith('+63')) return 'PH';
  if (phone.startsWith('09')) return 'PH';
  if (phone.startsWith('+1')) return 'US';
  if (phone.startsWith('+44')) return 'UK';
  if (phone.startsWith('+61')) return 'AU';
  if (phone.startsWith('+81')) return 'JP';
  return 'Unknown';
};
