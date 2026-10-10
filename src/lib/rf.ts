/** Speed of light in vacuum, m/s. */
export const C0 = 299_792_458

export const rad = (d: number) => (d * Math.PI) / 180
export const deg = (r: number) => (r * 180) / Math.PI
export const toDb = (x: number) => 10 * Math.log10(x)

/** Free-space wavelength in metres for a frequency in MHz. */
export function wavelength(fMHz: number): number {
  return C0 / (fMHz * 1e6)
}

/** Frequency in MHz for a free-space wavelength in metres. */
export function frequencyMHz(lambdaM: number): number {
  return C0 / lambdaM / 1e6
}
