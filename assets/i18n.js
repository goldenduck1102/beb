/* Display-only VI / EN / KO localization; no catalog mutation or network requests. */
(() => {
  'use strict';
  const supported = ['vi', 'en', 'ko'];
  const key = location.pathname.startsWith('/beb') ? 'goldenduck:beb-demo:language' : 'nanohome:beb-preview:language';
  let saved; try { saved = localStorage.getItem(key); } catch {}
  const requested = new URLSearchParams(location.search).get('lang');
  const lang = supported.includes(requested) ? requested : supported.includes(saved) ? saved : 'vi';
  try { localStorage.setItem(key, lang); } catch {}
  document.documentElement.lang = lang;
  const index = lang === 'ko' ? 1 : 0;
  const dictionary = window.BEB_TRANSLATIONS || {};
  const choose = (en, ko) => lang === 'ko' ? ko : en;
  function t(value) {
    if (lang === 'vi' || !value) return value;
    const text = String(value), clean = text.trim();
    let result = dictionary[clean]?.[index];
    if (result === undefined) {
      const rules = [
        [/^Giỏ hàng \((\d+)\)$/, n => choose(`Basket (${n})`, `장바구니 (${n})`)],
        [/^Xem thêm (\d+) sản phẩm$/, n => choose(`View ${n} more products`, `제품 ${n}개 더 보기`)],
        [/^Đang hiển thị (\d+) \/ (\d+) thiết kế$/, (n,total) => choose(`Showing ${n} of ${total} designs`, `전체 ${total}개 중 ${n}개 표시`)],
        [/^Nhóm (\d+) \/ (\d+)$/, (n,total) => choose(`Group ${n} of ${total}`, `그룹 ${n} / ${total}`)],
        [/^Ảnh (\d+)$/, n => choose(`Image ${n}`, `이미지 ${n}`)],
        [/^Tiết kiệm (.+)$/, price => choose(`You save ${price}`, `${price} 할인`)],
        [/^Giảm số lượng (.+)$/, title => choose(`Decrease quantity: ${t(title)}`, `수량 줄이기: ${t(title)}`)],
        [/^Tăng số lượng (.+)$/, title => choose(`Increase quantity: ${t(title)}`, `수량 늘리기: ${t(title)}`)],
        [/^Bỏ bộ lọc (.+)$/, label => choose(`Remove filter: ${t(label)}`, `필터 해제: ${t(label)}`)],
        [/^Giá minh hoạ với ưu đãi 15% cho đơn hàng đầu tiên\. Từ đơn thứ hai: (.+)$/, price => choose(`Price shown includes 15% off your first order. From your second order: ${price}`, `표시 가격은 첫 주문 15% 할인이 적용된 가격입니다. 두 번째 주문부터: ${price}`)],
        [/^Tôi muốn được tư vấn về (.+) \(mã (.+)\)\.$/, (title,sku) => choose(`I would like advice on ${t(title)} (SKU ${sku}).`, `${t(title)} (제품 코드 ${sku})에 대해 상담받고 싶습니다.`)],
        [/^(.+) · (Sofa|Ghế thư giãn|Ghế|Bàn|Tủ & kệ|Giường|Thảm|Gương|Thiết kế khác)$/, (brand,category) => `${brand} · ${t(category)}`]
      ];
      for (const [pattern, render] of rules) { const match = clean.match(pattern); if (match) { result = render(...match.slice(1)); break; } }
    }
    return result === undefined ? text : text.replace(clean, result);
  }
  window.BEB_I18N = {lang, t};
  const skip = 'script,style,[contenteditable],.language-switch';
  const attributes = ['aria-label', 'placeholder', 'title', 'alt'];
  function translateNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.parentElement?.closest(skip + ",textarea")) return;
      const translated = t(node.nodeValue); if (translated !== node.nodeValue) node.nodeValue = translated;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE || node.matches(skip)) return;
    attributes.forEach(attr => { if (node.hasAttribute(attr)) { const value = node.getAttribute(attr), translated = t(value); if (translated !== value) node.setAttribute(attr, translated); } });
    if (node.matches('meta[name="description"]')) { const value = node.content, translated = t(value); if (value !== translated) node.content = translated; }
    node.childNodes.forEach(translateNode);
  }
  const nav = document.querySelector('.header__nav');
  if (nav) {
    const control = document.createElement('div'); control.className = 'language-switch';
    control.innerHTML = `<button type="button" class="language-switch__trigger" aria-label="Language / Ngôn ngữ / 언어: ${lang.toUpperCase()}" aria-haspopup="menu" aria-expanded="false" aria-controls="language-menu"><span>${lang.toUpperCase()}</span><svg class="language-switch__chevron" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></button><div id="language-menu" class="language-switch__menu" role="menu" aria-label="Language / Ngôn ngữ / 언어" hidden>${supported.map(code => `<button type="button" role="menuitemradio" aria-checked="${code === lang}" data-language="${code}" tabindex="-1">${code.toUpperCase()}<span aria-hidden="true">${code === lang ? '✓' : ''}</span></button>`).join('')}</div>`;
    const trigger = control.querySelector('.language-switch__trigger');
    const menu = control.querySelector('.language-switch__menu');
    const items = [...menu.querySelectorAll('[data-language]')];
    function closeMenu(restoreFocus = false) {
      menu.hidden = true; trigger.setAttribute('aria-expanded', 'false');
      if (restoreFocus) trigger.focus();
    }
    function openMenu(index = supported.indexOf(lang)) {
      menu.hidden = false; trigger.setAttribute('aria-expanded', 'true'); items[index].focus();
    }
    trigger.addEventListener('click', () => menu.hidden ? openMenu() : closeMenu());
    control.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); closeMenu(true); }
      else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const current = items.indexOf(document.activeElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : current < 0 ? (event.key === 'ArrowUp' ? items.length - 1 : 0) : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        openMenu(next);
      } else if (event.key === 'Tab') closeMenu();
    });
    control.addEventListener('focusout', event => { if (!control.contains(event.relatedTarget)) closeMenu(); });
    document.addEventListener('pointerdown', event => { if (!control.contains(event.target)) closeMenu(); });
    menu.addEventListener('click', event => {
      const item = event.target.closest('[data-language]'); if (!item) return;
      const code = item.dataset.language;
      if (code === lang) { closeMenu(true); return; }
      const url = new URL(location.href); url.searchParams.set('lang', code);
      try { localStorage.setItem(key, code); } catch {}
      location.assign(url.href);
    });
    nav.append(control);
  }

  if (lang !== 'vi') {
    document.addEventListener('invalid', event => {
      const field = event.target, validity = field.validity;
      if (!validity || validity.customError) return;
      if (validity.valueMissing) field.setCustomValidity(choose('Please complete this field.', '이 항목을 입력해 주세요.'));
      else if (validity.typeMismatch) field.setCustomValidity(choose('Please enter a valid email address.', '올바른 이메일 주소를 입력해 주세요.'));
      else if (validity.tooShort) field.setCustomValidity(choose(`Please enter at least ${field.minLength} characters.`, `${field.minLength}자 이상 입력해 주세요.`));
    }, true);
    document.addEventListener('input', event => { if (event.target.setCustomValidity) event.target.setCustomValidity(''); });
  }
  translateNode(document.documentElement);
  // Observe only presentation changes made by the existing cart/catalog code.
  // Original input values, product records, IDs and API payloads are never rewritten.
  new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'childList') record.addedNodes.forEach(translateNode);
      else if (record.type === 'characterData') translateNode(record.target);
      else { const value = record.target.getAttribute(record.attributeName), translated = t(value); if (value !== translated) record.target.setAttribute(record.attributeName, translated); }
    }
  }).observe(document.documentElement, {subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attributes});
})();
