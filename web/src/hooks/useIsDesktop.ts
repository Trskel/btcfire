import { useEffect, useState } from 'react'

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(min-width: 640px)').matches
      : false,
  )

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 640px)')
    const onChange = (event: MediaQueryListEvent) => setIsDesktop(event.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isDesktop
}
