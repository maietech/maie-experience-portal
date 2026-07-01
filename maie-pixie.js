/**
 * maie-pixie.js  —  Shared Pixie canvas engine  v2.1
 *
 * Single source of truth for the Pixie renderer.
 * Used by the portal shell AND every experience module template.
 *
 * Usage:
 *   <script src="maie-pixie.js"></script>
 *   const pixie = MAIE.makePixie('canvas-id', 'ember', { rings:2, particles:8 });
 *   pixie.setPhase('executing');
 *   pixie.setProgress(72);
 *   pixie.setEchoes([{ color:'#38BDF8', resonance:0.8, createdAt: Date.now() - 86400000 }]);
 *   pixie.stop();
 *
 * Themes: 'ember' | 'arctic' | 'prism' | 'solar' | 'forest' | 'void'
 * Phases: 'idle' | 'planning' | 'review' | 'executing' | 'completed' | 'failed'
 *
 * ── v2.1: stage/performer breathing room ────────────────────────
 * The radial glow/aura previously sized itself off the canvas's own
 * bitmap dimensions, so on the larger hero instances the outer aura
 * routinely exceeded the canvas bounds and got hard-clipped — a
 * visible square edge around the glow.
 *
 * Fix: the canvas bitmap is now treated as "stage" — bigger than the
 * "performer" (Pixie's core + rings + particles) actually needs.
 * `performerScale` (formerly just `scale`) shrinks the performer
 * geometry independent of the stage size, so glow/aura has real
 * empty canvas to fall off into before hitting the edge.
 *
 * Callers should bump the <canvas width/height> attributes ~20% and
 * pass `performerScale` ~20% smaller than the old flat `scale` value
 * to land on the same *visual* Pixie size with a larger glow field.
 * `scale` is still accepted as an alias for `performerScale` for
 * backward compatibility with existing call sites.
 */

(function (root) {
  'use strict';

  /* ── Colour palettes ──────────────────────────────────────────── */
  const THEMES = {
    ember:  { ring: '#C24E4E', core: '#A52A2A', particle: '#FFB400', glow: 'rgba(165,42,42,0.30)'   },
    arctic: { ring: '#38BDF8', core: '#0369A1', particle: '#BAE6FD', glow: 'rgba(56,189,248,0.25)'  },
    prism:  { ring: '#A855F7', core: '#7E22CE', particle: '#22D3EE', glow: 'rgba(168,85,247,0.25)'  },
    solar:  { ring: '#F59E0B', core: '#B45309', particle: '#FDE68A', glow: 'rgba(245,158,11,0.25)'  },
    forest: { ring: '#22C55E', core: '#14532D', particle: '#BBF7D0', glow: 'rgba(34,197,94,0.22)'   },
    void:   { ring: '#64748B', core: '#1E293B', particle: '#F1F5F9', glow: 'rgba(100,116,139,0.20)' },
  };

  /* ── Core shapes ──────────────────────────────────────────────── */
  function buildPath(ctx, shape, cx, cy, r) {
    ctx.beginPath();
    switch (shape) {
      case 'hexagon':
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
          const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        break;
      case 'diamond':
        ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.8, cy);
        ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r * 0.8, cy);
        ctx.closePath();
        break;
      case 'shield':
        ctx.moveTo(cx, cy - r);
        ctx.quadraticCurveTo(cx + r, cy - r * 0.6, cx + r, cy);
        ctx.quadraticCurveTo(cx + r, cy + r * 0.4,  cx,     cy + r);
        ctx.quadraticCurveTo(cx - r, cy + r * 0.4,  cx - r, cy);
        ctx.quadraticCurveTo(cx - r, cy - r * 0.6,  cx,     cy - r);
        ctx.closePath();
        break;
      default: // circle
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
    }
  }

  /* ── Hex → [r,g,b] ───────────────────────────────────────────── */
  function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [200, 130, 255];
  }

  /**
   * makePixie(canvasId, themeKey, options) → controller
   *
   * options:
   *   rings           {number}  2        — concentric particle rings
   *   particles       {number}  8        — particles per ring
   *   performerScale  {number}  1.0      — Pixie's own size (core/rings/particles),
   *                                        independent of canvas/stage size
   *   scale           {number}           — deprecated alias for performerScale,
   *                                        kept for backward compatibility
   *   shape           {string}  'circle' — 'circle'|'hexagon'|'diamond'|'shield'
   *   echoes          {Array}   []       — initial echo marks
   *   breathe         {number}  1.2      — core breathe speed
   *   glowReach       {number}  2.2      — how far the ambient glow gradient
   *                                        extends past the core, in core-radii.
   *                                        Increase on larger "stage" canvases
   *                                        so the aura has room to fall off
   *                                        before hitting the canvas edge.
   */
  function makePixie(canvasId, themeKey, options) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    const W   = canvas.width;
    const H   = canvas.height;
    const CX  = W / 2;
    const CY  = H / 2;

    const opts = Object.assign({
      rings: 2, particles: 8, performerScale: 1.0,
      shape: 'circle', echoes: [], breathe: 1.2, glowReach: 2.2,
    }, options || {});

    // Backward-compat: callers still passing `scale` drive performerScale.
    if (options && typeof options.scale === 'number' && typeof options.performerScale !== 'number') {
      opts.performerScale = options.scale;
    }
    // Internal code below keeps using opts.scale as the single geometry
    // multiplier so the rest of the draw loop is unchanged.
    opts.scale = opts.performerScale;

    const theme    = THEMES[themeKey] || THEMES.ember;
    const coreR    = W * 0.10 * opts.scale;
    const baseRing = W * 0.20 * opts.scale;

    let t        = 0;
    let phase    = 'idle';
    let progress = 0;
    let echoes   = opts.echoes.slice();
    let parts    = [];
    let animId   = null;
    let mx       = CX;
    let my       = CY;

    /* Mouse tracking */
    const onMove = e => {
      const r = canvas.getBoundingClientRect();
      mx = (e.clientX - r.left) * (W / r.width);
      my = (e.clientY - r.top)  * (H / r.height);
    };
    const onLeave = () => { mx = CX; my = CY; };
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);

    /* Init particle rings */
    function initParticles() {
      parts = [];
      for (let ri = 0; ri < opts.rings; ri++) {
        const baseR = baseRing + ri * W * 0.085 * opts.scale;
        for (let pi = 0; pi < opts.particles; pi++) {
          parts.push({
            angle:      (pi / opts.particles) * Math.PI * 2 + ri * 0.6,
            radius:     baseR,
            baseRadius: baseR,
            speed:      0.009 + Math.random() * 0.005,
            size:       1.0   + Math.random() * 0.7,
            opacity:    0.45  + Math.random() * 0.4,
            phase:      Math.random() * Math.PI * 2,
            wobble:     0.7   + Math.random() * 1.3,
          });
        }
      }
    }
    initParticles();

    /* Main draw loop */
    function draw() {
      t += 0.017;

      const phaseEn =
        phase === 'executing'  ? 1.3 + (progress / 100) * 0.7
      : phase === 'planning'   ? 1.1
      : phase === 'completed'  ? 1.45
      : phase === 'failed'     ? 0.45
      : 0.82;                              // idle / review

      const modeEn =
        (phase === 'executing' || phase === 'completed') ? 1.2
      : phase === 'idle' ? 0.75
      : 1.0;

      /* Subtle gaze follow */
      const nx = CX + (mx - CX) * 0.05;
      const ny = CY + (my - CY) * 0.05;

      ctx.clearRect(0, 0, W, H);
      const [cR, cG, cB] = hexToRgb(theme.ring);

      /* Glow — falls off across glowReach core-radii of the larger
         "stage" canvas, well inside the bitmap edge, so it never clips. */
      const gR  = coreR * 2.4 + Math.sin(t * 1.2) * 3 + phaseEn * 6;
      const grd = ctx.createRadialGradient(nx, ny, 0, nx, ny, gR * opts.glowReach);
      grd.addColorStop(0,   `rgba(${cR},${cG},${cB},${0.20 * modeEn})`);
      grd.addColorStop(0.5, `rgba(${cR},${cG},${cB},${0.07 * modeEn})`);
      grd.addColorStop(1,   `rgba(${cR},${cG},${cB},0)`);
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(nx, ny, gR * opts.glowReach, 0, Math.PI * 2); ctx.fill();

      /* Core shape */
      const cR2 = coreR + Math.sin(t * opts.breathe) * 1.5 * phaseEn;
      buildPath(ctx, opts.shape, nx, ny, cR2);
      const cg = ctx.createRadialGradient(nx, ny, 0, nx, ny, cR2);
      cg.addColorStop(0,    `rgba(${cR},${cG},${cB},0.95)`);
      cg.addColorStop(0.65, `rgba(${cR},${cG},${cB},0.65)`);
      cg.addColorStop(1,    `rgba(${cR},${cG},${cB},0.18)`);
      ctx.fillStyle = cg; ctx.fill();

      /* Progress arc (executing only) */
      if (phase === 'executing' && progress > 0) {
        const pr = cR2 + W * 0.10;
        const sa = -Math.PI / 2;
        const ea = sa + (progress / 100) * Math.PI * 2;
        ctx.strokeStyle = `rgba(${cR},${cG},${cB},0.5)`;
        ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(nx, ny, pr, sa, ea); ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,255,0.045)`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(nx, ny, pr, 0, Math.PI * 2); ctx.stroke();
      }

      /* Particles */
      parts.forEach(p => {
        p.angle += p.speed * (1 + phaseEn * 0.5);
        const wo = Math.sin(t * p.wobble + p.phase) * 4;
        p.radius += (p.baseRadius + wo - p.radius) * 0.05;
        const px = nx + Math.cos(p.angle) * p.radius;
        const py = ny + Math.sin(p.angle) * p.radius;
        ctx.save();
        ctx.globalAlpha = p.opacity * 0.8 * modeEn;
        const pg = ctx.createRadialGradient(px, py, 0, px, py, p.size * 2.5);
        pg.addColorStop(0, `rgba(${cR},${cG},${cB},0.9)`);
        pg.addColorStop(1, `rgba(${cR},${cG},${cB},0)`);
        ctx.fillStyle = pg;
        ctx.beginPath(); ctx.arc(px, py, p.size * 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(${cR},${cG},${cB},0.95)`;
        ctx.beginPath(); ctx.arc(px, py, p.size * 0.5,  0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });

      /* Concentric rings */
      const rPh = (t * 0.9) % (Math.PI * 2);
      const rAl = Math.sin(rPh) * 0.5 + 0.5;
      for (let r = 0; r < opts.rings; r++) {
        const rSz = baseRing + r * W * 0.09 * opts.scale
                  + rAl * (W * 0.07) + phaseEn * (W * 0.07);
        ctx.strokeStyle = `rgba(${cR},${cG},${cB},${0.055 * rAl * modeEn / (r + 1)})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(nx, ny, rSz, 0, Math.PI * 2); ctx.stroke();
      }

      /* Echo marks */
      const baseEchoR = baseRing + (opts.rings - 1) * W * 0.09 * opts.scale + W * 0.15;
      echoes.forEach((echo, i) => {
        const angle    = ((i / echoes.length) * Math.PI * 2) - Math.PI / 2;
        const ageMs    = echo.createdAt ? Math.max(0, Date.now() - echo.createdAt) : 86400000 * 30;
        const maturity = Math.min(ageMs / 86400000, 1);
        const recency  = 1 - maturity;
        const resonance = echo.resonance || 0.6;
        const orbitR   = baseEchoR + maturity * W * 0.10;
        const pulse    = Math.sin(t * (0.35 + recency * 0.5) + i) * 0.3 + 0.7;
        const ex       = nx + Math.cos(angle) * orbitR;
        const ey       = ny + Math.sin(angle) * orbitR;
        const [er, eg, eb] = hexToRgb(echo.color);
        const dotR = 1.8 + resonance * 1.5;
        const eG   = ctx.createRadialGradient(ex, ey, 0, ex, ey, dotR * 3);
        eG.addColorStop(0, `rgba(${er},${eg},${eb},${(0.3 + resonance * 0.25) * pulse})`);
        eG.addColorStop(1, `rgba(${er},${eg},${eb},0)`);
        ctx.fillStyle = eG; ctx.beginPath(); ctx.arc(ex, ey, dotR * 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(${er},${eg},${eb},${0.85 * pulse})`;
        ctx.beginPath(); ctx.arc(ex, ey, dotR, 0, Math.PI * 2); ctx.fill();
      });

      animId = requestAnimationFrame(draw);
    }

    draw();

    /* Public controller */
    return {
      setPhase:    p    => { phase    = p; },
      setProgress: v    => { progress = v; },
      setEchoes:   arr  => { echoes   = arr.slice(); },
      setTheme:    key  => { Object.assign(theme, THEMES[key] || THEMES.ember); },
      resize:      (w, h) => {
        canvas.width = w; canvas.height = h;
        initParticles();
      },
      stop: () => {
        if (animId) { cancelAnimationFrame(animId); animId = null; }
        canvas.removeEventListener('mousemove', onMove);
        canvas.removeEventListener('mouseleave', onLeave);
      },
    };
  }

  /* ── Expose under MAIE namespace ──────────────────────────────── */
  root.MAIE = root.MAIE || {};
  root.MAIE.makePixie = makePixie;
  root.MAIE.THEMES    = THEMES;

}(typeof window !== 'undefined' ? window : this));
