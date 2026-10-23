// The landing page's 3D ritual box (public/landing.html), ported as a mountable widget.
// Markup strings are copied from the landing page; keep them in sync if the packaging changes.

const IC: Record<string, string> = {
  shield: '<path d="M12 3l7 3v5c0 4.6-3 8-7 10-4-2-7-5.4-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
  leaf: '<path d="M5 19C5 10 11 5 19 5c0 8-5 14-14 14z"/><path d="M5 19l8-8"/>',
  hand: '<path d="M8 13V6.5a1.5 1.5 0 013 0V11m0-5.5a1.5 1.5 0 013 0V11m0-4a1.5 1.5 0 013 0v6.5c0 4-2.7 7-6.5 7-2.6 0-4.3-1.4-5.4-3.6L4 13.6a1.5 1.5 0 012.6-1.5L8 14"/>',
  nodrop: '<path d="M12 3.5c3 4 5.5 7.2 5.5 10.5a5.5 5.5 0 01-11 0c0-3.3 2.5-6.5 5.5-10.5z"/><path d="M4 4l16 16"/>',
  nochem: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 001.8 3h10.4a2 2 0 001.8-3l-5-9V3"/><path d="M3 3l18 18"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  wind: '<path d="M3 9h11a2.5 2.5 0 10-2.5-2.5M3 14h15a2.5 2.5 0 11-2.5 2.5"/><path d="M4 21L21 4"/>',
  swirl: '<path d="M12 21c-5 0-8-3.5-8-8 0-4 3-7 7-7 3 0 5 2 5 5 0 2.4-1.8 4-4 4-1.8 0-3-1.2-3-3 0-1.4 1-2.3 2.2-2.3"/><path d="M12 3c1-1 3-1 3.5.5"/>',
};
const ic = (k: string, c = "") =>
  `<svg class="ic ${c}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${IC[k]}</svg>`;

function mandala(mode?: "mono") {
  const R = mode === "mono" ? "#c9a45c" : "#a3431f", G = mode === "mono" ? "#c9a45c" : "#5b6427", C = mode === "mono" ? "#c9a45c" : "#e8cf96";
  const fillLeaf = mode === "mono" ? "none" : G;
  let p = "";
  for (let i = 0; i < 16; i++) {
    const a = i * 22.5;
    p += `<path transform="rotate(${a} 50 50)" d="M50 21C55 16 55 9 50 3 45 9 45 16 50 21Z" fill="none" stroke="${R}" stroke-width="1.1"/>`;
    p += `<circle transform="rotate(${a + 11.25} 50 50)" cx="50" cy="9" r="1.3" fill="${R}" stroke="${R}" stroke-width=".2"/>`;
  }
  p += `<circle cx="50" cy="50" r="28" fill="none" stroke="${G}" stroke-width="1"/>`;
  for (let i = 0; i < 12; i++) p += `<path transform="rotate(${i * 30} 50 50)" d="M50 40C54 35 54 29 50 24 46 29 46 35 50 40Z" fill="${fillLeaf}" stroke="${G}" stroke-width=".6"/>`;
  for (let i = 0; i < 8; i++) p += `<path transform="rotate(${i * 45} 50 50)" d="M50 50C52.5 47.5 52.5 44.5 50 42 47.5 44.5 47.5 47.5 50 50Z" fill="${R}" stroke="${R}" stroke-width=".3"/>`;
  p += `<circle cx="50" cy="50" r="2.4" fill="${C}" stroke="${C}" stroke-width=".2"/>`;
  return `<svg class="mandala" viewBox="0 0 100 100">${p}</svg>`;
}

const ARCH = () =>
  `<svg class="arch" viewBox="0 0 260 214" preserveAspectRatio="none"><path d="M4 214V92C4 62 68 50 106 28 120 20 127 12 130 3 133 12 140 20 154 28 192 50 256 62 256 92V214Z" fill="#f5ede0"/><path d="M13 205V95C13 69 73 58 109 37 122 29 127 22 130 14 133 22 138 29 151 37 187 58 247 69 247 95V205Z" fill="none" stroke="#c9a45c" stroke-width="1.2" vector-effect="non-scaling-stroke"/></svg>`;

function seal() {
  const pts: string[] = [];
  for (let i = 0; i < 48; i++) {
    const r = i % 2 ? 45 : 50, a = (i / 48) * Math.PI * 2;
    pts.push((50 + r * Math.cos(a)).toFixed(1) + "," + (50 + r * Math.sin(a)).toFixed(1));
  }
  return `<svg class="seal45" viewBox="0 0 100 100"><polygon points="${pts.join(" ")}" fill="#a3431f"/><circle cx="50" cy="50" r="37" fill="none" stroke="#f5ede0" stroke-width="1" stroke-dasharray="2 2.6"/><text x="50" y="37" text-anchor="middle" font-family="Jost" font-weight="600" font-size="9" letter-spacing="2" fill="#f5ede0">READY IN</text><text x="50" y="66" text-anchor="middle" font-family="Fraunces" font-weight="700" font-size="30" fill="#f5ede0">45</text><text x="50" y="78" text-anchor="middle" font-family="Jost" font-weight="600" font-size="9" letter-spacing="2" fill="#f5ede0">MIN</text></svg>`;
}

function barcode() {
  const d = "8900000000005";
  const s: string[] = [];
  let x = 0, k = 0;
  while (x < 99) {
    const b = 0.9 + ((+d[k % 13] + k) % 3) * 0.8, g = 0.8 + ((k * 7) % 3) * 0.7;
    s.push(`#111 ${x.toFixed(1)}% ${(x + b).toFixed(1)}%`, `transparent ${(x + b).toFixed(1)}% ${(x + b + g).toFixed(1)}%`);
    x += b + g;
    k++;
  }
  return `<div class="barcode"><i style="background:linear-gradient(90deg,${s.join(",")})"></i><span>8 900000 000005</span></div>`;
}

const SH = `<div class="sheen"></div><div class="shd"></div>`;
const INGS = [["Henna", "Lawsonia inermis"], ["Shikakai", "Acacia concinna"], ["Amla", "Emblica officinalis"], ["Brahmi", "Bacopa monnieri"], ["Bhringraj", "Eclipta alba"], ["Neem", "Azadirachta indica"], ["Orange peel", "Citrus sinensis"], ["Reetha", "Sapindus mukorossi"], ["Tulsi", "Ocimum sanctum"], ["Coffee", "seed powder"]];
const SHADES = [["Black", "#16110e"], ["Dark Brown", "#3b2416"], ["Brown", "#6e3f22"], ["Burgundy", "#5c1621"]];
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function boxHTML(shade: string) {
  const sh = `<span class="ak-shade">${esc(shade.toLowerCase())}</span>`;
  const front = `<div class="fc f-front lattice">
    <div class="bx-top">Herbal Hair Color</div><div class="finial"></div>
    <div class="pack"><span>Pack of</span><b>3</b></div>
    <div class="arch-wrap">${ARCH()}<div class="arch-in">${mandala()}<div class="wm">AyurKesha</div><div class="wm-hi">आयुरकेशा</div><div class="dia"></div></div></div>
    ${seal()}
    <div class="bx-tag">From leaves, not from labs.</div>
    <div class="band"><div class="scal-ink"></div><div class="band-t">Natural and Herbal Color</div><div class="band-hi">प्राकृतिक और हर्बल रंग</div>
      <div class="icons5">${[["nochem", "No chemical<br>ingredients"], ["leaf", "All herbal<br>&amp; natural"], ["hand", "Self apply"], ["nodrop", "No skin<br>residue"], ["wind", "Odourless"]].map(([k, t]) => `<div>${ic(k)}<span>${t}</span></div>`).join("")}</div></div>
    ${SH}</div>`;
  const back = `<div class="fc f-back c-cream">
    <div class="bk-head lattice"><b>AyurKesha</b><span>आयुरकेशा</span><div class="scal-cream" style="bottom:-1px;top:auto;transform:scaleY(-1)"></div></div>
    <div class="bk-body">
      <h4>Grey to black, the herbal way</h4>
      <p>An all-herbal, natural hair colour with no chemical ingredients that turns grey hair natural black. Apply it yourself at home: it leaves no residue on skin and is ready in 45 minutes.</p>
      <div class="ing-box"><h5>10 NATURAL INGREDIENTS</h5><ul>${INGS.map(([a, b]) => `<li><b>${a}</b> ${b}</li>`).join("")}</ul></div>
      <p class="sm"><b>Contains:</b> 3 sachets · 3 gloves · 1 comb · Tissue · 1 shower cap<br><b>Shade:</b> ${sh} · For grey hair</p>
      <p class="sm"><b>Available in 4 shades:</b><span class="dots">${SHADES.map((s) => `<i style="background:${s[1]}"></i>`).join("")}</span></p>
      <div class="allergy-s"><b>Allergy test 48 h before every use.</b> Even natural ingredients can cause allergies. Apply a little paste inside your elbow and leave for 24 h. If redness or itching appears, do not use. External use only. Keep away from children.</div>
      <div class="bk-foot"><p><b>Mfd. by:</b> Cosmo International, Bhatinda<br><b>Mktd. by:</b> Aditya Enterprises, Navi Mumbai<br><b>MRP:</b> ₹249 (incl. of all taxes)<br><b>Care:</b> 9619178792 · www.ayurkesha.com<br>Country of origin: India</p>${barcode()}</div>
    </div>${SH}</div>`;
  const left = `<div class="fc f-left lattice">
    <div class="sd-arch"><b>AyurKesha</b><span>आयुरकेशा</span></div>
    <div class="sd-list">${[["nochem", "No chemical ingredients", "कोई रासायनिक तत्व नहीं"], ["leaf", "All herbal & natural", "पूरी तरह हर्बल और प्राकृतिक"], ["hand", "Self apply", "घर पर खुद लगाएँ"], ["nodrop", "No skin residue", "त्वचा पर कोई अवशेष नहीं"], ["clock", "Ready in 45 minutes", "45 मिनट में तैयार"]].map(([k, t, h]) => `<div>${ic(k)}<span>${t}<small>${h}</small></span></div>`).join("")}</div>
    <div class="pill sd-pill">${ic("shield")}Safe on Scalp</div>
    <div class="sd-bot"><div class="scal-ink"></div><h6>Available in 4 colors</h6><ul>${SHADES.map((s) => `<li><i style="background:${s[1]}"></i>${s[0]}</li>`).join("")}</ul></div>
    ${SH}</div>`;
  const right = `<div class="fc f-right c-ink"><div class="rt">
    ${ic("swirl", "swirl")}<h6>How to use</h6><div class="hi">उपयोग विधि</div>
    <ol>${[["Bowl", "Put the powder in a clean, dry bowl."], ["Add water", "Add water to make a paste."], ["Mix", "Mix well."], ["Apply", "After 15–20 min, apply on non-oily hair."], ["Wash", "Wash hair 45 minutes after applying."]].map(([t, d], i) => `<li><i>${i + 1}</i><div><b>${t}</b><span>${d}</span></div></li>`).join("")}</ol>
    <div class="pill">${ic("shield")}Safe on Scalp</div><div class="pill ol">${ic("clock")}Ready in 45 min</div><div class="pill gr">To be applied on washed and dried hair</div><div class="try">Try Herbal Way</div>
    </div>${SH}</div>`;
  // The box never opens here, so the inner walls are left out; on the landing page they show as a cream sliver along the lid seam.
  const lid = `<div class="lid"><div class="fc lid-out c-ink"><div class="lid-frame"><div><b>AyurKesha</b><p>Herbal hair colour · <span class="ak-shade-cap">${esc(shade)}</span><br>For grey hair · Self apply<br>Recyclable carton · Made in India</p></div><div class="wbox">BATCH · MFG · EXP</div></div>${SH}</div></div>`;
  const bottom = `<div class="fc f-bottom c-ink"><div class="btm-mq">Natural color ✦ No chemical ✦ Self apply ✦ No skin residue ✦ Ready in 45 min</div>${SH}</div>`;
  return `<div class="box">${front}${back}${left}${right}${bottom}${lid}</div>`;
}

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const LIGHT = (() => { const v = [-0.35, -0.7, 0.62], m = Math.hypot(...v); return v.map((x) => x / m); })();
const NORM: Record<string, number[]> = { front: [0, 0, 1], back: [0, 0, -1], right: [1, 0, 0], left: [-1, 0, 0], bottom: [0, 1, 0] };

function rot(n: number[], rx: number, ry: number) {
  const a = (ry * Math.PI) / 180, b = (rx * Math.PI) / 180;
  const x = n[0] * Math.cos(a) + n[2] * Math.sin(a), z1 = -n[0] * Math.sin(a) + n[2] * Math.cos(a), y = n[1];
  return [x, y * Math.cos(b) - z1 * Math.sin(b), y * Math.sin(b) + z1 * Math.cos(b)];
}

export type BoxHandle = { setShade(name: string, color: string): void; destroy(): void };

export function mountBox(host: HTMLElement, shade: string, color: string): BoxHandle {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  host.innerHTML = `<div class="ak3d" style="--tint:${color}">
    <div class="ak-halo"></div><div class="ak-ring">${mandala("mono")}</div><div class="ak-floor"></div>
    <div class="scaler"><div class="scene"><div class="rig">${boxHTML(shade)}</div></div></div>
    <p class="ak-hint"><svg viewBox="0 0 30 12" fill="none" stroke="currentColor"><path d="M1 6h28M5 2L1 6l4 4M25 2l4 4-4 4"/></svg>Drag to turn</p>
  </div>`;
  const stage = host.firstElementChild as HTMLElement;
  const q = (s: string) => stage.querySelector(s) as HTMLElement;
  const rig = q(".rig"), scaler = q(".scaler"), box = q(".box");
  const faces: Record<string, HTMLElement> = { front: q(".f-front"), back: q(".f-back"), right: q(".f-right"), left: q(".f-left"), bottom: q(".f-bottom"), lid: q(".lid-out") };

  const H = { rx: -14, ry: -34, vx: 0, vy: 0, drag: false, lx: 0, ly: 0 };
  const down = (e: PointerEvent) => { H.drag = true; H.lx = e.clientX; H.ly = e.clientY; H.vx = H.vy = 0; stage.setPointerCapture(e.pointerId); };
  const move = (e: PointerEvent) => {
    if (!H.drag) return;
    const dx = e.clientX - H.lx, dy = e.clientY - H.ly;
    H.lx = e.clientX; H.ly = e.clientY; H.vy = dx * 0.4; H.vx = -dy * 0.25;
    H.ry += H.vy; H.rx = clamp(H.rx + H.vx, -50, 30);
  };
  const up = () => { H.drag = false; };
  stage.addEventListener("pointerdown", down);
  stage.addEventListener("pointermove", move);
  stage.addEventListener("pointerup", up);
  stage.addEventListener("pointercancel", up);

  const size = () => {
    const w = stage.clientWidth, h = stage.clientHeight;
    scaler.style.setProperty("--k", clamp(Math.min(w / 480, h / 620), 0.45, 1.15).toFixed(3));
  };
  const ro = new ResizeObserver(size);
  ro.observe(stage);
  size();

  let visible = true;
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
  io.observe(stage);

  let raf = 0;
  const frame = (t: number) => {
    raf = requestAnimationFrame(frame);
    if (!visible) return;
    if (!H.drag) { H.ry += H.vy; H.vy *= 0.94; if (Math.abs(H.vy) < 0.3 && !reduce) H.ry += 0.12; H.rx += (-14 - H.rx) * 0.02; }
    const fl = reduce ? 0 : Math.sin(t * 0.0011) * 9;
    rig.style.transform = `translateY(${fl}px) rotateX(${H.rx}deg) rotateY(${H.ry}deg)`;
    for (const k in NORM) {
      const n = rot(NORM[k], H.rx, H.ry);
      faces[k].style.setProperty("--sh", clamp(0.42 - 0.5 * (n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]), 0, 0.7).toFixed(3));
    }
    const nl = rot([0, -1, 0], H.rx, H.ry);
    faces.lid.style.setProperty("--sh", clamp(0.42 - 0.5 * (nl[0] * LIGHT[0] + nl[1] * LIGHT[1] + nl[2] * LIGHT[2]), 0, 0.7).toFixed(3));
    const g = ((H.ry % 360) + 360) % 360;
    box.style.setProperty("--gx", (100 - (((g + 40) % 180) / 180) * 100).toFixed(1) + "%");
  };
  raf = requestAnimationFrame(frame);

  return {
    setShade(name, c) {
      stage.style.setProperty("--tint", c);
      stage.querySelectorAll(".ak-shade").forEach((el) => { el.textContent = name.toLowerCase(); });
      stage.querySelectorAll(".ak-shade-cap").forEach((el) => { el.textContent = name; });
      if (!reduce) H.vy += 9;
    },
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      host.innerHTML = "";
    },
  };
}
