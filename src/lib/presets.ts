export interface HelixPreset {
  id: string
  name: string
  fMHz: number
  cOverLambda: number
  pitchDeg: number
  turns: number
  wireMm: number
  groundOverLambda: number
}

export const HELIX_PRESETS: HelixPreset[] = [
  { id: 'uhf-sat', name: '435 MHz satellite (70 cm), 10 turns', fMHz: 435, cOverLambda: 1, pitchDeg: 13, turns: 10, wireMm: 4, groundOverLambda: 1 },
  { id: 'wifi', name: '2.4 GHz Wi-Fi, 12 turns', fMHz: 2437, cOverLambda: 1, pitchDeg: 13, turns: 12, wireMm: 1.5, groundOverLambda: 1 },
  { id: 'fpv', name: '5.8 GHz FPV, 5 turns', fMHz: 5800, cOverLambda: 1, pitchDeg: 13, turns: 5, wireMm: 1, groundOverLambda: 1 },
  { id: 'goes', name: '1694.1 MHz GOES HRIT, 12 turns', fMHz: 1694.1, cOverLambda: 1, pitchDeg: 13, turns: 12, wireMm: 2, groundOverLambda: 1 },
  { id: 'vhf-sat', name: '145.9 MHz satellite uplink, 6 turns', fMHz: 145.9, cOverLambda: 1, pitchDeg: 13, turns: 6, wireMm: 10, groundOverLambda: 0.8 },
]

export interface QfhPreset {
  id: string
  name: string
  fMHz: number
  heightOverLambda: number
  wireMm: number
}

export const QFH_PRESETS: QfhPreset[] = [
  { id: 'noaa', name: 'NOAA APT 137.5 MHz (NOAA 15/18/19)', fMHz: 137.5, heightOverLambda: 0.245, wireMm: 10 },
  { id: 'meteor', name: 'Meteor-M LRPT 137.9 MHz', fMHz: 137.9, heightOverLambda: 0.245, wireMm: 10 },
  { id: 'noaa19', name: 'NOAA 19 137.1 MHz', fMHz: 137.1, heightOverLambda: 0.245, wireMm: 10 },
  { id: 'iridium', name: 'Iridium L-band 1626 MHz', fMHz: 1626, heightOverLambda: 0.245, wireMm: 2 },
  { id: 'gps', name: 'GPS L1 1575.42 MHz', fMHz: 1575.42, heightOverLambda: 0.245, wireMm: 2 },
  { id: 'inmarsat', name: 'Inmarsat / STD-C 1541 MHz', fMHz: 1541, heightOverLambda: 0.245, wireMm: 2 },
]
