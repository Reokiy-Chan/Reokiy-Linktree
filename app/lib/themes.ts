export interface ColorPalette {
  bg: string
  primary: string
  primaryRgb: string
  primaryDim: string
  primaryGlow: string
  pink: string
  pinkRgb: string
  pinkDim: string
  burgundy: string
  particleColors: string[]
  name: string
}

export const PALETTES: ColorPalette[] = [
  {
    name: 'crimson',
    bg: '/images/bg1.png',
    primary: '#c41428',
    primaryRgb: '196,20,40',
    primaryDim: 'rgba(196,20,40,0.14)',
    primaryGlow: 'rgba(196,20,40,0.38)',
    pink: '#f0a0b8',
    pinkRgb: '240,160,184',
    pinkDim: 'rgba(240,160,184,0.18)',
    burgundy: '#6b0010',
    particleColors: ['rgba(196,20,40,', 'rgba(240,160,184,', 'rgba(107,0,16,', 'rgba(255,255,255,'],
  },
  {
    name: 'violet',
    bg: '/images/bg2.png',
    primary: '#7c3aed',
    primaryRgb: '124,58,237',
    primaryDim: 'rgba(124,58,237,0.14)',
    primaryGlow: 'rgba(124,58,237,0.38)',
    pink: '#c4b5fd',
    pinkRgb: '196,181,253',
    pinkDim: 'rgba(196,181,253,0.18)',
    burgundy: '#4c1d95',
    particleColors: ['rgba(124,58,237,', 'rgba(196,181,253,', 'rgba(76,29,149,', 'rgba(255,255,255,'],
  },
  {
    name: 'ocean',
    bg: '/images/bg3.png',
    primary: '#0ea5e9',
    primaryRgb: '14,165,233',
    primaryDim: 'rgba(14,165,233,0.14)',
    primaryGlow: 'rgba(14,165,233,0.38)',
    pink: '#7dd3fc',
    pinkRgb: '125,211,252',
    pinkDim: 'rgba(125,211,252,0.18)',
    burgundy: '#0369a1',
    particleColors: ['rgba(14,165,233,', 'rgba(125,211,252,', 'rgba(3,105,161,', 'rgba(255,255,255,'],
  },
  {
    name: 'emerald',
    bg: '/images/bg4.png',
    primary: '#10b981',
    primaryRgb: '16,185,129',
    primaryDim: 'rgba(16,185,129,0.14)',
    primaryGlow: 'rgba(16,185,129,0.38)',
    pink: '#6ee7b7',
    pinkRgb: '110,231,183',
    pinkDim: 'rgba(110,231,183,0.18)',
    burgundy: '#065f46',
    particleColors: ['rgba(16,185,129,', 'rgba(110,231,183,', 'rgba(6,95,70,', 'rgba(255,255,255,'],
  },
  {
    name: 'amber',
    bg: '/images/bg5.png',
    primary: '#f59e0b',
    primaryRgb: '245,158,11',
    primaryDim: 'rgba(245,158,11,0.14)',
    primaryGlow: 'rgba(245,158,11,0.38)',
    pink: '#fde68a',
    pinkRgb: '253,230,138',
    pinkDim: 'rgba(253,230,138,0.18)',
    burgundy: '#92400e',
    particleColors: ['rgba(245,158,11,', 'rgba(253,230,138,', 'rgba(146,64,14,', 'rgba(255,255,255,'],
  },
  {
    name: 'sakura',
    bg: '/images/bg6.png',
    primary: '#ec4899',
    primaryRgb: '236,72,153',
    primaryDim: 'rgba(236,72,153,0.14)',
    primaryGlow: 'rgba(236,72,153,0.38)',
    pink: '#fbcfe8',
    pinkRgb: '251,207,232',
    pinkDim: 'rgba(251,207,232,0.18)',
    burgundy: '#9d174d',
    particleColors: ['rgba(236,72,153,', 'rgba(251,207,232,', 'rgba(157,23,77,', 'rgba(255,255,255,'],
  },
  {
    name: 'cyber',
    bg: '/images/bg7.png',
    primary: '#14b8a6',
    primaryRgb: '20,184,166',
    primaryDim: 'rgba(20,184,166,0.14)',
    primaryGlow: 'rgba(20,184,166,0.38)',
    pink: '#99f6e4',
    pinkRgb: '153,246,228',
    pinkDim: 'rgba(153,246,228,0.18)',
    burgundy: '#134e4a',
    particleColors: ['rgba(20,184,166,', 'rgba(153,246,228,', 'rgba(19,78,74,', 'rgba(255,255,255,'],
  },
]