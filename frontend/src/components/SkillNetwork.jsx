import { useRef, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Points, PointMaterial } from '@react-three/drei'
import * as THREE from 'three'

// Generate pseudo-random positions for skills
const generateNodes = (count = 150) => {
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 10
    positions[i * 3 + 1] = (Math.random() - 0.5) * 10
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10
  }
  return positions
}

function Constellation() {
  const groupRef = useRef()
  const pointsRef = useRef()
  const linesRef = useRef()

  const { positions, linePositions } = useMemo(() => {
    const count = 150
    const pos = new Float32Array(count * 3)
    const pts = []
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 12
      const y = (Math.random() - 0.5) * 12
      const z = (Math.random() - 0.5) * 12
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      pts.push(new THREE.Vector3(x, y, z))
    }

    // Connect close points
    const lines = []
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const d = pts[i].distanceTo(pts[j])
        if (d < 2.5) {
          lines.push(pts[i].x, pts[i].y, pts[i].z, pts[j].x, pts[j].y, pts[j].z)
        }
      }
    }
    return { positions: pos, linePositions: new Float32Array(lines) }
  }, [])

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.x -= delta * 0.05
      groupRef.current.rotation.y -= delta * 0.07
    }
  })

  return (
    <group ref={groupRef} rotation={[0, 0, Math.PI / 4]}>
      <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
        <PointMaterial transparent color="#A9DCC8" size={0.06} sizeAttenuation={true} depthWrite={false} />
      </Points>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={linePositions.length / 3} array={linePositions} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial color="#103B3A" transparent opacity={0.3} depthWrite={false} />
      </lineSegments>
    </group>
  )
}

function CameraRig() {
  useFrame((state) => {
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, (state.mouse.x * 2), 0.05)
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, (state.mouse.y * 2), 0.05)
    state.camera.lookAt(0, 0, 0)
  })
  return null
}

export default function SkillNetwork({ isInteractive = true }) {
  // Respect user preference for reduced motion
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (prefersReducedMotion) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.1)', fontSize: '20rem', fontWeight: 900 }}>
        *
      </div>
    )
  }

  return (
    <Canvas camera={{ position: [0, 0, 8], fov: 60 }} dpr={Math.min(2, window.devicePixelRatio || 1)}>
      <fog attach="fog" args={['#0B1117', 5, 15]} />
      <ambientLight intensity={0.5} />
      <Constellation />
      {isInteractive && <CameraRig />}
    </Canvas>
  )
}
