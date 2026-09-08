import {createHash} from 'node:crypto';
import {fail} from './security.js';

// Recover a completed capture after a lost response or a failed database update.
// A stable request ID ensures retries never create a second capture.
export async function capturePaypalOrder({baseUrl,accessToken,orderId,fetchImpl=fetch}) {
  const url=`${baseUrl}/v2/checkout/orders/${encodeURIComponent(orderId)}`;
  const headers={Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json',Prefer:'return=representation'};
  const readOrder=async()=>{
    const response=await fetchImpl(url,{headers,signal:AbortSignal.timeout(15000)});
    if(!response.ok) fail(502,'PayPal could not check this payment. Please retry confirmation.');
    return response.json();
  };
  const existing=await readOrder();
  if(existing.status==='COMPLETED') return existing;
  if(existing.status!=='APPROVED') fail(409,'PayPal has not completed approval for this order yet.');
  try {
    const response=await fetchImpl(`${url}/capture`,{
      method:'POST',headers:{...headers,'PayPal-Request-Id':createHash('sha256').update(`mq3-capture:${orderId}`).digest('hex').slice(0,38)},
      body:'{}',signal:AbortSignal.timeout(15000)
    });
    if(response.ok) return await response.json();
  } catch {
    // Capture may have succeeded even when the response was lost.
  }
  const recovered=await readOrder();
  if(recovered.status==='COMPLETED') return recovered;
  fail(502,'PayPal payment confirmation is not complete yet. Please retry confirmation.');
}
