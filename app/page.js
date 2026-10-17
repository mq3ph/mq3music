'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [support, setSupport] = useState(false);
  const [sf, setSf] = useState({ name: '', mobile: '', email: '', subject: 'General Question', message: '' });
  const [ss, setSs] = useState(false);

  useEffect(() => {
    load();
    track('site_visit');
  }, []);

  async function load() {
    const { data } = await supabase.from('products').select('*').eq('is_active', true).order('sort_order');
    const list = data || [];
    setProducts(list);
    const id = new URLSearchParams(window.location.search).get('product');
    if (id) {
      const product = list.find((item) => item.id === id);
      if (product) {
        setCat('All');
        setQ(product.name);
        setTimeout(() => document.getElementById(`product-${product.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
      }
    }
  }

  async function track(event_type, product_id = null) {
    if (localStorage.getItem('lw_exclude_analytics') === '1') return;
    await supabase.from('analytics_events').insert({
      event_type,
      product_id,
      session_id: getVisitor(),
      referrer: document.referrer || null,
    });
  }

  function getVisitor() {
    let id = localStorage.getItem('lw_visitor');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('lw_visitor', id);
    }
    return id;
  }

  async function sendSupport(e) {
    e.preventDefault();
    if (ss) return;
    setSs(true);
    const { data, error } = await supabase.rpc('create_support_chat', {
      p_customer_name: sf.name,
      p_mobile: sf.mobile,
      p_email: sf.email,
      p_subject: sf.subject,
      p_message: sf.message,
    });
    setSs(false);
    if (error) return alert(error.message);
    const row = data?.[0];
    if (!row) return alert('Unable to start chat. Please try again.');
    window.location.href = `/support/${row.public_token}`;
  }

  const cats = ['All', ...new Set(products.map((product) => product.category))];
  const shown = useMemo(
    () => products.filter((product) => (cat === 'All' || product.category === cat) && product.name.toLowerCase().includes(q.toLowerCase())),
    [products, q, cat],
  );

  return (
    <>
      <header className="storeheader lwtop">
        <div className="brand lwbrand">
          <div className="brandlogo lwlogo"><img src="/living-well-logo.png" alt="Living Well with USANA" /></div>
          <div className="brandcopy lwcopy">
            <h1><span className="lwpremium">Living Well</span> <span className="lwusana">with USANA</span></h1>
            <p>by Sally Quimson, RN</p>
          </div>
        </div>
        <button className="lwchat" type="button" aria-label="Chat with Sally" title="Chat with Sally" onClick={() => setSupport(true)}>
          <span className="lwchatIcon">💬</span>
          <span className="lwchatText"><span>Chat with</span><strong>Sally</strong></span>
        </button>
      </header>

      <style jsx>{`
        .lwtop{display:grid!important;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:48px;min-height:112px;padding:18px 28px!important}
        .lwbrand{display:flex!important;align-items:center!important;gap:12px!important;min-width:0!important;margin:0!important;max-width:none!important}
        .lwlogo{flex:0 0 82px!important;width:82px!important;height:82px!important}
        .lwlogo img{width:82px!important;height:82px!important;object-fit:contain!important}
        .lwcopy{min-width:0!important}
        .lwcopy h1{margin:0!important;white-space:nowrap!important;font-size:26px!important;line-height:1.08!important}
        .lwpremium{font-family:Georgia,'Times New Roman',serif;font-weight:700;font-style:italic;letter-spacing:-.4px;font-size:1.1em}
        .lwusana{font-family:Inter,Arial,sans-serif;font-weight:800;font-size:.9em}
        .lwcopy p{margin:6px 0 0!important;white-space:nowrap!important;font-size:13px!important;line-height:1.2!important}
        .lwchat{justify-self:end;display:flex;align-items:center;gap:7px;background:#174633;color:#fff;border:0;border-radius:18px;padding:7px 12px;cursor:pointer;white-space:nowrap}
        .lwchatIcon{font-size:13px;line-height:1}
        .lwchatText{display:flex;flex-direction:column;align-items:flex-start;line-height:1.05;font-size:10px;font-weight:500}
        .lwchatText strong{font-size:13px;font-weight:900}
        @media(max-width:600px){
          .lwtop{grid-template-columns:minmax(0,1fr) auto!important;gap:10px!important;min-height:108px!important;padding:14px!important}
          .lwbrand{gap:10px!important}.lwlogo{flex-basis:68px!important;width:68px!important;height:68px!important}.lwlogo img{width:68px!important;height:68px!important}
          .lwcopy h1{font-size:17px!important;letter-spacing:-.35px!important}.lwcopy p{font-size:10px!important;margin-top:5px!important}
          .lwchat{align-self:end!important;transform:translateY(7px)!important;margin-bottom:0!important;padding:6px 9px!important;border-radius:15px!important}
          .lwchatText{font-size:8px!important}.lwchatText strong{font-size:11px!important}.lwchatIcon{font-size:11px!important}
        }
        @media(max-width:390px){
          .lwtop{gap:8px!important;padding-left:10px!important;padding-right:10px!important}
          .lwlogo{flex-basis:62px!important;width:62px!important;height:62px!important}.lwlogo img{width:62px!important;height:62px!important}
          .lwcopy h1{font-size:15px!important}.lwcopy p{font-size:9px!important}
          .lwchat{align-self:end!important;transform:translateY(7px)!important;margin-bottom:0!important;padding:5px 7px!important}
          .lwchatText{font-size:7px!important}.lwchatText strong{font-size:10px!important}.lwchatIcon{font-size:10px!important}
        }
      `}</style>

      <main className="storemain">
        <div className="searchwrap"><span>⌕</span><input className="search" placeholder="Search products..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="chips">{cats.map((category) => <button className={cat === category ? 'active' : ''} onClick={() => setCat(category)} key={category}>{category}</button>)}</div>
        <div className="grid">
          {shown.map((product) => (
            <article className="card" id={`product-${product.id}`} key={product.id}>
              <div className="pic" onClick={() => track('product_view', product.id)}>
                {product.image_url ? <img src={product.image_url} alt={product.name} /> : <span>Product image</span>}
              </div>
              <div className="cardbody">
                <h2>{product.name}</h2>
                <div className="price">₱{Number(product.price).toLocaleString('en-PH')}</div>
                <a className="buy" href={`/product/${encodeURIComponent(product.id)}`} onClick={() => track('product_view', product.id)}>Learn More</a>
              </div>
            </article>
          ))}
        </div>
        {!shown.length && <div className="empty">No products found.</div>}
      </main>

      {support && (
        <div className="modalback" onMouseDown={(e) => { if (e.target === e.currentTarget) setSupport(false); }}>
          <div className="inquirymodal">
            <button className="modalclose" onClick={() => setSupport(false)}>×</button>
            <div className="inquiryproduct">
              <img src="/sally-avatar.png" alt="Sally" />
              <div><small>CUSTOMER SUPPORT</small><h2>Chat with Sally</h2><p style={{ margin: 0, fontSize: 13 }}>Ask a question, share a concern, or send feedback.</p></div>
            </div>
            <form className="inquiryform" onSubmit={sendSupport}>
              <label>Name *<input required minLength="2" value={sf.name} onChange={(e) => setSf({ ...sf, name: e.target.value })} placeholder="Your name" /></label>
              <div className="inquiryrow">
                <label>Mobile <input value={sf.mobile} onChange={(e) => setSf({ ...sf, mobile: e.target.value })} placeholder="Optional" /></label>
                <label>Email <input type="email" value={sf.email} onChange={(e) => setSf({ ...sf, email: e.target.value })} placeholder="Optional" /></label>
              </div>
              <label>What can Sally help with?<select value={sf.subject} onChange={(e) => setSf({ ...sf, subject: e.target.value })}>
                <option>General Question</option><option>Product Question</option><option>Order Concern</option><option>Payment Concern</option><option>Complaint</option><option>Feedback</option>
              </select></label>
              <label>Message *<textarea required minLength="2" maxLength="2000" value={sf.message} onChange={(e) => setSf({ ...sf, message: e.target.value })} placeholder="Tell Sally how she can help..." /></label>
              <button className="sendinquiry" disabled={ss}>{ss ? 'STARTING CHAT...' : 'START CHAT'}</button>
              <p className="formnote">You’ll receive a private chat page where you can continue the conversation with Sally.</p>
            </form>
          </div>
        </div>
      )}

      <footer>Independent product guide by Sally Quimson, RN. Product information, prices and availability may change.</footer>
    </>
  );
}
