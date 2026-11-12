/* Hành vi dùng chung cho bản thử V2 và V3 của beb.nanohome.vn.
   Mỗi phiên bản chỉ khác HTML + CSS; mọi khối được gắn bằng thuộc tính data-*. */
(() => {
  "use strict";
  const icon = (name) => `<svg class="bnb-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="/beb/assets/icons/sprite.svg?v=20261113-2#${name}"/></svg>`;
  const SHARED = "/beb/shared/";
  const SALE = { start: Date.parse("2026-11-04T09:00:00+07:00"), end: Date.parse("2026-12-04T00:00:00+07:00") };
  const CATEGORIES = { sofas: "Sofa", lounges: "Ghế thư giãn", chairs: "Ghế", tables: "Bàn", cabinets: "Tủ & kệ", beds: "Giường", rugs: "Thảm", mirrors: "Gương", others: "Thiết kế khác" };
  const products = window.BEB_PRODUCTS || [];
  const bySku = new Map(products.map((p) => [p.sku, p]));
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const money = (value) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
  const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const saleActive = () => { const now = Date.now(); return now >= SALE.start && now < SALE.end; };
  const src = (path) => (/^https?:/.test(path) ? path : SHARED + path);

  /* ---------- Giá: minh hoạ ưu đãi 15% đơn đầu tiên, giống v1 ---------- */
  function priceHtml(product) {
    if (!product.price) return `<p class="price price--request">Liên hệ báo giá</p>`;
    if (!saleActive()) return `<p class="price"><span class="price__now">${money(product.price)}</span></p>`;
    return `<p class="price"><del class="price__was">${money(product.price)}</del><span class="price__now">${money(Math.round(product.price * 0.85))}</span><span class="price__tag">−15%</span></p>`;
  }

  document.addEventListener("click", event => {
    const add = event.target.closest("[data-card-add]");
    if (add) window.dispatchEvent(new CustomEvent("beb:cart-add", { detail: { sku: add.dataset.cardAdd } }));
    const consult = event.target.closest("[data-card-consult]");
    if (consult) {
      const product = (window.BEB_PRODUCTS || []).find(p => p.sku === consult.dataset.cardConsult);
      const message = document.querySelector("#contact textarea");
      if (product && message) { message.value = `Tôi muốn được tư vấn về ${product.title} (mã ${product.sku}).`; message.dispatchEvent(new Event("input", { bubbles: true })); }
    }
  });

  // Dimensions gently adjust optical scale within a category, never to literal room scale.
  function productSize(product) {
    const dimensions = product.specs.find(s => /kích thước/i.test(s.label))?.value || "";
    const values = /cm/i.test(dimensions) ? (dimensions.match(/\d+(?:[.,]\d+)?/g) || []).map(n => Number(n.replace(",", "."))).filter(n => n > 0 && n < 1000) : [];
    const reference = { sofas: 300, lounges: 110, chairs: 85, tables: 180, cabinets: 200, beds: 220, rugs: 300, mirrors: 180 }[product.cat];
    if (!values.length || !reference) return 1;
    return Math.max(.84, Math.min(1, .9 + .1 * Math.log2(Math.max(...values) / reference))).toFixed(3);
  }

  function cardHtml(product, index, catalog = false) {
    return `<article class="card" data-cat="${product.cat}" style="--product-size:${productSize(product)}">
      <div class="card__link"><a class="card__preview" href="#sp-${product.sku}" data-sku="${product.sku}">
        <div class="card__heading"><p class="card__brand">${escapeHtml(product.brand)}</p>
          <div class="card__meta"><span>${escapeHtml(CATEGORIES[product.cat] || "Thiết kế khác")}</span><span>${escapeHtml(product.sku)}</span></div>
        </div>
        <div class="card__media"><img src="${src(product.cardImg || product.img)}" alt="${escapeHtml(product.name)}" loading="lazy" decoding="async" width="1280" height="1280"></div>
      </a>
        <div class="card__body">
          <h3 class="card__title"><a href="#sp-${product.sku}" data-sku="${product.sku}">${escapeHtml(product.title)}</a></h3>
          ${priceHtml(product)}
          <div class="card__actions"><button type="button" class="btn btn--solid" data-card-add="${product.sku}">${icon("cart")}Thêm vào giỏ</button><a href="#contact" class="btn" data-card-consult="${product.sku}">Nhận tư vấn</a></div>
        </div>
      </div>
    </article>`;
  }

  /* ---------- Danh sách sản phẩm: carousel (trang chủ) hoặc lưới 12 + Xem thêm ---------- */
  function initProductLists() {
    $$("[data-products]").forEach((list) => {
      const kind = list.dataset.products;
      const scope = list.closest("[data-product-scope]") || list.parentElement;
      const pageSize = Number(list.dataset.pageSize) || 0;
      const more = $("[data-more]", scope);
      const count = $("[data-count]", scope);
      const filters = $("[data-filters]", scope);
      const sort = $("[data-sort]", scope);
      const search = $("[data-search]", scope);
      const brand = $("[data-brand]", scope);
      const categorySelect = $("[data-category]", scope);
      const empty = $("[data-empty]", scope);
      const normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().trim();
      const base = kind === "all" ? products : products.filter((p) => p.tag === kind);
      let category = "all";
      let appliedBrand = "all", appliedSort = "featured";
      const mobileFilters = matchMedia("(max-width: 680px)");
      let shown = pageSize || base.length;

      function render() {
        const query = normalize(search?.value || "");
        const items = base.filter((p) => (category === "all" || p.cat === category)
          && (!brand || appliedBrand === "all" || p.brandSlug === appliedBrand)
          && (!query || normalize(`${p.title} ${p.name} ${p.sku}`).includes(query)));
        if (empty) empty.hidden = items.length > 0;
        if (appliedSort.startsWith("price-")) items.sort((a, b) => {
          const aKnown = Number.isFinite(a.price) && a.price > 0;
          const bKnown = Number.isFinite(b.price) && b.price > 0;
          if (!aKnown || !bKnown) return Number(bKnown) - Number(aKnown);
          return appliedSort === "price-asc" ? a.price - b.price : b.price - a.price;
        });
        const visible = items.slice(0, shown);
        list.innerHTML = visible.map((product, index) => cardHtml(product, index, kind === "all")).join("");
        if (more) {
          const rest = items.length - visible.length;
          more.hidden = rest <= 0;
          const label = $("[data-more-label]", more) || more;
          label.textContent = rest > 0 ? `Xem thêm ${Math.min(pageSize, rest)} sản phẩm` : "";
        }
        if (count) count.textContent = `Đang hiển thị ${visible.length} / ${items.length} thiết kế`;
        list.dispatchEvent(new CustomEvent("beb:rendered", { bubbles: true }));
      }

      if (filters) {
        const available = Object.keys(CATEGORIES).filter((slug) => base.some((p) => p.cat === slug));
        filters.innerHTML = [`<button type="button" class="chip" data-cat="all" aria-pressed="true">Tất cả <span>${base.length}</span></button>`]
          .concat(available.map((slug) => `<button type="button" class="chip" data-cat="${slug}" aria-pressed="false">${CATEGORIES[slug]} <span>${base.filter((p) => p.cat === slug).length}</span></button>`)).join("");
        filters.addEventListener("click", (event) => {
          const chip = event.target.closest("[data-cat]");
          if (!chip) return;
          category = chip.dataset.cat;
          shown = pageSize || base.length;
          $$("[data-cat]", filters).forEach((item) => item.setAttribute("aria-pressed", String(item === chip)));
          render();
        });
      }
      const resetAndRender = () => {
        const top = window.scrollY;
        shown = pageSize || base.length;
        render();
        window.scrollTo({ top, behavior: "instant" });
      };
      if (brand) {
        const brands = [...new Map(base.map((p) => [p.brandSlug, p.brand])).entries()];
        brand.innerHTML += brands.map(([slug, name]) => `<option value="${escapeHtml(slug)}">${escapeHtml(name)}</option>`).join("");
        brand.addEventListener("change", () => { if (!mobileFilters.matches) { appliedBrand = brand.value; resetAndRender(); } });
      }
      if (categorySelect) {
        categorySelect.innerHTML += Object.entries(CATEGORIES).filter(([slug]) => base.some((p) => p.cat === slug)).map(([slug, name]) => `<option value="${slug}">${name}</option>`).join("");
        categorySelect.addEventListener("change", () => { if (!mobileFilters.matches) { category = categorySelect.value; resetAndRender(); } });
      }
      search?.addEventListener("input", resetAndRender);
      const toggle = $("[data-sort-toggle]", scope);
      const panel = $("#sort-panel", scope);
      let filterDialog;
      const closeSort = () => { if (filterDialog?.open) filterDialog.close(); if (panel) panel.hidden = true; toggle?.setAttribute("aria-expanded", "false"); };
      toggle?.addEventListener("click", () => {
        brand.value = appliedBrand; categorySelect.value = category; sort.value = appliedSort;
        [brand, categorySelect, sort].forEach(select => select._sync?.());
        panel.hidden = false;
        filterDialog.showModal();
        toggle.setAttribute("aria-expanded", "true");
      });
      sort?.addEventListener("change", () => { if (!mobileFilters.matches) { appliedSort = sort.value; resetAndRender(); } });
      more?.addEventListener("click", () => {
        const before = list.children.length;
        shown += pageSize;
        render();
        list.children[before]?.querySelector("a")?.focus({ preventScroll: true });
      });
      [brand, categorySelect, sort].filter(Boolean).forEach(enhanceSelect);
      if (brand && categorySelect && panel) {
        const mobile = mobileFilters;
        const controls = [brand, categorySelect].map(select => select.closest(".catalog-control"));
        const tools = toggle.closest(".catalog-tools");
        const sortHome = toggle.parentElement;
        filterDialog = document.createElement("dialog");
        filterDialog.className = "filter-modal";
        filterDialog.setAttribute("aria-label", "Bộ lọc sản phẩm");
        filterDialog.innerHTML = `<header><h2>Bộ lọc sản phẩm</h2><button type="button" aria-label="Đóng bộ lọc">×</button></header><footer><button type="button" class="btn btn--solid">Áp dụng bộ lọc</button></footer>`;
        document.body.append(filterDialog);
        filterDialog.querySelector("header button").onclick = closeSort;
        filterDialog.addEventListener("click", event => { if(event.target === filterDialog) closeSort(); });
        filterDialog.addEventListener("close", () => toggle.setAttribute("aria-expanded", "false"));
        const chips = document.createElement("div");
        chips.className = "catalog-applied"; chips.hidden = true;
        tools.after(chips);
        const syncChips = () => {
          chips.replaceChildren();
          [[brand, appliedBrand, "all"], [categorySelect, category, "all"], [sort, appliedSort, "featured"]].forEach(([select, value, defaultValue]) => {
            if(value === defaultValue) return;
            const chip = document.createElement("button"); chip.type = "button";
            const label = [...select.options].find(option => option.value === value).textContent;
            chip.textContent = `${label} ×`; chip.setAttribute("aria-label", `Bỏ bộ lọc ${label}`);
            chip.onclick = () => {
              select.value = defaultValue; select._sync?.();
              if(select === brand) appliedBrand = defaultValue;
              if(select === categorySelect) category = defaultValue;
              if(select === sort) appliedSort = defaultValue;
              resetAndRender(); syncChips();
            };
            chips.append(chip);
          });
          chips.hidden = !chips.children.length;
        };
        filterDialog.querySelector("footer button").onclick = () => {
          appliedBrand = brand.value; category = categorySelect.value; appliedSort = sort.value;
          closeSort(); resetAndRender(); syncChips();
        };
        [brand, categorySelect, sort].forEach(select => select.addEventListener("change", () => { if(!mobile.matches) syncChips(); }));
        const relocateFilters = () => {
          closeSort();
          controls.forEach(control => mobile.matches ? panel.insertBefore(control, sort.closest(".catalog-control")) : tools.insertBefore(control, sortHome));
          if(mobile.matches) filterDialog.insertBefore(panel, filterDialog.querySelector("footer"));
          else sortHome.append(panel);
          [brand, categorySelect, sort].forEach((select, i) => { select.value = [appliedBrand, category, appliedSort][i]; select._sync?.(); });
          toggle.setAttribute("aria-label", "Lọc và sắp xếp sản phẩm");
        };
        relocateFilters(); mobile.addEventListener("change", relocateFilters);
      }

      render();
    });
  }

  // Anchored dropdowns avoid platform popups shifting around the selected option.
  function enhanceSelect(select) {
    const label = select.closest("label");
    const caption = label.querySelector("span")?.textContent || "Sắp xếp";
    const wrapper = document.createElement("div");
    wrapper.className = "catalog-dropdown";
    const id = `catalog-options-${select.hasAttribute("data-brand") ? "brand" : select.hasAttribute("data-category") ? "category" : "sort"}`;
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "catalog-dropdown__trigger";
    trigger.setAttribute("aria-label", caption);
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", id);
    const menu = document.createElement("div");
    menu.className = "catalog-dropdown__menu";
    menu.id = id;
    menu.setAttribute("role", "listbox");
    menu.setAttribute("aria-label", caption);
    menu.hidden = true;
    select.after(wrapper);
    wrapper.append(trigger, menu);
    select.hidden = true;
    select._trigger = trigger;
    // A label must not forward option clicks to another control.
    const group = document.createElement("div");
    group.className = label.className;
    label.replaceWith(group);
    group.append(...label.childNodes);
    const sync = () => {
      trigger.innerHTML = `<span>${escapeHtml(select.selectedOptions[0].textContent)}</span>${icon("chevron-down")}`;
      [...menu.children].forEach((option, index) => option.setAttribute("aria-selected", String(select.options[index].selected)));
    };
    select._sync = sync;
    let optionDialog;
    const close = () => { if(optionDialog?.open) optionDialog.close(); menu.hidden = true; trigger.setAttribute("aria-expanded", "false"); };
    const open = () => {
      if (matchMedia("(max-width: 680px)").matches) {
        if (!optionDialog) {
          optionDialog = document.createElement("dialog"); optionDialog.className = "filter-modal filter-options";
          optionDialog.setAttribute("aria-label", caption);
          const head = document.createElement("header");
          const title = document.createElement("h2"); title.textContent = caption;
          const back = document.createElement("button"); back.type = "button"; back.textContent = "×"; back.setAttribute("aria-label", "Đóng lựa chọn"); back.onclick = close;
          head.append(title, back); optionDialog.append(head); document.body.append(optionDialog);
          optionDialog.addEventListener("click", event => { if(event.target === optionDialog) close(); });
          optionDialog.addEventListener("close", () => { wrapper.append(menu); menu.hidden = true; trigger.setAttribute("aria-expanded", "false"); });
        }
        optionDialog.append(menu); optionDialog.showModal();
      }
      menu.hidden = false; trigger.setAttribute("aria-expanded", "true");
      menu.children[select.selectedIndex]?.focus({ preventScroll: true });
    };
    [...select.options].forEach((option) => {
      const button = document.createElement("button");
      button.type = "button"; button.tabIndex = -1;
      button.setAttribute("role", "option"); button.textContent = option.textContent;
      button.addEventListener("click", () => {
        select.value = option.value; sync(); close();
        trigger.focus({ preventScroll: true });
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });
      menu.append(button);
    });
    trigger.addEventListener("click", () => menu.hidden ? open() : close());
    trigger.addEventListener("keydown", (event) => {
      if (["ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); open(); }
    });
    menu.addEventListener("keydown", (event) => {
      const options = [...menu.children]; const index = options.indexOf(document.activeElement);
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); trigger.focus({ preventScroll: true }); }
      if (event.key === "Tab") close();
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
        options[next].focus({ preventScroll: true });
        options[next].scrollIntoView({ block: "nearest", behavior: "instant" });
      }
    });
    document.addEventListener("click", (event) => { if (!wrapper.contains(event.target) && !optionDialog?.contains(event.target)) close(); });
    wrapper.addEventListener("focusout", (event) => { if (!wrapper.contains(event.relatedTarget) && !optionDialog?.contains(event.relatedTarget)) close(); });
    select.addEventListener("change", sync);
    sync();
  }

  /* ---------- Carousel: scroll-snap gốc của trình duyệt + thanh tiến độ ---------- */
  function initCarousels() {
    $$("[data-carousel]").forEach((carousel) => {
      const track = $("[data-carousel-track]", carousel);
      const bars = $("[data-carousel-bars]", carousel);
      const prev = $("[data-carousel-prev]", carousel);
      const next = $("[data-carousel-next]", carousel);
      if (!track) return;
      const pages = () => Math.max(1, Math.round(track.scrollWidth / track.clientWidth));
      const page = () => Math.min(pages() - 1, Math.round(track.scrollLeft / track.clientWidth));
      function sync() {
        const total = pages();
        if (bars) {
          if (bars.children.length !== total) {
            bars.innerHTML = Array.from({ length: total }, (_, i) => `<button type="button" aria-label="Nhóm ${i + 1} / ${total}"></button>`).join("");
          }
          [...bars.children].forEach((bar, i) => bar.setAttribute("aria-current", String(i === page())));
          bars.hidden = total < 2;
        }
        const max = track.scrollWidth - track.clientWidth - 2;
        if (prev) prev.disabled = track.scrollLeft <= 2;
        if (next) next.disabled = track.scrollLeft >= max;
      }
      const go = (index) => track.scrollTo({ left: index * track.clientWidth, behavior: "smooth" });
      bars?.addEventListener("click", (event) => { const i = [...bars.children].indexOf(event.target.closest("button")); if (i >= 0) go(i); });
      prev?.addEventListener("click", () => go(page() - 1));
      next?.addEventListener("click", () => go(page() + 1));
      track.addEventListener("scroll", () => requestAnimationFrame(sync), { passive: true });
      track.addEventListener("beb:rendered", sync);
      window.addEventListener("resize", sync);
      sync();
    });
  }

  /* ---------- Xem nhanh sản phẩm ---------- */
  let dialog;
  const compactQuick = matchMedia("(max-width: 680px)");
  function positionQuickActions() {
    if (!dialog) return;
    const actions = dialog.querySelector(".quick__actions");
    if (!actions) return;
    if (compactQuick.matches) dialog.append(actions);
    else dialog.querySelector(".quick__info").insertBefore(actions, dialog.querySelector(".quick__feedback"));
  }
  compactQuick.addEventListener("change", positionQuickActions);
  function openProduct(sku) {
    const product = bySku.get(sku);
    if (!product) return;
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.className = "quick";
      dialog.setAttribute("aria-labelledby", "quick-title");
      document.body.append(dialog);
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog || event.target.closest("[data-quick-close]")) dialog.close();
        const thumb = event.target.closest("[data-full]");
        if (thumb) {
          $(".quick__main img", dialog).src = thumb.dataset.full;
          $$("[data-full]", dialog).forEach((item) => item.setAttribute("aria-current", String(item === thumb)));
        }
        const add = event.target.closest("[data-cart-add]");
        if (add) window.dispatchEvent(new CustomEvent("beb:cart-add", { detail: { sku: dialog._product.sku } }));
      });
      dialog.addEventListener("close", () => { if (location.hash.startsWith("#sp-")) history.replaceState(null, "", location.pathname + location.search); });
    }
    const thumbs = [{ full: src(product.img), thumb: src(product.img) }].concat((product.gallery || []).filter(g => g.thumb).map((g) => ({ full: src(g.full), thumb: src(g.thumb) }))).slice(0, 3);
    const active = dialog._product = product;
    dialog.innerHTML = `<div class="quick__panel">
      <button type="button" class="quick__close" data-quick-close aria-label="Đóng sản phẩm">${icon("close")}</button>
      <div class="quick__gallery">
        <div class="quick__main"><img src="${src(product.cardImg || product.img)}" alt="${escapeHtml(product.name)}"></div>
        ${thumbs.length > 1 ? `<div class="quick__thumbs">${thumbs.map((t, i) => `<button type="button" data-full="${t.full}" aria-current="${i === 0}" aria-label="Ảnh ${i + 1}"><img src="${t.thumb}" alt="" loading="lazy"></button>`).join("")}</div>` : ""}
      </div>
      <div class="quick__info">
        <p class="quick__brand">${escapeHtml(product.brand)} · ${CATEGORIES[product.cat] || ""}</p>
        <h2 id="quick-title" class="quick__title">${escapeHtml(product.title)}</h2>
        <p class="quick__sku">SKU ${product.sku}</p>
        ${priceHtml(product)}
        ${product.desc ? `<p class="quick__desc">${escapeHtml(product.desc)}</p>` : ""}
        ${product.specs.length ? `<dl class="quick__specs">${product.specs.map((s) => `<div><dt>${escapeHtml(s.label)}</dt><dd>${escapeHtml(s.value)}</dd></div>`).join("")}</dl>` : ""}
        <div class="quick__actions">
          <button type="button" class="btn btn--solid" data-cart-add>${icon("cart")}Thêm vào giỏ</button>
          <a class="btn" href="#contact"  rel="noopener noreferrer">${icon("zalo")}Tư vấn qua Zalo</a>
        </div>
        <p class="quick__feedback" role="status" data-add-feedback></p>
        ${product.price && saleActive() ? `<p class="quick__note">Giá minh hoạ với ưu đãi 15% cho đơn hàng đầu tiên. Từ đơn thứ hai: ${money(Math.round(product.price * 0.8))} (−20%).</p>` : ""}
      </div>
    </div>`;
    positionQuickActions();
    document.dispatchEvent(new CustomEvent("beb:rendered"));
    void active;
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    dialog.querySelector(".quick__panel").scrollTop = 0;
  }
  function initQuickView() {
    document.addEventListener("click", (event) => {
      const link = event.target.closest("a[data-sku]");
      if (!link || event.metaKey || event.ctrlKey || event.shiftKey) return;
      event.preventDefault();
      history.replaceState(null, "", `#sp-${link.dataset.sku}`);
      openProduct(link.dataset.sku);
    });
    if (location.hash.startsWith("#sp-")) openProduct(location.hash.slice(4));
  }

  /* ---------- Video hero: tải bản mã hoá phù hợp màn hình, tôn trọng tiết kiệm dữ liệu ---------- */
  function initHeroVideo() {
    const wrap = $("[data-hero-video]");
    if (!wrap) return;
    const video = $("video", wrap);
    const play = $("[data-video-play]", wrap);
    const mute = $("[data-video-mute]", wrap);
    const connection = navigator.connection || {};
    const conserve = connection.saveData || ["slow-2g", "2g", "3g"].includes(connection.effectiveType || "");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let userPaused = false, manual = false, visible = false;
    function load() {
      if (video.getAttribute("src")) return;
      const width = window.innerWidth * Math.min(window.devicePixelRatio || 1, 2);
      video.src = width <= 800 ? wrap.dataset.srcSm : width <= 1700 ? wrap.dataset.srcMd : wrap.dataset.srcLg;
      video.load();
    }
    function sync() {
      if (!visible || document.hidden || userPaused || (!manual && (reduced.matches || conserve))) { video.pause(); return; }
      load();
      video.play().catch(() => {});
    }
    const svg = icon;
    function paint() {
      if (play) { play.innerHTML = svg(video.paused ? "play" : "pause"); play.setAttribute("aria-label", video.paused ? "Phát video" : "Tạm dừng video"); }
      if (mute) { mute.innerHTML = svg(video.muted ? "muted" : "sound"); mute.setAttribute("aria-label", video.muted ? "Bật âm thanh" : "Tắt âm thanh"); }
    }
    video.addEventListener("playing", () => { wrap.classList.add("is-playing"); paint(); });
    video.addEventListener("pause", paint);
    play?.addEventListener("click", () => {
      if (!video.paused) { userPaused = true; video.pause(); return; }
      manual = true; userPaused = false; load(); video.play().catch(() => {});
    });
    mute?.addEventListener("click", () => { video.muted = !video.muted; paint(); });
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: 0.15 }).observe(wrap);
    document.addEventListener("visibilitychange", sync);
    paint();
  }

  /* ---------- Video showroom (Wistia): chỉ tải trình phát khi khối sắp vào màn hình.
     Trình phát Wistia tự chọn chất lượng theo băng thông nên dùng chung cho desktop và mobile. ---------- */
  function initWistia() {}

  /* ---------- Demo form: no transmission or persistence ---------- */
  function initContactForm() {
    document.querySelectorAll("form[data-contact-form]").forEach(form => form.addEventListener('submit', event => {
      event.preventDefault(); if (!form.reportValidity()) return;
      const status = form.querySelector('[data-form-status]');
      status.hidden = false; status.dataset.state = 'success';
      status.textContent = 'Mô phỏng thành công. Thông tin không được gửi hoặc lưu; đây là bản demo.';
      form.reset();
    }));
  }

  /* ---------- Đếm ngược tới hết chương trình ---------- */
  function initCountdown() {
    const blocks = $$("[data-countdown]");
    if (!blocks.length) return;
    function tick() {
      const now = Date.now();
      const state = now < SALE.start ? "upcoming" : now < SALE.end ? "active" : "ended";
      const total = Math.max(0, Math.ceil(((state === "upcoming" ? SALE.start : SALE.end) - now) / 1000));
      const parts = [Math.floor(total / 86400), Math.floor(total / 3600) % 24, Math.floor(total / 60) % 60, total % 60];
      blocks.forEach((block) => {
        block.dataset.state = state;
        const label = $("[data-countdown-label]", block);
        if (label) label.textContent = state === "upcoming" ? "Chương trình bắt đầu sau" : state === "active" ? "Ưu đãi kết thúc sau" : "Chương trình đã kết thúc";
        $$("[data-unit]", block).forEach((unit, i) => { unit.textContent = String(parts[i]).padStart(2, "0"); });
      });
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- Hiệu ứng nhẹ: header khi cuộn + hiện dần khi vào màn hình ---------- */
  function initChrome() {
    const root = document.documentElement;
    const onScroll = () => root.classList.toggle("is-scrolled", window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    const reveals = $$("[data-reveal]");
    if (!reveals.length) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) { reveals.forEach((el) => el.classList.add("is-in")); return; }
    root.classList.add("has-reveal");
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add("is-in"); observer.unobserve(entry.target); }
    }), { rootMargin: "0px 0px -8% 0px" });
    reveals.forEach((el) => observer.observe(el));
  }

  function initMobileGalleries() {
    $$("#vietnam .places, #lifestyle .mosaic").forEach((track) => {
      const nav = document.createElement("div");
      nav.className = "mobile-gallery-nav";
      nav.innerHTML = `<span aria-live="polite"></span><button type="button" aria-label="Ảnh trước">${icon("arrow-left")}</button><button type="button" aria-label="Ảnh tiếp theo">${icon("arrow-right")}</button>`;
      track.after(nav);
      const [prev, next] = nav.querySelectorAll("button");
      const step = () => track.firstElementChild.getBoundingClientRect().width + 14;
      const sync = () => {
        const current = Math.round(track.scrollLeft / step());
        nav.querySelector("span").textContent = `${current + 1} / ${track.children.length}`;
        prev.disabled = current === 0;
        next.disabled = current >= track.children.length - 1;
      };
      const move = (direction) => track.scrollTo({ left: (Math.round(track.scrollLeft / step()) + direction) * step(), behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
      prev.addEventListener("click", () => move(-1));
      next.addEventListener("click", () => move(1));
      track.addEventListener("scroll", sync, { passive: true });
      window.addEventListener("resize", sync);
      sync();
    });
  }
  initMobileGalleries();
  initProductLists();
  initCarousels();
  initQuickView();
  initHeroVideo();
  initWistia();
  initContactForm();
  initCountdown();
  initChrome();
})();
