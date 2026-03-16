declare module 'react-simple-maps' {
  import { ReactNode, CSSProperties, SVGProps, ForwardRefExoticComponent, RefAttributes } from 'react'

  export interface ComposableMapProps {
    projection?: string
    projectionConfig?: {
      rotate?: [number, number, number]
      center?: [number, number]
      scale?: number
      parallels?: [number, number]
    }
    width?: number
    height?: number
    className?: string
    style?: CSSProperties
    children?: ReactNode
  }

  export interface GeographiesProps {
    geography: string | object
    children: (props: { geographies: GeographyFeature[]; outline: object; borders: object }) => ReactNode
    parseGeographies?: (features: GeographyFeature[]) => GeographyFeature[]
    className?: string
  }

  export interface GeographyFeature {
    type: string
    id: string
    properties: Record<string, unknown>
    geometry: object
    rsmKey: string
  }

  export interface GeographyProps extends SVGProps<SVGPathElement> {
    geography: GeographyFeature
    style?: {
      default?: CSSProperties
      hover?: CSSProperties
      pressed?: CSSProperties
    }
    className?: string
    onMouseEnter?: (event: React.MouseEvent<SVGPathElement, MouseEvent>) => void
    onMouseLeave?: (event: React.MouseEvent<SVGPathElement, MouseEvent>) => void
    onClick?: (event: React.MouseEvent<SVGPathElement, MouseEvent>) => void
  }

  export interface SphereProps extends SVGProps<SVGPathElement> {
    id?: string
    fill?: string
    stroke?: string
    strokeWidth?: number
    className?: string
  }

  export interface GraticuleProps extends SVGProps<SVGPathElement> {
    step?: [number, number]
    fill?: string
    stroke?: string
    strokeWidth?: number
    className?: string
  }

  export interface MarkerProps {
    coordinates: [number, number]
    children?: ReactNode
    className?: string
    style?: CSSProperties
  }

  export interface ZoomableGroupProps {
    center?: [number, number]
    zoom?: number
    minZoom?: number
    maxZoom?: number
    translateExtent?: [[number, number], [number, number]]
    onMoveStart?: (pos: { coordinates: [number, number]; zoom: number }) => void
    onMove?: (pos: { x: number; y: number; zoom: number; dragging: boolean }) => void
    onMoveEnd?: (pos: { coordinates: [number, number]; zoom: number }) => void
    children?: ReactNode
    className?: string
  }

  export const ComposableMap: ForwardRefExoticComponent<ComposableMapProps & RefAttributes<SVGSVGElement>>
  export const Geographies: ForwardRefExoticComponent<GeographiesProps & RefAttributes<SVGGElement>>
  export const Geography: ForwardRefExoticComponent<GeographyProps & RefAttributes<SVGPathElement>>
  export const Sphere: ForwardRefExoticComponent<SphereProps & RefAttributes<SVGPathElement>>
  export const Graticule: ForwardRefExoticComponent<GraticuleProps & RefAttributes<SVGPathElement>>
  export const Marker: ForwardRefExoticComponent<MarkerProps & RefAttributes<SVGGElement>>
  export const ZoomableGroup: ForwardRefExoticComponent<ZoomableGroupProps & RefAttributes<SVGGElement>>
}
