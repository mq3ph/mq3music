'use client';

import { use, useEffect, useState } from 'react';
import { buyLink, supabase } from '../../../lib/supabase';

function getInfo(product) {
  return {
    about: product.product_info_about || product.info_about || product.about || product.description || '',
    body: product.product_info_body || product.info_body || product.body_support || product.how_it_supports || '',
    use: product.product_info_use || product.info_use || product.how_to_use || product.usage || '',
    note: product.product_info_note || product.info_note || product.disclaimer || '',
  };
}

export default function ProductDetails({ params }) {
  const { id } = use(params);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data, error } = await supabase.from('products').select('*').eq('id', id).eq('is_active', true).maybeSingle();
      if (!active) return;
      if (error || !data) setNotFound(true);
      else {
        setProduct(data);
        if (localStorage.getItem('lw_exclude_analytics') !== '1') {
          let sessionId = localStorage.getItem('lw_visitor');
          if (!sessionId) {
            sessionId = crypto.randomUUID();
            localStorage.setItem('lw_visitor', sessionId);
          }
          await supabase.from('analytics_events').insert({
            event_type: 'product_view',
            product_id: data.id,
            session_id: sessionId,
            referrer: document.referrer || null,
          });
        }
      }
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [id]);

  if (loading) return <main className="productpage"><p>Loading product information...</p></main>;
  if (notFound || !product) return <main className="productpage"><a className="backlink" href="/">← Back to products</a><section className="detailcard"><h1>Product not found</h1><p>This product may no longer be available.</p></section></main>;

  const info = getInfo(product);
  const hasInfo = info.about || info.body || info.use;

  return (
    <>
      <header className="storeheader">
        <a className="brand convbrand" href="/">
          <div className="brandlogo"><img src="/living-well-logo.png" alt="Living Well with USANA" /></div>
          <div className="brandcopy"><h1>Living Well with USANA</h1><p>by Sally Quimson, RN</p></div>
        </a>
      </header>
      <main className="productpage">
        <a className="backlink" href="/">← Back to products</a>
        <section className="detailcard">
          <div className="detailhero">
            <div className="detailimage">{product.image_url ? <img src={product.image_url} alt={product.name} /> : <span>Product image</span>}</div>
            <div className="detailheading">
              <span className="detailcategory">{product.category || 'USANA Product'}</span>
              <h1>{product.name}</h1>
              <strong className="detailprice">₱{Number(product.price).toLocaleString('en-PH')}</strong>
              <a className="buy detailbuy" href={buyLink(product)} target="_blank" rel="noreferrer">BUY NOW ON USANA</a>
            </div>
          </div>

          <div className="detailinfo">
            {hasInfo ? (
              <>
                <h2>Product information</h2>
                {info.about && <p>{info.about}</p>}
                {info.body && <p><b>How it supports the body:</b><br />{info.body}</p>}
                {info.use && <p><b>How to use:</b><br />{info.use}</p>}
                {info.note && <p className="detailnote">{info.note}</p>}
              </>
            ) : (
              <>
                <h2>Product information</h2>
                <p>{product.description || `${product.name} is part of USANA’s ${product.category || 'wellness'} product lineup.`}</p>
                <p><b>How to use:</b><br />Follow the directions on the current Philippine product label.</p>
                <p className="detailnote">Food supplement only. No approved therapeutic claims. Consult a healthcare professional if you are pregnant, nursing, taking medication, or have a medical condition.</p>
              </>
            )}
          </div>

          <p className="detaildisclaimer">Product details, directions, price, and availability may change. Always refer to the current product label and official USANA store information.</p>
          <a className="detailback" href="/">Back to all products</a>
        </section>
      </main>
      <footer>Independent product guide by Sally Quimson, RN. Product information, prices and availability may change.</footer>
      <style jsx>{`
        .productpage{max-width:760px;margin:0 auto;padding:18px 16px 34px}
        .detailcard{background:#fff;border:1px solid #e4e8e3;border-radius:18px;padding:18px;box-shadow:0 3px 14px rgba(30,55,40,.04)}
        .detailhero{display:grid;grid-template-columns:minmax(150px,240px) 1fr;gap:22px;align-items:center;padding-bottom:18px;border-bottom:1px solid #edf0ec}
        .detailimage{aspect-ratio:1;background:#f8faf7;border:1px solid #edf0eb;border-radius:14px;display:grid;place-items:center;padding:14px;color:#929b95;font-size:12px}
        .detailimage img{width:100%;height:100%;object-fit:contain}
        .detailcategory{text-transform:uppercase;letter-spacing:.09em;color:#718078;font-size:10px;font-weight:800}
        .detailheading h1{color:#173f2d;font-size:25px;line-height:1.2;margin:7px 0 8px}
        .detailprice{display:block;color:#173f2d;font-size:20px;margin-bottom:16px}
        .detailbuy{display:inline-block;font-size:12px;padding:12px 17px}
        .detailinfo{margin:18px 0;padding:18px;background:#f3f8f5;border:1px solid #dce9e1;border-radius:13px;line-height:1.65;color:#34463b;font-size:14px}
        .detailinfo h2{font-size:17px;color:#173f2d;margin:0 0 12px}
        .detailinfo p{margin:0 0 12px}.detailinfo p:last-child{margin-bottom:0}
        .detailnote,.detaildisclaimer{font-size:12px;color:#66736c;line-height:1.55}
        .detaildisclaimer{margin:0 2px 14px}
        .detailback{display:inline-block;color:#174633;font-size:12px;font-weight:700;text-decoration:none;padding:9px 0}
        @media(max-width:560px){.productpage{padding:13px 12px 28px}.detailcard{padding:13px;border-radius:14px}.detailhero{grid-template-columns:1fr;gap:14px}.detailimage{max-height:280px}.detailheading h1{font-size:21px}.detailinfo{padding:14px;font-size:13px}}
      `}</style>
    </>
  );
}
