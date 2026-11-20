import type { ShotNarrationSpec } from '../../types/audio';
import type { AudioCue, SfxTrackSpec } from '../../types/common';
import type { InfographicCallout, SubtitleCue } from '../../types/episode';

export const SHOT_NARRATIONS: Readonly<Record<string, ShotNarrationSpec>> = {
  'shot-01-dawn-valley': {
    voiceRole: 'narrator',
    narrationText: 'Tahun 1260, pasukan Mongol tampak mustahil dihentikan.',
    autoSyncDuration: false,
    languageCode: 'id',
  },
  'shot-02-hidden-ambush': {
    voiceRole: 'narrator',
    narrationText: 'Di lembah Ain Jalut, Sultan Qutuz menyiapkan jebakan senyap.',
    autoSyncDuration: false,
    languageCode: 'id',
  },
  'shot-03-qutuz-order': {
    voiceRole: 'commander',
    speakerCharacterId: 'qutuz',
    narrationText: 'Sembunyikan pasukan inti di balik bukit dan pepohonan!',
    autoSyncDuration: false,
    languageCode: 'id',
  },
  'shot-04-mongol-advance': {
    voiceRole: 'narrator',
    narrationText: 'Jenderal Kitbuqa memacu pasukan Mongol memasuki lembah.',
    autoSyncDuration: false,
    languageCode: 'id',
  },
  'shot-05-baibars-clash': {
    voiceRole: 'npc_secondary',
    speakerCharacterId: 'baibars',
    narrationText: 'Pasukan depan, serang cepat lalu tarik mereka masuk!',
    autoSyncDuration: false,
    languageCode: 'id',
  },
  'shot-06-arrow-volley': {
    voiceRole: 'narrator',
    narrationText: 'Debu membubung saat hujan panah menghantam barisan depan.',
    autoSyncDuration: false,
    languageCode: 'id',
  },
  'shot-07-feigned-retreat': {
    voiceRole: 'narrator',
    narrationText: 'Baibars tiba-tiba pura-pura mundur ke dalam lembah!',
    autoSyncDuration: false,
    languageCode: 'id',
  },
  'shot-08-kitbuqa-bait': {
    voiceRole: 'npc_reactive',
    speakerCharacterId: 'kitbuqa',
    narrationText: 'Mereka kabur! Kejar sampai habis, jangan beri ampun!',
    autoSyncDuration: false,
    languageCode: 'id',
  },
  'shot-09-trap-sprung': {
    voiceRole: 'narrator',
    narrationText: 'Begitu Mongol masuk penuh, genderang perang langsung bergemuruh!',
    autoSyncDuration: false,
    languageCode: 'id',
  },
  'shot-10-wings-emerge': {
    voiceRole: 'narrator',
    narrationText: 'Sayap kiri dan kanan Mamluk muncul serentak dari balik bukit!',
    autoSyncDuration: false,
    languageCode: 'id',
  },
  'shot-11-kitbuqa-shock': {
    voiceRole: 'npc_reactive',
    speakerCharacterId: 'kitbuqa',
    narrationText: 'Jebakan?! Dari mana datangnya seluruh pasukan itu?!',
    autoSyncDuration: false,
    languageCode: 'id',
  },
  'shot-12-qutuz-rally': {
    voiceRole: 'commander',
    speakerCharacterId: 'qutuz',
    narrationText: 'Wa Islamah! Majulah, hari ini kita hentikan mereka!',
    autoSyncDuration: false,
    languageCode: 'id',
  },
  'shot-13-encirclement': {
    voiceRole: 'narrator',
    narrationText: 'Formasi Mongol terkunci rapat dan dikepung dari segala arah.',
    autoSyncDuration: false,
    languageCode: 'id',
  },
  'shot-14-mongol-breaks': {
    voiceRole: 'narrator',
    narrationText: 'Untuk pertama kalinya, gelombang besar Mongol dipukul mundur.',
    autoSyncDuration: false,
    languageCode: 'id',
  },
  'shot-15-dusk-victory': {
    voiceRole: 'narrator',
    narrationText: 'Saat senja tiba, lembah Ain Jalut menjadi saksi sejarah.',
    autoSyncDuration: false,
    languageCode: 'id',
  },
  'shot-16-legacy-close': {
    voiceRole: 'narrator',
    narrationText: 'Taktik cerdas mengalahkan pasukan paling ditakuti di dunia.',
    autoSyncDuration: false,
    languageCode: 'id',
  },
};

/** Crisp rhythmic 2-4 word cardless captions per beat synchronized to the 16 narration shots. */
export const EPISODE_SUBTITLES: readonly SubtitleCue[] = [
  { startFrame: 8, endFrame: 145, text: 'Tahun 1260,', highlightWord: '1260,' },
  { startFrame: 148, endFrame: 290, text: 'Mongol mustahil dihentikan.', highlightWord: 'Mongol' },
  { startFrame: 304, endFrame: 416, text: 'Di lembah Ain Jalut,', highlightWord: 'Ain Jalut,' },
  { startFrame: 420, endFrame: 536, text: 'Qutuz siapkan jebakan.', highlightWord: 'jebakan.' },
  { startFrame: 549, endFrame: 638, speaker: 'SULTAN QUTUZ', text: 'Sembunyikan pasukan inti', highlightWord: 'pasukan inti' },
  { startFrame: 642, endFrame: 729, speaker: 'SULTAN QUTUZ', text: 'di balik bukit!', highlightWord: 'balik bukit!' },
  { startFrame: 742, endFrame: 848, text: 'Jenderal Kitbuqa memacu', highlightWord: 'Kitbuqa' },
  { startFrame: 852, endFrame: 956, text: 'pasukan Mongol masuk.', highlightWord: 'Mongol' },
  { startFrame: 970, endFrame: 1058, speaker: 'PANGLIMA BAIBARS', text: 'Serang cepat!', highlightWord: 'Serang cepat!' },
  { startFrame: 1062, endFrame: 1150, speaker: 'PANGLIMA BAIBARS', text: 'Tarik mereka masuk!', highlightWord: 'Tarik mereka' },
  { startFrame: 1164, endFrame: 1268, text: 'Debu membubung tinggi,', highlightWord: 'Debu' },
  { startFrame: 1272, endFrame: 1378, text: 'hujan panah menghantam!', highlightWord: 'hujan panah' },
  { startFrame: 1391, endFrame: 1472, text: 'Baibars tiba-tiba', highlightWord: 'Baibars' },
  { startFrame: 1476, endFrame: 1554, text: 'PURA-PURA MUNDUR!', highlightWord: 'PURA-PURA MUNDUR!' },
  { startFrame: 1566, endFrame: 1654, speaker: 'JENDERAL KITBUQA', text: 'Mereka kabur!', highlightWord: 'kabur!' },
  { startFrame: 1658, endFrame: 1746, speaker: 'JENDERAL KITBUQA', text: 'Kejar sampai habis!', highlightWord: 'Kejar' },
  { startFrame: 1760, endFrame: 1872, text: 'Mongol masuk jebakan,', highlightWord: 'jebakan,' },
  { startFrame: 1876, endFrame: 1986, text: 'genderang perang bergemuruh!', highlightWord: 'genderang perang' },
  { startFrame: 2000, endFrame: 2106, text: 'Sayap Mamluk muncul', highlightWord: 'Sayap Mamluk' },
  { startFrame: 2110, endFrame: 2214, text: 'serentak dari bukit!', highlightWord: 'serentak' },
  { startFrame: 2228, endFrame: 2308, speaker: 'JENDERAL KITBUQA', text: 'JEBAKAN?!', highlightWord: 'JEBAKAN?!' },
  { startFrame: 2312, endFrame: 2404, speaker: 'JENDERAL KITBUQA', text: 'Dari mana mereka?!', highlightWord: 'Dari mana' },
  { startFrame: 2416, endFrame: 2520, speaker: 'SULTAN QUTUZ', text: 'WA ISLAMAH!', highlightWord: 'WA ISLAMAH!' },
  { startFrame: 2524, endFrame: 2634, speaker: 'SULTAN QUTUZ', text: 'Hentikan mereka hari ini!', highlightWord: 'Hentikan' },
  { startFrame: 2648, endFrame: 2756, text: 'Formasi Mongol terkunci', highlightWord: 'terkunci' },
  { startFrame: 2760, endFrame: 2866, text: 'dikepung segala arah!', highlightWord: 'dikepung' },
  { startFrame: 2880, endFrame: 2996, text: 'Untuk pertama kalinya,', highlightWord: 'pertama kalinya,' },
  { startFrame: 3000, endFrame: 3116, text: 'Mongol dipukul mundur!', highlightWord: 'dipukul mundur!' },
  { startFrame: 3130, endFrame: 3246, text: 'Saat senja tiba,', highlightWord: 'senja' },
  { startFrame: 3250, endFrame: 3366, text: 'Ain Jalut jadi sejarah.', highlightWord: 'Ain Jalut' },
  { startFrame: 3380, endFrame: 3482, text: 'Taktik cerdas menang', highlightWord: 'Taktik cerdas' },
  { startFrame: 3486, endFrame: 3588, text: 'atas pasukan terkuat.', highlightWord: 'pasukan terkuat.' },
];

export const EPISODE_CALLOUTS: readonly InfographicCallout[] = [
  { startFrame: 700, endFrame: 880, metric: 'LEMBAH JEZREEL', label: 'Medan Sempit Kunci Penyergapan', icon: 'compass' },
  { startFrame: 1370, endFrame: 1560, metric: 'UMPAN MUNDUR', label: 'Taktik Feigned Retreat Baibars', icon: 'flame' },
  { startFrame: 2720, endFrame: 2910, metric: 'KEPUNGAN 3 SISI', label: 'Sayap Mamluk Mengunci Lembah', icon: 'wall' },
];

export const EPISODE_SFX: SfxTrackSpec = {
  ambient: 'dawn_breeze',
  ambientGain: 0.13,
  duckRatio: 6.5,
  accents: [
    { id: 'sfx-whoosh-1', frame: 225, kind: 'whoosh', gain: 0.32 },
    { id: 'sfx-drum-march', frame: 675, kind: 'war_drum', gain: 0.58, cameraImpulse: 'drop_thud', impulseIntensity: 0.85, vfxPosition: [0, 0.2, 6.8] },
    { id: 'sfx-clash-1', frame: 1020, kind: 'metal_clang', gain: 0.52, cameraImpulse: 'impact_punch', impulseIntensity: 0.82, timeDilationFrames: 8, vfxPosition: [0.5, 1.2, -1.9] },
    { id: 'sfx-arrows', frame: 1210, kind: 'arrow_volley', gain: 0.62, cameraImpulse: 'rumble_surge', impulseIntensity: 0.8, vfxPosition: [0, 1.5, -2.5] },
    { id: 'sfx-retreat-whoosh', frame: 1410, kind: 'whoosh', gain: 0.36 },
    { id: 'sfx-trap-drum', frame: 1812, kind: 'war_drum', gain: 0.75, cameraImpulse: 'impact_punch', impulseIntensity: 1.0, timeDilationFrames: 8, vfxPosition: [0, 0.2, -1.4] },
    { id: 'sfx-wings-thud', frame: 2040, kind: 'heavy_thud', gain: 0.64, cameraImpulse: 'drop_thud', impulseIntensity: 0.9, vfxPosition: [-4.6, 0.2, -1.0] },
    { id: 'sfx-rally-drum', frame: 2486, kind: 'war_drum', gain: 0.72, cameraImpulse: 'impact_punch', impulseIntensity: 0.95, timeDilationFrames: 8, vfxPosition: [0.1, 1.1, 4.6] },
    { id: 'sfx-clash-final', frame: 2718, kind: 'metal_clang', gain: 0.58, cameraImpulse: 'rumble_surge', impulseIntensity: 0.88, timeDilationFrames: 9, vfxPosition: [0.0, 1.2, -1.6] },
  ],
};

export const EPISODE_AUDIO_CUES: readonly AudioCue[] = [
  { id: 'bgm-ain-jalut', startFrame: 0, durationFrames: 3600, kind: 'music', label: 'Valley Wind & War Percussion', gain: 0.25 },
];
