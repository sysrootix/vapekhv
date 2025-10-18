import crypto from 'crypto';

const CODE_LENGTH = 8;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const generateReferralCode = (): string => {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let code = '';

  for (let i = 0; i < CODE_LENGTH; i += 1) {
    const index = bytes[i] % CODE_ALPHABET.length;
    code += CODE_ALPHABET[index];
  }

  return code;
};

export const buildReferralLink = (code: string): string => {
  const baseUrl = process.env.WEBAPP_URL || process.env.FRONTEND_URL || '';
  if (!baseUrl) {
    return code;
  }

  const url = new URL(baseUrl);
  url.searchParams.set('startapp', code);
  url.searchParams.set('ref', code);
  return url.toString();
};
