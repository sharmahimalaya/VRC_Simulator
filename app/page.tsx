import type { Metadata } from 'next'
import VRCSimulator from './VRCSimulator' // Import our new client component

// This is a Server Component, so we can export metadata
export const metadata: Metadata = {
  title: 'VRC Simulator | Error Detection',
  description: 'A simulator for Vertical Redundancy Check (VRC) error detection.',
}

// This is the main page
export default function Page() {
  // It just renders the interactive client component
  return (
    <main>
      <VRCSimulator />
    </main>
  )
}