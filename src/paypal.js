import {createHash} from 'node:crypto';
import {fail} from './security.js';

// Recover a completed capture after a lost response or a failed database update.
// A stable request ID ensures retries never create a second capture.
export async function capturePaypalOrder({baseUrl,accessToken,orderId,localId,expectedAmount,fetchImpl=fetch}) {
  const url=`${baseUrl}/v2/checkout/orders/${encodeURIComponent(orderId)}`;
  const headers={Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json',Prefer:'return=representation'};
  const readOrder=async()=>{
    const response=await fetchImpl(url,{headers,signal:AbortSignal.timeout(15000)});
    if(!response.ok) fail(502,'PayPal could not check this payment. Please retry confirmation.');
    return response.json();
  };
  const existing=await readOrder();
  if(localId && (existing.id!==orderId || existing.purchase_units?.length!==1 || existing.purchase_units[0].custom_id!==localId)) fail(400,'PayPal order does not match the MQ3 purchase.');
  if(expectedAmount!==undefined && (existing.purchase_units?.[0]?.amount?.currency_code!=='PHP' || Number(existing.purchase_units[0].amount.value)!==expectedAmount)) fail(400,'PayPal order amount does not match the MQ3 purchase.');
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

// Post back to PayPal; never trust the event payload or fetch its certificate URL ourselves.
export async function verifyPaypalWebhook({baseUrl,accessToken,webhookId,headers,event,fetchImpl=fetch}) {
  if(!webhookId) fail(503,'PayPal webhook is not configured.');
  const fields={auth_algo:'paypal-auth-algo',cert_url:'paypal-cert-url',transmission_id:'paypal-transmission-id',transmission_sig:'paypal-transmission-sig',transmission_time:'paypal-transmission-time'};
  const payload={webhook_id:String(webhookId).trim(),webhook_event:event};
  for(const [field,header] of Object.entries(fields)){
    if(typeof headers[header]!=='string' || !headers[header] || headers[header].length>2048) fail(400,'Missing or invalid PayPal signature headers.');
    payload[field]=headers[header];
  }
  if(!event?.id || typeof event.event_type!=='string') fail(400,'Invalid PayPal event.');
  const response=await fetchImpl(`${baseUrl}/v1/notifications/verify-webhook-signature`,{
    method:'POST',headers:{Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'},
    body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)
  });
  if(!response.ok) fail(502,'PayPal signature verification is temporarily unavailable.');
  const result=await response.json();
  if(result.verification_status!=='SUCCESS') fail(400,'Invalid PayPal webhook signature.');
}
