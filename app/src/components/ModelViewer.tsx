'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment } from '@react-three/drei'

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  return <primitive object={scene} />
}

export default function ModelViewer({ url }: { url: string }) {
  return (
    <div className="w-full h-64 bg-gray-900 rounded-xl overflow-hidden">
      <Canvas camera={{ position: [0, 1, 3], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <Environment preset="city" />
        <Suspense fallback={null}>
          <Model url={url} />
        </Suspense>
        <OrbitControls autoRotate autoRotateSpeed={2} />
      </Canvas>
    </div>
  )
}
