// ePalace online shop — cart kept in the browser (localStorage), rendered in the drawer,
// posted as JSON at checkout. Prices always come from window.SHOP_ITEMS (server data).
(function () {
    "use strict";
    var KEY = "epalace-cart";
    var items = {};
    (window.SHOP_ITEMS || []).forEach(function (i) { items[i.id] = i; });

    // ---- language (English / தமிழ்): server renders both, CSS shows one; JS strings use T()
    var TA = {
        "cart.empty": "உங்கள் கூடை காலியாக உள்ளது",
        "cart.emptySub": "தொடங்க பட்டாசுகளைச் சேர்க்கவும்.",
        "added": "கூடையில் சேர்க்கப்பட்டது",
        "unit": "அலகு", "units": "அலகுகள்", "product": "பொருள்", "products": "பொருட்கள்",
        "wa.empty": "கூடை காலியாக உள்ளது — WhatsApp catalogue திறக்கப்படுகிறது",
        "list.empty": "கூடை காலியாக உள்ளது — விலைப்பட்டியலில் சேர்க்கவும்",
        "addProducts": "பட்டாசுகளைச் சேர்க்கவும்",
        "maxQty": "ஒரு பொருளுக்கு அதிகபட்சம் 9,999 — ஏற்கனவே கூடையில் உள்ளது",
        "qty": "எண்ணிக்கை", "dec": "ஒன்று குறை", "inc": "ஒன்று கூட்டு", "remove": "கூடையிலிருந்து நீக்கு",
        "dl.free": "இலவசம்", "dl.call": "அழைப்பில் உறுதி",
        "dl.callNote": "இந்த மாநிலத்துக்கான டெலிவரியை அழைப்பில் உறுதி செய்வோம்.",
        "dl.freeNote": "இலவச டெலிவரி — உங்கள் ஆர்டர் இலவச டெலிவரி வரம்பைத் தாண்டியது.",
        "re.added": "முந்தைய ஆர்டரின் பொருட்கள் கூடையில் சேர்க்கப்பட்டன. இன்றைய விலைகள் காட்டப்படுகின்றன.",
        "re.skipped": "இவை இப்போது கிடைக்கவில்லை, சேர்க்கப்படவில்லை: ",
        "re.none": "இந்த ஆர்டரின் பொருட்கள் எதுவும் இப்போது கிடைக்கவில்லை."
    };
    function lang() { return document.documentElement.lang === "ta" ? "ta" : "en"; }
    function T(key, en) { return lang() === "ta" && TA[key] ? TA[key] : en; }
    function NM(item) { return lang() === "ta" && item.nameTa ? item.nameTa : item.name; }
    function applyLang(l) {
        document.documentElement.lang = l;
        try { localStorage.setItem("epalace-lang", l); } catch (e) { }
        document.cookie = "epalace-lang=" + l + ";path=/;max-age=31536000;samesite=lax";
        document.querySelectorAll("[data-ph-ta]").forEach(function (el) {
            if (!el.hasAttribute("data-ph-en")) el.setAttribute("data-ph-en", el.getAttribute("placeholder") || "");
            el.setAttribute("placeholder", l === "ta" ? el.getAttribute("data-ph-ta") : el.getAttribute("data-ph-en"));
        });
        document.querySelectorAll("option[data-ta]").forEach(function (o) {
            if (!o.hasAttribute("data-en")) o.setAttribute("data-en", o.textContent);
            o.textContent = l === "ta" ? o.getAttribute("data-ta") : o.getAttribute("data-en");
        });
        document.querySelectorAll("optgroup[data-ta]").forEach(function (g) {   // group headings live in the label attribute
            if (!g.hasAttribute("data-en")) g.setAttribute("data-en", g.label);
            g.label = l === "ta" ? g.getAttribute("data-ta") : g.getAttribute("data-en");
        });
        document.querySelectorAll("[data-set-lang]").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-set-lang") === l); });
        if (typeof render === "function" && document.readyState !== "loading") render();
    }
    document.addEventListener("click", function (e) {
        var b = e.target.closest("[data-set-lang]");
        if (b) applyLang(b.getAttribute("data-set-lang"));
    });

    function money(v) { return "₹" + (Number(v) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
    function load() { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; } }
    function save(c) { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) { } }
    function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

    var cart = load();
    // drop items that no longer exist
    Object.keys(cart).forEach(function (id) { if (!items[id]) delete cart[id]; });

    if (document.body.getAttribute("data-clear-cart") === "true") { cart = {}; save(cart); }

    function lines() {
        return Object.keys(cart).map(function (id) { return { item: items[id], qty: cart[id] }; }).filter(function (l) { return l.item && l.qty > 0; });
    }
    function totals() {
        var t = { units: 0, mrp: 0, total: 0, count: 0 };
        lines().forEach(function (l) { t.units += l.qty; t.mrp += l.item.mrp * l.qty; t.total += l.item.price * l.qty; t.count++; });
        t.saving = t.mrp - t.total;
        return t;
    }

    function toast(msg) {
        var el = document.getElementById("shopToast");
        if (!el) {
            el = document.createElement("div");
            el.id = "shopToast";
            el.className = "shop-toast";
            document.body.appendChild(el);
        }
        el.innerHTML = '<i class="bi bi-check-circle-fill"></i> ' + esc(msg);
        el.classList.add("show");
        clearTimeout(el._t);
        el._t = setTimeout(function () { el.classList.remove("show"); }, 2200);
    }

    // The drawer lines are rebuilt on every change; put the keyboard focus back on the same control
    // (or the drawer itself when the line went away) so Esc still closes the drawer and Tab carries on.
    var focusAfter = null;
    function restoreFocus(box) {
        var f = focusAfter; focusAfter = null;
        if (!f) return;
        var line = box.querySelector('.cart-line[data-id="' + f.id + '"]');
        var el = line && line.querySelector(f.sel);
        if (!el && line) el = line.querySelector("[data-qty]");
        if (!el) { var any = box.querySelector(".cart-line [data-qty]"); el = any || box.closest(".offcanvas"); }
        if (el && el.focus) el.focus({ preventScroll: true });
    }

    function render() {
        var t = totals();
        document.querySelectorAll("[data-cart-count]").forEach(function (b) { b.textContent = String(t.units); b.classList.toggle("d-none", false); });
        var box = document.querySelector("[data-cart-lines]");
        if (box) {
            var ls = lines();
            var ae = document.activeElement, aeLine = ae && box.contains(ae) && ae.closest(".cart-line");
            if (!focusAfter && aeLine) focusAfter = { id: aeLine.getAttribute("data-id"), sel: ae.matches("[data-inc]") ? "[data-inc]" : ae.matches("[data-dec]") ? "[data-dec]" : ae.matches("[data-remove]") ? "[data-remove]" : "[data-qty]" };
            if (!ls.length) {
                box.innerHTML = '<div class="cart-empty"><i class="bi bi-bag d-block mb-2" style="font-size:40px;opacity:.4"></i><div class="fw-700 text-ink-2">' + esc(T("cart.empty", "Your cart is empty")) + '</div><div class="fs-13">' + esc(T("cart.emptySub", "Add crackers from the catalogue to get started.")) + '</div></div>';
            } else {
                box.innerHTML = ls.map(function (l) {
                    var i = l.item;
                    return '<div class="cart-line" data-id="' + i.id + '">' +
                        '<span class="cl-ico" style="--h:' + i.hue + '">' + (i.photo ? '<img src="' + esc(i.photo) + '" alt="" loading="lazy" />' : (i.emoji ? '<span class="emo">' + i.emoji + '</span>' : '<i class="bi ' + i.icon + '"></i>')) + '</span>' +
                        '<div class="flex-grow-1 min-w-0"><div class="fw-700 truncate">' + esc(NM(i)) + '</div>' +
                        '<div class="fs-12 text-muted">' + money(i.price) + (i.discount > 0 ? ' <s>' + money(i.mrp) + '</s> <span class="text-ok fw-700">-' + i.discount + '%</span>' : '') + '</div>' +
                        '<div class="d-flex align-items-center gap-2 mt-1"><div class="qty-ctl qty-ctl-sm"><button type="button" data-dec aria-label="' + esc(T("dec", "Remove one") + " · " + NM(i)) + '">−</button>' +
                        '<input type="number" min="1" max="9999" value="' + l.qty + '" data-qty inputmode="numeric" aria-label="' + esc(T("qty", "Quantity") + " · " + NM(i)) + '" />' +
                        '<button type="button" data-inc aria-label="' + esc(T("inc", "Add one") + " · " + NM(i)) + '">+</button></div>' +
                        '<button type="button" class="btn btn-sm btn-light" data-remove title="' + esc(T("remove", "Remove from cart")) + '" aria-label="' + esc(T("remove", "Remove from cart") + " · " + NM(i)) + '"><i class="bi bi-trash"></i></button></div></div>' +
                        '<div class="fw-800 money text-end" style="min-width:86px">' + money(i.price * l.qty) + '</div></div>';
                }).join("");
            }
            restoreFocus(box);
        }
        var set = function (sel, v) { document.querySelectorAll(sel).forEach(function (e) { e.textContent = v; }); };
        set("[data-cart-units]", t.units + " " + (t.units === 1 ? T("unit", "unit") : T("units", "units")) + " · " + t.count + " " + (t.count === 1 ? T("product", "product") : T("products", "products")));
        set("[data-cart-mrp]", money(t.mrp));
        set("[data-cart-saving]", money(t.saving));
        set("[data-cart-total]", money(t.total));
        set("[data-cart-products]", String(t.count));
        // fixed totals row: flash when the total changes
        document.querySelectorAll("[data-sum-strip]").forEach(function (s) {
            s.classList.toggle("has-items", t.units > 0);
            if (s._last !== undefined && s._last !== t.total) { s.classList.remove("bump"); void s.offsetWidth; s.classList.add("bump"); }
            s._last = t.total;
        });
        document.querySelectorAll("[data-cart-checkout]").forEach(function (b) { b.classList.toggle("disabled", t.units === 0); });
        document.querySelectorAll("[data-cart-summary]").forEach(function (b) { b.classList.toggle("d-none", t.units === 0); });
        document.querySelectorAll("[data-order-bar]").forEach(function (b) { b.classList.toggle("d-none", t.units === 0); });
        document.body.classList.toggle("has-order-bar", t.units > 0 && !!document.querySelector("[data-order-bar]"));

        // catalogue: "n in cart" markers and the price-list quantities / amounts
        document.querySelectorAll("[data-in-cart]").forEach(function (m) {
            var q = cart[m.getAttribute("data-in-cart")] || 0;
            m.classList.toggle("d-none", q === 0);
            var s = m.querySelector("span"); if (s) s.textContent = String(q);
        });
        document.querySelectorAll("[data-list-qty]").forEach(function (inp) {
            var id = inp.getAttribute("data-list-qty"), q = cart[id] || 0;
            if (document.activeElement !== inp) inp.value = q > 0 ? String(q) : "";
            inp.closest("tr").classList.toggle("picked", q > 0);
            var amt = document.querySelector('[data-list-amount="' + id + '"]');
            if (amt) amt.textContent = q > 0 && items[id] ? money(items[id].price * q) : "—";
        });

        // checkout page: delivery estimate for the chosen state (the server recomputes it when the order is placed)
        renderDelivery(t);
        var json = document.getElementById("CartJson");
        if (json) json.value = JSON.stringify(lines().map(function (l) { return { itemId: l.item.id, qty: l.qty }; }));
        // checkout: the Place order buttons are enabled by the form checklist in shop-extras.js (cart + required fields)
        if (typeof window.ShopCheckoutGate === "function") window.ShopCheckoutGate();
        document.querySelectorAll("[data-checkout-lines]").forEach(function (review) {
            review.innerHTML = lines().length ? lines().map(function (l) {
                return '<tr><td><div class="fw-600">' + esc(NM(l.item)) + '</div><div class="cell-sub">' + money(l.item.price) + (l.item.discount > 0 ? ' · <s>' + money(l.item.mrp) + '</s>' : '') + '</div></td>' +
                    '<td class="text-center fw-700">' + l.qty + '</td><td class="text-end money fw-600">' + money(l.item.price * l.qty) + '</td></tr>';
            }).join("") : '<tr><td colspan="3" class="text-center text-muted py-4">' + esc(T("cart.empty", "Your cart is empty")) + ' — <a href="' + (window.SHOP_CHECKOUT_URL || "/Shop").replace(/Checkout$/, "") + '">' + esc(T("addProducts", "add products")) + '</a>.</td></tr>';
        });
    }

    // ---- Delivery estimate (checkout): flat ₹ per state from Settings, rendered into the form as data-delivery =
    // {"rates":{"Tamil Nadu":150,…},"freeAbove":5000|null}. A state without a rate = "We'll confirm delivery on call" (no charge added).
    var DELIVERY = null;
    (function () {
        var f = document.querySelector("[data-delivery]");
        if (!f) return;
        try { DELIVERY = JSON.parse(f.getAttribute("data-delivery") || "{}") || {}; } catch (e) { DELIVERY = {}; }
        DELIVERY.rates = DELIVERY.rates || {};
    })();
    function deliveryQuote(state, goods) {
        if (!DELIVERY || !state || !Object.prototype.hasOwnProperty.call(DELIVERY.rates, state)) return { charge: null, free: false };
        var rate = Number(DELIVERY.rates[state]) || 0;
        if (rate > 0 && DELIVERY.freeAbove > 0 && goods >= DELIVERY.freeAbove) return { charge: 0, free: true };
        return { charge: rate, free: rate === 0 };
    }
    function renderDelivery(t) {
        var sel = document.querySelector("[data-co-state]");
        var set = function (s, v) { document.querySelectorAll(s).forEach(function (e) { e.textContent = v; }); };
        if (!sel || !DELIVERY) { set("[data-co-grand]", money(t.total)); return; }
        var q = deliveryQuote(sel.value, t.total);
        var opt = sel.options[sel.selectedIndex];
        set("[data-co-delivery-state]", opt ? "· " + opt.textContent : "");
        set("[data-co-delivery]", q.charge === null ? T("dl.call", "Confirmed on call") : q.charge === 0 ? T("dl.free", "Free") : money(q.charge));
        set("[data-co-grand]", money(t.total + (q.charge || 0)));
        var note = document.querySelector("[data-co-delivery-note]");
        if (!note) return;
        var text = "", ok = false;
        if (q.charge === null) text = T("dl.callNote", "We'll confirm delivery on call for this state.");
        else if (q.free && DELIVERY.freeAbove > 0 && t.units > 0) { text = T("dl.freeNote", "Free delivery — your order is above the free-delivery amount."); ok = true; }
        else if (q.charge > 0 && DELIVERY.freeAbove > 0 && t.units > 0) text = lang() === "ta"
            ? money(DELIVERY.freeAbove) + "-க்கு மேல் இலவச டெலிவரி — இன்னும் " + money(DELIVERY.freeAbove - t.total) + " சேர்க்கவும்."
            : "Free delivery above " + money(DELIVERY.freeAbove) + " — add " + money(DELIVERY.freeAbove - t.total) + " more.";
        note.textContent = text;
        note.classList.toggle("ok", ok);
        note.classList.toggle("d-none", !text);
    }
    (function () {
        var sel = document.querySelector("[data-co-state]");
        if (!sel) return;
        // a fresh checkout takes the state used last time on this device (a re-shown form keeps what was posted)
        if (sel.hasAttribute("data-restore-state")) {
            try {
                var last = localStorage.getItem("epalace-state");
                if (last && Array.prototype.some.call(sel.options, function (o) { return o.value === last; })) sel.value = last;
            } catch (e) { }
        }
        sel.addEventListener("change", function () {
            try { localStorage.setItem("epalace-state", sel.value); } catch (e) { }
            render();
        });
    })();

    // one cart line holds 1–9999 units (the server clamps to the same range)
    var MAX_QTY = 9999;
    function add(id, qty) {
        id = String(id); qty = Math.min(MAX_QTY, Math.max(1, parseInt(qty, 10) || 1));
        if (!items[id]) return;
        var before = cart[id] || 0;
        cart[id] = Math.min(MAX_QTY, before + qty);
        qty = cart[id] - before;
        save(cart); render();
        if (qty > 0) toast(NM(items[id]) + " × " + qty + " " + T("added", "added to cart"));
        else toast(T("maxQty", "Maximum 9,999 per product is already in your cart"));
    }
    function setQty(id, qty) {
        id = String(id); qty = parseInt(qty, 10) || 0;
        if (qty <= 0) delete cart[id]; else cart[id] = Math.min(qty, 9999);
        save(cart); render();
    }

    // Catalogue buttons
    document.addEventListener("click", function (e) {
        var addBtn = e.target.closest("[data-add]");
        if (addBtn) {
            var card = addBtn.closest("[data-item]");
            var q = card ? card.querySelector("[data-qty]") : null;
            add(addBtn.getAttribute("data-add"), q ? q.value : 1);
            if (q) q.value = 1;
            return;
        }
        var line = e.target.closest(".cart-line");
        if (line) {
            var id = line.getAttribute("data-id"), q2 = line.querySelector("[data-qty]");
            if (e.target.closest("[data-inc]")) { focusAfter = { id: id, sel: "[data-inc]" }; setQty(id, (parseInt(q2.value, 10) || 0) + 1); }
            else if (e.target.closest("[data-dec]")) { focusAfter = { id: id, sel: "[data-dec]" }; setQty(id, (parseInt(q2.value, 10) || 0) - 1); }
            else if (e.target.closest("[data-remove]")) { focusAfter = { id: id, sel: "[data-remove]" }; setQty(id, 0); }
            return;
        }
        var card2 = e.target.closest("[data-item]");
        if (card2) {
            var qi = card2.querySelector("[data-qty]");
            if (e.target.closest("[data-inc]") && qi) qi.value = Math.min(9999, (parseInt(qi.value, 10) || 1) + 1);
            if (e.target.closest("[data-dec]") && qi) qi.value = Math.max(1, (parseInt(qi.value, 10) || 1) - 1);
        }
        if (e.target.closest("[data-cart-clear]")) { cart = {}; save(cart); render(); }
    });
    document.addEventListener("change", function (e) {
        var line = e.target.closest(".cart-line");
        if (line && e.target.matches("[data-qty]")) { setQty(line.getAttribute("data-id"), e.target.value); return; }
        // card quantity boxes: keep what was typed within 1–9999
        if (e.target.matches("[data-item] [data-qty]")) {
            var v = parseInt(e.target.value, 10);
            e.target.value = String(Math.min(MAX_QTY, Math.max(1, isNaN(v) ? 1 : v)));
        }
    });
    // Price list: typing a quantity puts it straight into the cart
    document.addEventListener("input", function (e) {
        if (!e.target.matches("[data-list-qty]")) return;
        var v = parseInt(e.target.value, 10) || 0;
        setQty(e.target.getAttribute("data-list-qty"), Math.max(0, Math.min(v, 9999)));
    });
    document.addEventListener("focusout", function (e) { if (e.target.matches && e.target.matches("[data-list-qty]")) render(); });
    // Price list: − / + buttons (no typing needed)
    document.addEventListener("click", function (e) {
        var inc = e.target.closest("[data-list-inc]"), dec = e.target.closest("[data-list-dec]");
        if (!inc && !dec) return;
        var id = (inc || dec).getAttribute(inc ? "data-list-inc" : "data-list-dec");
        var q = (cart[id] || 0) + (inc ? 1 : -1);
        setQty(id, Math.max(0, Math.min(q, 9999)));
        var row = (inc || dec).closest("tr");
        if (row) { row.classList.remove("bump"); void row.offsetWidth; row.classList.add("bump"); }
    });

    // WhatsApp: send the cart as a ready-to-send order message (empty cart opens the WhatsApp catalogue)
    // Backup (static GitHub) shop: every checkout button sends the order on WhatsApp instead
    document.addEventListener("click", function (e) {
        var b = e.target.closest("[data-wa-order]") || (window.SHOP_STATIC && e.target.closest("[data-cart-checkout], a[href*='Checkout']"));
        if (!b) return;
        e.preventDefault();
        var ls = lines(), t = totals(), wa = window.SHOP_WA || "919488127540";
        if (!ls.length) { toast(T("wa.empty", "Your cart is empty — opening our WhatsApp catalogue")); window.open("https://wa.me/c/" + wa, "_blank", "noopener"); return; }
        var ta = lang() === "ta";
        var NL = "\n";
        var msg = (ta ? "வணக்கம் " : "Hello ") + (window.SHOP_NAME || "ePALACE") + (ta ? ", நான் ஆர்டர் செய்ய விரும்புகிறேன்:" : ", I would like to order:") + NL + NL +
            ls.map(function (l, i) { return (i + 1) + ". " + NM(l.item) + (ta && l.item.nameTa !== l.item.name ? " (" + l.item.name + ")" : "") + " × " + l.qty + " = " + money(l.item.price * l.qty); }).join(NL) +
            NL + NL + (ta ? "மொத்தம்: " : "Total: ") + money(t.total) + " (" + t.units + " " + (ta ? "அலகுகள்" : "units") + ")" +
            NL + NL + (ta ? ["பெயர்:", "முகவரி:", "தொலைபேசி:"] : ["Name:", "Address:", "Phone:"]).join(NL) +
            NL + NL + (ta ? "(பெற்ற பின் பணம் — Cash on delivery)" : "(Cash on delivery)");
        window.open("https://wa.me/" + wa + "?text=" + encodeURIComponent(msg), "_blank", "noopener");
    });

    // Reorder (Track page, after the order was verified with its number + mobile): data-reorder =
    // {"lines":[{itemId,qty}],"skipped":["name",…]} from the server, already limited to today's active items.
    // The lines are added to this device's cart at today's prices (items/SHOP_ITEMS) and Checkout opens;
    // anything not sold any more is named there (sessionStorage, read once by the checkout page).
    document.addEventListener("click", function (e) {
        var b = e.target.closest("[data-reorder]");
        if (!b) return;
        e.preventDefault();
        var data;
        try { data = JSON.parse(b.getAttribute("data-reorder") || "{}") || {}; } catch (err) { data = {}; }
        var skipped = (data.skipped || []).slice(), added = 0;
        (data.lines || []).forEach(function (l) {
            var id = String(l.itemId), qty = Math.min(MAX_QTY, Math.max(1, parseInt(l.qty, 10) || 1));
            if (!items[id]) { skipped.push(l.name || "#" + id); return; }   // switched off since the page was opened
            cart[id] = Math.min(MAX_QTY, (cart[id] || 0) + qty);
            added++;
        });
        save(cart); render();
        try { sessionStorage.setItem("epalace-reorder", JSON.stringify({ added: added, skipped: skipped })); } catch (err) { }
        if (!added) { toast(T("re.none", "None of the products in this order is available now.")); return; }
        location.href = b.getAttribute("href") || window.SHOP_CHECKOUT_URL || "/Shop/Checkout";
    });
    (function () {
        var note = document.querySelector("[data-reorder-note]");
        if (!note) return;
        var info = null;
        try { info = JSON.parse(sessionStorage.getItem("epalace-reorder") || "null"); sessionStorage.removeItem("epalace-reorder"); } catch (e) { }
        if (!info || !info.added) return;
        note.textContent = T("re.added", "The products from your earlier order are in your cart, at today's prices.") +
            (info.skipped && info.skipped.length ? " " + T("re.skipped", "Not available any more, so left out: ") + info.skipped.join(", ") : "");
        note.classList.remove("d-none");
    })();

    // Catalogue search / category / offers filter (cards and price list together)
    var search = document.getElementById("shopSearch");
    var offersOnly = document.getElementById("offersOnly");
    var sort = document.getElementById("shopSort");
    var catSel = document.getElementById("shopCat");
    // "Shop for" chips: which categories each audience sees (business sees everything, in the price list)
    var AUDIENCE = {
        kids: ["sparklers", "flower-pots", "chakkar", "fountain-items", "rope-candles", "stones"],
        family: ["family-pack", "gift-box"]   // exactly what the chip says: family packs and ready gift boxes
    };
    // Sorting: "Sort: category" is the page as the server sent it (category by category). A price / discount / name sort
    // is one list across every category (what shoppers expect from "Price: low → high"), so the items move into a
    // single list and the category headers step aside; choosing "category" again puts every item back where it was.
    var ord = 0;
    function remember(pane) {
        pane.querySelectorAll("[data-item]").forEach(function (el) { if (el._home) return; el._home = el.parentNode; el._ord = ord++; });
    }
    function sortedBox(pane, create) {
        var box = pane.querySelector("[data-sorted]");
        if (box || !create) return box;
        var table = pane.querySelector("table");
        if (table) { box = document.createElement("tbody"); table.appendChild(box); }
        else {
            var wrap = document.createElement("section");
            wrap.className = "sorted-section";
            box = document.createElement("div"); box.className = "product-grid";
            wrap.appendChild(box); pane.insertBefore(wrap, pane.firstChild);
        }
        box.setAttribute("data-sorted", "");
        return box;
    }
    function sortEls(els, s) {
        return els.sort(function (a, b) {
            var pa = parseFloat(a.getAttribute("data-price")), pb = parseFloat(b.getAttribute("data-price"));
            var da = parseFloat(a.getAttribute("data-discount")), db = parseFloat(b.getAttribute("data-discount"));
            var r = s === "price-asc" ? pa - pb : s === "price-desc" ? pb - pa : s === "discount" ? db - da || pa - pb
                : a.getAttribute("data-name").localeCompare(b.getAttribute("data-name"));
            return r || a._ord - b._ord;   // ties keep the catalogue order
        });
    }
    function applyFilter() {
        var panes = document.querySelectorAll("[data-view-pane]");
        if (!panes.length) return;
        var term = (search ? search.value : "").trim().toLowerCase();
        var only = offersOnly && offersOnly.checked;
        var cat = catSel ? catSel.value : "";
        var s = sort ? sort.value : "";
        var aud = AUDIENCE[document.body.getAttribute("data-audience") || ""];
        var shown = 0;
        panes.forEach(function (pane, pi) {
            remember(pane);
            var all = Array.prototype.slice.call(pane.querySelectorAll("[data-item]"));
            var box = sortedBox(pane, !!s && all.length > 0);
            if (s) { sortEls(all, s).forEach(function (c) { box.appendChild(c); }); }
            else if (box && box.children.length) { all.sort(function (a, b) { return a._ord - b._ord; }).forEach(function (c) { c._home.appendChild(c); }); }
            if (box) (box.closest(".sorted-section") || box).classList.toggle("d-none", !s);
            all.forEach(function (c) {
                var ok = (!term || (c.getAttribute("data-search") || "").indexOf(term) !== -1) &&
                         (!only || c.getAttribute("data-discount") !== "0") &&
                         (!cat || c.getAttribute("data-cat") === cat) &&
                         (!aud || aud.indexOf(c.getAttribute("data-cat")) !== -1);
                c.classList.toggle("d-none", !ok);
                if (ok && pi === 0) shown++;
            });
            pane.querySelectorAll("[data-cat-section]").forEach(function (sec) {
                sec.classList.toggle("d-none", !sec.querySelector("[data-item]:not(.d-none)"));
            });
        });
        var cnt = document.getElementById("shownCount");
        if (cnt) cnt.textContent = String(shown);
        var empty = document.getElementById("noProducts");
        if (empty) empty.classList.toggle("d-none", shown > 0);
        // the gift box / family pack showcase steps aside while the customer searches or filters
        var ps = document.getElementById("gift-packs");
        if (ps) ps.classList.toggle("d-none", !!(term || only || cat || aud));
    }
    if (search) search.addEventListener("input", applyFilter);
    if (offersOnly) offersOnly.addEventListener("change", applyFilter);
    if (sort) sort.addEventListener("change", applyFilter);
    if (catSel) catSel.addEventListener("change", applyFilter);
    if (location.hash === "#offers" && offersOnly) { offersOnly.checked = true; }

    // Price list rows are built from the product cards the first time the list is shown (the server sends the cards only)
    function buildPriceList() {
        var table = document.querySelector("[data-pl-table]");
        if (!table || table.getAttribute("data-built")) return;
        table.setAttribute("data-built", "1");
        var html = [];
        document.querySelectorAll('[data-view-pane="grid"] .cat-section').forEach(function (sec) {
            var key = sec.getAttribute("data-cat-section"), head = sec.querySelector(".cat-head");
            var hue = head ? head.style.getPropertyValue("--h") : "20", img = sec.getAttribute("data-img-sm") || "";
            if (window.SHOP_STATIC) img = img.replace(/^\//, "../");
            // the section's own cards, in catalogue order (while a price sort is on they sit in the sorted list)
            var grid = sec.querySelector("[data-product-grid]");
            var cards = Array.prototype.slice.call(document.querySelectorAll('[data-view-pane="grid"] [data-item]'))
                .filter(function (c) { return (c._home || c.parentNode) === grid; })
                .sort(function (a, b) { return (a._ord || 0) - (b._ord || 0); });
            html.push('<tbody data-cat-section="' + key + '"><tr class="pl-cat" style="--h:' + hue + ";--img:url('" + img + "')\"><td colspan=\"5\"><span class=\"emo\">" +
                (head && head.querySelector(".emo") ? head.querySelector(".emo").textContent : "") + "</span> " + (head && head.querySelector("h3") ? head.querySelector("h3").innerHTML : key) +
                ' <span class="fs-12 opacity-75">· ' + cards.length + "</span></td></tr>");
            cards.forEach(function (c) {
                var id = c.getAttribute("data-item"), nameEn = c.getAttribute("data-name") || "";
                var nameHtml = (c.querySelector(".product-name") || {}).innerHTML || esc(nameEn);
                var unitHtml = (c.querySelector(".unit") || {}).innerHTML || "";
                var photo = (c.querySelector("img.art-photo") || {}).getAttribute ? c.querySelector("img.art-photo").getAttribute("src") : "";
                var offer = (c.querySelector(".price-offer") || {}).textContent || "", mrp = c.querySelector(".price-mrp"), rib = c.querySelector(".ribbon");
                // gift boxes / family packs: the same "What's inside" button as the card (opens the #packBox popup)
                var inside = c.querySelector(".pack-inside[data-pack-open]");
                html.push('<tr data-item="' + id + '" data-name="' + esc(nameEn) + '" data-price="' + c.getAttribute("data-price") + '" data-cat="' + key + '" data-discount="' + c.getAttribute("data-discount") + '" data-search="' + esc(c.getAttribute("data-search") || "") + '">' +
                    '<td><div class="pl-prod"><img src="' + esc(photo) + '" alt="" loading="lazy" role="button" tabindex="0" aria-label="View photo" /><div><div class="fw-700">' + nameHtml + "</div>" +
                    (rib ? '<span class="pl-off">' + esc(rib.textContent) + "</span>" : "") + '<div class="d-md-none fs-12 text-muted">' + unitHtml + "</div>" +
                    (inside ? inside.outerHTML.replace('class="pack-inside"', 'class="pack-inside pl-inside"') : "") + "</div></div></td>" +
                    '<td class="d-none d-md-table-cell text-muted fs-13">' + unitHtml + "</td>" +
                    '<td class="text-end"><div class="fw-800">' + esc(offer) + "</div>" + (mrp ? '<div class="fs-12"><s class="pl-mrp">' + esc(mrp.textContent) + "</s></div>" : "") + "</td>" +
                    '<td class="text-center"><div class="qty-ctl qty-ctl-sm pl-stepper" data-list-stepper="' + id + '"><button type="button" data-list-dec="' + id + '" aria-label="Remove one ' + esc(nameEn) + '">−</button>' +
                    '<input type="number" min="0" max="9999" data-list-qty="' + id + '" placeholder="0" inputmode="numeric" aria-label="Quantity of ' + esc(nameEn) + '" />' +
                    '<button type="button" data-list-inc="' + id + '" aria-label="Add one ' + esc(nameEn) + '">+</button></div></td>' +
                    '<td class="text-end fw-700 money" data-list-amount="' + id + '">—</td></tr>');
            });
            html.push("</tbody>");
        });
        table.insertAdjacentHTML("beforeend", html.join(""));
        render(); applyFilter();
        document.dispatchEvent(new Event("shop:pricelist"));
    }

    // Jump to a category / item accurately: the category sections use content-visibility:auto, so sections above the
    // target change height while they render and one smooth scroll lands in the wrong place (it could end in the footer).
    // Scroll, let the layout settle, and correct until the target sits where it should.
    function jump(el, block) {
        if (!el) return;
        block = block || "start";
        var tries = 0;
        (function go() {
            el.scrollIntoView({ block: block, behavior: "instant" });
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    var r = el.getBoundingClientRect();
                    var want = block === "center" ? Math.max(0, (window.innerHeight - r.height) / 2) : (parseFloat(getComputedStyle(el).scrollMarginTop) || 0);
                    if (Math.abs(r.top - want) > 6 && ++tries < 10) go();
                });
            });
        })();
    }

    // Cards / price-list toggle (remembered per browser)
    function setView(v) {
        if (v === "list") buildPriceList();
        document.querySelectorAll("[data-view-pane]").forEach(function (p) { p.classList.toggle("d-none", p.getAttribute("data-view-pane") !== v); });
        document.querySelectorAll("[data-view]").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-view") === v); });
        try { localStorage.setItem("epalace-shop-view", v); } catch (e) { }
    }
    document.addEventListener("click", function (e) {
        var vb = e.target.closest("[data-view]");
        if (vb) { setView(vb.getAttribute("data-view")); return; }
        var vl = e.target.closest("[data-view-link]");
        if (vl) { setView(vl.getAttribute("data-view-link")); }
        var cl = e.target.closest("[data-cat-link]");
        if (cl) {
            e.preventDefault();
            if (catSel) { catSel.value = ""; }
            // a global price sort hides the category sections: go back to the category order to land on the tile's section
            if (sort && sort.value) { sort.value = ""; sort.dispatchEvent(new Event("change", { bubbles: true })); }
            applyFilter();
            var key = cl.getAttribute("data-cat-link");
            var pane = document.querySelector("[data-view-pane]:not(.d-none)");
            var target = pane && pane.querySelector('[data-cat-section="' + key + '"]');
            jump(target, "start");
        }
    });
    if (document.querySelector("[data-view-pane]")) {
        var saved = null;
        try { saved = localStorage.getItem("epalace-shop-view"); } catch (e) { }
        // quick order list first (like the Sivakasi price lists); the card view stays one tap away and is remembered
        setView(location.hash === "#pricelist" ? "list" : (saved === "grid" ? "grid" : "list"));
    }
    applyFilter();

    // Hero fireworks (skipped for reduced-motion users and hidden tabs)
    (function fireworks() {
        var cv = document.querySelector("[data-fireworks]");
        if (!cv || !cv.getContext) return;
        if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        var ctx = cv.getContext("2d"), parts = [], rockets = [], w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
        var colors = ["#ffd166", "#ff6b6b", "#f72585", "#4cc9f0", "#80ffdb", "#ffffff", "#fca311", "#b388ff"];
        function size() { w = cv.clientWidth; h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
        size(); window.addEventListener("resize", size);
        var onScreen = true;
        if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { onScreen = en[0].isIntersecting; }).observe(cv);
        function launch() {
            rockets.push({ x: w * (0.1 + Math.random() * 0.8), y: h, vy: -(h / 55 + Math.random() * 3), ty: h * (0.12 + Math.random() * 0.35), c: colors[(Math.random() * colors.length) | 0] });
        }
        function burst(x, y, c) {
            var n = 46 + ((Math.random() * 30) | 0), c2 = colors[(Math.random() * colors.length) | 0];
            for (var i = 0; i < n; i++) {
                var a = (Math.PI * 2 * i) / n, sp = 1.2 + Math.random() * 2.6;
                parts.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 60 + Math.random() * 30, age: 0, c: i % 3 ? c : c2 });
            }
        }
        var last = 0;
        function frame(t) {
            requestAnimationFrame(frame);
            if (document.hidden || !onScreen || t - last < 16) return;
            last = t;
            ctx.globalCompositeOperation = "destination-out";
            ctx.fillStyle = "rgba(0,0,0,.22)";
            ctx.fillRect(0, 0, w, h);
            ctx.globalCompositeOperation = "lighter";
            if (Math.random() < 0.035 && rockets.length < 3) launch();
            for (var i = rockets.length - 1; i >= 0; i--) {
                var r = rockets[i];
                r.y += r.vy; r.vy *= 0.985;
                ctx.fillStyle = r.c; ctx.fillRect(r.x, r.y, 2, 6);
                if (r.y <= r.ty || r.vy > -1) { burst(r.x, r.y, r.c); rockets.splice(i, 1); }
            }
            for (var j = parts.length - 1; j >= 0; j--) {
                var p = parts[j];
                p.age++; p.x += p.vx; p.y += p.vy; p.vy += 0.035; p.vx *= 0.985; p.vy *= 0.985;
                var alpha = Math.max(0, 1 - p.age / p.life);
                ctx.globalAlpha = alpha;
                ctx.fillStyle = p.c;
                ctx.beginPath(); ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2); ctx.fill();
                if (p.age >= p.life) parts.splice(j, 1);
            }
            ctx.globalAlpha = 1;
        }
        launch(); setTimeout(launch, 600);
        requestAnimationFrame(frame);
    })();

    render();
    applyLang(lang());
    window.ShopCart = { add: add, setQty: setQty, lines: lines, totals: totals, items: items, money: money, lang: lang, name: NM, filter: applyFilter, setView: setView, jump: jump, toast: toast, render: render, buildPriceList: buildPriceList };
})();

// ---------------------------------------------------------------------------------------------
// Festive extras: colour-paper confetti (shop opens / order placed), image fade-in, checkout guard
(function () {
    "use strict";
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ---- confetti: coloured paper pieces that burst, flutter and fall
    function confetti(opts) {
        if (reduce) return;
        opts = opts || {};
        var cv = document.createElement("canvas");
        cv.className = "confetti-canvas";
        document.body.appendChild(cv);
        var ctx = cv.getContext("2d"), dpr = Math.min(window.devicePixelRatio || 1, 2);
        var W = cv.width = innerWidth * dpr, H = cv.height = innerHeight * dpr;
        var colors = ["#ff1f6d", "#ffd23f", "#ff8a00", "#22e07a", "#1fc8ff", "#b14dff", "#ffffff", "#ff4fd8", "#00e5c8", "#ffe66d", "#4d7cff"];
        var shapes = ["paper", "paper", "paper", "circle", "star", "star", "ribbon", "ribbon", "triangle"];
        var pieces = [], n = Math.round((opts.count || 160) * (innerWidth < 600 ? 0.6 : 1));
        var origins = opts.origins || [{ x: 0.5, y: -0.05, spread: Math.PI, dir: Math.PI / 2, power: 4 }];
        for (var i = 0; i < n; i++) {
            var o = origins[i % origins.length];
            var a = o.dir + (Math.random() - 0.5) * o.spread, sp = (o.power + Math.random() * o.power) * dpr;
            pieces.push({
                x: o.x * W, y: o.y * H, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
                w: (6 + Math.random() * 7) * dpr, h: (9 + Math.random() * 10) * dpr,
                r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3, flip: Math.random() * Math.PI, vf: 0.08 + Math.random() * 0.12,
                c: colors[(Math.random() * colors.length) | 0], c2: colors[(Math.random() * colors.length) | 0], shape: shapes[(Math.random() * shapes.length) | 0], wave: Math.random() * 6
            });
        }
        var start = performance.now(), life = opts.duration || 3800;
        (function frame(t) {
            var el = t - start;
            ctx.clearRect(0, 0, W, H);
            var alive = 0;
            pieces.forEach(function (p) {
                p.vy += 0.09 * dpr; p.vx *= 0.99; p.vy = Math.min(p.vy, 5.5 * dpr);
                p.x += p.vx + Math.sin((el + p.flip * 500) / 260) * 0.6 * dpr; p.y += p.vy; p.r += p.vr; p.flip += p.vf;
                if (p.y < H + 30) alive++;
                ctx.save();
                ctx.globalAlpha = Math.max(0, Math.min(1, (life - el) / 700));
                ctx.translate(p.x, p.y); ctx.rotate(p.r);
                ctx.fillStyle = p.c;
                if (p.shape === "circle") { ctx.beginPath(); ctx.arc(0, 0, p.w / 2.4, 0, Math.PI * 2); ctx.fill(); }
                else if (p.shape === "star") {
                    // golden 5-point star with a soft glow
                    ctx.fillStyle = Math.random() < 0.5 ? "#ffd23f" : p.c; ctx.shadowColor = "rgba(255,210,63,.8)"; ctx.shadowBlur = 6 * dpr;
                    ctx.beginPath();
                    for (var s = 0; s < 10; s++) { var rr = s % 2 ? p.w * 0.45 : p.w * 1.05, aa = s * Math.PI / 5 - Math.PI / 2; ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); }
                    ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
                }
                else if (p.shape === "ribbon") {
                    // curly streamer in two colours
                    ctx.strokeStyle = p.c; ctx.lineWidth = 2.6 * dpr; ctx.lineCap = "round"; ctx.beginPath();
                    for (var q = 0; q <= 12; q++) { var yy = (q - 6) * 2.4 * dpr, xx = Math.sin(q * 0.9 + p.wave + el / 180) * 4 * dpr; q ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
                    ctx.stroke(); ctx.strokeStyle = p.c2; ctx.lineWidth = 1 * dpr; ctx.stroke();
                }
                else if (p.shape === "triangle") { ctx.beginPath(); ctx.moveTo(0, -p.h / 2); ctx.lineTo(p.w / 2, p.h / 2); ctx.lineTo(-p.w / 2, p.h / 2); ctx.closePath(); ctx.fill(); }
                else { ctx.scale(1, Math.cos(p.flip)); ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); }
                ctx.restore();
            });
            if (el < life && alive) requestAnimationFrame(frame); else cv.remove();
        })(start);
    }
    window.ShopConfetti = confetti;

    var body = document.body;
    if (body.getAttribute("data-celebrate") === "true") {
        // order placed: two paper cannons from the bottom corners + a shower from the top
        setTimeout(function () {
            confetti({ count: 220, duration: 4800, origins: [
                { x: 0.02, y: 1.02, dir: -Math.PI / 3, spread: 0.7, power: 11 },
                { x: 0.98, y: 1.02, dir: -2 * Math.PI / 3, spread: 0.7, power: 11 }] });
        }, 250);
        setTimeout(function () { confetti({ count: 140, duration: 4200 }); }, 1300);
    } else if (document.querySelector(".fest-hero")) {
        // shop opens: a colour-paper blast over the banner
        setTimeout(function () { confetti({ count: 150, duration: 3600, origins: [{ x: 0.5, y: -0.05, dir: Math.PI / 2, spread: Math.PI * 0.9, power: 3 }] }); }, 400);
    }

    // ---- product photos fade in once loaded (shimmer placeholder until then)
    document.querySelectorAll("img.art-photo").forEach(function (img) {
        if (img.complete && img.naturalWidth) img.classList.add("loaded");
        else img.addEventListener("load", function () { img.classList.add("loaded"); }, { once: true });
    });

    // ---- checkout: one tap only, show progress
    var form = document.querySelector('form[action*="PlaceOrder"]');
    if (form) form.addEventListener("submit", function (e) {
        if (e.defaultPrevented) return;   // blocked by the checklist or client validation
        var btns = document.querySelectorAll("[data-place-order]");
        if (!btns.length || form.dataset.busy) { if (form.dataset.busy) e.preventDefault(); return; }
        form.dataset.busy = "1";
        setTimeout(function () {
            var ta = document.documentElement.lang === "ta";
            btns.forEach(function (btn) {
                btn.disabled = true;
                btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>' + (ta ? "ஆர்டர் செய்யப்படுகிறது…" : "Placing your order…");
            });
        }, 0);
    });
})();
