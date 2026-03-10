import api from './client';

export interface LeagueDetail {
  league_id: string
  name: string
  tier: number
  logo_url: string
  events_count: number
  season: string
}

export interface CountryEvents {
  country_code: string
  total_events: number
  total_leagues: number
  leagues: LeagueDetail[]
}

export const marketResearchApi = {
  scan: () => api.post('/market-research/scan'),
  getCountries: () => api.get('/market-research/countries'),
  getCountry: (id: string) => api.get(`/market-research/countries/${id}`),
  getRankings: () => api.get('/market-research/rankings'),
  getEvents: (countryCode: string) => api.get<CountryEvents>(`/market-research/events/${countryCode}`),
};
