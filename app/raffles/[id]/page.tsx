import type { Metadata } from 'next'
import RaffleDetailClient from './RaffleDetailClient'

export const metadata: Metadata = {
  title: 'Giveaway | reokiy',
  description: 'Giveaway entry page',
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <RaffleDetailClient params={params} />
}