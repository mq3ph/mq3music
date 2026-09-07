import {randomBytes, scryptSync, timingSafeEqual, createHmac} from 'node:crypto';
export const token = () => randomBytes(32).toString('hex');
export function passwordHash(password, salt=randomBytes(16).toString('hex')) {return `${salt}:${scryptSync(password,salt,64).toString('hex')}`;}
export function verifyPassword(password, encoded) {
  if(typeof password!=='string'||password.length>256||!/^([a-f0-9]{32}):([a-f0-9]{128})$/.test(encoded||'')) return false;
  const [salt,hash]=encoded.split(':');return timingSafeEqual(scryptSync(password,salt,64),Buffer.from(hash,'hex'));
}
export function digest(value,secret) {if(!secret||secret.length<32)throw Object.assign(new Error('Complete SESSION_SECRET setup first.'),{status:503});return createHmac('sha256',secret).update(value).digest('hex');}
export const normalize = value => value.normalize('NFKC').trim().toLocaleLowerCase('en').replace(/\s+/g,' ');
export function text(value,max=150){if(typeof value!=='string'||!value.trim()||value.trim().length>max)throw Object.assign(new Error('Check the required fields and their length.'),{status:400});return value.trim();}
export function email(value){const e=text(value,254).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))throw Object.assign(new Error('Enter a valid email address.'),{status:400});return e;}
export function uuid(value){if(!/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(value||''))throw Object.assign(new Error('Invalid record.'),{status:400});return value;}
export const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
