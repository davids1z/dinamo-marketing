import type { Scene } from '../../../types/studio'

export interface StudioTemplate {
  id: string
  name: string
  description: string
  icon: string
  scenes: Scene[]
  caption: string
  hashtags: string[]
  aspectRatio: '9:16' | '1:1' | '16:9'
}

export const matchdayAnnouncement: StudioTemplate = {
  id: 'matchday',
  name: 'Matchday najava',
  description: 'Najava utakmice s grbom, VS grafikom i detalji',
  icon: '⚽',
  aspectRatio: '9:16',
  caption: '🔵⚪ MATCHDAY! Podržite ShiftOneZero na utakmici!',
  hashtags: ['#S1Z', '#ShiftOneZero', '#Marketing', '#HNL', '#Matchday'],
  scenes: [
    {
      id: 'matchday_1', order: 1, duration: 3,
      background: { type: 'gradient', colors: ['#0A1A28', '#0057A8'], direction: 'to bottom right' },
      text_layers: [
        { id: 'mt1_1', text: 'MATCHDAY', position: { x: 50, y: 35 }, font_size: 72, font_family: 'Tektur', font_weight: '800', color: '#B8FF00', text_align: 'center', animation: 'scale_up', animation_delay: 0 },
        { id: 'mt1_2', text: 'SHIFTONEZERO', position: { x: 50, y: 50 }, font_size: 28, font_family: 'Inter', font_weight: '600', color: '#FFFFFF', text_align: 'center', animation: 'fade_in', animation_delay: 0.3 },
      ],
      overlay_layers: [
        { id: 'mo1_1', type: 'badge', position: { x: 50, y: 18 }, size: 80, animation: 'scale_up', animation_delay: 0.1 },
      ],
      transition: 'fade',
    },
    {
      id: 'matchday_2', order: 2, duration: 4,
      background: { type: 'gradient', colors: ['#0057A8', '#0A1A28'], direction: 'to bottom' },
      text_layers: [
        { id: 'mt2_1', text: 'S1Z', position: { x: 25, y: 40 }, font_size: 48, font_family: 'Tektur', font_weight: '800', color: '#FFFFFF', text_align: 'center', animation: 'slide_right', animation_delay: 0 },
        { id: 'mt2_2', text: 'VS', position: { x: 50, y: 40 }, font_size: 36, font_family: 'Tektur', font_weight: '800', color: '#B8FF00', text_align: 'center', animation: 'scale_up', animation_delay: 0.3 },
        { id: 'mt2_3', text: 'PROTIVNIK', position: { x: 75, y: 40 }, font_size: 48, font_family: 'Tektur', font_weight: '800', color: '#FFFFFF', text_align: 'center', animation: 'slide_left', animation_delay: 0 },
      ],
      overlay_layers: [],
      transition: 'slide_left',
    },
    {
      id: 'matchday_3', order: 3, duration: 3,
      background: { type: 'color', color: '#0A1A28' },
      text_layers: [
        { id: 'mt3_1', text: '📍 Stadion Maksimir', position: { x: 50, y: 35 }, font_size: 32, font_family: 'Inter', font_weight: '600', color: '#FFFFFF', text_align: 'center', animation: 'slide_up', animation_delay: 0 },
        { id: 'mt3_2', text: '🕐 20:00', position: { x: 50, y: 50 }, font_size: 48, font_family: 'Tektur', font_weight: '800', color: '#B8FF00', text_align: 'center', animation: 'scale_up', animation_delay: 0.2 },
        { id: 'mt3_3', text: '#S1Z #Marketing #HNL', position: { x: 50, y: 70 }, font_size: 18, font_family: 'Inter', font_weight: '400', color: '#FFFFFF80', text_align: 'center', animation: 'fade_in', animation_delay: 0.5 },
      ],
      overlay_layers: [],
      transition: 'zoom_in',
    },
  ],
}

export const victoryCelebration: StudioTemplate = {
  id: 'victory',
  name: 'Slavlje pobjede',
  description: '4 scene: rezultat, strijelci, highlights, sljedeća utakmica',
  icon: '🏆',
  aspectRatio: '9:16',
  caption: '💙 POBJEDA! ShiftOneZero nastavlja pobjednički niz!',
  hashtags: ['#S1Z', '#ShiftOneZero', '#Marketing', '#Pobjeda', '#HNL'],
  scenes: [
    {
      id: 'victory_1', order: 1, duration: 3,
      background: { type: 'gradient', colors: ['#0A1A28', '#1a5c2a'], direction: 'to bottom' },
      text_layers: [
        { id: 'vt1_1', text: 'POBJEDA!', position: { x: 50, y: 30 }, font_size: 72, font_family: 'Tektur', font_weight: '800', color: '#B8FF00', text_align: 'center', animation: 'bounce', animation_delay: 0 },
        { id: 'vt1_2', text: '3 - 1', position: { x: 50, y: 50 }, font_size: 96, font_family: 'Tektur', font_weight: '800', color: '#FFFFFF', text_align: 'center', animation: 'scale_up', animation_delay: 0.3 },
      ],
      overlay_layers: [],
      transition: 'fade',
    },
    {
      id: 'victory_2', order: 2, duration: 4,
      background: { type: 'gradient', colors: ['#0057A8', '#0A1A28'], direction: 'to bottom right' },
      text_layers: [
        { id: 'vt2_1', text: 'STRIJELCI', position: { x: 50, y: 20 }, font_size: 36, font_family: 'Tektur', font_weight: '800', color: '#B8FF00', text_align: 'center', animation: 'slide_down', animation_delay: 0 },
        { id: 'vt2_2', text: '⚽ Petković 23\'\n⚽ Baturina 45\'\n⚽ Sučić 78\'', position: { x: 50, y: 50 }, font_size: 28, font_family: 'Inter', font_weight: '600', color: '#FFFFFF', text_align: 'center', animation: 'fade_in', animation_delay: 0.3 },
      ],
      overlay_layers: [],
      transition: 'slide_up',
    },
    {
      id: 'victory_3', order: 3, duration: 3,
      background: { type: 'gradient', colors: ['#0A1A28', '#0057A8'], direction: 'to bottom' },
      text_layers: [
        { id: 'vt3_1', text: 'HIGHLIGHTS', position: { x: 50, y: 30 }, font_size: 48, font_family: 'Tektur', font_weight: '800', color: '#FFFFFF', text_align: 'center', animation: 'blur_in', animation_delay: 0 },
        { id: 'vt3_2', text: 'Pogledajte na YouTube →', position: { x: 50, y: 55 }, font_size: 20, font_family: 'Inter', font_weight: '500', color: '#B8FF00', text_align: 'center', animation: 'fade_in', animation_delay: 0.4 },
      ],
      overlay_layers: [],
      transition: 'fade',
    },
    {
      id: 'victory_4', order: 4, duration: 3,
      background: { type: 'color', color: '#0A1A28' },
      text_layers: [
        { id: 'vt4_1', text: 'SLJEDEĆA UTAKMICA', position: { x: 50, y: 30 }, font_size: 28, font_family: 'Inter', font_weight: '600', color: '#FFFFFF80', text_align: 'center', animation: 'fade_in', animation_delay: 0 },
        { id: 'vt4_2', text: 'Nedjelja, 20:00', position: { x: 50, y: 50 }, font_size: 40, font_family: 'Tektur', font_weight: '800', color: '#B8FF00', text_align: 'center', animation: 'scale_up', animation_delay: 0.2 },
      ],
      overlay_layers: [],
      transition: 'zoom_in',
    },
  ],
}

export const playerSpotlight: StudioTemplate = {
  id: 'player',
  name: 'Igrač spotlight',
  description: 'Profil igrača sa slikom, statistikama i citatom',
  icon: '⭐',
  aspectRatio: '9:16',
  caption: '⭐ Upoznajte našeg igrača!',
  hashtags: ['#S1Z', '#ShiftOneZero', '#Marketing', '#PlayerSpotlight'],
  scenes: [
    {
      id: 'player_1', order: 1, duration: 3,
      background: { type: 'gradient', colors: ['#0057A8', '#0A1A28'], direction: 'to bottom' },
      text_layers: [
        { id: 'pt1_1', text: 'PLAYER\nSPOTLIGHT', position: { x: 50, y: 35 }, font_size: 64, font_family: 'Tektur', font_weight: '800', color: '#FFFFFF', text_align: 'center', animation: 'scale_up', animation_delay: 0 },
        { id: 'pt1_2', text: '#10', position: { x: 50, y: 60 }, font_size: 96, font_family: 'Tektur', font_weight: '800', color: '#B8FF00', text_align: 'center', animation: 'blur_in', animation_delay: 0.3 },
      ],
      overlay_layers: [],
      transition: 'fade',
    },
    {
      id: 'player_2', order: 2, duration: 4,
      background: { type: 'gradient', colors: ['#0A1A28', '#0057A8'], direction: 'to bottom right' },
      text_layers: [
        { id: 'pt2_1', text: 'STATISTIKA', position: { x: 50, y: 15 }, font_size: 28, font_family: 'Tektur', font_weight: '800', color: '#B8FF00', text_align: 'center', animation: 'slide_down', animation_delay: 0 },
        { id: 'pt2_2', text: '⚽ 12 golova\n🅰️ 8 asistencija\n📊 92% prolaznost', position: { x: 50, y: 45 }, font_size: 24, font_family: 'Inter', font_weight: '600', color: '#FFFFFF', text_align: 'center', animation: 'slide_up', animation_delay: 0.2 },
      ],
      overlay_layers: [],
      transition: 'slide_left',
    },
    {
      id: 'player_3', order: 3, duration: 3,
      background: { type: 'color', color: '#0A1A28' },
      text_layers: [
        { id: 'pt3_1', text: '"ShiftOneZero je moj dom.\nOvdje sam postao igrač."', position: { x: 50, y: 40 }, font_size: 28, font_family: 'Inter', font_weight: '500', color: '#FFFFFF', text_align: 'center', animation: 'fade_in', animation_delay: 0 },
        { id: 'pt3_2', text: '— Ime Igrača', position: { x: 50, y: 65 }, font_size: 18, font_family: 'Inter', font_weight: '400', color: '#B8FF00', text_align: 'center', animation: 'fade_in', animation_delay: 0.5 },
      ],
      overlay_layers: [],
      transition: 'fade',
    },
  ],
}

export const quoteCard: StudioTemplate = {
  id: 'quote',
  name: 'Citatna kartica',
  description: 'Jednosecna kartica s citatom na tamnoj pozadini',
  icon: '💬',
  aspectRatio: '1:1',
  caption: '💬 Inspirativne riječi od našeg kluba.',
  hashtags: ['#S1Z', '#ShiftOneZero', '#Marketing', '#Quote'],
  scenes: [
    {
      id: 'quote_1', order: 1, duration: 5,
      background: { type: 'gradient', colors: ['#0A1A28', '#0057A8'], direction: 'to bottom right' },
      text_layers: [
        { id: 'qt1_1', text: '"Snaga je u\njedinstvu."', position: { x: 50, y: 40 }, font_size: 48, font_family: 'Tektur', font_weight: '700', color: '#FFFFFF', text_align: 'center', animation: 'blur_in', animation_delay: 0 },
        { id: 'qt1_2', text: '— ShiftOneZero', position: { x: 50, y: 65 }, font_size: 18, font_family: 'Inter', font_weight: '400', color: '#B8FF00', text_align: 'center', animation: 'fade_in', animation_delay: 0.5 },
      ],
      overlay_layers: [
        { id: 'qo1_1', type: 'badge', position: { x: 50, y: 85 }, size: 40, animation: 'fade_in', animation_delay: 0.8 },
      ],
      transition: 'fade',
    },
  ],
}

export const ALL_TEMPLATES: StudioTemplate[] = [
  matchdayAnnouncement,
  victoryCelebration,
  playerSpotlight,
  quoteCard,
]
