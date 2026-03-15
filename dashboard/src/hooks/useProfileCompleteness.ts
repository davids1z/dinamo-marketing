import { useMemo } from 'react'
import { useClient } from '../contexts/ClientContext'
import { useProjectStatus } from './useProjectStatus'

export interface ProfileCheck {
  id: string
  label: string
  done: boolean
  weight: number
}

export interface ProfileCompleteness {
  /** 0–100 percentage */
  percent: number
  /** Individual field checks with weights */
  checks: ProfileCheck[]
  /** Number of completed checks */
  completedCount: number
  /** Total number of checks */
  totalCount: number
  /** True when all critical criteria are met: name+desc, audience+tone, 1 social, 1 project */
  isReady: boolean
}

export function useProfileCompleteness(): ProfileCompleteness {
  const { currentClient } = useClient()
  const { hasProjects } = useProjectStatus()

  return useMemo(() => {
    const c = currentClient

    // Count connected social handles
    const socialHandles = c?.social_handles
    let connectedCount = 0
    if (socialHandles && typeof socialHandles === 'object') {
      for (const url of Object.values(socialHandles)) {
        if (url && typeof url === 'string' && url.trim().length > 0) {
          connectedCount++
        }
      }
    }

    const checks: ProfileCheck[] = [
      {
        id: 'name',
        label: 'Ime klijenta',
        done: !!(c?.client_name && c.client_name.trim().length > 0),
        weight: 5,
      },
      {
        id: 'description',
        label: 'Opis poslovanja',
        done: !!(c?.business_description && c.business_description.trim().length >= 20),
        weight: 15,
      },
      {
        id: 'audience',
        label: 'Ciljna publika',
        done: !!(c?.target_audience && c.target_audience.trim().length >= 10),
        weight: 10,
      },
      {
        id: 'tone',
        label: 'Ton komunikacije',
        done: !!(c?.tone_of_voice && c.tone_of_voice.trim().length > 0),
        weight: 10,
      },
      {
        id: 'logo',
        label: 'Logo',
        done: !!(c?.logo_url || c?.client_logo_url),
        weight: 10,
      },
      {
        id: 'social1',
        label: 'Prva društvena mreža',
        done: connectedCount >= 1,
        weight: 20,
      },
      {
        id: 'social2',
        label: 'Druga društvena mreža',
        done: connectedCount >= 2,
        weight: 10,
      },
      {
        id: 'hashtags',
        label: 'Hashtagovi',
        done: !!(c?.hashtags && Array.isArray(c.hashtags) && c.hashtags.length > 0),
        weight: 10,
      },
      {
        id: 'project',
        label: 'Projekt kreiran',
        done: hasProjects,
        weight: 10,
      },
    ]

    const completedCount = checks.filter(ch => ch.done).length
    const percent = checks.reduce((sum, ch) => sum + (ch.done ? ch.weight : 0), 0)

    // Ready = core fields filled
    const isReady = !!(
      c?.client_name &&
      c?.business_description && c.business_description.trim().length >= 20 &&
      c?.target_audience && c.target_audience.trim().length >= 10 &&
      c?.tone_of_voice &&
      connectedCount >= 1 &&
      hasProjects
    )

    return { percent, checks, completedCount, totalCount: checks.length, isReady }
  }, [currentClient, hasProjects])
}
