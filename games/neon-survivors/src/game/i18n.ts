/** Localization — English and Russian strings */

export type Locale = 'en' | 'ru';

const STRINGS = {
  en: {
    // Menu
    subtitle:          'Survive the swarm. Grow stronger.',
    tapToStart:        'TAP or PRESS ANY KEY',
    moveLeft:          'Left joystick = move',
    aimLeft:           'Right joystick = aim & shoot',
    movePC:            'WASD / Arrows = move',
    aimPC:             'Mouse = aim & shoot  |  ESC = pause',
    // Level up
    levelUp:           'LEVEL UP!',
    chooseUpgrade:     'Choose an upgrade',
    newWeaponPrefix:   'NEW: ',
    permanentStat:     'Permanent stat boost',
    shotgunMode:       'Shotgun Mode',
    shotgunDesc:       'Wide spread, 5 bullets per shot, less damage and range',
    rapidFire:         'Rapid Fire',
    rapidDesc:         '2x fire rate, faster bullets, smaller size and less damage',
    upgradePrefix:     'Upgrade ',
    // Game over
    gameOver:          'GAME OVER',
    victory:           'VICTORY!',
    timeSurvived:      'Time survived:',
    levelReached:      'Level reached:',
    enemiesKilled:     'Enemies killed:',
    damageDealt:       'Damage dealt:',
    watchAdRevive:     '\u25b6 WATCH AD \u2014 REVIVE',
    playAgain:         'PLAY AGAIN',
    shareScore:        '\ud83d\udce4 SHARE SCORE',
    // Pause
    paused:            'PAUSED',
    tapResume:         'Tap \u23f8 to resume',
    escResume:         'ESC or click \u23f8 to resume',
    aimHintPause:      'MOUSE = aim  |  WASD = move',
    resume:            'RESUME',
    restart:           'RESTART',
    // HUD
    hpLabel:           'HP',
    enemiesLabel:      'enemies:',
    killsLabel:        'kills:',
    lvLabel:           'LV',
    aimHintHud:        'MOUSE = aim  |  ESC = pause',
    // Share text builders
    shareVictory: (level: number, kills: number, time: string) =>
      `\ud83c\udfc6 I beat Neon Survivors! Level ${level}, ${kills} kills in ${time}! Can you survive? \ud83d\ude80`,
    shareDeath: (level: number, kills: number, time: string) =>
      `\ud83d\udc80 I survived ${time} in Neon Survivors! Level ${level}, ${kills} kills. Can you beat me? \ud83d\ude80`,
    // Weapon names & descriptions
    weapons: {
      magic_orb: { name: 'Magic Orb',    description: 'Fires orbs in your direction' },
      holy_aura: { name: 'Holy Aura',    description: 'Damages nearby enemies' },
      lightning:  { name: 'Lightning',    description: 'Strikes a random nearby enemy' },
      frost_nova: { name: 'Frost Nova',   description: 'Freezes and damages enemies around you' },
      fire_trail: { name: 'Fire Trail',   description: 'Leaves fire behind you as you move' },
    } as Record<string, { name: string; description: string }>,
    // Stat upgrade names
    stats: {
      damage:      '+10% Damage',
      speed:       '+8% Move Speed',
      maxHp:       '+20 Max HP',
      pickupRange: '+25% Pickup Range',
      armor:       '+1 Armor',
      cooldown:    '-8% Cooldowns',
    } as Record<string, string>,
  },
  ru: {
    subtitle:          'Выживи среди орды. Стань сильнее.',
    tapToStart:        'НАЖМИТЕ ЛЮБУЮ КЛАВИШУ',
    moveLeft:          'Левый джойстик = движение',
    aimLeft:           'Правый джойстик = прицел и стрельба',
    movePC:            'WASD / Стрелки = движение',
    aimPC:             'Мышь = прицел и стрельба  |  ESC = пауза',
    levelUp:           'НОВЫЙ УРОВЕНЬ!',
    chooseUpgrade:     'Выберите улучшение',
    newWeaponPrefix:   'НОВОЕ: ',
    permanentStat:     'Постоянное улучшение',
    shotgunMode:       'Дробовик',
    shotgunDesc:       'Широкий разброс, 5 пуль за выстрел, меньше урона',
    rapidFire:         'Скорострельность',
    rapidDesc:         'Скорострельность x2, быстрые пули, меньше урон',
    upgradePrefix:     'Улучшить ',
    gameOver:          'ИГРА ОКОНЧЕНА',
    victory:           'ПОБЕДА!',
    timeSurvived:      'Время выживания:',
    levelReached:      'Достигнутый уровень:',
    enemiesKilled:     'Убито врагов:',
    damageDealt:       'Нанесено урона:',
    watchAdRevive:     '\u25b6 РЕКЛАМА \u2014 ВОСКРЕСНУТЬ',
    playAgain:         'ИГРАТЬ СНОВА',
    shareScore:        '\ud83d\udce4 ПОДЕЛИТЬСЯ',
    paused:            'ПАУЗА',
    tapResume:         'Нажмите \u23f8 чтобы продолжить',
    escResume:         'ESC или \u23f8 чтобы продолжить',
    aimHintPause:      'МЫШЬ = прицел  |  WASD = движение',
    resume:            'ПРОДОЛЖИТЬ',
    restart:           'ЗАНОВО',
    hpLabel:           'HP',
    enemiesLabel:      'враги:',
    killsLabel:        'убийств:',
    lvLabel:           'УР',
    aimHintHud:        'МЫШЬ = прицел  |  ESC = пауза',
    shareVictory: (level: number, kills: number, time: string) =>
      `\ud83c\udfc6 Я прошёл Neon Survivors! Уровень ${level}, ${kills} убийств за ${time}! Сможешь выжить? \ud83d\ude80`,
    shareDeath: (level: number, kills: number, time: string) =>
      `\ud83d\udc80 Я продержался ${time} в Neon Survivors! Уровень ${level}, ${kills} убийств. Побьёшь рекорд? \ud83d\ude80`,
    weapons: {
      magic_orb: { name: 'Магическая сфера',   description: 'Стреляет сферами в направлении движения' },
      holy_aura: { name: 'Святая аура',         description: 'Наносит урон ближайшим врагам' },
      lightning:  { name: 'Молния',             description: 'Бьёт случайного ближайшего врага' },
      frost_nova: { name: 'Морозная вспышка',   description: 'Замораживает и наносит урон врагам вокруг' },
      fire_trail: { name: 'Огненный след',      description: 'Оставляет огонь позади при движении' },
    } as Record<string, { name: string; description: string }>,
    stats: {
      damage:      '+10% к урону',
      speed:       '+8% к скорости',
      maxHp:       '+20 к макс. HP',
      pickupRange: '+25% к радиусу подбора',
      armor:       '+1 к броне',
      cooldown:    '-8% к перезарядке',
    } as Record<string, string>,
  },
} as const;

type Strings = typeof STRINGS.en;

function savedLocale(): Locale {
  try {
    const v = localStorage.getItem('ns_locale');
    if (v === 'en' || v === 'ru') return v;
  } catch { /* ignore */ }
  return 'en';
}

let _locale: Locale = savedLocale();

export function getLocale(): Locale { return _locale; }

export function setLocale(l: Locale): void {
  _locale = l;
  try { localStorage.setItem('ns_locale', l); } catch { /* ignore */ }
}

export function t(): Strings {
  return STRINGS[_locale] as Strings;
}
