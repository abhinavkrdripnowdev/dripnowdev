import axios from 'axios';
import { env } from '../../config/env';
import { fail } from '../../utils/httpError';
export async function sendSms(phone: string, otp: string) {
  return sendSmsMessage(phone, `Your DripNow verification code is ${otp}. It expires in ${env.OTP_EXPIRES_IN_MINUTES} minutes.`);
}
export async function sendSmsMessage(phone: string, message: string) {
  if (env.SMS_PROVIDER === 'mock') {
    if (env.NODE_ENV === 'production') fail('A real SMS provider is required', 503);
    return;
  }
  if (env.SMS_PROVIDER === 'twilio') {
    const sid = process.env.TWILIO_ACCOUNT_SID, token = process.env.TWILIO_AUTH_TOKEN, from = process.env.TWILIO_FROM;
    if (!sid || !token || !from) fail('SMS provider is not configured', 503);
    await axios.post(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      new URLSearchParams({ To: phone, From: from, Body: message }),
      { auth: { username: sid, password: token }, timeout: 10000 });
    return;
  }
  fail('Configured SMS provider is not supported; select twilio', 503);
}
