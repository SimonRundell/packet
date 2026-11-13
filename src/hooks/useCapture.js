import { useEffect, useRef } from 'react'
import { pickScenarioBuilder } from '../lib/scenarios.js'
import { finalizePacket } from '../lib/packetBuilder.js'

const TICK_MS = 120
const MIN_SCENARIO_GAP_MS = 250
const MAX_SCENARIO_GAP_MS = 1400

/**
 * Drives the simulated capture: periodically starts a new "conversation"
 * scenario (lib/scenarios.js) and schedules its packets, then drains and
 * dispatches whichever scheduled packets have come due on every tick.
 * Uses performance.now() as its own internal clock so capture time keeps
 * accumulating correctly across pause/resume.
 */
export function useCapture({ isCapturing, interfaceName, dispatch }) {
  const queueRef = useRef([])
  const counterRef = useRef(1)
  const nextScenarioAtRef = useRef(null)
  const startedAtRef = useRef(null)

  useEffect(() => {
    if (!isCapturing) return undefined

    if (startedAtRef.current === null) startedAtRef.current = performance.now()
    if (nextScenarioAtRef.current === null) nextScenarioAtRef.current = performance.now()

    const timer = setInterval(() => {
      const now = performance.now()

      if (now >= nextScenarioAtRef.current) {
        const build = pickScenarioBuilder()
        const events = build()
        let cursor = now
        for (const event of events) {
          cursor += event.delayMs
          queueRef.current.push({ dueAt: cursor, event })
        }
        nextScenarioAtRef.current =
          now + MIN_SCENARIO_GAP_MS + Math.random() * (MAX_SCENARIO_GAP_MS - MIN_SCENARIO_GAP_MS)
      }

      const due = []
      const remaining = []
      for (const item of queueRef.current) {
        if (item.dueAt <= now) due.push(item)
        else remaining.push(item)
      }
      if (due.length === 0) return
      queueRef.current = remaining
      due.sort((a, b) => a.dueAt - b.dueAt)

      const packets = due.map(({ event, dueAt }) => {
        const number = counterRef.current++
        const relTime = Math.max(0, (dueAt - startedAtRef.current) / 1000)
        const timestamp = Date.now() - (now - dueAt)
        return finalizePacket({
          layerParts: event.layerParts,
          number,
          timestamp,
          relTime,
          srcAddr: event.srcAddr,
          dstAddr: event.dstAddr,
          protocol: event.protocol,
          info: event.info,
          interfaceName,
        })
      })

      dispatch({ type: 'ADD_PACKETS', packets })
    }, TICK_MS)

    return () => clearInterval(timer)
  }, [isCapturing, interfaceName, dispatch])

  function reset() {
    queueRef.current = []
    counterRef.current = 1
    startedAtRef.current = null
    nextScenarioAtRef.current = null
  }

  return { reset }
}
