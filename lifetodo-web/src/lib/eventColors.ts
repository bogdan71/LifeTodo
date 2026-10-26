/**
 * The colour code for the calendar. One list feeds the picker in the event dialog,
 * the legend under the calendar, and the colour each event is drawn in — so the
 * names people pick are always the names they see on the grid.
 */
export interface EventColor {
  /** Hex value stored on the event and handed to FullCalendar. */
  value: string
  /** What the colour means, in the words the picker and legend use. */
  name: string
}

export const EVENT_COLORS: EventColor[] = [
  { value: '#6366f1', name: 'Focus / work' },
  { value: '#0ea5e9', name: 'Meetings' },
  { value: '#10b981', name: 'Health' },
  { value: '#f59e0b', name: 'Personal' },
  { value: '#f43f5e', name: 'Family' },
  { value: '#8b5cf6', name: 'Learning' },
]

export const DEFAULT_EVENT_COLOR = EVENT_COLORS[0].value

/** The dark half of the text-colour choice; white is the other half. */
const DARK_INK = '#0f172a'

/** The name for a stored colour, falling back to the raw value for a custom one. */
export function eventColorName(value: string | null | undefined): string {
  if (!value) return 'No colour'
  const wanted = value.trim().toLowerCase()
  return EVENT_COLORS.find((color) => color.value === wanted)?.name ?? value
}

function channelLuminance(component: number): number {
  const value = component / 255
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

/** WCAG relative luminance, or null when the value isn't a plain six-digit hex. */
function relativeLuminance(color: string): number | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(color.trim())
  if (!match) return null

  const hex = match[1]
  return (
    0.2126 * channelLuminance(parseInt(hex.slice(0, 2), 16)) +
    0.7152 * channelLuminance(parseInt(hex.slice(2, 4), 16)) +
    0.0722 * channelLuminance(parseInt(hex.slice(4, 6), 16))
  )
}

/**
 * Dark ink or white for a title sitting on `background`, whichever ends up with the
 * higher contrast. The switch point is where the two candidates score equally —
 * on a light swatch like amber the dark ink wins, on indigo white does.
 */
export function readableTextColor(background: string): string {
  const luminance = relativeLuminance(background)
  const dark = relativeLuminance(DARK_INK)
  if (luminance === null || dark === null) return '#ffffff'

  const switchPoint = Math.sqrt(1.05 * (dark + 0.05)) - 0.05
  return luminance > switchPoint ? DARK_INK : '#ffffff'
}
