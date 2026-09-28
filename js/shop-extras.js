// ePalace shop extras: page loader, offer countdown, welcome offer popup, product photo popup,
// "shop for" chips (kids / family / business) and the free chat assistant.
// Runs after shop.js and uses window.ShopCart. Everything is client-side, so the static backup shop works too.
(function () {
    "use strict";
    var cart = window.ShopCart || {};
    var promo = window.SHOP_PROMO || {};
    var biz = window.SHOP_BIZ || {};
    var WA = window.SHOP_WA || "919488127540";
    function ta() { return document.documentElement.lang === "ta"; }
    function L(en, t) { return ta() ? t : en; }
    function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
    function money(v) { return cart.money ? cart.money(v) : "₹" + v; }
    function store(kind) { try { return window[kind]; } catch (e) { return null; } }
    function get(kind, k) { try { var s = store(kind); return s ? s.getItem(k) : null; } catch (e) { return null; } }
    function put(kind, k, v) { try { var s = store(kind); if (s) s.setItem(k, v); } catch (e) { } }

    // ---- page loader: hide once the page is usable; show again while moving to another shop page
    var loader = document.getElementById("shopLoader");
    function hideLoader() { if (loader) loader.classList.add("done"); }
    if (document.readyState === "complete") hideLoader();
    else { window.addEventListener("load", hideLoader); setTimeout(hideLoader, 2500); }
    window.addEventListener("pageshow", hideLoader); // back / forward cache
    document.addEventListener("click", function (e) {
        var a = e.target.closest("a[href]");
        if (!a || !loader || e.defaultPrevented || e.ctrlKey || e.metaKey || e.shiftKey || a.target === "_blank" || a.hasAttribute("download")) return;
        var href = a.getAttribute("href");
        if (!href || href.charAt(0) === "#" || /^(mailto|tel|javascript|https?:\/\/wa\.me)/i.test(href)) return;
        if (a.host && a.host !== location.host) return;
        if (a.pathname === location.pathname && a.hash) return;
        loader.classList.remove("done");
        setTimeout(hideLoader, 8000);
    });
    document.addEventListener("submit", function (e) { if (loader && !e.defaultPrevented && !e.target.matches("[data-chat-form]")) loader.classList.remove("done"); });

    // ---- back to top (appears after scrolling two screens)
    var toTop = document.querySelector("[data-to-top]");
    if (toTop) {
        var onScroll = function () { toTop.classList.toggle("show", window.scrollY > window.innerHeight * 2); };
        window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
        toTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
    }

    // ---- category header photos load only when the section comes near the screen (saves ~3 MB on first load)
    (function () {
        var heads = document.querySelectorAll("[data-bg]");
        function show(el) { var u = el.getAttribute("data-bg"); if (window.SHOP_STATIC) u = u.replace(/^\//, "../"); /* css-variable urls resolve from css/ */ el.style.setProperty("--img", "url('" + u + "')"); el.removeAttribute("data-bg"); }
        if (!("IntersectionObserver" in window)) { heads.forEach(show); return; }
        var io = new IntersectionObserver(function (en) { en.forEach(function (e) { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } }); }, { rootMargin: "600px 0px" });
        heads.forEach(function (h) { io.observe(h); });
    })();

    // ---- keep sticky elements under the (taller) header
    var header = document.querySelector(".shop-header");
    function measure() { if (header) document.documentElement.style.setProperty("--shop-hdr", header.offsetHeight + "px"); }
    requestAnimationFrame(measure); window.addEventListener("resize", measure);

    // ---- countdown to the offer end (one week before Diwali)
    var ends = promo.ends ? new Date(promo.ends).getTime() : 0;
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function left() {
        var ms = Math.max(0, ends - Date.now()), s = Math.floor(ms / 1000);
        return { ms: ms, d: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), m: Math.floor(s % 3600 / 60), s: s % 60 };
    }
    function tick() {
        if (!ends) return;
        var t = left();
        document.querySelectorAll("[data-countdown]").forEach(function (box) {
            ["d", "h", "m", "s"].forEach(function (k) {
                var el = box.querySelector('[data-cd="' + k + '"]'), v = k === "d" ? String(t.d) : pad(t[k]);
                if (el && el.textContent !== v) { var first = el.textContent === "00" && !box._ticked; el.textContent = v; if (!first) { el.classList.remove("flip"); void el.offsetWidth; el.classList.add("flip"); } }
            });
            box.classList.toggle("over", t.ms === 0); box._ticked = true;
        });
        document.querySelectorAll("[data-cd-live]").forEach(function (e) { e.classList.toggle("d-none", t.ms === 0); });
        document.querySelectorAll("[data-cd-over]").forEach(function (e) { e.classList.toggle("d-none", t.ms > 0); });
    }
    tick(); setInterval(tick, 1000);

    // ---- welcome offer popup: once per visit, after the loader, only while the offer is running
    var pop = document.getElementById("offerPop");
    if (pop && window.bootstrap && (!ends || left().ms > 0) && !get("sessionStorage", "epalace-offer-seen") && !/[?&]nopopup/.test(location.search)) {
        var gif = pop.querySelector("img.op-gif[data-src]");
        if (gif) { gif.src = gif.getAttribute("data-src"); gif.addEventListener("load", function () { gif.classList.add("loaded"); }, { once: true }); }
        setTimeout(function () {
            if (document.querySelector(".modal.show, .offcanvas.show")) return;
            window.bootstrap.Modal.getOrCreateInstance(pop).show();
            put("sessionStorage", "epalace-offer-seen", "1");
        }, 1400);
    }

    // ---- the 90% badge (countdown band) reopens the offer popup at any time
    document.addEventListener("click", function (e) {
        if (!e.target.closest("[data-open-offer]") || !pop || !window.bootstrap) return;
        var g = pop.querySelector("img.op-gif[data-src]");
        if (g && !g.getAttribute("src")) { g.src = g.getAttribute("data-src"); g.addEventListener("load", function () { g.classList.add("loaded"); }, { once: true }); }
        window.bootstrap.Modal.getOrCreateInstance(pop).show();
    });

    // ---- product photo popup: tap a product picture to see it large, add from there
    var box = document.getElementById("photoBox"), boxId = null;
    document.addEventListener("click", function (e) {
        // the whole picture area is the tap target (glow / ribbon layers sit on top of the <img>)
        var art = e.target.closest(".fest-art, .pl-prod img");
        if (!art || !box || !window.bootstrap || e.target.closest("button, a, input")) return;
        var img = art.matches("img") ? art : art.querySelector("img.art-photo");
        if (!img) return;
        var row = img.closest("[data-item]"), id = row && row.getAttribute("data-item"), it = cart.items && cart.items[id];
        if (!it) return;
        boxId = id;
        var big = img.getAttribute("src").replace(/-sm\.jpg(\?.*)?$/, ".jpg");
        var pi = box.querySelector("[data-pb-img]");
        pi.src = img.getAttribute("src"); pi.alt = it.name;
        if (big !== img.getAttribute("src")) { var pre = new Image(); pre.onload = function () { if (boxId === id) pi.src = big; }; pre.src = big; }
        box.querySelector("[data-pb-name]").textContent = cart.name ? cart.name(it) : it.name;
        box.querySelector("[data-pb-price]").innerHTML = money(it.price) + (it.discount > 0 ? ' <s>' + money(it.mrp) + '</s> <span class="pb-off">' + it.discount + '% OFF</span>' : "");
        window.bootstrap.Modal.getOrCreateInstance(box).show();
    });
    document.addEventListener("click", function (e) {
        if (!e.target.closest("[data-pb-add]") || !boxId || !cart.add) return;
        cart.add(boxId, 1);
        window.bootstrap.Modal.getInstance(box).hide();
    });
    document.querySelectorAll(".fest-art.has-photo, .pl-prod img").forEach(function (i) { i.setAttribute("role", "button"); i.setAttribute("tabindex", "0"); i.setAttribute("aria-label", "View photo"); });
    document.addEventListener("keydown", function (e) {
        if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches(".fest-art.has-photo, .pl-prod img")) { e.preventDefault(); e.target.click(); }
    });

    // ---- "shop for" chips
    function setAudience(a) {
        document.body.setAttribute("data-audience", a);
        document.querySelectorAll("[data-audience]").forEach(function (b) { if (b !== document.body) { b.classList.toggle("active", b.getAttribute("data-audience") === a); b.setAttribute("aria-pressed", b.getAttribute("data-audience") === a ? "true" : "false"); } });
        document.querySelectorAll("[data-aud-note]").forEach(function (n) { n.classList.toggle("d-none", n.getAttribute("data-aud-note") !== a); });
        if (cart.setView && document.querySelector("[data-view-pane]")) cart.setView(a === "business" ? "list" : (a ? "grid" : (get("localStorage", "epalace-shop-view") || "grid")));
        if (cart.filter) cart.filter();
    }
    document.addEventListener("click", function (e) {
        var chip = e.target.closest(".aud-chip[data-audience]");
        if (chip) { setAudience(chip.getAttribute("data-audience")); var p = document.getElementById("products"); if (p) p.scrollIntoView({ behavior: "smooth", block: "start" }); }
        if (e.target.closest("[data-bulk-enquiry]")) openWa(bulkText());
    });

    function openWa(text) { window.open("https://wa.me/" + WA + (text ? "?text=" + encodeURIComponent(text) : ""), "_blank", "noopener"); }
    function bulkText() {
        var ls = cart.lines ? cart.lines() : [], t = cart.totals ? cart.totals() : { total: 0 };
        return L("Hello " + (biz.name || "ePALACE") + ", I would like a bulk / business order quote.", "வணக்கம் " + (biz.name || "ePALACE") + ", மொத்த / வணிக ஆர்டருக்கான விலை வேண்டும்.") +
            (ls.length ? "\n\n" + ls.map(function (l, i) { return (i + 1) + ". " + l.item.name + " × " + l.qty; }).join("\n") + "\n" + L("Current total: ", "தற்போதைய மொத்தம்: ") + money(t.total) : "") +
            "\n\n" + L("Business name:\nGSTIN (if any):\nCity:", "நிறுவனப் பெயர்:\nGSTIN (இருந்தால்):\nஊர்:");
    }

    // =============================================================================================
    // Chat assistant — free and rule-based: answers from the shop's own data, hands the rest to a person
    // =============================================================================================
    var panel = document.getElementById("shopChat");
    var fab = document.querySelector("[data-chat-open]");
    if (!panel || !fab) return;
    var log = panel.querySelector("[data-chat-log]"), chipsBox = panel.querySelector("[data-chat-chips]");
    var form = panel.querySelector("[data-chat-form]"), input = panel.querySelector("[data-chat-input]");
    var human = panel.querySelector("[data-chat-human]");
    var HKEY = "epalace-chat", history = [];
    try { history = JSON.parse(get("sessionStorage", HKEY) || "[]") || []; } catch (e) { history = []; }
    var lastQuestion = "";

    var KIDS = ["sparklers", "flower-pots", "chakkar", "fountain-items", "rope-candles", "stones"];
    function daysLeft() { return ends ? left().d : null; }
    function offerLine() {
        var d = daysLeft();
        if (ends && left().ms === 0) return L("The early-booking offer has closed, but you can still order for Diwali — our team will confirm the rates.", "முன்பதிவு சலுகை முடிந்துவிட்டது; தீபாவளிக்கு இன்னும் ஆர்டர் செய்யலாம் — விலையை எங்கள் குழு உறுதி செய்யும்.");
        return L("🎉 Up to <b>" + (promo.off || 90) + "% OFF</b> on the festival range, at wholesale rates. The offer ends on <b>" + esc(promo.endsLabel || "") + "</b>" + (d !== null ? " — <b>" + d + " day" + (d === 1 ? "" : "s") + "</b> left" : "") + ". Diwali is on " + esc(promo.diwali || "") + ".",
            "🎉 பண்டிகை வகைகளுக்கு மொத்த விலையில் <b>" + (promo.off || 90) + "% வரை தள்ளுபடி</b>. சலுகை <b>" + esc(promo.endsLabelTa || promo.endsLabel || "") + "</b> அன்று முடிகிறது" + (d !== null ? " — இன்னும் <b>" + d + " நாள்</b>" : "") + ". தீபாவளி: " + esc(promo.diwaliTa || promo.diwali || "") + ".");
    }

    // Each intent: words that trigger it (English, Tamil, Tanglish) and the reply it gives
    var INTENTS = [
        { id: "greet", words: ["hi", "hello", "hey", "hai", "vanakkam", "வணக்கம்", "good morning", "good evening"],
          reply: function () { return { html: L("Hello! 👋 I'm the ePALACE helper. Ask me about offers, prices, delivery or anything about ordering.", "வணக்கம்! 👋 நான் ePALACE உதவியாளர். சலுகை, விலை, டெலிவரி அல்லது ஆர்டர் பற்றி கேளுங்கள்.") }; } },
        { id: "offer", words: ["offer", "discount", "sale", "90", "deal", "cheap", "countdown", "last date", "ends", "தள்ளுபடி", "சலுகை", "offer eppo"],
          reply: function () { return { html: offerLine(), actions: [{ t: L("🛍️ Show offers", "🛍️ சலுகைகள்"), go: "offers" }, { t: L("📋 Price list", "📋 விலைப்பட்டியல்"), go: "list" }] }; } },
        { id: "how", words: ["how to order", "how do i order", "order", "buy", "purchase", "book", "enquiry", "ஆர்டர்", "வாங்க", "எப்படி"],
          reply: function () { return { html: L("Ordering is easy:<ol><li>Tap <b>Add</b> on the crackers you like (or type quantities in the price list).</li><li>Watch <b>Products · You save · Overall total</b> at the top.</li><li>Tap <b>Place order</b>, give your name, phone and address — or send it on WhatsApp.</li><li>We call or WhatsApp you within 24 hours to confirm.</li></ol>", "ஆர்டர் செய்வது எளிது:<ol><li>பிடித்த பட்டாசில் <b>சேர்</b> அழுத்துங்கள் (அல்லது விலைப்பட்டியலில் எண்ணிக்கை உள்ளிடுங்கள்).</li><li>மேலே <b>பொருட்கள் · சேமிப்பு · மொத்தம்</b> பாருங்கள்.</li><li><b>ஆர்டர் செய்</b> அழுத்தி பெயர், தொலைபேசி, முகவரி கொடுங்கள் — அல்லது WhatsApp-ல் அனுப்புங்கள்.</li><li>24 மணி நேரத்தில் அழைத்து / WhatsApp-ல் உறுதி செய்வோம்.</li></ol>"), actions: [{ t: L("🛒 Open my cart", "🛒 என் கூடை"), go: "cart" }] }; } },
        { id: "pay", words: ["cash on delivery", "pay on delivery", "pay", "payment", "cash", "cod", "upi", "gpay", "card", "advance", "பணம்", "செலுத்த"],
          reply: function () { return { html: L("💵 <b>Cash on delivery</b> — you pay only after you receive the crackers in hand. For any other payment method, our team will tell you when they confirm the order.", "💵 <b>பெற்ற பின் பணம்</b> — பட்டாசுகள் கையில் கிடைத்த பிறகே பணம் செலுத்துங்கள். வேறு முறைகளை ஆர்டர் உறுதி செய்யும்போது எங்கள் குழு தெரிவிக்கும்.") }; } },
        { id: "delivery", words: ["deliver", "delivery", "ship", "shipping", "courier", "transport", "parcel", "lorry", "when will", "டெலிவரி", "அனுப்ப", "பார்சல்"],
          reply: function () { return { html: L("🚚 <b>Door delivery</b> is available. Parcels go only through registered, legal transport services. After you order we contact you within 24 hours to confirm the order and the delivery.", "🚚 <b>வீட்டுக்கே டெலிவரி</b> உண்டு. பதிவு செய்யப்பட்ட சட்டப்பூர்வ போக்குவரத்து மூலம் மட்டுமே பார்சல் அனுப்பப்படும். ஆர்டர் செய்த 24 மணி நேரத்தில் உறுதி செய்ய உங்களைத் தொடர்பு கொள்வோம்.") }; } },
        { id: "kids", words: ["kid", "kids", "child", "children", "baby", "school", "small", "safe cracker", "no sound", "less sound", "குழந்தை", "சிறுவர்", "பிள்ளை"],
          reply: function () { return { html: L("🧒 Kids love sparklers, flower pots, ground chakkars and fountains — colourful and gentle. Always light them with an adult nearby, and keep a bucket of water ready.", "🧒 குழந்தைகளுக்கு மத்தாப்பு, புஸ்வாணம், தரைச் சக்கரம், ஃபவுண்டன் பிடிக்கும் — வண்ணமயமானவை, மென்மையானவை. பெரியவர் அருகில் இருக்கும்போது மட்டும் வெடிக்கவும்; ஒரு வாளி தண்ணீர் வைத்திருக்கவும்."), products: pick(function (i) { return KIDS.indexOf(i.cat) !== -1; }, 4), actions: [{ t: L("🧒 Show kids' picks", "🧒 குழந்தைகளுக்கானவை"), go: "kids" }] }; } },
        { id: "safety", words: ["safety", "safe", "burn", "fire", "careful", "precaution", "பாதுகாப்பு", "தீ"],
          reply: function () { return { html: L("🛡️ Safety first:<ul><li>Light crackers in open spaces, away from vehicles and dry leaves.</li><li>Keep water or sand nearby; children only with adults.</li><li>Use a long incense stick — never lean over a cracker.</li><li>Wear cotton clothes; soak duds in water, never relight.</li></ul>", "🛡️ பாதுகாப்பு முதலில்:<ul><li>திறந்த வெளியில், வாகனங்கள், காய்ந்த இலைகளிலிருந்து தள்ளி வெடிக்கவும்.</li><li>தண்ணீர் / மணல் அருகில் வைத்திருக்கவும்; குழந்தைகள் பெரியவர்களுடன் மட்டும்.</li><li>நீண்ட ஊதுபத்தி பயன்படுத்தவும் — பட்டாசின் மேல் குனிய வேண்டாம்.</li><li>பருத்தி ஆடை அணியவும்; வெடிக்காததை தண்ணீரில் நனைக்கவும்.</li></ul>") }; } },
        { id: "business", words: ["bulk", "wholesale", "business", "dealer", "retailer", "company", "corporate", "shop owner", "resell", "gst", "gstin", "bill", "invoice", "மொத்த", "வணிக", "கடைக்கு"],
          reply: function () { return { html: L("💼 For shops, companies and bulk buyers: use the <b>quick price list</b> to type quantities fast, and you get an instant invoice" + (biz.gstin ? " with our GSTIN <b>" + esc(biz.gstin) + "</b>" : "") + ". For big quantities, send a bulk enquiry — our team replies with the best rate.", "💼 கடைகள், நிறுவனங்கள், மொத்த வாங்குபவர்களுக்கு: <b>விரைவு விலைப்பட்டியலில்</b> எண்ணிக்கையை வேகமாக உள்ளிடுங்கள்; உடனே பில் கிடைக்கும்" + (biz.gstin ? " (GSTIN <b>" + esc(biz.gstin) + "</b>)" : "") + ". அதிக அளவுக்கு மொத்த விசாரணை அனுப்புங்கள் — சிறந்த விலையுடன் பதில் தருவோம்."), actions: [{ t: L("📋 Open price list", "📋 விலைப்பட்டியல்"), go: "business" }, { t: L("💬 Send bulk enquiry", "💬 மொத்த விசாரணை"), go: "bulk" }] }; } },
        { id: "list", words: ["price list", "pricelist", "rate list", "rates", "catalogue", "catalog", "pdf", "list", "விலைப்பட்டியல்", "விலை பட்டியல்"],
          reply: function () { return { html: L("📋 The quick price list shows every item with its offer price — tap − / + or type a quantity and the total updates live.", "📋 விரைவு விலைப்பட்டியலில் எல்லா பொருட்களும் சலுகை விலையுடன் — − / + அழுத்துங்கள் அல்லது எண்ணிக்கை உள்ளிடுங்கள்; மொத்தம் உடனே மாறும்."), actions: [{ t: L("📋 Open price list", "📋 விலைப்பட்டியல்"), go: "list" }] }; } },
        { id: "cart", words: ["my cart", "cart", "total", "how much", "my order total", "கூடை", "மொத்தம்"],
          reply: function () {
              var t = cart.totals ? cart.totals() : { units: 0 };
              if (!t.units) return { html: L("Your cart is empty. Add a few crackers and I'll add up the total for you.", "உங்கள் கூடை காலியாக உள்ளது. சில பட்டாசுகளைச் சேர்த்தால் மொத்தத்தைச் சொல்கிறேன்.") };
              return { html: L("🛒 You have <b>" + t.count + "</b> product(s), " + t.units + " unit(s). You save <b>" + money(t.saving) + "</b>; overall total <b>" + money(t.total) + "</b>.", "🛒 உங்கள் கூடையில் <b>" + t.count + "</b> பொருட்கள், " + t.units + " அலகுகள். சேமிப்பு <b>" + money(t.saving) + "</b>; மொத்தம் <b>" + money(t.total) + "</b>."), actions: [{ t: L("✅ Place order", "✅ ஆர்டர் செய்"), go: "checkout" }, { t: L("🛒 Open cart", "🛒 கூடை"), go: "cart" }] };
          } },
        { id: "status", words: ["status", "track", "where is my order", "not received", "cancel", "change my order", "ஆர்டர் நிலை", "ரத்து"],
          reply: function () { return { html: L("📦 Track your order any time with your invoice number and mobile number. For changes or cancellation, our team will help you personally.", "📦 விலைப்பட்டியல் எண், மொபைல் எண் கொண்டு எப்போது வேண்டுமானாலும் ஆர்டரைக் கண்காணிக்கலாம். மாற்றம் அல்லது ரத்து செய்ய எங்கள் குழு உதவும்."), actions: [{ t: L("🚚 Track my order", "🚚 ஆர்டரைக் கண்காணி"), go: "track" }, { t: L("💬 Ask our team", "💬 குழுவிடம் கேளுங்கள்"), go: "human" }] }; } },
        { id: "legal", words: ["legal", "supreme court", "court", "allowed", "licence", "license", "law", "explosive", "சட்ட", "நீதிமன்ற"],
          reply: function () { return { html: L("⚖️ As per the 2018 Supreme Court order, firecrackers are not sold online directly. Add items to your cart and submit them as an order / enquiry — we confirm by phone or WhatsApp within 24 hours. Our shops and godowns follow the Explosives Act.", "⚖️ 2018 உச்ச நீதிமன்ற உத்தரவின்படி பட்டாசுகள் நேரடியாக ஆன்லைனில் விற்கப்படுவதில்லை. கூடையில் சேர்த்து ஆர்டர் / விசாரணையாக அனுப்புங்கள் — 24 மணி நேரத்தில் தொலைபேசி / WhatsApp-ல் உறுதி செய்வோம். எங்கள் கடைகள், கிடங்குகள் வெடிபொருள் சட்டப்படி உள்ளன."), actions: [{ t: L("📜 Read the notice", "📜 அறிவிப்பைப் படிக்க"), go: "legal" }] }; } },
        { id: "contact", words: ["contact", "phone", "call", "number", "mobile", "address", "location", "where", "shop address", "map", "visit", "email", "whatsapp", "முகவரி", "தொலைபேசி", "எங்கே", "அழைக்க"],
          reply: function () {
              var h = [];
              if (biz.phone) h.push('📞 <a href="tel:' + esc(biz.phone.replace(/[^\d+]/g, "")) + '">' + esc(biz.phone) + "</a>");
              h.push('💬 <a href="https://wa.me/' + WA + '" target="_blank" rel="noopener">WhatsApp</a>');
              if (biz.email) h.push('✉️ <a href="mailto:' + esc(biz.email) + '">' + esc(biz.email) + "</a>");
              if (biz.address) h.push("📍 " + esc(biz.address));
              return { html: L("Here's how to reach us:", "எங்களைத் தொடர்பு கொள்ள:") + "<br>" + h.join("<br>"), actions: [{ t: L("🗺️ Show on map", "🗺️ வரைபடம்"), go: "contact" }] };
          } },
        { id: "human", words: ["admin", "agent", "human", "person", "owner", "manager", "talk", "speak", "support", "help me", "complaint", "பேச", "உதவி"],
          reply: function () { return { html: L("Sure — I'll connect you to our team on WhatsApp. Your question will be filled in; just tap send. 🙏", "நிச்சயமாக — WhatsApp-ல் எங்கள் குழுவுடன் இணைக்கிறேன். உங்கள் கேள்வி நிரப்பப்படும்; அனுப்பு அழுத்துங்கள். 🙏"), actions: [{ t: L("💬 Open WhatsApp", "💬 WhatsApp திற"), go: "human" }].concat(biz.phone ? [{ t: L("📞 Call us", "📞 அழைக்க"), go: "call" }] : []) }; } },
        { id: "thanks", words: ["thanks", "thank you", "thx", "ok", "okay", "super", "nandri", "நன்றி"],
          reply: function () { return { html: L("You're welcome! 🪔 Wishing you a safe and happy Diwali.", "மிக்க மகிழ்ச்சி! 🪔 பாதுகாப்பான, இனிய தீபாவளி வாழ்த்துகள்.") }; } }
    ];

    var CHIPS = [
        { t: ["🎁 Offers", "🎁 சலுகைகள்"], q: "offer" },
        { t: ["🛒 How to order", "🛒 ஆர்டர் எப்படி"], q: "how to order" },
        { t: ["🚚 Delivery", "🚚 டெலிவரி"], q: "delivery" },
        { t: ["💵 Payment", "💵 பணம்"], q: "payment" },
        { t: ["🧒 For kids", "🧒 குழந்தைகளுக்கு"], q: "kids" },
        { t: ["💼 Bulk / business", "💼 மொத்தம் / வணிகம்"], q: "bulk" },
        { t: ["📋 Price list", "📋 விலைப்பட்டியல்"], q: "price list" },
        { t: ["💬 Talk to our team", "💬 குழுவுடன் பேச"], q: "talk to admin" }
    ];

    function norm(s) { return String(s || "").toLowerCase().replace(/[^\p{L}\p{M}\p{N}\s%]/gu, " ").replace(/\s+/g, " ").trim(); }
    function scoreIntent(q) {
        var best = null, bestScore = 0, padded = " " + q + " ";
        INTENTS.forEach(function (it) {
            var sc = 0;
            it.words.forEach(function (w) {
                var nw = norm(w);
                // Tamil words match anywhere; short English words must be whole words
                var hit = /[^\x00-\x7f]/.test(nw) ? q.indexOf(nw) !== -1 : padded.indexOf(" " + nw + " ") !== -1 || (nw.length > 4 && q.indexOf(nw) !== -1);
                if (hit) sc += nw.split(" ").length + (nw.length > 5 ? 1 : 0);
            });
            if (sc > bestScore) { bestScore = sc; best = it; }
        });
        return best;
    }
    function pick(fn, n) {
        var all = cart.items ? Object.keys(cart.items).map(function (k) { return cart.items[k]; }) : [];
        return all.filter(fn).sort(function (a, b) { return b.discount - a.discount || a.price - b.price; }).slice(0, n);
    }
    var STOP = ["price", "rate", "cost", "of", "the", "a", "an", "for", "how", "much", "is", "are", "what", "show", "me", "any", "do", "you", "have", "want", "need", "i", "my", "our", "your", "can", "please", "get", "with", "and", "in", "on", "to", "it", "available", "tell", "about", "list", "total", "order", "buy", "விலை", "என்ன", "எவ்வளவு"];
    function findProducts(q) {
        var terms = q.split(" ").filter(function (w) { return w.length > 1 && STOP.indexOf(w) === -1; });
        if (!terms.length || !cart.items) return [];
        var scored = Object.keys(cart.items).map(function (k) {
            var i = cart.items[k], words = norm(i.name + " " + (i.nameTa || "") + " " + (i.code || "") + " " + (i.cat || "").replace(/-/g, " ")).split(" ");
            // a term matches a whole word or the start of one ("pot" → "pots", "1000" → "1000 wala"), never the middle ("my" ≠ "army")
            var s = 0; terms.forEach(function (t) { if (words.some(function (w) { return w === t || (t.length >= 3 && w.indexOf(t) === 0); })) s++; });
            return { i: i, s: s };
        }).filter(function (x) { return x.s > 0; });
        var max = scored.reduce(function (m, x) { return Math.max(m, x.s); }, 0);
        return scored.filter(function (x) { return x.s === max && (max > 1 || terms.length <= 2 || x.s >= terms.length / 2); })
            .sort(function (a, b) { return a.i.price - b.i.price; }).slice(0, 5).map(function (x) { return x.i; });
    }

    function answer(raw) {
        var q = norm(raw);
        var intent = scoreIntent(q);
        var products = findProducts(q);
        var priceAsk = /price|rate|cost|how much|விலை|எவ்வளவு/.test(q);
        // a product name wins over broad intents ("flower pot price", "1000 wala")
        if (products.length && (!intent || priceAsk || ["list", "offer", "how", "greet"].indexOf(intent.id) !== -1 && q.split(" ").length > 1)) {
            return { html: L("Here's what I found" + (products.length === 5 ? " (top 5)" : "") + ":", "நான் கண்டவை" + (products.length === 5 ? " (முதல் 5)" : "") + ":"), products: products };
        }
        if (intent) return intent.reply();
        return { html: L("I'm not sure about that one yet 🤔 — our team can answer it. Tap below and your question is sent to them on WhatsApp.", "அதற்கு எனக்குத் தெரியவில்லை 🤔 — எங்கள் குழு பதில் தரும். கீழே அழுத்தினால் உங்கள் கேள்வி WhatsApp-ல் அவர்களுக்குச் செல்லும்."),
            actions: [{ t: L("💬 Ask our team", "💬 குழுவிடம் கேளுங்கள்"), go: "human" }].concat(biz.phone ? [{ t: L("📞 Call us", "📞 அழைக்க"), go: "call" }] : []) };
    }

    function productCards(list) {
        return '<div class="cb-products">' + list.map(function (i) {
            return '<div class="cb-prod"><img src="' + esc(i.photo || "") + '" alt="" loading="lazy" /><div class="min-w-0 flex-grow-1"><div class="cbp-name">' + esc(cart.name ? cart.name(i) : i.name) + '</div>' +
                '<div class="cbp-price">' + money(i.price) + (i.discount > 0 ? ' <s>' + money(i.mrp) + '</s> <span>' + i.discount + '% OFF</span>' : "") + '</div></div>' +
                '<button type="button" class="cbp-add" data-chat-add="' + i.id + '" aria-label="Add ' + esc(i.name) + '"><i class="bi bi-plus-lg"></i></button></div>';
        }).join("") + "</div>";
    }
    function bubble(m) {
        var el = document.createElement("div");
        el.className = "cb-msg " + (m.me ? "me" : "bot");
        el.innerHTML = m.me ? esc(m.text) : (m.html || "") + (m.products && m.products.length ? productCards(m.products) : "") +
            (m.actions && m.actions.length ? '<div class="cb-actions">' + m.actions.map(function (a) { return '<button type="button" data-chat-go="' + a.go + '">' + esc(a.t) + "</button>"; }).join("") + "</div>" : "");
        log.appendChild(el);
        log.scrollTop = log.scrollHeight;
    }
    function persist() { put("sessionStorage", HKEY, JSON.stringify(history.slice(-30).map(function (m) { return m.products ? { me: m.me, text: m.text, html: m.html, actions: m.actions, pids: m.products.map(function (p) { return p.id; }) } : m; }))); }
    function say(m) { history.push(m); bubble(m); persist(); }
    function renderChips() {
        chipsBox.innerHTML = CHIPS.map(function (c) { return '<button type="button" data-chat-q="' + esc(c.q) + '">' + esc(ta() ? c.t[1] : c.t[0]) + "</button>"; }).join("");
    }
    function welcome() {
        say({ html: L("Vanakkam! 🙏 I'm the <b>ePALACE Helper</b>. I can tell you about offers, prices, delivery and payment — or find any cracker for you. Type a question or tap a topic below.", "வணக்கம்! 🙏 நான் <b>ePALACE உதவியாளர்</b>. சலுகை, விலை, டெலிவரி, பணம் பற்றிச் சொல்வேன் — எந்தப் பட்டாசையும் தேடித் தருவேன். கேள்வியை எழுதுங்கள் அல்லது கீழே ஒரு தலைப்பைத் தட்டுங்கள்.") });
        say({ html: offerLine() });
    }
    function ask(text, query) {
        text = String(text || "").trim();
        if (!text) return;
        lastQuestion = text;
        say({ me: true, text: text });
        var typing = document.createElement("div");
        typing.className = "cb-msg bot typing"; typing.innerHTML = "<i></i><i></i><i></i>";
        log.appendChild(typing); log.scrollTop = log.scrollHeight;
        setTimeout(function () { typing.remove(); say(answer(query || text)); }, 450 + Math.min(600, text.length * 12));
    }
    function humanUrl() {
        var msg = L("Hello " + (biz.name || "ePALACE") + ", I have a question", "வணக்கம் " + (biz.name || "ePALACE") + ", எனக்கு ஒரு கேள்வி") + (lastQuestion ? ": " + lastQuestion : ".");
        return "https://wa.me/" + WA + "?text=" + encodeURIComponent(msg);
    }
    function go(where) {
        var scrollTo = function (sel) { var el = document.querySelector(sel); if (el) { close(); setTimeout(function () { el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 150); } else location.href = (window.SHOP_STATIC ? "index.html" : "/Shop") + (where === "list" ? "#pricelist" : sel); };
        switch (where) {
            case "offers": { var o = document.getElementById("offersOnly"); if (o) { o.checked = true; o.dispatchEvent(new Event("change")); } scrollTo("#products"); break; }
            case "list": if (cart.setView && document.querySelector("[data-view-pane]")) cart.setView("list"); scrollTo("#products"); break;
            case "kids": case "business": case "family": setAudience(where); scrollTo("#products"); break;
            case "bulk": openWa(bulkText()); break;
            case "cart": close(); var d = document.getElementById("cartDrawer"); if (d && window.bootstrap) window.bootstrap.Offcanvas.getOrCreateInstance(d).show(); break;
            case "checkout": { var c = document.querySelector("a[data-cart-checkout]"); if (c) c.click(); break; }
            case "human": window.open(humanUrl(), "_blank", "noopener"); break;
            case "call": if (biz.phone) location.href = "tel:" + biz.phone.replace(/[^\d+]/g, ""); break;
            case "legal": scrollTo("#legal"); break;
            case "track": location.href = window.SHOP_STATIC ? "https://wa.me/" + WA : "/Shop/Track"; break;
            case "contact": scrollTo("#contact"); break;
        }
    }

    function open() {
        panel.hidden = false;
        requestAnimationFrame(function () { panel.classList.add("show"); });
        fab.setAttribute("aria-expanded", "true");
        fab.classList.add("is-open");
        var dot = fab.querySelector("[data-chat-dot]"); if (dot) dot.remove();
        put("localStorage", "epalace-chat-seen", "1");
        if (!log.children.length) {
            if (history.length) history.forEach(function (m) { if (m.pids) m.products = m.pids.map(function (id) { return cart.items && cart.items[id]; }).filter(Boolean); bubble(m); });
            else welcome();
        }
        renderChips();
        if (window.matchMedia("(min-width: 577px)").matches) input.focus();
    }
    function close() {
        panel.classList.remove("show");
        fab.setAttribute("aria-expanded", "false");
        fab.classList.remove("is-open");
        setTimeout(function () { if (!panel.classList.contains("show")) panel.hidden = true; }, 220);
    }
    if (get("localStorage", "epalace-chat-seen")) { var dot0 = fab.querySelector("[data-chat-dot]"); if (dot0) dot0.remove(); }

    fab.addEventListener("click", function () { panel.classList.contains("show") ? close() : open(); });
    panel.querySelector("[data-chat-close]").addEventListener("click", function () { close(); fab.focus(); });
    panel.querySelector("[data-chat-reset]").addEventListener("click", function () { history = []; persist(); log.innerHTML = ""; lastQuestion = ""; welcome(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && panel.classList.contains("show")) { close(); fab.focus(); } });
    form.addEventListener("submit", function (e) { e.preventDefault(); var v = input.value; input.value = ""; ask(v); });
    panel.addEventListener("click", function (e) {
        var c = e.target.closest("[data-chat-q]"); if (c) { ask(c.textContent, c.getAttribute("data-chat-q")); return; }
        var g = e.target.closest("[data-chat-go]"); if (g) { go(g.getAttribute("data-chat-go")); return; }
        var a = e.target.closest("[data-chat-add]");
        if (a && cart.add) { cart.add(a.getAttribute("data-chat-add"), 1); a.classList.add("done"); a.innerHTML = '<i class="bi bi-check-lg"></i>'; }
    });
    if (human) human.addEventListener("click", function () { human.href = humanUrl(); });
    // language switch: refresh the topic chips in the new language
    document.addEventListener("click", function (e) { if (e.target.closest("[data-set-lang]")) setTimeout(renderChips, 0); });
})();

// =================================================================================================
// Checkout: live validation, "what is missing" checklist, Place order stays disabled until complete,
// digits-only phone / PIN, remembered details for returning customers. The server re-validates everything.
// =================================================================================================
(function () {
    "use strict";
    var form = document.querySelector("[data-checkout-form]");
    if (!form) return;
    var cart = window.ShopCart || {};
    function ta() { return document.documentElement.lang === "ta"; }
    function $(id) { return document.getElementById(id); }
    function digits(v) { return String(v || "").replace(/\D/g, ""); }
    function mobile(v) { var d = digits(v); if (d.length === 12 && d.indexOf("91") === 0) d = d.slice(2); else if (d.length === 11 && d.charAt(0) === "0") d = d.slice(1); return d; }
    var FIELDS = [
        { id: "CustomerName", en: "Full name", t: "முழு பெயர்", ok: function (v) { v = v.trim(); return v.length >= 2 && /[^\s\d]/.test(v) && !/[0-9<>{}\[\]@#$%^*=|\\\/]/.test(v); },
          msg: ["Please enter your full name (letters only).", "முழு பெயரை உள்ளிடவும் (எழுத்துகள் மட்டும்)."] },
        { id: "PhoneNumber", en: "Mobile number", t: "மொபைல் எண்", ok: function (v) { return /^[6-9]\d{9}$/.test(mobile(v)); },
          msg: ["Enter a 10-digit mobile number starting with 6–9.", "6–9 இல் தொடங்கும் 10 இலக்க மொபைல் எண்ணை உள்ளிடவும்."] },
        { id: "AlternatePhone", optional: true, ok: function (v) { return !v.trim() || (/^[6-9]\d{9}$/.test(mobile(v)) && mobile(v) !== mobile($("PhoneNumber").value)); },
          msg: ["Enter a different 10-digit mobile number, or leave it empty.", "வேறு 10 இலக்க எண்ணை உள்ளிடவும், அல்லது காலியாக விடவும்."] },
        { id: "Email", optional: true, ok: function (v) { return !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); },
          msg: ["Enter a valid email, or leave it empty.", "சரியான மின்னஞ்சலை உள்ளிடவும், அல்லது காலியாக விடவும்."] },
        { id: "Address", en: "Delivery address", t: "டெலிவரி முகவரி", ok: function (v) { return v.trim().length >= 10; },
          msg: ["Enter the full address — door no, street and area.", "முழு முகவரி — கதவு எண், தெரு, பகுதி."] },
        { id: "City", en: "City / town", t: "ஊர்", ok: function (v) { return v.trim().length >= 2; },
          msg: ["Enter your city or town.", "ஊரை உள்ளிடவும்."] },
        { id: "Pincode", en: "PIN code", t: "அஞ்சல் குறியீடு", ok: function (v) { return /^[1-9]\d{5}$/.test(v.trim()); },
          msg: ["PIN code must be 6 digits.", "அஞ்சல் குறியீடு 6 இலக்கங்கள்."] }
    ].filter(function (f) { return !!$(f.id); });
    var touched = {}, tried = false;

    // remembered details (this device only)
    var KEY = "epalace-customer";
    try {
        var saved = JSON.parse(localStorage.getItem(KEY) || "null");
        if (saved) FIELDS.forEach(function (f) { var el = $(f.id); if (el && !el.value && saved[f.id]) el.value = saved[f.id]; });
    } catch (e) { }

    function msgEl(f) {
        var el = $(f.id), box = el.closest(".co-field") || el.parentElement;
        var m = box.querySelector(".co-msg");
        if (!m) { m = document.createElement("div"); m.className = "co-msg"; box.appendChild(m); }
        return m;
    }
    function gate() {
        var missing = [], allOk = true;
        FIELDS.forEach(function (f) {
            var el = $(f.id), good = f.ok(el.value || "");
            if (!good) { allOk = false; if (!f.optional || (el.value || "").trim()) missing.push(f); }
            var show = touched[f.id] || tried;
            el.classList.toggle("is-valid", good && (el.value || "").trim() !== "" && show);
            el.classList.toggle("is-invalid", !good && show);
            el.setAttribute("aria-invalid", !good && show ? "true" : "false");
            var m = msgEl(f);
            m.textContent = !good && show ? f.msg[ta() ? 1 : 0] : "";
        });
        var units = cart.totals ? cart.totals().units : 0;
        var ready = allOk && units > 0;
        document.querySelectorAll("[data-place-order]").forEach(function (b) {
            if (form.dataset.busy) return;
            b.setAttribute("aria-disabled", ready ? "false" : "true");
            b.classList.toggle("is-ready", ready);
            b.querySelectorAll("[data-co-ready]").forEach(function (s) { s.classList.toggle("d-none", !ready); });
            b.querySelectorAll("[data-co-wait]").forEach(function (s) { s.classList.toggle("d-none", ready); });
        });
        var list = document.querySelector("[data-co-check]");
        if (list) {
            var items = [];
            if (units === 0) items.push('<li class="bad"><a href="/Shop"><i class="bi bi-bag-x"></i> ' + (ta() ? "கூடை காலியாக உள்ளது — பட்டாசுகளைச் சேர்க்கவும்" : "Your cart is empty — add crackers") + "</a></li>");
            FIELDS.filter(function (f) { return !f.optional; }).forEach(function (f) {
                var good = f.ok($(f.id).value || "");
                items.push('<li class="' + (good ? "good" : "bad") + '"><button type="button" data-co-jump="' + f.id + '"><i class="bi ' + (good ? "bi-check-circle-fill" : "bi-circle") + '"></i> ' + (ta() ? f.t : f.en) + "</button></li>");
            });
            list.innerHTML = ready ? "" : items.join("");
        }
        var hint = document.querySelector("[data-co-hint]");
        if (hint) hint.textContent = ready ? (ta() ? "தயார் — ஆர்டர் செய்யுங்கள்" : "Ready — place your order")
            : units === 0 ? (ta() ? "கூடை காலியாக உள்ளது" : "Your cart is empty")
            : (ta() ? "நிரப்ப வேண்டியவை: " : "Still needed: ") + missing.map(function (f) { return ta() ? (f.t || f.id) : (f.en || f.id); }).join(", ");
        return ready;
    }
    window.ShopCheckoutGate = gate;
    form.setAttribute("data-js", "1");   // the live messages below replace the per-field jQuery ones

    FIELDS.forEach(function (f) {
        var el = $(f.id);
        el.addEventListener("input", function () {
            if (el.hasAttribute("data-digits")) {   // phones / PIN: digits only (a leading + is allowed for +91)
                var v = el.value, clean = v.replace(/(?!^\+)[^\d]/g, "");
                if (clean !== v) el.value = clean;
            }
            if (el.classList.contains("is-invalid")) touched[f.id] = true;
            gate();
        });
        el.addEventListener("blur", function () { if ((el.value || "").trim() || tried) touched[f.id] = true; gate(); });
    });
    document.addEventListener("click", function (e) {
        var j = e.target.closest("[data-co-jump]");
        if (j) { var el = $(j.getAttribute("data-co-jump")); touched[el.id] = true; gate(); el.scrollIntoView({ behavior: "smooth", block: "center" }); setTimeout(function () { el.focus(); }, 250); }
    });
    // runs before the other submit handlers (capture phase): stop incomplete orders and show what is missing
    document.addEventListener("submit", function (e) {
        if (e.target !== form) return;
        tried = true;
        if (!gate()) {
            e.preventDefault(); e.stopImmediatePropagation();
            var first = FIELDS.filter(function (f) { return !f.ok($(f.id).value || ""); })[0];
            if (first) { $(first.id).scrollIntoView({ behavior: "smooth", block: "center" }); setTimeout(function () { $(first.id).focus(); }, 250); }
            else if (cart.toast) cart.toast(ta() ? "கூடை காலியாக உள்ளது" : "Your cart is empty");
            return;
        }
        var rem = form.querySelector("[data-remember]");
        try {
            if (rem && rem.checked) { var o = {}; FIELDS.forEach(function (f) { if (f.id !== "Notes") o[f.id] = $(f.id).value; }); localStorage.setItem(KEY, JSON.stringify(o)); }
            else localStorage.removeItem(KEY);
        } catch (err) { }
    }, true);
    document.addEventListener("click", function (e) { if (e.target.closest("[data-set-lang]")) setTimeout(gate, 0); });
    // server returned validation errors: show them straight away
    if (form.querySelector(".field-validation-error, .validation-summary-errors")) tried = true;
    gate();
})();

// =================================================================================================
// Catalogue filters: category chips, clear-search button, active-filter pills ("Clear all")
// =================================================================================================
(function () {
    "use strict";
    var chipsBox = document.querySelector("[data-cat-chips]");
    var catSel = document.getElementById("shopCat"), search = document.getElementById("shopSearch");
    var offers = document.getElementById("offersOnly"), sort = document.getElementById("shopSort");
    var active = document.querySelector("[data-active-filters]"), clear = document.querySelector("[data-search-clear]");
    if (!chipsBox || !catSel) return;
    function ta() { return document.documentElement.lang === "ta"; }
    function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
    function fire(el, type) { el.dispatchEvent(new Event(type, { bubbles: true })); }

    function syncChips() {
        chipsBox.querySelectorAll("[data-cat-chip]").forEach(function (c) {
            var on = c.getAttribute("data-cat-chip") === catSel.value;
            c.classList.toggle("active", on); c.setAttribute("aria-selected", on ? "true" : "false");
        });
        var cur = chipsBox.querySelector(".cat-chip.active");
        if (cur && cur.scrollIntoView) { var box = chipsBox.getBoundingClientRect(), r = cur.getBoundingClientRect(); if (r.left < box.left || r.right > box.right) chipsBox.scrollBy({ left: r.left - box.left - 40, behavior: "smooth" }); }
        arrows();
    }
    function arrows() {
        var wrap = chipsBox.parentElement;
        wrap.classList.toggle("can-prev", chipsBox.scrollLeft > 4);
        wrap.classList.toggle("can-next", chipsBox.scrollLeft + chipsBox.clientWidth < chipsBox.scrollWidth - 4);
    }
    function renderActive() {
        if (clear && search) clear.classList.toggle("d-none", !search.value);
        if (!active) return;
        var pills = [];
        if (search && search.value.trim()) pills.push({ k: "q", t: "🔎 “" + search.value.trim() + "”" });
        if (catSel.value) {
            var c = chipsBox.querySelector('[data-cat-chip="' + catSel.value + '"]'), nm = c && (c.querySelector(".cc-name " + (ta() ? ".ta-only" : ".en-only")) || c.querySelector(".cc-name"));
            pills.push({ k: "cat", t: c ? c.querySelector(".cc-emo").textContent + " " + nm.textContent.trim() : catSel.value });
        }
        if (offers && offers.checked) pills.push({ k: "offers", t: "🔥 " + (ta() ? "சலுகைகள்" : "Offers") });
        var aud = document.body.getAttribute("data-audience");
        if (aud) { var a = document.querySelector('.aud-chip[data-audience="' + aud + '"]'); pills.push({ k: "aud", t: a ? a.firstChild.textContent.trim() + " " + (a.querySelector(".en-only, .ta-only") ? "" : "") : aud }); }
        if (sort && sort.value) pills.push({ k: "sort", t: "↕ " + sort.options[sort.selectedIndex].textContent });
        active.classList.toggle("d-none", pills.length === 0);
        // only touch the DOM when something changed — rebuilding during a tap (blur → change) would swallow the click
        var html = pills.map(function (p) { return '<button type="button" class="af-pill" data-af="' + p.k + '">' + esc(p.t) + ' <i class="bi bi-x"></i></button>'; }).join("") +
            (pills.length > 1 ? '<button type="button" class="af-clear" data-af="all">' + (ta() ? "அனைத்தையும் நீக்கு" : "Clear all") + "</button>" : "");
        if (active.getAttribute("data-html") !== html) { active.innerHTML = html; active.setAttribute("data-html", html); }
    }
    function audLabel() {
        var aud = document.body.getAttribute("data-audience"), a = aud && document.querySelector('.aud-chip[data-audience="' + aud + '"]');
        if (!a) return aud;
        var span = a.querySelector(ta() ? ".ta-only" : ".en-only");
        return (a.textContent.trim().split(" ")[0] || "") + " " + (span ? span.textContent : "");
    }
    // nicer audience text in the pill
    var baseRender = renderActive;
    renderActive = function () {
        baseRender();
        var p = active && active.querySelector('[data-af="aud"]'), want = esc(audLabel()) + ' <i class="bi bi-x"></i>';
        if (p && p.innerHTML !== want) p.innerHTML = want;
    };

    chipsBox.addEventListener("click", function (e) {
        var c = e.target.closest("[data-cat-chip]");
        if (!c) return;
        catSel.value = c.getAttribute("data-cat-chip");
        fire(catSel, "change");
        syncChips(); renderActive();
        var p = document.getElementById("products");
        if (p && p.getBoundingClientRect().top < 0) p.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    document.addEventListener("click", function (e) {
        var s = e.target.closest("[data-cc-scroll]");
        if (s) chipsBox.scrollBy({ left: parseInt(s.getAttribute("data-cc-scroll"), 10) * chipsBox.clientWidth * 0.7, behavior: "smooth" });
        var af = e.target.closest("[data-af]");
        if (af) {
            var k = af.getAttribute("data-af");
            if ((k === "q" || k === "all") && search) { search.value = ""; fire(search, "input"); }
            if (k === "cat" || k === "all") { catSel.value = ""; fire(catSel, "change"); }
            if ((k === "offers" || k === "all") && offers && offers.checked) { offers.checked = false; fire(offers, "change"); }
            if ((k === "sort" || k === "all") && sort) { sort.value = ""; fire(sort, "change"); }
            if (k === "aud" || k === "all") { var ev = document.querySelector('.aud-chip[data-audience=""]'); if (ev) ev.click(); }
            syncChips(); setTimeout(renderActive, 0);
        }
        if (e.target.closest(".aud-chip")) setTimeout(renderActive, 0);
        if (e.target.closest("[data-cat-link]")) setTimeout(function () { syncChips(); renderActive(); }, 0);   // category tiles reset the filter in shop.js
        if (e.target.closest("[data-set-lang]")) setTimeout(renderActive, 0);
    });
    if (clear) clear.addEventListener("click", function () { search.value = ""; fire(search, "input"); search.focus(); });
    [search, offers, sort].forEach(function (el) { if (el) { el.addEventListener("input", renderActive); el.addEventListener("change", renderActive); } });
    catSel.addEventListener("change", function () { syncChips(); renderActive(); });
    chipsBox.addEventListener("scroll", arrows, { passive: true });
    window.addEventListener("resize", arrows);
    if (search) search.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); search.blur(); var p = document.getElementById("products"); if (p) p.scrollIntoView({ behavior: "smooth" }); } });
    renderActive();
    requestAnimationFrame(function () { syncChips(); });
})();

// =================================================================================================
// Wishlist (saved on this device) + search suggestions
// =================================================================================================
(function () {
    "use strict";
    var cart = window.ShopCart || {};
    var items = cart.items || {};
    function ta() { return document.documentElement.lang === "ta"; }
    function L(en, t) { return ta() ? t : en; }
    function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
    function money(v) { return cart.money ? cart.money(v) : "₹" + v; }
    function nm(i) { return cart.name ? cart.name(i) : i.name; }
    function toast(m) { if (cart.toast) cart.toast(m); }
    function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? d : v; } catch (e) { return d; } }
    function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }

    // ---------------------------------------------------------------- wishlist
    var WKEY = "epalace-wish";
    var wish = (load(WKEY, []) || []).map(String).filter(function (id, i, a) { return items[id] && a.indexOf(id) === i; });
    function has(id) { return wish.indexOf(String(id)) !== -1; }
    function heart(id, cls) {
        return '<button type="button" class="' + cls + '" data-wish="' + id + '" aria-pressed="false" aria-label="' + esc(L("Save to wishlist", "விருப்பப் பட்டியலில் சேர்")) + '"><i class="bi bi-heart"></i></button>';
    }
    // hearts on product cards and price-list rows
    document.querySelectorAll(".product-card[data-item] .fest-art").forEach(function (art) {
        var id = art.closest("[data-item]").getAttribute("data-item");
        art.insertAdjacentHTML("beforeend", heart(id, "wish-btn"));
    });
    function rowHearts() {
        document.querySelectorAll("tr[data-item] .pl-prod").forEach(function (p) {
            if (p.querySelector(".wish-btn")) return;
            var id = p.closest("[data-item]").getAttribute("data-item");
            p.insertAdjacentHTML("beforeend", heart(id, "wish-btn wish-sm"));
        });
    }
    rowHearts();
    document.addEventListener("shop:pricelist", function () { rowHearts(); renderWish(); });

    function renderWish() {
        document.querySelectorAll("[data-wish-count]").forEach(function (c) { c.textContent = String(wish.length); c.classList.toggle("d-none", wish.length === 0 && c.classList.contains("wish-count")); });
        document.querySelectorAll(".wish-hdr").forEach(function (b) { b.classList.toggle("has", wish.length > 0); var i = b.querySelector(".bi"); if (i) i.className = "bi " + (wish.length ? "bi-heart-fill" : "bi-heart"); });
        document.querySelectorAll("[data-wish]").forEach(function (b) {
            var on = has(b.getAttribute("data-wish"));
            b.classList.toggle("on", on); b.setAttribute("aria-pressed", on ? "true" : "false");
            b.setAttribute("aria-label", on ? L("Remove from wishlist", "பட்டியலிலிருந்து நீக்கு") : L("Save to wishlist", "விருப்பப் பட்டியலில் சேர்"));
            var i = b.querySelector(".bi"); if (i) i.className = "bi " + (on ? "bi-heart-fill" : "bi-heart");
        });
        var box = document.querySelector("[data-wish-lines]");
        if (box) {
            box.innerHTML = wish.length ? wish.map(function (id) {
                var i = items[id];
                return '<div class="wish-line" data-id="' + id + '"><img src="' + esc(i.photo || "") + '" alt="" loading="lazy" />' +
                    '<div class="flex-grow-1 min-w-0"><div class="fw-700 truncate">' + esc(nm(i)) + '</div>' +
                    '<div class="fs-12"><b class="wish-price">' + money(i.price) + '</b>' + (i.mrp > i.price ? ' <s class="text-muted">' + money(i.mrp) + '</s> <span class="text-ok fw-700">' + i.discount + '% OFF</span>' : "") + '</div></div>' +
                    '<button type="button" class="btn btn-sm btn-fest" data-wish-add="' + id + '" aria-label="' + esc(L("Add to cart", "கூடையில் சேர்")) + '"><i class="bi bi-bag-plus"></i></button>' +
                    '<button type="button" class="btn btn-sm btn-light" data-wish="' + id + '" aria-label="' + esc(L("Remove", "நீக்கு")) + '"><i class="bi bi-x-lg"></i></button></div>';
            }).join("") : '<div class="wish-empty"><i class="bi bi-heart"></i><div class="fw-700">' + esc(L("Your wishlist is empty", "உங்கள் பட்டியல் காலியாக உள்ளது")) + '</div><div class="fs-13">' +
                esc(L("Tap ♥ on any cracker to save it for later.", "பின்னர் வாங்க எந்தப் பட்டாசிலும் ♥ தட்டுங்கள்.")) + "</div></div>";
        }
        var acts = document.querySelector("[data-wish-actions]");
        if (acts) acts.classList.toggle("d-none", wish.length === 0);
        var tot = document.querySelector("[data-wish-total]");
        if (tot) tot.textContent = money(wish.reduce(function (s, id) { return s + items[id].price; }, 0));
    }
    function toggle(id, btn) {
        id = String(id);
        if (!items[id]) return;
        if (has(id)) { wish.splice(wish.indexOf(id), 1); toast(L("Removed from wishlist", "பட்டியலிலிருந்து நீக்கப்பட்டது")); }
        else { wish.unshift(id); toast("♥ " + nm(items[id]) + " — " + L("saved to your wishlist", "விருப்பப் பட்டியலில் சேர்க்கப்பட்டது")); }
        save(WKEY, wish); renderWish();
        if (btn) { btn.classList.remove("pop"); void btn.offsetWidth; btn.classList.add("pop"); }
    }
    document.addEventListener("click", function (e) {
        var w = e.target.closest("[data-wish]");
        if (w) { e.preventDefault(); e.stopPropagation(); toggle(w.getAttribute("data-wish"), w); return; }
        var a = e.target.closest("[data-wish-add]");
        if (a && cart.add) { cart.add(a.getAttribute("data-wish-add"), 1); return; }
        if (e.target.closest("[data-wish-all]") && cart.add) {
            wish.forEach(function (id) { cart.add(id, 1); });
            toast(L(wish.length + " items added to your cart", wish.length + " பொருட்கள் கூடையில் சேர்க்கப்பட்டன"));
            return;
        }
        if (e.target.closest("[data-wish-clear]")) { wish = []; save(WKEY, wish); renderWish(); return; }
        if (e.target.closest("[data-wish-share]")) {
            var msg = L("My ePALACE crackers wishlist:", "என் ePALACE பட்டாசு விருப்பப் பட்டியல்:") + "\n" +
                wish.map(function (id, n) { var i = items[id]; return (n + 1) + ". " + nm(i) + " — " + money(i.price); }).join("\n") + "\n\n" + location.origin + "/";
            window.open("https://wa.me/?text=" + encodeURIComponent(msg), "_blank", "noopener");
        }
    }, true);   // capture: hearts sit on the photo, which has its own click (photo popup)
    window.addEventListener("storage", function (e) { if (e.key === WKEY) { wish = (load(WKEY, []) || []).map(String).filter(function (id) { return items[id]; }); renderWish(); } });
    document.addEventListener("click", function (e) { if (e.target.closest("[data-set-lang]")) setTimeout(renderWish, 0); });
    renderWish();
    window.ShopWish = { toggle: toggle, list: function () { return wish.slice(); } };

    // ---------------------------------------------------------------- search suggestions
    var input = document.getElementById("shopSearch");
    var wrap = input && input.closest(".ft-search");
    if (!input || !wrap) return;
    function norm(s) { return String(s || "").toLowerCase().replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim(); }
    var catNames = {};
    document.querySelectorAll("[data-cat-chip]").forEach(function (c) {
        var k = c.getAttribute("data-cat-chip"); if (!k) return;
        var en = c.querySelector(".cc-name .en-only"), tn = c.querySelector(".cc-name .ta-only");
        catNames[k] = { en: en ? en.textContent : k, ta: tn ? tn.textContent : k, emo: (c.querySelector(".cc-emo") || {}).textContent || "", n: (c.querySelector(".cc-n") || {}).textContent || "" };
    });
    var index = Object.keys(items).map(function (id) {
        var i = items[id], cn = catNames[i.cat] || { en: "", ta: "" };
        return { id: id, i: i, words: norm(i.name + " " + (i.nameTa || "") + " " + cn.en + " " + cn.ta + " " + (i.cat || "").replace(/-/g, " ")).split(" "), nameN: norm(i.name), taN: norm(i.nameTa || "") };
    });
    function lev1(a, b) {   // true when a and b differ by at most one edit (typo tolerance)
        if (Math.abs(a.length - b.length) > 1) return false;
        var i = 0, j = 0, edits = 0;
        while (i < a.length && j < b.length) {
            if (a[i] === b[j]) { i++; j++; continue; }
            if (++edits > 1) return false;
            if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
        }
        return edits + (a.length - i) + (b.length - j) <= 1;
    }
    function search(q) {
        var terms = norm(q).split(" ").filter(Boolean);
        if (!terms.length) return [];
        return index.map(function (e) {
            var score = 0;
            for (var t = 0; t < terms.length; t++) {
                var term = terms[t], best = 0;
                e.words.forEach(function (w) {
                    if (w === term) best = Math.max(best, 4);
                    else if (w.indexOf(term) === 0) best = Math.max(best, 3);
                    else if (term.length >= 3 && w.indexOf(term) > 0) best = Math.max(best, 1.5);
                    else if (term.length >= 4 && lev1(term, w.slice(0, Math.max(term.length, Math.min(w.length, term.length + 1))))) best = Math.max(best, 1);
                });
                if (!best) return null;   // every word typed must match something
                score += best;
            }
            if (e.nameN.indexOf(terms[0]) === 0 || e.taN.indexOf(terms[0]) === 0) score += 2;
            return { e: e, s: score };
        }).filter(Boolean).sort(function (a, b) { return b.s - a.s || a.e.i.price - b.e.i.price; }).slice(0, 7).map(function (x) { return x.e; });
    }
    function mark(text, q) {
        var terms = norm(q).split(" ").filter(function (t) { return t.length > 0; }), low = text.toLowerCase(), hits = [];
        terms.forEach(function (t) { var k = low.indexOf(t); if (k !== -1) hits.push([k, k + t.length]); });
        hits.sort(function (a, b) { return a[0] - b[0]; });
        var out = "", pos = 0;
        hits.forEach(function (h) { if (h[0] < pos) return; out += esc(text.slice(pos, h[0])) + "<mark>" + esc(text.slice(h[0], h[1])) + "</mark>"; pos = h[1]; });
        return out + esc(text.slice(pos));
    }

    var drop = document.createElement("div");
    drop.className = "ss-drop"; drop.id = "shopSuggest"; drop.setAttribute("role", "listbox"); drop.hidden = true;
    wrap.appendChild(drop);
    input.setAttribute("role", "combobox"); input.setAttribute("aria-autocomplete", "list"); input.setAttribute("aria-controls", "shopSuggest"); input.setAttribute("aria-expanded", "false");
    var RKEY = "epalace-recent-search", opts = [], active = -1;
    var POPULAR = ["1000 wala", "flower pot", "sparklers", "rocket", "chakkar", "gift box"];

    function open(html) {
        drop.innerHTML = html; drop.hidden = !html; input.setAttribute("aria-expanded", html ? "true" : "false");
        opts = Array.prototype.slice.call(drop.querySelectorAll("[data-ss]")); setActive(-1);
    }
    function close() { drop.hidden = true; input.setAttribute("aria-expanded", "false"); active = -1; input.removeAttribute("aria-activedescendant"); }
    function setActive(n) {
        active = n;
        opts.forEach(function (o, k) { o.classList.toggle("active", k === n); o.setAttribute("aria-selected", k === n ? "true" : "false"); });
        if (n >= 0 && opts[n]) { input.setAttribute("aria-activedescendant", opts[n].id); opts[n].scrollIntoView({ block: "nearest" }); } else input.removeAttribute("aria-activedescendant");
    }
    function renderSuggest() {
        var q = input.value.trim();
        if (!q) {
            var recent = load(RKEY, []) || [];
            var html = "";
            if (recent.length) html += '<div class="ss-head">' + esc(L("Recent searches", "சமீபத்திய தேடல்கள்")) + '<button type="button" class="ss-clear-recent" data-ss-clear>' + esc(L("Clear", "நீக்கு")) + "</button></div>" +
                recent.map(function (r, k) { return '<div class="ss-opt ss-term" role="option" id="ss-r' + k + '" data-ss="term" data-v="' + esc(r) + '"><i class="bi bi-clock-history"></i> ' + esc(r) + "</div>"; }).join("");
            html += '<div class="ss-head">' + esc(L("Popular", "பிரபலமானவை")) + '</div><div class="ss-pop">' +
                POPULAR.map(function (p, k) { return '<button type="button" class="ss-chip" role="option" id="ss-p' + k + '" data-ss="term" data-v="' + esc(p) + '">🔥 ' + esc(p) + "</button>"; }).join("") + "</div>";
            open(html); return;
        }
        var res = search(q), qn = norm(q);
        var cats = Object.keys(catNames).filter(function (k) { var c = catNames[k]; return norm(c.en).indexOf(qn) !== -1 || norm(c.ta).indexOf(qn) !== -1 || k.indexOf(qn.replace(/ /g, "-")) !== -1; }).slice(0, 2);
        var html2 = cats.map(function (k, n) { var c = catNames[k]; return '<div class="ss-opt ss-cat" role="option" id="ss-c' + n + '" data-ss="cat" data-v="' + k + '"><span class="ss-emo">' + esc(c.emo) + "</span><span>" + mark(ta() ? c.ta : c.en, q) + ' <small>· ' + esc(c.n) + " " + esc(L("items", "பொருட்கள்")) + '</small></span><i class="bi bi-arrow-right ms-auto"></i></div>'; }).join("");
        html2 += res.map(function (e, n) {
            var i = e.i, name = nm(i);
            return '<div class="ss-opt ss-prod" role="option" id="ss-i' + n + '" data-ss="item" data-v="' + e.id + '">' +
                '<img src="' + esc(i.photo || "") + '" alt="" loading="lazy" /><div class="min-w-0 flex-grow-1"><div class="ss-name">' + mark(name, q) + "</div>" +
                '<div class="ss-price"><b>' + money(i.price) + "</b>" + (i.mrp > i.price ? " <s>" + money(i.mrp) + '</s> <span>' + i.discount + "% OFF</span>" : "") + "</div></div>" +
                '<button type="button" class="ss-add" data-ss-add="' + e.id + '" aria-label="' + esc(L("Add to cart", "கூடையில் சேர்")) + '"><i class="bi bi-plus-lg"></i></button></div>';
        }).join("");
        if (!html2) html2 = '<div class="ss-none"><i class="bi bi-emoji-frown"></i> ' + esc(L("No crackers match “" + q + "”. Try another word or ask our chat helper.", "“" + q + "” பொருந்தவில்லை. வேறு சொல்லை முயற்சிக்கவும் அல்லது உதவியாளரிடம் கேளுங்கள்.")) + "</div>";
        else html2 += '<div class="ss-foot" data-ss="all" role="option" id="ss-all">' + esc(L("See all results for “" + q + "”", "“" + q + "” க்கான எல்லா முடிவுகளும்")) + " ↵</div>";
        open(html2);
    }
    function remember(q) {
        q = (q || "").trim(); if (q.length < 2) return;
        var r = (load(RKEY, []) || []).filter(function (x) { return x.toLowerCase() !== q.toLowerCase(); });
        r.unshift(q); save(RKEY, r.slice(0, 5));
    }
    function fire(el, t) { el.dispatchEvent(new Event(t, { bubbles: true })); }
    function goTo(id) {
        // show everything, then bring the product into view and flash it
        remember(input.value);
        input.value = ""; fire(input, "input"); clearTimeout(input._ss); input.blur();   // don't reopen the list
        var cat = document.getElementById("shopCat"); if (cat && cat.value) { cat.value = ""; fire(cat, "change"); }
        var off = document.getElementById("offersOnly"); if (off && off.checked) { off.checked = false; fire(off, "change"); }
        if (document.body.getAttribute("data-audience")) { var ev = document.querySelector('.aud-chip[data-audience=""]'); if (ev) ev.click(); }
        close();
        setTimeout(function () {
            var el = document.querySelector('[data-view-pane]:not(.d-none) [data-item="' + id + '"]');
            if (!el) return;
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.remove("ss-flash"); void el.offsetWidth; el.classList.add("ss-flash");
        }, 120);
    }
    function choose(o) {
        var kind = o.getAttribute("data-ss"), v = o.getAttribute("data-v");
        if (kind === "item") goTo(v);
        else if (kind === "cat") { remember(input.value); input.value = ""; fire(input, "input"); clearTimeout(input._ss); input.blur(); var chip = document.querySelector('[data-cat-chip="' + v + '"]'); if (chip) chip.click(); close(); }
        else if (kind === "term") { input.value = v; fire(input, "input"); renderSuggest(); input.focus(); }
        else if (kind === "all") { remember(input.value); close(); var p = document.getElementById("products"); if (p) p.scrollIntoView({ behavior: "smooth" }); }
    }

    input.addEventListener("input", function () { clearTimeout(input._ss); input._ss = setTimeout(renderSuggest, 90); });
    input.addEventListener("focus", renderSuggest);
    document.addEventListener("keydown", function (e) {
        if (e.target !== input || drop.hidden) return;
        if (e.key === "ArrowDown") { e.preventDefault(); setActive(Math.min(opts.length - 1, active + 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setActive(Math.max(-1, active - 1)); }
        else if (e.key === "Escape") { e.preventDefault(); close(); }
        else if (e.key === "Enter") {
            remember(input.value);
            if (active >= 0 && opts[active]) { e.preventDefault(); e.stopImmediatePropagation(); choose(opts[active]); }
            else close();
        }
    }, true);
    drop.addEventListener("mousedown", function (e) { e.preventDefault(); });   // keep focus in the box while clicking
    drop.addEventListener("click", function (e) {
        var add = e.target.closest("[data-ss-add]");
        if (add && cart.add) { cart.add(add.getAttribute("data-ss-add"), 1); add.classList.add("done"); add.innerHTML = '<i class="bi bi-check-lg"></i>'; return; }
        if (e.target.closest("[data-ss-clear]")) { save(RKEY, []); renderSuggest(); return; }
        var o = e.target.closest("[data-ss]"); if (o) choose(o);
    });
    // outside click closes; use the event path because the "+" button swaps its icon during the click
    document.addEventListener("click", function (e) { var p = e.composedPath ? e.composedPath() : [e.target]; if (p.indexOf(wrap) === -1) close(); });
    // close when focus leaves the search box and its list (tapping "+" inside the list keeps it open)
    wrap.addEventListener("focusout", function (e) { setTimeout(function () { if (!wrap.contains(document.activeElement)) close(); }, 150); });
})();
