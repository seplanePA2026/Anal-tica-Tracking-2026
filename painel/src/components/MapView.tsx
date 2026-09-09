import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import type { Municipality } from '../types'

type Props = {
  municipalities: Municipality[]
  selected: string | null
  onSelect: (name: string) => void
  /** Clique no mapa (fora dos pontos) volta para a Bahia. */
  onClear?: () => void
  visible?: boolean
}

export function MapView({
  municipalities,
  selected,
  onSelect,
  onClear,
  visible = true,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const fittedRef = useRef(false)
  const onSelectRef = useRef(onSelect)
  const onClearRef = useRef(onClear)
  const [ready, setReady] = useState(false)
  onSelectRef.current = onSelect
  onClearRef.current = onClear

  useEffect(() => {
    const el = hostRef.current
    if (!el) return

    const map = L.map(el, {
      zoomControl: false,
      scrollWheelZoom: true,
      attributionControl: true,
    }).setView([-13.2, -41.7], 6)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 18,
    }).addTo(map)

    L.control.zoom({ position: 'topright' }).addTo(map)
    const group = L.layerGroup().addTo(map)

    map.on('click', () => {
      onClearRef.current?.()
    })

    mapRef.current = map
    layerRef.current = group
    setReady(true)

    const resize = () => {
      if (mapRef.current === map) map.invalidateSize()
    }
    window.addEventListener('resize', resize)
    const frame = window.requestAnimationFrame(resize)

    return () => {
      window.removeEventListener('resize', resize)
      window.cancelAnimationFrame(frame)
      setReady(false)
      mapRef.current = null
      layerRef.current = null
      fittedRef.current = false
      map.remove()
    }
  }, [])

  useEffect(() => {
    if (!visible) return
    const map = mapRef.current
    if (!map) return
    const id = window.requestAnimationFrame(() => map.invalidateSize())
    return () => window.cancelAnimationFrame(id)
  }, [visible])

  useEffect(() => {
    if (!ready) return
    const map = mapRef.current
    const group = layerRef.current
    if (!map || !group) return
    group.clearLayers()
    const bounds: L.LatLngTuple[] = []

    for (const m of municipalities) {
      if (m.lat == null || m.lon == null) continue
      const isSel = selected === m.name
      const size = Math.max(16, Math.min(34, 12 + Math.sqrt(m.n) * 1.15))
      const icon = L.divIcon({
        className: `mun-marker${isSel ? ' is-sel' : ''}`,
        html: `<span class="pin${isSel ? ' sel' : ''}"></span>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      })
      const marker = L.marker([m.lat, m.lon], {
        icon,
        keyboard: true,
        riseOnHover: true,
      })
      marker.bindTooltip(m.name, {
        direction: 'top',
        offset: [0, -size / 2 - 2],
        opacity: 1,
        className: 'mun-tip',
      })
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e)
        onSelectRef.current(m.name)
      })
      marker.addTo(group)
      bounds.push([m.lat, m.lon])
    }

    if (bounds.length && !fittedRef.current) {
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 8 })
      fittedRef.current = true
    }
    if (mapRef.current === map) map.invalidateSize()
  }, [ready, municipalities, selected])

  return (
    <div className="map-wrap">
      <div ref={hostRef} className="map-canvas" />
    </div>
  )
}
