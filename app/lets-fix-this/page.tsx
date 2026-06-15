import type { Metadata } from 'next'
import LetsFixThisClient from './LetsFixThisClient'

export const metadata: Metadata = {
  title: 'reokiy',
  description: '',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <LetsFixThisClient />
}
