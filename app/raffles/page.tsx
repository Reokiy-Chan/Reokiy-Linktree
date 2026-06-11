import type { Metadata } from 'next'
import RafflesClient from './RafflesClient'

export const metadata: Metadata = {
  title: 'Giveaways | reokiy',
  description: 'Active giveaways and raffles',
}

export default function Page() {
  return <RafflesClient />
}