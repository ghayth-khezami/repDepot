import Lottie from 'lottie-react'
import babyLoadingAnimation from '../Baby loading.json'

export function PostLoginLoadingOverlay({
  isOpen,
  message = 'Bonjour et bienvenue EYA et GHASSEN',
}: {
  isOpen: boolean
  message?: string
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-lavender-100 via-peach-50 to-secondary-100">
      <div className="w-64 max-w-[80vw] flex flex-col items-center animate-card-enter">
        <Lottie animationData={babyLoadingAnimation} loop />
        <div className="mt-4 text-center text-base font-semibold text-lavender-800">{message}</div>
      </div>
    </div>
  )
}

