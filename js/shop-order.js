// ePalace WhatsApp order page (/order, order.html on the backup shop).
// New order: the cart (localStorage "epalace-cart") is shown as an invoice-style order; the customer adds name, mobile,
// address and PIN, and "Send" opens WhatsApp with a short message and a link to /order#o=<data>.
// Opened from that link (#o=…): the same order page, built only from the link — no server or database needed, so the
// shop can open it whether the main site or the backup is serving. Prices are the ones the customer saw.
(function () {
    "use strict";
    var items = {};
    (window.SHOP_ITEMS || []).forEach(function (i) { items[i.id] = i; });
    var biz = window.SHOP_BIZ || {}, WA = window.SHOP_WA || "919488127540";
    var ME = "epalace-order-me";
    var $ = function (id) { return document.getElementById(id); };

    function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
    function L(en, ta) { return '<span class="en-only">' + esc(en) + '</span><span class="ta-only" lang="ta">' + esc(ta) + "</span>"; }
    function ta() { return document.documentElement.lang === "ta"; }
    function money(v) { return "₹" + (Number(v) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
    function asset(u) { return window.SHOP_STATIC ? String(u || "").replace(/^\//, "") : u; }

    // ---- link data: base64url(JSON {r,t,n,p,a,c,m,l:[[itemId,qty,price]]}) — names and MRP come from the catalogue
    function enc(o) {
        var b = new TextEncoder().encode(JSON.stringify(o)), s = "";
        for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
        return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }
    function dec(s) {
        try {
            s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "=";
            var bin = atob(s), b = new Uint8Array(bin.length);
            for (var i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
            var o = JSON.parse(new TextDecoder().decode(b));
            return o && Array.isArray(o.l) ? o : null;
        } catch (e) { return null; }
    }
    function pageUrl() {
        // the public address, so the link works for the shop whichever copy (main / backup) is serving
        var host = /^(localhost|127\.|192\.168\.)/.test(location.hostname) ? location.origin : "https://epalace.online";
        return host + "/order";
    }

    function cartLines() {
        var cart = {};
        try { cart = JSON.parse(localStorage.getItem("epalace-cart") || "{}") || {}; } catch (e) { }
        return Object.keys(cart).filter(function (id) { return items[id] && cart[id] > 0; }).map(function (id) {
            var it = items[id];
            return [it.id, +cart[id], it.price];
        }).sort(function (a, b) { return String(items[a[0]].name).localeCompare(String(items[b[0]].name)); });
    }
    function newRef() {
        var d = new Date(), p = function (n) { return (n < 10 ? "0" : "") + n; };
        return "WA-" + p(d.getDate()) + p(d.getMonth() + 1) + "-" + String(Math.floor(1000 + Math.random() * 9000));
    }

    // ---- the order document (same look as the festive invoice)
    function render(o, sent) {
        var t = { units: 0, total: 0, mrp: 0 };
        function mrpOf(l) { var it = items[l[0]]; return it && it.mrp > l[2] ? it.mrp : l[2]; }
        o.l.forEach(function (l) { t.units += l[1]; t.total += l[1] * l[2]; t.mrp += l[1] * mrpOf(l); });
        var when = new Date(o.t || Date.now());
        var date = when.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        var rows = o.l.map(function (l, i) {
            var it = items[l[0]] || {}, name = it.name || ("Item #" + l[0]), nameTa = it.nameTa || name, mrp = mrpOf(l);
            var pic = it.photo ? '<img class="oslip-pic" src="' + esc(asset(it.photo)) + '" alt="" loading="lazy">' : '<span class="oslip-pic oslip-emo">' + esc(it.emoji || "🎆") + "</span>";
            var strike = mrp > l[2] ? '<span class="finv-mrp">' + money(mrp) + "</span>" : "";
            return '<tr><td class="c-no">' + (i + 1) + '</td><td><div class="oslip-item">' + pic + "<b>" + L(name, nameTa) + "</b></div></td>" +
                '<td class="c-qty">' + l[1] + '</td><td class="c-amt">' + strike + money(l[2]) + '</td><td class="c-amt"><b>' + money(l[1] * l[2]) + "</b></td></tr>";
        }).join("");
        var saved = t.mrp - t.total;
        var cust = o.n
            ? '<div class="fp-name">' + esc(o.n) + "</div><div>" + esc(o.a || "") + (o.c ? " – " + esc(o.c) : "") + '</div><div><i class="bi bi-telephone"></i> ' + esc(o.p || "") + "</div>" + (o.m ? '<div class="oslip-note"><i class="bi bi-chat-left-text"></i> ' + esc(o.m) + "</div>" : "")
            : '<div class="text-muted">' + L("Fill in your details above", "மேலே உங்கள் விவரங்களை நிரப்பவும்") + "</div>";
        var logo = asset("/img/logo-192.png"), hero = asset("/img/shop/hero-sm.jpg");
        if (window.SHOP_STATIC) hero = "../" + hero;   // css variable urls resolve from css/
        $("oslipDoc").innerHTML =
            '<article class="finv oslip" data-oslip>' +
            '<header class="finv-head" style="--inv-img:url(\'' + esc(hero) + '\')"><div class="finv-brand"><img src="' + esc(logo) + '" alt="" class="finv-logo"><div>' +
            '<div class="finv-name">' + esc(biz.name || "E-PALACE") + '</div><div class="finv-tag">' + L("Crackers & gift boxes", "பட்டாசுகள் & பரிசுப் பெட்டிகள்") + "</div>" +
            '<div class="finv-meta">' + (biz.address ? '<div><i class="bi bi-geo-alt"></i> ' + esc(biz.address) + "</div>" : "") + (biz.phone ? '<span><i class="bi bi-telephone"></i> ' + esc(biz.phone) + "</span>" : "") + "</div></div></div>" +
            '<div class="finv-title"><div class="finv-word">' + L("ORDER", "ஆர்டர்") + '</div><div class="finv-no">' + esc(o.r) + '</div><div class="finv-date">' + L("Date", "தேதி") + ": <b>" + esc(date) + "</b></div>" +
            '<div class="oslip-state ' + (sent ? "sent" : "draft") + '">' + (sent ? L("Order request received on WhatsApp", "WhatsApp-ல் பெற்ற ஆர்டர்") : L("Not sent yet", "இன்னும் அனுப்பப்படவில்லை")) + "</div></div></header>" +
            '<div class="finv-ribbon"></div>' +
            '<section class="finv-parties oslip-parties"><div class="finv-party"><div class="fp-label">' + L("Customer & delivery", "வாடிக்கையாளர் & டெலிவரி") + "</div>" + cust + "</div>" +
            '<div class="finv-party"><div class="fp-label">' + L("Payment", "கட்டணம்") + '</div><div class="fp-name">' + L("Cash on delivery", "பெற்ற பின் பணம்") + "</div><div>" + L("Pay after you receive the crackers.", "பட்டாசுகளை பெற்ற பின் பணம் செலுத்தவும்.") + "</div></div></section>" +
            '<table class="finv-table"><thead><tr><th class="c-no">#</th><th>' + L("Item", "பொருள்") + '</th><th class="c-qty">' + L("Qty", "அளவு") + '</th><th class="c-amt">' + L("Rate", "விலை") + '</th><th class="c-amt">' + L("Amount", "தொகை") + "</th></tr></thead><tbody>" + rows + "</tbody></table>" +
            '<section class="finv-summary"><div class="finv-notes"><div class="fn-chip">🧨 ' + o.l.length + " " + L("items", "பொருட்கள்") + " · " + t.units + " " + L("units", "அலகுகள்") + "</div>" +
            '<div class="fn-cod">💵 ' + L("Cash on delivery — we confirm the order, delivery charge and dispatch date on WhatsApp / phone.", "பெற்ற பின் பணம் — ஆர்டர், டெலிவரி கட்டணம், அனுப்பும் தேதியை WhatsApp / அழைப்பில் உறுதி செய்வோம்.") + "</div>" +
            '<div class="fn-safety">🛡️ ' + L("Celebrate safely: light crackers in open spaces and keep water nearby.", "பாதுகாப்பாகக் கொண்டாடுங்கள்: திறந்த வெளியில் வெடிக்கவும், அருகில் தண்ணீர் வைத்திருக்கவும்.") + "</div></div>" +
            '<div class="finv-totals">' + (saved > 0 ? '<div class="ft-row"><span>' + L("MRP total", "MRP மொத்தம்") + '</span><span class="finv-mrp">' + money(t.mrp) + "</span></div>" : "") +
            '<div class="ft-grand"><span>' + L("Order total", "ஆர்டர் மொத்தம்") + "</span><span>" + money(t.total) + "</span></div>" +
            (saved > 0 ? '<div class="ft-saved"><span>' + L("You save", "உங்கள் சேமிப்பு") + "</span><span>" + money(saved) + "</span></div>" : "") +
            '<div class="ft-row"><span>' + L("Delivery charges", "டெலிவரி கட்டணம்") + "</span><span>" + L("confirmed on call", "அழைப்பில் உறுதி") + "</span></div>" +
            '<div class="finv-stamp due">' + L("CASH ON DELIVERY", "பெற்ற பின் பணம்") + "</div></div></section>" +
            '<footer class="finv-foot"><div class="ff-thanks">' + L("Thank you for ordering with us! Wishing you a safe and happy Diwali 🎆", "எங்களிடம் ஆர்டர் செய்ததற்கு நன்றி! பாதுகாப்பான, மகிழ்ச்சியான தீபாவளி வாழ்த்துகள் 🎆") + "</div>" +
            '<div class="ff-small">' + L("Order request — the bill is issued when we confirm it.", "ஆர்டர் கோரிக்கை — உறுதி செய்த பின் பில் வழங்கப்படும்.") + " · epalace.online</div></footer></article>";
        return t;
    }

    function messageFor(o, t, link) {
        var NL = "\n";
        if (ta()) return "🧾 *புதிய ஆர்டர் " + o.r + "*" + NL + "பெயர்: " + o.n + NL + "கைபேசி: " + o.p + NL + "ஊர்: " + o.a + " – " + o.c + NL +
            o.l.length + " பொருட்கள் · " + t.units + " அலகுகள் · *" + money(t.total) + "*" + NL + "(பெற்ற பின் பணம்)" + NL + NL + "முழு ஆர்டர் 👇" + NL + link;
        return "🧾 *New order " + o.r + "*" + NL + "Name: " + o.n + NL + "Mobile: " + o.p + NL + "Address: " + o.a + " – " + o.c + NL +
            o.l.length + " items · " + t.units + " units · *" + money(t.total) + "*" + NL + "(Cash on delivery)" + NL + NL + "Full order 👇" + NL + link;
    }

    // ---- page
    var m = location.hash.match(/[#&]o=([A-Za-z0-9_-]+)/);
    var tools = $("oslipTools"), share = $("oslipShare");
    tools.hidden = false;
    document.querySelectorAll("[data-oslip-edit]").forEach(function (a) { if (window.SHOP_STATIC) a.setAttribute("href", "index.html"); });

    if (m) {   // opened from the WhatsApp link
        var got = dec(m[1]);
        if (!got || !got.l.length) { $("oslipEmpty").hidden = false; return; }
        document.querySelector("[data-oslip-edit]").hidden = true;
        render(got, true);
        share.hidden = false;
        share.href = "https://wa.me/?text=" + encodeURIComponent((biz.name || "E-PALACE") + " order " + got.r + " — " + location.href);
        var create = $("oslipCreate");   // signed-in staff: open the admin New order form prefilled from this link
        if (create) { create.href = create.getAttribute("data-url") + "?o=" + m[1]; create.hidden = false; }
        document.title = "Order " + got.r + " – " + (biz.name || "E-PALACE");
        return;
    }

    var lines = cartLines();
    if (!lines.length) { $("oslipEmpty").hidden = false; tools.hidden = true; return; }
    var me = {};
    try { me = JSON.parse(localStorage.getItem(ME) || "{}") || {}; } catch (e) { }
    $("osName").value = me.n || ""; $("osPhone").value = me.p || ""; $("osAddr").value = me.a || ""; $("osPin").value = me.c || "";
    var order = { r: newRef(), t: Date.now(), l: lines };
    function read() {
        order.n = $("osName").value.trim(); order.p = $("osPhone").value.replace(/[^\d+]/g, "");
        order.a = $("osAddr").value.trim().replace(/\s*\n\s*/g, ", "); order.c = $("osPin").value.replace(/\D/g, ""); order.m = $("osNote").value.trim();
    }
    $("oslipForm").hidden = false;
    ["osName", "osPhone", "osAddr", "osPin", "osNote"].forEach(function (id) { $(id).addEventListener("input", function () { $("oslipErr").innerHTML = ""; read(); render(order, false); }); });
    read(); render(order, false);

    $("oslipDetails").addEventListener("submit", function (e) {
        e.preventDefault();
        read();
        var digits = order.p.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
        var err = !order.n ? L("Please enter your name.", "உங்கள் பெயரை உள்ளிடவும்.")
            : digits.length !== 10 ? L("Please enter a 10-digit mobile number.", "10 இலக்க கைபேசி எண்ணை உள்ளிடவும்.")
            : order.a.length < 6 ? L("Please enter your delivery address.", "டெலிவரி முகவரியை உள்ளிடவும்.")
            : !/^\d{6}$/.test(order.c) ? L("Please enter the 6-digit PIN code.", "6 இலக்க அஞ்சல் குறியீட்டை உள்ளிடவும்.") : "";
        $("oslipErr").innerHTML = err;
        if (err) return;
        order.p = digits;
        try { localStorage.setItem(ME, JSON.stringify({ n: order.n, p: order.p, a: order.a, c: order.c })); } catch (x) { }
        var t = render(order, false);
        var link = pageUrl() + "#o=" + enc(order);
        window.open("https://wa.me/" + WA + "?text=" + encodeURIComponent(messageFor(order, t, link)), "_blank", "noopener");
    });
})();
