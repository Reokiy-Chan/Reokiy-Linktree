import type { Metadata } from 'next'
import HomeClient from './HomeClient'

export const metadata: Metadata = {
  title: 'reokiy',
  description: 'Links, giveaways and updates from reokiy',
}

export default function Page() {
  return <HomeClient />
}