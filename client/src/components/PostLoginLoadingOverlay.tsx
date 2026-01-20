import Lottie from 'lottie-react'
import babyLoadingAnimation from '../Baby loading.json'

export function PostLoginLoadingOverlay({ isOpen }: { isOpen: boolean }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/90 backdrop-blur-sm">
      <div className="w-64 max-w-[80vw]">
        <Lottie animationData={babyLoadingAnimation} loop />
        <div className="mt-4 text-center text-sm font-medium text-gray-700">Chargement…</div>
      </div>
    </div>
  )
}

