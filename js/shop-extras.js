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

    // ---- keep sticky elements under the (taller) header
    var header = document.querySelector(".shop-header");
    function measure() { if (header) document.documentElement.style.setProperty("--shop-hdr", header.offsetHeight + "px"); }
    measure(); window.addEventListener("resize", measure);

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
                if (el && el.textContent !== v) { el.textContent = v; el.classList.remove("flip"); void el.offsetWidth; el.classList.add("flip"); }
            });
            box.classList.toggle("over", t.ms === 0);
        });
        document.querySelectorAll("[data-cd-live]").forEach(function (e) { e.classList.toggle("d-none", t.ms === 0); });
        document.querySelectorAll("[data-cd-over]").forEach(function (e) { e.classList.toggle("d-none", t.ms > 0); });
    }
    tick(); setInterval(tick, 1000);

    // ---- welcome offer popup: once per visit, after the loader, only while the offer is running
    var pop = document.getElementById("offerPop");
    if (pop && window.bootstrap && (!ends || left().ms > 0) && !get("sessionStorage", "epalace-offer-seen") && !/[?&]nopopup/.test(location.search)) {
        setTimeout(function () {
            if (document.querySelector(".modal.show, .offcanvas.show")) return;
            window.bootstrap.Modal.getOrCreateInstance(pop).show();
            put("sessionStorage", "epalace-offer-seen", "1");
        }, 1400);
    }

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
          reply: function () { return { html: L("📦 For the status of an order, changes or cancellation, our team will help you personally — tap below and send your name and phone number.", "📦 ஆர்டர் நிலை, மாற்றம் அல்லது ரத்து செய்ய எங்கள் குழு நேரடியாக உதவும் — கீழே அழுத்தி உங்கள் பெயர், தொலைபேசி எண்ணை அனுப்புங்கள்."), actions: [{ t: L("💬 Ask our team", "💬 குழுவிடம் கேளுங்கள்"), go: "human" }] }; } },
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
