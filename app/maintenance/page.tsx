import type { Metadata } from 'next'
import MaintenanceClient from './MaintenanceClient'

export const metadata: Metadata = {
  title: 'Maintenance | reokiy',
  description: 'Site is under maintenance',
}

export default function Page() {
  return <MaintenanceClient />
}