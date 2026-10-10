import { useEffect, useRef, useState } from 'react'
import type { Vec3 } from '../lib/geometry'

export interface Scene3D {
  /** Conductors as polylines in metres, z up. */
  wires: Vec3[][]
  /** Optional ground disc (diameter in m) at z = 0. */
  groundDiameter?: number
  /** Conductor diameter in m for drawing. */
  wireDiameter: number
  /** Extra emphasised wires (second loop) drawn in another colour. */
  accent?: Vec3[][]
}

/** Interactive Three.js preview; three is loaded lazily so the first paint stays light. */
export default function Preview3D({ scene, msgNoGl }: { scene: Scene3D; msgNoGl: string }) {
  const host = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const el = host.current
    if (!el) return
    let disposed = false
    let cleanup = () => {}
    ;(async () => {
      try {
        const THREE = await import('three')
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')
        if (disposed) return
        const css = getComputedStyle(document.documentElement)
        const bg = css.getPropertyValue('--chart-bg').trim() || '#0b0d11'
        const accentCol = css.getPropertyValue('--accent').trim() || '#3b82f6'
        const warnCol = css.getPropertyValue('--warn').trim() || '#fbbf24'
        const renderer = new THREE.WebGLRenderer({ antialias: true })
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
        el.appendChild(renderer.domElement)
        const sc = new THREE.Scene()
        sc.background = new THREE.Color(bg)
        sc.add(new THREE.AmbientLight(0xffffff, 1.2))
        const dir = new THREE.DirectionalLight(0xffffff, 2.2)
        dir.position.set(1, 2, 1.5)
        sc.add(dir)

        // Model space: z up in the maths, y up in three.js.
        const toV = (p: Vec3) => new THREE.Vector3(p[0], p[2], -p[1])
        const all = [...scene.wires, ...(scene.accent ?? [])]
        let maxR = scene.groundDiameter ? scene.groundDiameter / 2 : 0
        let maxH = 0
        for (const w of all)
          for (const p of w) {
            maxR = Math.max(maxR, Math.hypot(p[0], p[1]))
            maxH = Math.max(maxH, p[2])
          }
        const size = Math.max(maxR * 2, maxH, 1e-6)
        const rad = Math.max(scene.wireDiameter / 2, size * 0.004)
        const geos: { dispose: () => void }[] = []
        const add = (poly: Vec3[], color: string) => {
          const pts = poly.map(toV)
          const curve = pts.length > 2 ? new THREE.CatmullRomCurve3(pts, false, 'centripetal') : new THREE.LineCurve3(pts[0], pts[1])
          const g = new THREE.TubeGeometry(curve, Math.max(8, pts.length * 2), rad, 8, false)
          const m = new THREE.MeshStandardMaterial({ color, metalness: 0.4, roughness: 0.4 })
          geos.push(g, m)
          sc.add(new THREE.Mesh(g, m))
        }
        for (const w of scene.wires) add(w, accentCol)
        for (const w of scene.accent ?? []) add(w, warnCol)
        if (scene.groundDiameter) {
          const g = new THREE.CircleGeometry(scene.groundDiameter / 2, 64)
          const m = new THREE.MeshStandardMaterial({ color: '#8b93a1', side: THREE.DoubleSide, transparent: true, opacity: 0.55 })
          geos.push(g, m)
          const mesh = new THREE.Mesh(g, m)
          mesh.rotation.x = -Math.PI / 2
          mesh.position.y = -rad
          sc.add(mesh)
        }
        const grid = new THREE.GridHelper(size * 2, 10, 0x667085, 0x3a414e)
        grid.position.y = -rad * 2
        sc.add(grid)
        geos.push(grid.geometry)

        const cam = new THREE.PerspectiveCamera(40, 1, size / 100, size * 50)
        cam.position.set(size * 1.1, maxH * 0.9 + size * 0.35, size * 1.4)
        const ctl = new OrbitControls(cam, renderer.domElement)
        ctl.target.set(0, maxH / 2, 0)
        ctl.autoRotate = true
        ctl.autoRotateSpeed = 1.2
        ctl.enableDamping = true
        ctl.update()
        const stop = () => (ctl.autoRotate = false)
        renderer.domElement.addEventListener('pointerdown', stop)

        const resize = () => {
          const w = el.clientWidth
          const h = el.clientHeight
          renderer.setSize(w, h, false)
          cam.aspect = w / Math.max(1, h)
          cam.updateProjectionMatrix()
        }
        const ro = new ResizeObserver(resize)
        ro.observe(el)
        resize()
        let raf = 0
        const loop = () => {
          ctl.update()
          renderer.render(sc, cam)
          raf = requestAnimationFrame(loop)
        }
        loop()
        cleanup = () => {
          cancelAnimationFrame(raf)
          ro.disconnect()
          ctl.dispose()
          for (const g of geos) g.dispose()
          renderer.dispose()
          renderer.domElement.remove()
        }
        if (disposed) cleanup()
      } catch {
        if (!disposed) setFailed(true)
      }
    })()
    return () => {
      disposed = true
      cleanup()
    }
  }, [scene])

  return (
    <div className="scene-canvas" ref={host} role="img" aria-label="3D preview">
      {failed && <div className="scene-msg">{msgNoGl}</div>}
    </div>
  )
}
