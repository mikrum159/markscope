import { useEffect, useState } from 'react'

/**
 * True only once `active` has been continuously true for `delayMs`, and false
 * again the moment it stops. Used to keep a transient state from reaching the
 * screen at all: the caller passes the real condition, and this hook decides
 * whether it has lasted long enough to be worth showing.
 *
 * Note that it delays the *display*, never the work. Whatever `active` is
 * tracking runs at full speed; only the feedback about it waits.
 */
export function useDelayedFlag(active: boolean, delayMs: number): boolean {
  const [elapsed, setElapsed] = useState(false)
  const [previousActive, setPreviousActive] = useState(active)

  // The reset happens here, during render, rather than in the effect below.
  // React documents this as the way to adjust state when an input changes
  // ("You Might Not Need an Effect"), and it is what the
  // react-hooks/set-state-in-effect rule requires: React re-runs this
  // component with the new state before anything is painted, so a stale
  // `elapsed` from an earlier activation is never rendered and no extra frame
  // is shown. Doing the same work in the effect would paint once with the
  // stale value and then cascade a second render to correct it.
  if (active !== previousActive) {
    setPreviousActive(active)
    setElapsed(false)
  }

  useEffect(() => {
    if (!active) return

    const timer = setTimeout(() => setElapsed(true), delayMs)
    return () => clearTimeout(timer)
  }, [active, delayMs])

  return active && elapsed
}
