import {passwordHash,token} from '../src/security.js';
const password=token().slice(0,24);
console.log('Save this generated admin password in your password manager:',password);
console.log('Set these ONLY in .env.local or Vercel environment variables:');
console.log('ADMIN_PASSWORD_HASH='+passwordHash(password));
console.log('SESSION_SECRET='+token());
