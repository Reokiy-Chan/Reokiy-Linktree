import type { Metadata } from 'next'
import RedeemClient from './RedeemClient'

export const metadata: Metadata = {
  title: 'Redeem Code | reokiy',
  description: 'Redeem a reward code',
}

export default function Page() {
  return <RedeemClient />
}