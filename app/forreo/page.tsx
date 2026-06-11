import type { Metadata } from 'next'
import ForreoClient from './ForreoClient'

export const metadata: Metadata = {
  title: 'forreo | reokiy',
  description: 'forreo',
}

export default function Page() {
  return <ForreoClient />
}