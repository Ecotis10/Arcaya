/* ============================================================
   ARCAYA — Hero líquido (WebGL)
   Distorsión muy sutil sobre la foto del hero. Degrada con
   elegancia: si no hay WebGL, es móvil o el usuario pidió
   menos movimiento, no se inicializa y queda la <img> estática.
   ============================================================ */

const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_time;
uniform vec2 u_mouse;     // 0..1
uniform float u_mouseAmt; // 0..1 (entra/sale suave)
uniform vec2 u_res;       // canvas px
uniform vec2 u_img;       // imagen px

void main() {
  // object-fit: cover
  float rC = u_res.x / u_res.y;
  float rI = u_img.x / u_img.y;
  vec2 uv = v_uv;
  if (rC > rI) {
    float s = rI / rC;
    uv.y = (uv.y - 0.5) * s + 0.5;
  } else {
    float s = rC / rI;
    uv.x = (uv.x - 0.5) * s + 0.5;
  }

  float t = u_time;

  // ondas lentas tipo aire caliente / agua quieta (amplitud mínima)
  vec2 wob = vec2(
    sin(uv.y * 7.0 + t * 0.55) + sin(uv.y * 13.0 - t * 0.3),
    cos(uv.x * 6.0 + t * 0.45) + cos(uv.x * 11.0 + t * 0.25)
  ) * 0.0018;

  // halo líquido siguiendo el cursor
  float d = distance(v_uv, u_mouse);
  float ring = smoothstep(0.35, 0.0, d) * u_mouseAmt;
  wob += normalize(v_uv - u_mouse + 0.0001) * ring * 0.012 * sin(d * 26.0 - t * 2.2);

  vec2 suv = uv + wob;
  if (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) {
    suv = clamp(suv, 0.0, 1.0);
  }
  gl_FragColor = texture2D(u_tex, suv);
}`;

export function initHeroLiquid(imgEl) {
  if (!imgEl) return;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bigScreen = matchMedia('(min-width: 768px)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (reduce || !bigScreen || !finePointer) return; // queda la <img>

  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl', { antialias: true, alpha: false, premultipliedAlpha: false });
  if (!gl) return; // sin WebGL → <img>

  const start = () => {
    const tex = createTexture(gl, imgEl);
    if (!tex) return;

    canvas.className = 'hero__canvas';
    Object.assign(canvas.style, {
      position: 'absolute', inset: '0', width: '100%', height: '100%',
      display: 'block',
    });
    const prog = createProgram(gl, VERT, FRAG);
    if (!prog) return; // shader falló → no tocamos la <img>, queda estática

    imgEl.parentElement.appendChild(canvas);
    imgEl.style.visibility = 'hidden'; // se mantiene en DOM para SEO/fallback
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const U = {
      time: gl.getUniformLocation(prog, 'u_time'),
      mouse: gl.getUniformLocation(prog, 'u_mouse'),
      mouseAmt: gl.getUniformLocation(prog, 'u_mouseAmt'),
      res: gl.getUniformLocation(prog, 'u_res'),
      img: gl.getUniformLocation(prog, 'u_img'),
      tex: gl.getUniformLocation(prog, 'u_tex'),
    };
    gl.uniform1i(U.tex, 0);
    gl.uniform2f(U.img, imgEl.naturalWidth || 1, imgEl.naturalHeight || 1);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    function resize() {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(U.res, canvas.width, canvas.height);
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    // cursor (suavizado)
    let mx = 0.5, my = 0.5, tmx = 0.5, tmy = 0.5, amt = 0, tamt = 0;
    const hero = imgEl.closest('.hero') || document;
    hero.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      tmx = (e.clientX - r.left) / r.width;
      tmy = 1 - (e.clientY - r.top) / r.height;
      tamt = 1;
    });
    hero.addEventListener('pointerleave', () => { tamt = 0; });

    // pausa cuando el hero sale de vista
    let visible = true;
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { threshold: 0 })
      .observe(canvas);

    const t0 = performance.now();
    let raf;
    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      mx += (tmx - mx) * 0.06; my += (tmy - my) * 0.06;
      amt += (tamt - amt) * 0.05;
      gl.uniform1f(U.time, (now - t0) / 1000);
      gl.uniform2f(U.mouse, mx, my);
      gl.uniform1f(U.mouseAmt, amt);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    raf = requestAnimationFrame(frame);

    // limpieza si se pierde el contexto
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      cancelAnimationFrame(raf);
      imgEl.style.visibility = 'visible';
      canvas.remove();
    });
  };

  if (imgEl.complete && imgEl.naturalWidth) start();
  else imgEl.addEventListener('load', start, { once: true });
}

function createTexture(gl, img) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // origen de textura abajo → arriba
  try {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
  } catch (e) {
    return null;
  }
  return tex;
}

function createProgram(gl, vsrc, fsrc) {
  const vs = compile(gl, gl.VERTEX_SHADER, vsrc);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fsrc);
  if (!vs || !fs) return null;
  const p = gl.createProgram();
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
  return p;
}

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
  return s;
}
