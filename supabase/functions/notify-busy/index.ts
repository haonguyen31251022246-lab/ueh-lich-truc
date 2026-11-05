// Supabase Edge Function: notify-busy
// Required Supabase secrets: GMAIL_SENDER, GOOGLE_CLIENT_ID,
// GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN.


const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function base64Url(input: Uint8Array) {
  let binary = '';
  for (const byte of input) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });
  try {
    const { member, day, shift, action, recipients } = await req.json();
    if (!member || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !['Sáng', 'Chiều', 'Tối'].includes(shift)) {
      return new Response(JSON.stringify({ error: 'Thông tin báo bận không hợp lệ.' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    const emails = [...new Set((Array.isArray(recipients) ? recipients : []).filter((x) => typeof x === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)))];
    if (!emails.length) return new Response(JSON.stringify({ sent: 0, message: 'Chưa có Gmail nhận thông báo.' }), { headers: { ...cors, 'Content-Type': 'application/json' } });

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const refreshToken = Deno.env.get('GOOGLE_REFRESH_TOKEN');
    const sender = Deno.env.get('GMAIL_SENDER');
    if (!clientId || !clientSecret || !refreshToken || !sender) throw new Error('Thiếu cấu hình Gmail OAuth trong Supabase Secrets.');

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) throw new Error('Không lấy được quyền gửi Gmail.');
    const [year, month, date] = day.split('-');
    const dateText = `${date}/${month}/${year}`;
    const subject = `Thông báo ${action === 'cancel' ? 'hủy báo bận' : 'báo bận'}: ${member}`;
    const body = `${member} đã ${action === 'cancel' ? 'hủy trạng thái báo bận' : 'báo bận'} ngày ${dateText}, ca ${shift}.`;
    const rawText = [`From: ${sender}`, `To: ${emails.join(', ')}`, `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', btoa(unescape(encodeURIComponent(body)))].join('\r\n');
    const raw = base64Url(new TextEncoder().encode(rawText));
    const sendResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST', headers: { Authorization: `Bearer ${tokenData.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw }),
    });
    if (!sendResponse.ok) throw new Error('Gmail từ chối gửi thư. Kiểm tra quyền Gmail API và tài khoản gửi.');
    return new Response(JSON.stringify({ sent: emails.length }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Lỗi gửi email.' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});