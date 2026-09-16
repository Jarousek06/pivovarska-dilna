/* Pivovarská dílna — 3D dřevěný sud řízený scrollem (Three.js)
   Kapitoly a průběh fungují i bez WebGL; 3D scéna se načte dynamicky. */

const section = document.querySelector("#sud");
const pin = section?.querySelector(".barrel__pin");
const canvas = document.querySelector("#barrelCanvas");
const chapters = [...section.querySelectorAll(".chapter")];
const bars = [...section.querySelectorAll(".barrel__progress span")];
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = t => t * t * (3 - 2 * t);

/* ---------------- průběh scrollu a kapitoly ---------------- */
let progress = 0;
function measure() {
  const r = pin.getBoundingClientRect();
  progress = clamp(-r.top / (r.height - innerHeight || 1));
  const n = chapters.length;
  const idx = Math.min(n - 1, Math.floor(progress * n));
  chapters.forEach((c, i) => c.classList.toggle("is-on", i === idx));
  bars.forEach((b, i) => b.style.setProperty("--f", clamp(progress * n - i).toFixed(3)));
}
if (!reduced) {
  addEventListener("scroll", measure, { passive: true });
  addEventListener("resize", measure);
  measure();
}

/* ---------------- 3D scéna ---------------- */
// 3D scéna se staví až když se k sudu blíží scroll — nezatěžuje úvodní video
if (!reduced) {
  new IntersectionObserver(([en], obs) => {
    if (!en.isIntersecting) return;
    obs.disconnect();
    init().catch(err => {
      console.warn("Sud: WebGL není k dispozici", err);
      section.classList.add("no-webgl");
    });
  }, { rootMargin: "60% 0px" }).observe(section);
}

async function init() {
  const THREE = await import("three");
  const { RoomEnvironment } = await import("three/addons/environments/RoomEnvironment.js");

  const isSmall = () => innerWidth < 900;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, isSmall() ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0b0907, 6, 13);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.environmentIntensity = .22;

  const camera = new THREE.PerspectiveCamera(32, 1, .1, 60);

  /* textury */
  const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const [plankImg, logoImg] = await Promise.all([
    loadImg("assets/tex/prkna.jpg"), loadImg("assets/img/vicko.png")
  ]);
  await document.fonts.ready;
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  /* dužiny sudu: pruhy dřeva se spárami */
  function staveTexture() {
    const W = 2048, H = 1024, N = 24;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d");
    const sw = W / N;
    for (let i = 0; i < N; i++) {
      // vyřízne pruh ze starého dubu (letokruhy vodorovně) a otočí ho podél dužiny
      const sy = 20 + (i * 211) % (plankImg.height - 140);
      const sx = (i * 89) % 20;
      g.save();
      g.beginPath(); g.rect(i * sw, 0, sw, H); g.clip();
      g.translate(i * sw + sw / 2, H / 2); g.rotate(Math.PI / 2);
      g.drawImage(plankImg, sx, sy, plankImg.width - 30, 96, -H / 2, -sw / 2 - 2, H, sw + 4);
      g.restore();
      g.fillStyle = `rgba(0,0,0,${(i * 7 % 5) * .035})`;
      g.fillRect(i * sw, 0, sw, H);
      g.fillStyle = "rgba(4,2,1,.9)"; g.fillRect(i * sw, 0, 3, H);
      g.fillStyle = "rgba(255,220,170,.07)"; g.fillRect(i * sw + 3, 0, 2, H);
    }
    // teplý tón dubového sudu
    g.globalCompositeOperation = "multiply";
    g.fillStyle = "#c08a55"; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = "overlay";
    g.fillStyle = "rgba(150,90,40,.35)"; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = "source-over";
    // ztmavení ke krajům (špína u obručí)
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, "rgba(10,5,2,.55)"); gr.addColorStop(.18, "rgba(10,5,2,0)");
    gr.addColorStop(.82, "rgba(10,5,2,0)"); gr.addColorStop(1, "rgba(10,5,2,.55)");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; t.wrapS = THREE.RepeatWrapping;
    return t;
  }

  /* dno sudu: prkna + vypálený znak */
  function headTexture(withLogo) {
    const S = 1024;
    const c = document.createElement("canvas"); c.width = c.height = S;
    const g = c.getContext("2d");
    const boards = 5, bh = S / boards;
    for (let i = 0; i < boards; i++) {
      g.drawImage(plankImg, (i * 97) % 200, 30 + (i * 173) % (plankImg.height - 260), plankImg.width - 220, 200, 0, i * bh, S, bh);
      g.fillStyle = "rgba(6,3,1,.85)"; g.fillRect(0, i * bh, S, 4);
    }
    g.globalCompositeOperation = "multiply";
    g.fillStyle = "#d09a62"; g.fillRect(0, 0, S, S);
    g.globalCompositeOperation = "screen";
    g.fillStyle = "rgba(90,55,25,.35)"; g.fillRect(0, 0, S, S);
    g.globalCompositeOperation = "source-over";
    if (withLogo) {
      const burn = "rgba(12,5,2,.9)";
      g.save(); g.translate(S / 2, S / 2);
      g.strokeStyle = burn; g.lineWidth = 7;
      g.beginPath(); g.arc(0, 0, S * .36, 0, Math.PI * 2); g.stroke();
      g.lineWidth = 3; g.beginPath(); g.arc(0, 0, S * .33, 0, Math.PI * 2); g.stroke();
      // text po obvodu
      const txt = "PIVOVARSKÁ DÍLNA  ·  LITOMĚŘICE  ·  KRAJSKÁ 61/4  ·  ";
      g.fillStyle = burn; g.font = `500 ${S * .036}px Archivo, sans-serif`;
      const R = S * .395, step = (Math.PI * 2) / txt.length;
      [...txt].forEach((ch, k) => {
        g.save(); g.rotate(-Math.PI / 2 + k * step); g.translate(R, 0); g.rotate(Math.PI / 2);
        g.fillText(ch, -g.measureText(ch).width / 2, 0); g.restore();
      });
      // čárky z tácku
      g.lineCap = "round"; g.lineWidth = 16; g.strokeStyle = burn;
      const x0 = -S * .14, y0 = -S * .02;
      for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x0 + k * S * .07, y0 - S * .13); g.lineTo(x0 + k * S * .07 + 6, y0 + S * .13); g.stroke(); }
      g.beginPath(); g.moveTo(x0 - S * .05, y0 + S * .08); g.lineTo(x0 + S * .27, y0 - S * .08); g.stroke();
      g.font = `italic 400 ${S * .06}px Fraunces, serif`;
      g.fillText("Dílna", -g.measureText("Dílna").width / 2, S * .24);
      g.restore();
      // jemný otisk loga víčka
      g.globalAlpha = .12; g.globalCompositeOperation = "multiply";
      g.drawImage(logoImg, S * .42, S * .1, S * .16, S * .16);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
    t.center.set(.5, .5); t.rotation = -Math.PI / 2;
    return t;
  }

  /* geometrie sudu */
  const HALF = 1.25, R0 = .8, BULGE = .16;
  const radiusAt = y => R0 + BULGE * (1 - (y / HALF) ** 2);
  const profile = [];
  for (let i = 0; i <= 48; i++) {
    const y = -HALF + (i / 48) * HALF * 2;
    profile.push(new THREE.Vector2(radiusAt(y), y));
  }
  const barrel = new THREE.Group();

  const staveMap = staveTexture();
  const body = new THREE.Mesh(
    new THREE.LatheGeometry(profile, isSmall() ? 64 : 120),
    new THREE.MeshStandardMaterial({ map: staveMap, bumpMap: staveMap, bumpScale: 3, roughness: .78, metalness: 0, side: THREE.DoubleSide })
  );
  body.castShadow = true; body.receiveShadow = true;
  barrel.add(body);

  const iron = new THREE.MeshStandardMaterial({ color: 0x2a2520, roughness: .38, metalness: .85 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xb08040, roughness: .28, metalness: 1 });
  [-1.08, -.62, .62, 1.08].forEach(y => {
    const h = .11;
    const hoop = new THREE.Mesh(new THREE.CylinderGeometry(radiusAt(y + h / 2) + .014, radiusAt(y - h / 2) + .014, h, 96, 1, true), iron);
    hoop.position.y = y; hoop.castShadow = true;
    barrel.add(hoop);
    // nýt
    const rivet = new THREE.Mesh(new THREE.SphereGeometry(.018, 12, 8), iron);
    rivet.position.set(radiusAt(y) + .03, y, 0);
    barrel.add(rivet);
  });

  const headR = radiusAt(HALF) - .035;
  const headFront = new THREE.Mesh(new THREE.CircleGeometry(headR, 64), new THREE.MeshStandardMaterial({ map: headTexture(true), roughness: .8 }));
  headFront.rotation.x = -Math.PI / 2; headFront.position.y = HALF - .06;
  const headBack = new THREE.Mesh(new THREE.CircleGeometry(headR, 64), new THREE.MeshStandardMaterial({ map: headTexture(false), roughness: .85 }));
  headBack.rotation.x = Math.PI / 2; headBack.position.y = -HALF + .06;
  barrel.add(headFront, headBack);

  // mosazný kohout ve dně
  const spigot = new THREE.Group();
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(.035, .04, .26, 20), brass);
  pipe.position.y = .13;
  const valve = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .08, 24), brass);
  valve.position.y = .2;
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(.025, .03, .16, 16), brass);
  spout.rotation.z = Math.PI / 2; spout.position.set(0, .2, 0); spout.rotation.x = Math.PI / 2;
  spout.position.z = .08;
  const handle = new THREE.Mesh(new THREE.BoxGeometry(.03, .03, .22), brass);
  handle.position.set(0, .27, 0); handle.rotation.y = .6;
  spigot.add(pipe, valve, spout, handle);
  spigot.position.set(-headR * .8, HALF - .06, 0);
  spigot.traverse(o => { o.castShadow = true; });
  barrel.add(spigot);

  // sud leží na boku, na dřevěných kozlících
  const barrelPivot = new THREE.Group();
  barrel.rotation.z = Math.PI / 2;
  barrelPivot.add(barrel);
  const cradleMat = new THREE.MeshStandardMaterial({ color: 0x1e140c, roughness: .9 });
  [-.75, .75].forEach(x => {
    const block = new THREE.Mesh(new THREE.BoxGeometry(.14, .3, 1.3), cradleMat);
    block.position.set(x, -radiusAt(x) - .02, 0); block.castShadow = true; block.receiveShadow = true;
    barrelPivot.add(block);
  });
  barrelPivot.position.y = 0;
  scene.add(barrelPivot);

  // podlaha z prken
  const floorTex = new THREE.CanvasTexture(plankImg);
  floorTex.colorSpace = THREE.SRGBColorSpace; floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(12, 12); floorTex.anisotropy = maxAniso;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ map: floorTex, color: 0x6a5a4a, roughness: .95 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -1.08; floor.receiveShadow = true;
  scene.add(floor);

  /* světla */
  scene.add(new THREE.HemisphereLight(0x5a4230, 0x050302, .5));
  const key = new THREE.SpotLight(0xffc27a, 90, 18, .55, .6, 1.6);
  key.position.set(-2.5, 4.2, 3); key.castShadow = true;
  key.shadow.mapSize.set(isSmall() ? 1024 : 2048, isSmall() ? 1024 : 2048);
  key.shadow.bias = -.0004; key.shadow.normalBias = .02;
  scene.add(key, key.target);
  const rim = new THREE.PointLight(0xff8a3a, 22, 9, 1.8);
  rim.position.set(3, 1.2, -2.5);
  scene.add(rim);
  const fill = new THREE.PointLight(0xffd9a8, 3, 8, 2);
  fill.position.set(2, .5, 4);
  scene.add(fill);

  /* prach ve světle */
  const dustN = isSmall() ? 160 : 360;
  const dustGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(dustN * 3), seed = new Float32Array(dustN);
  for (let i = 0; i < dustN; i++) {
    pos[i * 3] = (Math.random() - .5) * 7; pos[i * 3 + 1] = Math.random() * 4 - 1; pos[i * 3 + 2] = (Math.random() - .5) * 5;
    seed[i] = Math.random() * 100;
  }
  dustGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const dotC = document.createElement("canvas"); dotC.width = dotC.height = 64;
  const dg = dotC.getContext("2d"); const rg = dg.createRadialGradient(32, 32, 0, 32, 32, 32);
  rg.addColorStop(0, "rgba(255,220,170,1)"); rg.addColorStop(1, "rgba(255,220,170,0)");
  dg.fillStyle = rg; dg.fillRect(0, 0, 64, 64);
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    size: .035, map: new THREE.CanvasTexture(dotC), transparent: true, opacity: .55,
    depthWrite: false, blending: THREE.AdditiveBlending
  }));
  scene.add(dust);

  /* choreografie kamery podle kapitol */
  const K = [
    // p,   camX, camY, camZ, lookX, lookY, rotY,  keyX
    [0,    -1.3,  1.4,  7.0,  0,    -.1,   .55,  -2.5],
    [.3,    .1,   .45,  5.4,  0,    -.05,  1.57, -1.6],
    [.58,   2.7,  -.15, 3.9,  0,    -.15,  2.45,  1.6],
    [.82,   .5,   2.5,  6.2,  0,    -.25,  3.35, -2.8],
    [1,    -.6,   1.7,  7.2,  0,    -.1,   3.9,  -2.5]
  ];
  const sample = p => {
    let i = 0;
    while (i < K.length - 2 && p > K[i + 1][0]) i++;
    const a = K[i], b = K[i + 1];
    const t = smooth(clamp((p - a[0]) / (b[0] - a[0])));
    return a.map((v, k) => v + (b[k] - v) * t);
  };

  let W = 0, H = 0;
  const resize = () => {
    W = canvas.clientWidth; H = canvas.clientHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    // na desktopu je sud posunutý doprava (vlevo text), na mobilu nahoru
    if (isSmall()) camera.setViewOffset(W, H, 0, H * .16, W, H);
    else camera.setViewOffset(W, H, -W * .2, 0, W, H);
    camera.fov = isSmall() ? 44 : 32;
    camera.updateProjectionMatrix();
  };
  resize();
  addEventListener("resize", resize);

  let px = 0, py = 0, cx = 0, cy = 0;
  if (matchMedia("(pointer: fine)").matches) {
    section.addEventListener("pointermove", e => { px = e.clientX / innerWidth - .5; py = e.clientY / innerHeight - .5; });
  }

  let visible = false, smoothP = progress;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(section);

  const clock = new THREE.Clock();
  const look = new THREE.Vector3();
  const loop = () => {
    requestAnimationFrame(loop);
    if (!visible) return;
    const dt = Math.min(clock.getDelta(), .05);
    const time = clock.elapsedTime;
    smoothP += (progress - smoothP) * Math.min(1, dt * 4);
    cx += (px - cx) * dt * 2; cy += (py - cy) * dt * 2;

    const [, x, y, z, lx, ly, rotY, keyX] = sample(smoothP);
    const zoom = W < 900 ? 1.4 : 1;
    camera.position.set((x + cx * .5) * zoom, (y - cy * .3) * zoom, z * zoom);
    look.set(lx, ly, 0);
    camera.lookAt(look);
    barrelPivot.rotation.y = rotY + Math.sin(time * .25) * .04;
    key.position.x = keyX + Math.sin(time * .4) * .15;
    rim.intensity = 18 + Math.sin(time * 1.7) * 1.5 + Math.sin(time * 5.3) * .8;

    const arr = dustGeo.attributes.position.array;
    for (let i = 0; i < dustN; i++) {
      arr[i * 3 + 1] += dt * .05;
      arr[i * 3] += Math.sin(time * .3 + seed[i]) * dt * .02;
      if (arr[i * 3 + 1] > 3) arr[i * 3 + 1] = -1;
    }
    dustGeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  };
  loop();
  section.classList.add("is-live");
}
