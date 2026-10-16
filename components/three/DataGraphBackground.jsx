'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { watchLayerVisibility } from '@/lib/sectionVisibility'
import styles from '@/styles/three/DataGraphBackground.module.css'

// Subtle data / lineage graph behind the publications: soft nodes, faint edges
// between near neighbours, an occasional pulse travelling along an edge.
// Everything moves in the vertex shader; the CPU only updates a few uniforms.

const NODES_DESKTOP = 200
const NODES_MOBILE  = 100
const ACCENT_SHARE  = 0.08   // ~8 % of nodes in the accent colour
const NEIGHBOURS    = 2      // edges per node (to its nearest neighbours)
const MAX_EDGE      = 0.32   // max edge length (clip-space units, view = -1..1)
const PULSE_SHARE   = 0.1    // share of edges that can carry a pulse
const PARALLAX      = 0.05   // mouse → offset in clip units (±0.025 ≈ ±1.25 % of the view)
const MAX_DPR       = 1.5

// Shared GLSL: each node jitters around its anchor; nearer "layers" get more parallax
const DRIFT = /* glsl */ `
  uniform float uTime;
  uniform vec2  uParallax;
  vec2 drift(vec2 anchor, float phase) {
    vec2 wobble = vec2(sin(uTime * 0.21 + phase * 6.2832), cos(uTime * 0.17 + phase * 4.1));
    return anchor + wobble * 0.016 + uParallax * (0.5 + fract(phase * 7.31) * 0.5);
  }
`

const POINT_VERT = /* glsl */ `
  ${DRIFT}
  uniform float uPixelRatio;
  attribute vec2  aAnchor;
  attribute float aPhase;
  attribute float aAccent;
  attribute float aSize;
  varying float vAccent;
  varying float vTwinkle;
  void main() {
    vAccent  = aAccent;
    vTwinkle = 0.8 + 0.2 * sin(uTime * 0.5 + aPhase * 19.0);
    gl_Position  = vec4(drift(aAnchor, aPhase), 0.0, 1.0);
    gl_PointSize = aSize * uPixelRatio * (aAccent > 0.5 ? 3.0 : 1.0);   // accent nodes carry a glow halo
  }
`

const POINT_FRAG = /* glsl */ `
  uniform vec3 uWarm;
  uniform vec3 uAccent;
  varying float vAccent;
  varying float vTwinkle;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float core = 1.0 - smoothstep(0.0, 0.5, d);
    float alpha = vAccent > 0.5
      ? pow(core, 2.2) * 0.5               // soft glow
      : pow(core, 1.6) * 0.2;              // dim warm-white dot
    gl_FragColor = vec4(mix(uWarm, uAccent, vAccent), alpha * vTwinkle);
  }
`

const LINE_VERT = /* glsl */ `
  ${DRIFT}
  attribute vec2  aAnchor;
  attribute float aPhase;
  attribute float aT;       // 0 at one end of the edge, 1 at the other
  attribute float aPulse;   // < 0: no pulse on this edge; otherwise a per-edge seed
  varying float vT;
  varying float vPulse;
  void main() {
    vT = aT;
    vPulse = aPulse;
    gl_Position = vec4(drift(aAnchor, aPhase), 0.0, 1.0);
  }
`

const LINE_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3  uWarm;
  uniform vec3  uAccent;
  varying float vT;
  varying float vPulse;
  void main() {
    float glow = 0.0;
    if (vPulse >= 0.0) {
      // each pulse edge fires for ~10 % of a 20–35 s cycle, the head travelling end to end
      float cycle  = fract(uTime / (20.0 + vPulse * 15.0) + vPulse * 7.0);
      float window = 0.1;
      float head   = cycle / window;
      glow = step(cycle, window) * (1.0 - smoothstep(0.0, 0.12, abs(vT - head))) * 0.3;
    }
    gl_FragColor = vec4(mix(uWarm, uAccent, min(glow * 3.0, 1.0)), 0.05 + glow);
  }
`

function cssColor(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return new THREE.Color(v || fallback)
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

// Nodes + nearest-neighbour edges, computed once (O(n²) for n ≤ 200 at mount only)
function buildGraph(count) {
  const anchors = new Float32Array(count * 2)
  const phase   = new Float32Array(count)
  const accent  = new Float32Array(count)
  const size    = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    anchors[i * 2]     = Math.random() * 2.1 - 1.05
    anchors[i * 2 + 1] = Math.random() * 2.1 - 1.05
    phase[i]  = Math.random()
    accent[i] = Math.random() < ACCENT_SHARE ? 1 : 0
    size[i]   = 2 + Math.random() * 1.6
  }

  const seen  = new Set()
  const edges = []
  for (let i = 0; i < count; i++) {
    const near = []
    for (let j = 0; j < count; j++) {
      if (i === j) continue
      const dx = anchors[i * 2] - anchors[j * 2]
      const dy = anchors[i * 2 + 1] - anchors[j * 2 + 1]
      const d2 = dx * dx + dy * dy
      if (d2 < MAX_EDGE * MAX_EDGE) near.push([d2, j])
    }
    near.sort((a, b) => a[0] - b[0])
    for (const [, j] of near.slice(0, NEIGHBOURS)) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`
      if (!seen.has(key)) { seen.add(key); edges.push([i, j]) }
    }
  }

  const n = edges.length * 2
  const lAnchor = new Float32Array(n * 2)
  const lPhase  = new Float32Array(n)
  const lT      = new Float32Array(n)
  const lPulse  = new Float32Array(n)
  edges.forEach(([a, b], e) => {
    const pulse = Math.random() < PULSE_SHARE ? Math.random() : -1
    ;[a, b].forEach((node, end) => {
      const v = e * 2 + end
      lAnchor[v * 2]     = anchors[node * 2]
      lAnchor[v * 2 + 1] = anchors[node * 2 + 1]
      lPhase[v] = phase[node]
      lT[v]     = end
      lPulse[v] = pulse
    })
  })

  return { anchors, phase, accent, size, lAnchor, lPhase, lT, lPulse }
}

export default function DataGraphBackground() {
  const rootRef = useRef(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (!hasWebGL()) { root.classList.add(styles.fallback); return }

    const isMobile = window.matchMedia('(max-width: 767px)').matches
    const reduced  = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const pointer  = window.matchMedia('(hover: hover) and (min-width: 768px)').matches

    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'low-power' })
    } catch {
      root.classList.add(styles.fallback)
      return
    }
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
    renderer.setPixelRatio(dpr)
    renderer.setClearColor(cssColor('--surface-black', '#0a0a0a'), 1)
    root.prepend(renderer.domElement)

    const g = buildGraph(isMobile ? NODES_MOBILE : NODES_DESKTOP)
    const uniforms = {
      uTime:       { value: 0 },
      uParallax:   { value: new THREE.Vector2() },
      uPixelRatio: { value: dpr },
      uWarm:       { value: cssColor('--surface-amber', '#fff7ed') },
      uAccent:     { value: cssColor('--accent', '#f7931e') },
    }

    const pointGeo = new THREE.BufferGeometry()
    pointGeo.setAttribute('aAnchor', new THREE.BufferAttribute(g.anchors, 2))
    pointGeo.setAttribute('aPhase',  new THREE.BufferAttribute(g.phase, 1))
    pointGeo.setAttribute('aAccent', new THREE.BufferAttribute(g.accent, 1))
    pointGeo.setAttribute('aSize',   new THREE.BufferAttribute(g.size, 1))
    pointGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(g.phase.length * 3), 3))  // count only

    const lineGeo = new THREE.BufferGeometry()
    lineGeo.setAttribute('aAnchor', new THREE.BufferAttribute(g.lAnchor, 2))
    lineGeo.setAttribute('aPhase',  new THREE.BufferAttribute(g.lPhase, 1))
    lineGeo.setAttribute('aT',      new THREE.BufferAttribute(g.lT, 1))
    lineGeo.setAttribute('aPulse',  new THREE.BufferAttribute(g.lPulse, 1))
    lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(g.lT.length * 3), 3))     // count only

    const common = { uniforms, transparent: true, depthTest: false, depthWrite: false }
    const pointMat = new THREE.ShaderMaterial({ ...common, vertexShader: POINT_VERT, fragmentShader: POINT_FRAG })
    const lineMat  = new THREE.ShaderMaterial({ ...common, vertexShader: LINE_VERT,  fragmentShader: LINE_FRAG })

    const scene  = new THREE.Scene()
    const lines  = new THREE.LineSegments(lineGeo, lineMat)
    const points = new THREE.Points(pointGeo, pointMat)
    lines.frustumCulled = points.frustumCulled = false   // positions come from the shader
    scene.add(lines, points)
    const camera = new THREE.Camera()                    // shaders write clip space directly

    function resize() {
      renderer.setSize(root.clientWidth, root.clientHeight, false)
      renderer.render(scene, camera)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(root)
    resize()

    // Gentle mouse parallax (desktop only), eased toward the target each frame
    const mouse = new THREE.Vector2()
    function onMove(e) {
      mouse.set((e.clientX / window.innerWidth - 0.5) * PARALLAX, -(e.clientY / window.innerHeight - 0.5) * PARALLAX)
    }
    if (pointer && !reduced) window.addEventListener('mousemove', onMove)

    let animId = 0
    let last = 0
    function frame(t) {
      animId = requestAnimationFrame(frame)
      const dt = last ? Math.min((t - last) / 1000, 0.05) : 0   // capped so a pause doesn't jump
      last = t
      uniforms.uTime.value += dt
      uniforms.uParallax.value.lerp(mouse, 0.04)
      renderer.render(scene, camera)
    }

    // Run only while the publications backdrop is on screen and the tab is visible
    let visible = false
    function sync() {
      const run = visible && !document.hidden && !reduced
      if (run && !animId) { last = 0; animId = requestAnimationFrame(frame) }
      if (!run && animId) { cancelAnimationFrame(animId); animId = 0 }
    }
    const unwatch = watchLayerVisibility(root, isVisible => { visible = isVisible; sync() })
    document.addEventListener('visibilitychange', sync)

    function onContextLost(e) {
      e.preventDefault()
      cancelAnimationFrame(animId); animId = 0
      root.classList.add(styles.fallback, styles.lost)   // hide the dead canvas, show the gradient
    }
    renderer.domElement.addEventListener('webglcontextlost', onContextLost)

    return () => {
      cancelAnimationFrame(animId)
      unwatch()
      ro.disconnect()
      document.removeEventListener('visibilitychange', sync)
      window.removeEventListener('mousemove', onMove)
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost)
      pointGeo.dispose(); lineGeo.dispose()
      pointMat.dispose(); lineMat.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return (
    <div ref={rootRef} className={styles.root} aria-hidden="true">
      <div className={styles.shade} />
    </div>
  )
}
