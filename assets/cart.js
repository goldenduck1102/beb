/* V3 consultation basket: shared across home/products, persisted by SKU. */
(() => {
  'use strict';
  const key = 'goldenduck:beb-demo:cart:v1';
  const products = new Map((window.BEB_PRODUCTS || []).map(p => [p.sku, p]));
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = value => new Intl.NumberFormat('vi-VN', {style:'currency',currency:'VND'}).format(value);
  const icon = name => `<svg class="bnb-icon" viewBox="0 0 24 24" aria-hidden="true"><use href="/beb/assets/icons/sprite.svg#${name}"/></svg>`;
  const parse = raw => {
    try { const rows=JSON.parse(raw); if (!Array.isArray(rows)) return []; const seen=new Set(); return rows.map(r=>({...r,sku:r.sku||[...products.values()].find(p=>p.id===r.id)?.sku})).filter(r=>r && products.has(r.sku) && Number.isInteger(r.quantity) && r.quantity>0 && r.quantity<=99 && !seen.has(r.sku) && seen.add(r.sku)).slice(0,50).map(({sku,quantity})=>({sku,quantity})); } catch {return [];}
  };
  let lines=[]; try {lines=parse(localStorage.getItem(key));} catch {}
  let storageOK=true, pending=false;
  const cart=document.createElement('dialog');cart.className='basket';cart.setAttribute('aria-labelledby','basket-title');
  cart.innerHTML=`<div class="basket__inner"><header class="basket__header"><h2 id="basket-title">Giỏ hàng</h2><button type="button" data-cart-close aria-label="Đóng giỏ hàng">${icon('close')}</button></header><div class="basket__body"><details class="basket__order"><summary aria-label="Mở hoặc thu gọn danh sách sản phẩm"><span class="basket__preview-row"><span data-cart-preview class="basket__preview"></span>${icon('chevron-down')}</span><span class="basket__order-action">Xem chi tiết sản phẩm</span></summary><div data-cart-lines></div></details><div data-cart-empty class="basket__empty">Giỏ hàng chưa có sản phẩm.<a class="btn btn--solid" href="/beb/products/">Khám phá sản phẩm</a></div><p data-cart-storage role="status"></p><form id="basket-form" data-cart-form class="basket__form"><h3>Thông tin liên hệ</h3><label>Họ và tên *<input name="name" placeholder="Nhập họ và tên" autocomplete="name" required minlength="2" maxlength="120"></label><label>Số điện thoại *<input name="phone" placeholder="Nhập số điện thoại" type="tel" autocomplete="tel" required minlength="9" maxlength="30"></label><label>Email *<input name="email" placeholder="Nhập email" type="email" autocomplete="email" required maxlength="254"></label><p>Bản demo: thông tin chỉ dùng để thử giao diện, không gửi cho nanoHome.</p></form><p data-cart-status role="status"></p></div><footer class="basket__footer"><details class="offers"><summary><span>Áp dụng ưu đãi</span><span class="offersSelection"><span class="offerCode">Mã ưu đãi 15%</span><svg class="bnb-icon offersChevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></span></summary><div class="offerChoices"><button type="button" class="selectedOffer" data-offer-selected><span class="couponPercent">15%</span><span><strong>Giảm 15%</strong><span>Ưu đãi được áp dụng vào giá trong giỏ hàng.</span><small>✓ Đang áp dụng</small></span></button><button type="button" class="lockedOffer" data-offer-register><span class="couponPercent">20%</span><span><strong>Giảm 20%</strong><small>Cần đăng ký</small><span class="offerDescription">Điền form để đăng ký nhận ưu đãi 20%.</span><span class="offerRegister">Đăng ký tư vấn ưu đãi 20%</span></span></button></div></details><div class="checkoutRow"><div class="footerPrice"><div data-original class="footerOriginal"></div><strong data-footer-total></strong><small data-savings class="footerSavings"></small></div><button class="btn btn--solid" form="basket-form" type="submit"><span>GỬI YÊU CẦU<br>TƯ VẤN</span></button></div></footer></div>`;
  document.body.append(cart);
  const offerShade = document.createElement('button');
  offerShade.className = 'basket__offer-shade'; offerShade.type = 'button'; offerShade.hidden = true;
  offerShade.setAttribute('aria-label', 'Đóng lựa chọn ưu đãi');
  cart.append(offerShade);
  const offers = cart.querySelector('.offers');
  offers.addEventListener('toggle', () => { offerShade.hidden = !offers.open; });
  offerShade.onclick = () => { offers.open = false; };
  cart.addEventListener('close', () => { offers.open = false; });
  const form=cart.querySelector('form'),status=cart.querySelector('[data-cart-status]');
  const activeSale=()=>Date.now()>=Date.parse('2026-11-04T09:00:00+07:00')&&Date.now()<Date.parse('2026-12-04T00:00:00+07:00');
  const price=p=>p.price ? Math.round(p.price*(activeSale()?.85:1)):null;
  function syncAddedButtons() {
    document.querySelectorAll('[data-card-add], [data-cart-add]').forEach(button => {
      const sku = button.dataset.cardAdd || button.closest('dialog.quick')?._product?.sku;
      const added = lines.some(row => row.sku === sku);
      button.classList.toggle('is-added', added);
      button.setAttribute('aria-label', added ? 'Đã có trong giỏ — thêm một sản phẩm' : 'Thêm vào giỏ');
    });
  }
  document.addEventListener('beb:rendered', syncAddedButtons);
  function render() {
    syncAddedButtons();
    const count=lines.reduce((n,r)=>n+r.quantity,0);
    document.querySelectorAll('[data-cart-count]').forEach(e=>e.textContent=count||'');
    document.querySelectorAll('[data-cart-open]').forEach(e=>e.setAttribute('aria-label',`Giỏ hàng (${count})`));
    cart.querySelector('[data-cart-lines]').innerHTML=lines.length ? lines.map(row=>{const p=products.get(row.sku);return `<article class="basket__line"><img src="${esc(/^https?:/.test(p.img)?p.img:'/beb/shared/'+p.img)}" alt="${esc(p.title)}"><div><div class="basket__line-heading"><p class="basket__brand">${esc(p.brand)}</p><button type="button" data-remove="${esc(p.sku)}">Xóa</button></div><h3>${esc(p.title)}</h3><p>${activeSale()&&p.price?`<del>${money(p.price)}</del> `:''}<strong>${price(p)?money(price(p)):'Liên hệ báo giá'}</strong></p><div class="basket__quantity"><button type="button" data-quantity="-1" data-sku="${esc(p.sku)}" aria-label="Giảm số lượng ${esc(p.title)}" >−</button><span aria-label="Số lượng">${row.quantity}</span><button type="button" data-quantity="1" data-sku="${esc(p.sku)}" aria-label="Tăng số lượng ${esc(p.title)}" ${row.quantity===99?'disabled':''}>+</button></div></div></article>`;}).join(''):'<p class="basket__empty">Giỏ hàng chưa có sản phẩm. Chọn một thiết kế và bấm “Thêm vào giỏ”.</p>';
    const known=lines.every(r=>price(products.get(r.sku))!==null);
    cart.querySelector('#basket-title').textContent=`Giỏ hàng (${count})`;
    cart.querySelector('.basket__order').hidden=!lines.length;
    cart.querySelector('[data-cart-empty]').hidden=!!lines.length;
    cart.querySelector('.basket__footer').hidden=!lines.length;
    cart.querySelector('[data-footer-total]').textContent=money(lines.reduce((sum,r)=>sum+(price(products.get(r.sku))||0)*r.quantity,0));
    cart.querySelector('[data-cart-preview]').innerHTML=lines.slice(0,4).map(row=>{const p=products.get(row.sku);return `<span><img src="${esc(/^https?:/.test(p.img)?p.img:'/beb/shared/'+p.img)}" alt="${esc(p.title)}"><small>×${row.quantity}</small></span>`;}).join('')+(lines.length>4?`<b>+${lines.length-4}</b>`:'');
    const original=lines.reduce((sum,r)=>sum+(products.get(r.sku).price||0)*r.quantity,0);
    cart.querySelector('[data-original]').innerHTML=activeSale()?`<del>${money(original)}</del><span class="discountTag">Giảm 15%</span>`:'';
    cart.querySelector('[data-savings]').textContent=activeSale()?`Tiết kiệm ${money(Math.round(original*.15))}`:'';
    cart.querySelector('.offers').hidden=!activeSale();
    form.hidden=!lines.length;
    cart.querySelector('[data-cart-storage]').textContent=storageOK?'':'Trình duyệt chưa lưu được giỏ. Sản phẩm vẫn được giữ trong lần mở trang này.';
  }
  function save(){try{localStorage.setItem(key,JSON.stringify(lines.map(r=>({id:products.get(r.sku).id,quantity:r.quantity}))));storageOK=true;}catch{storageOK=false;}render();}
  function openCart(){document.querySelector('dialog.quick[open]')?.close();status.textContent='';render();cart.querySelector('.basket__order').open=false;if(location.pathname.replace(/\/$/,'').replace(/\/$/,'')!=='/beb/cart')history.pushState({bebBasketOverlay:true,returnURL:location.pathname.replace(/\/$/,'')+location.search+location.hash},'', '/beb/cart');if(!cart.open)cart.showModal();cart.querySelector('[data-cart-close]').focus({preventScroll:true});}
  document.addEventListener('click',event=>{if(event.target.closest('[data-cart-open]'))openCart();});
  cart.addEventListener('close',()=>{if(location.pathname.replace(/\/$/,'').replace(/\/$/,'')==='/beb/cart'){if(history.state?.bebBasketOverlay)history.back();else location.replace('/beb/products/');}});
  window.addEventListener('popstate',()=>{if(location.pathname.replace(/\/$/,'').replace(/\/$/,'')==='/beb/cart'){if(!cart.open)cart.showModal();}else if(location.pathname.replace(/\/$/,'')!=='/beb/offer'&&cart.open)cart.close();});
  window.addEventListener('beb:cart-add',event=>{
    const sku=event.detail?.sku;if(!products.has(sku))return;
    const row=lines.find(r=>r.sku===sku);let message;
    if((row&&row.quantity>=99)||(!row&&lines.length>=50)){message='Giỏ đã đạt giới hạn. Anh/chị vui lòng kiểm tra giỏ hàng.';}else{if(row)row.quantity++;else lines.push({sku,quantity:1});save();message='Đã thêm vào giỏ hàng.';}
    document.querySelector('.basket-toast')?.remove();
    const toast=document.createElement('div');toast.className='basket-toast';toast.setAttribute('role','status');toast.innerHTML=`<p>${esc(message)} <strong>${esc(products.get(sku).title)}</strong></p><button data-cart-open>Xem giỏ hàng</button><button data-toast-close aria-label="Đóng thông báo">×</button>`;document.body.append(toast);toast.querySelector('[data-toast-close]').onclick=()=>toast.remove();toast.querySelector('[data-cart-open]').addEventListener('click',()=>toast.remove());setTimeout(()=>toast.remove(),6000);
    const feedback=document.querySelector('[data-add-feedback]');if(feedback)feedback.textContent=message;
  });
  cart.addEventListener('click',event=>{
    if(pending)return;
    if(event.target===cart||event.target.closest('[data-cart-close]'))cart.close();
    const button=event.target.closest('[data-quantity], [data-remove]');if(!button)return;
    const sku=button.dataset.sku||button.dataset.remove;
    const selector=button.hasAttribute('data-remove')?null:`[data-sku="${CSS.escape(sku)}"][data-quantity="${button.dataset.quantity}"]`;
    if(button.hasAttribute('data-remove'))lines=lines.filter(r=>r.sku!==sku);else{const row=lines.find(r=>r.sku===sku);if(row)row.quantity=Math.max(0,Math.min(99,row.quantity+Number(button.dataset.quantity)));}
    lines=lines.filter(r=>r.quantity>0);save();(selector&&cart.querySelector(selector)||cart.querySelector('[data-cart-close]')).focus({preventScroll:true});
  });
  cart.addEventListener('cancel',event=>{if(pending)event.preventDefault();});
  form.elements.phone.addEventListener('input',()=>form.elements.phone.setCustomValidity(''));
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(pending||!lines.length||!form.reportValidity())return;
    const phone=form.elements.phone;phone.setCustomValidity(/^[+\d\s().-]+$/.test(phone.value)&&phone.value.replace(/\D/g,'').length>=9&&phone.value.replace(/\D/g,'').length<=15?'':'Vui lòng nhập số điện thoại hợp lệ (9–15 chữ số).');if(!form.reportValidity())return;
    status.textContent='Mô phỏng thành công. Yêu cầu không được gửi; giỏ demo được giữ lại.';
    form.reset();
  });
  window.addEventListener('storage',event=>{if(event.key===key&&!pending){lines=parse(event.newValue);render();}});
  function goContact(behavior='smooth'){
    const title=document.querySelector('#contact-title');if(!title)return;
    const top=title.getBoundingClientRect().top+scrollY-document.querySelector('.header').getBoundingClientRect().height-20;
    window.scrollTo({top,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':behavior});
  }
  document.addEventListener('click',event=>{const link=event.target.closest('a[href="#contact"]');if(!link)return;event.preventDefault();history.replaceState(null,'','#contact');goContact();});
  if(location.hash==='#contact')window.addEventListener('load',()=>goContact('instant'),{once:true});
  const offer=document.createElement('dialog');offer.className='basket';offer.setAttribute('aria-label','Đăng ký tư vấn ưu đãi 20%');
  offer.innerHTML=`<div class="basket__inner"><header class="basket__header"><h2>Đăng ký tư vấn ưu đãi 20%</h2><button type="button" data-offer-close aria-label="Đóng đăng ký ưu đãi">${icon('close')}</button></header><div class="basket__body"><form class="basket__form"><label>Họ và tên *<input name="name" required minlength="2" maxlength="120" autocomplete="name"></label><label>Số điện thoại *<input name="phone" type="tel" required minlength="9" maxlength="20" autocomplete="tel"></label><label>Email *<input name="email" type="email" required maxlength="254" autocomplete="email"></label><button class="btn btn--solid" type="submit">Đăng ký tư vấn ưu đãi 20%</button><p role="status"></p></form></div></div>`;document.body.append(offer);
  let offerBusy=false;
  cart.addEventListener('click',event=>{if(pending)return;if(event.target.closest('[data-offer-selected]'))cart.querySelector('.offers').open=false;if(event.target.closest('[data-offer-register]')){cart.querySelector('.offers').open=false;history.pushState({bebOfferOverlay:true},'','/beb/offer');offer.showModal();}});
  offer.querySelector('[data-offer-close]').onclick=()=>{if(!offerBusy)offer.close();};
  offer.addEventListener('cancel',e=>{if(offerBusy)e.preventDefault();});
  offer.addEventListener('close',()=>{if(location.pathname.replace(/\/$/,'')==='/beb/offer'){if(history.state?.bebOfferOverlay)history.back();else location.replace('/beb/products/');}});
  window.addEventListener('popstate',()=>{if(location.pathname.replace(/\/$/,'')!=='/beb/offer'&&offer.open)offer.close();if(location.pathname.replace(/\/$/,'')==='/beb/offer'&&!offer.open)offer.showModal();});
  offer.querySelector('form').onsubmit=event=>{event.preventDefault();const f=event.currentTarget;if(!f.reportValidity())return;f.querySelector('[role=status]').textContent='Mô phỏng thành công. Không đăng ký thật và không lưu thông tin.';f.reset();};
  cart.addEventListener('keydown',e=>{if(e.key==='Escape'&&cart.querySelector('.offers').open){e.preventDefault();e.stopPropagation();cart.querySelector('.offers').open=false;}});

  render();
  if(location.pathname.replace(/\/$/,'').replace(/\/$/,'')==='/beb/cart')openCart();
  if(location.pathname.replace(/\/$/,'').replace(/\/$/,'')==='/beb/offer'){history.replaceState(null,'','/beb/offer');offer.showModal();}
})();
