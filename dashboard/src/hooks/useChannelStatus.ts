import { useMemo } from 'react'
import { useClient } from '../contexts/ClientContext'

export interface ChannelStatus {
  /** True if at least one social channel has a non-empty handle/URL */
  hasConnectedChannels: boolean
  /** Map of platform → URL, only for connected platforms */
  connectedChannels: Record<string, string>
  /** List of platform keys that have handles */
  connectedPlatforms: string[]
  /** Check if a specific platform is connected */
  isConnected: (platform: string) => boolean
}

export function useChannelStatus(): ChannelStatus {
  const { currentClient } = useClient()

  return useMemo(() => {
    const handles = currentClient?.social_handles
    const connectedChannels: Record<string, string> = {}

    if (handles && typeof handles === 'object') {
      for (const [platform, url] of Object.entries(handles)) {
        if (url && typeof url === 'string' && url.trim().length > 0) {
          connectedChannels[platform] = url.trim()
        }
      }
    }

    const connectedPlatforms = Object.keys(connectedChannels)

    return {
      hasConnectedChannels: connectedPlatforms.length > 0,
      connectedChannels,
      connectedPlatforms,
      isConnected: (platform: string) => platform in connectedChannels,
    }
  }, [currentClient?.social_handles])
}
