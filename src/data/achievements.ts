/** Achievements (TB-248 list, TB-249 system): docs/ACHIEVEMENTS.md is the source of truth. Ids are stable and map to Steam
 *  as `ACH_` + the id in upper case. Rewards are cosmetic only: a title or a cosmetic, never a stat. */

export type AchGroup = 'progress' | 'collection' | 'challenge' | 'fun' | 'secret';
export const ACH_GROUPS: readonly AchGroup[] = ['progress', 'collection', 'challenge', 'fun', 'secret'];

/** Art cosmetics (TB-250). Wall and camp decor show once earned; elf, bow, trail and ring are picked one at a time. */
export const COSMETICS = {
  cloak_ember: 'Ember cloak', cloak_frost: 'Frost cloak', cloak_dusk: 'Dusk cloak', cloak_starlit: 'Starlit cloak', cloak_gold: 'Gold cloak',
  bow_moonsilver: 'Moonsilver bow', bow_thornwood: 'Thornwood bow', bow_heartwood: 'Heartwood bow',
  trail_ember: 'Ember trail', trail_star: 'Star trail', trail_leaf: 'Leaf trail', ring_rune: 'Rune ring',
  wall_banner_grove: 'Grove banner', wall_banner_tide: 'Tide banner', wall_lanterns: 'Wall lanterns', wall_skulls: 'Skull posts',
  shield_fox: 'Fox shields',
  trophy_warboss: 'Warboss trophy', trophy_ogre: 'Ogre trophy', trophy_orc: 'Orc trophy', trophy_raider: 'Raider trophy', trophy_ogre_creature: 'Ogre Creature trophy',
  camp_campfire: 'Campfire', camp_wolf_statue: 'Wolf statue', camp_standing_stone: 'Standing stone', camp_lantern_string: 'Lantern string',
  camp_armour_stand: 'Armour stand', camp_bell: 'Camp bell', camp_sapling: 'Grove sapling',
  banner_serpent: 'Serpent banner', banner_fox: 'Fox banner', banner_magpie: 'Magpie banner',
} as const;
export type CosmeticId = keyof typeof COSMETICS;

/** Cosmetics the player wears, one per slot (TB-250). Only the cloak dyes have art so far; the rest show "arrives with the art pass". */
export type CosmeticSlot = 'cloak';
/** Each cloak dye's sprite suffix: the elf draws `elf.<dye>` and `elf.<dye>.attack` (sheet_elf_<dye>.webp), the default `elf` without one. */
export const CLOAK_DYES = { cloak_ember: 'ember', cloak_frost: 'frost', cloak_dusk: 'dusk', cloak_starlit: 'starlit', cloak_gold: 'gold' } as const;
export const COSMETIC_SLOT: Partial<Record<CosmeticId, CosmeticSlot>> = Object.fromEntries(Object.keys(CLOAK_DYES).map((k) => [k, 'cloak']));

export interface AchDef {
  id: string; name: string; group: AchGroup; rule: string;
  /** Exactly one reward: a title the player can wear on the HUD tag, or a cosmetic. */
  title?: string; cosmetic?: CosmeticId;
}

/** Every threshold the checks use (no numbers in sim/achievements.ts). */
export const ACH_N = {
  slain: { slain_100: 100, slain_1k: 1_000, slain_10k: 10_000, slain_100k: 100_000, slain_1m: 1_000_000 },
  wave: { wave_5: 5, wave_10: 10, wave_25: 25, wave_50: 50, wave_75: 75, wave_100: 100, wave_150: 150, wave_200: 200 },
  replant: { replant_1: 1, replant_10: 10, replant_50: 50, replant_100: 100 },
  boss: { first_boss: 1, boss_10: 10, boss_50: 50 },
  tier: { tier_2: 2, tier_3: 3, tier_4: 4, tier_5: 5, tier_6: 6 },
  /** Wave a challenge run must reach. */
  challengeWave: { no_vanguard: 25, bow_only: 25, lean_tree: 25, bare_wall: 30, untouched_10: 10, all_summoned: 40, first_run_25: 25 },
  leanRanks: 10,
  swiftSecsLeft: 20,
  lastPlankFrac: 0.1,
  bossStreak: 3,
  floodKills: 200,
  holdSecs: 3600,
  tierUpWithin: 3,
  oneLob: 10, shatterWave: 20, storm: 5, treant: 10,
  wolfKills: 1_000, unhorsed: 100, drummerBeats: 2,
  salvages: 1_000, rerolls: 100, legendsWave: 2, thornsRun: 50, heirloomLevels: 50,
  secretPlankFrac: 0.01, handsOffFrom: 20, voluntaryWave: 12, bossesWaiting: 5,
  /** More than this many earned at once (an old save's first load) toast as one line. */
  toastBatch: 3,
} as const;

const P = (id: string, name: string, rule: string, r: { title?: string; cosmetic?: CosmeticId }): AchDef => ({ id, name, group: 'progress', rule, ...r });
const C = (id: string, name: string, rule: string, r: { title?: string; cosmetic?: CosmeticId }): AchDef => ({ id, name, group: 'collection', rule, ...r });
const H = (id: string, name: string, rule: string, r: { title?: string; cosmetic?: CosmeticId }): AchDef => ({ id, name, group: 'challenge', rule, ...r });
const F = (id: string, name: string, rule: string, r: { title?: string; cosmetic?: CosmeticId }): AchDef => ({ id, name, group: 'fun', rule, ...r });
const S = (id: string, name: string, rule: string, r: { title?: string; cosmetic?: CosmeticId }): AchDef => ({ id, name, group: 'secret', rule, ...r });

export const ACHIEVEMENTS: readonly AchDef[] = [
  P('first_blood', 'First Blood', 'Slay an orc', { title: 'Warden' }),
  P('slain_100', 'A Hundred Fallen', 'Slay 100 orcs', { title: 'Orc-Hunter' }),
  P('slain_1k', 'A Thousand Fallen', 'Slay 1,000 orcs', { cosmetic: 'trail_leaf' }),
  P('slain_10k', 'Ten Thousand Fallen', 'Slay 10,000 orcs', { title: 'Tidebreaker' }),
  P('slain_100k', 'The Tide Thins', 'Slay 100,000 orcs', { cosmetic: 'wall_skulls' }),
  P('slain_1m', 'Orcs Are Weather', 'Slay 1,000,000 orcs', { title: 'Weathered' }),
  P('wave_5', 'Holding', 'Reach wave 5', { title: 'Holdfast' }),
  P('wave_10', 'Dug In', 'Reach wave 10', { cosmetic: 'wall_banner_grove' }),
  P('wave_25', 'First Boss Wave', 'Reach wave 25', { title: 'Steadfast' }),
  P('wave_50', 'Half a Hundred', 'Reach wave 50', { cosmetic: 'cloak_ember' }),
  P('wave_75', 'Long Watch', 'Reach wave 75', { title: 'Long-Watcher' }),
  P('wave_100', 'The Hundredth Wave', 'Reach wave 100', { cosmetic: 'bow_thornwood' }),
  P('wave_150', 'Beyond Counting', 'Reach wave 150', { title: 'Unbroken' }),
  P('wave_200', 'The Wall That Stood', 'Reach wave 200', { cosmetic: 'cloak_gold' }),
  P('first_fall', "It Isn't a Loss", 'The barricade falls for the first time', { title: 'Seedling' }),
  P('replant_1', 'Replanted', 'Replant the grove', { cosmetic: 'camp_sapling' }),
  P('replant_10', 'Ten Seasons', 'Replant 10 times', { title: 'Gardener' }),
  P('replant_50', 'Old Growth', 'Replant 50 times', { title: 'Old Growth' }),
  P('replant_100', 'Ancient Grove', 'Replant 100 times', { cosmetic: 'bow_heartwood' }),
  P('first_node', 'Sharpened', 'Learn a Grove node', { title: 'Apprentice' }),
  P('first_boss', "Champion's Fall", 'Clear a boss wave', { cosmetic: 'trophy_warboss' }),
  P('boss_10', 'Bosses Are Weather Too', 'Clear 10 boss waves', { title: 'Bossbane' }),
  P('boss_50', 'Fifty Champions', 'Clear 50 boss waves', { cosmetic: 'wall_banner_tide' }),
  P('tier_2', 'The Second Tide', 'Unlock tier 2', { title: 'of the Second Tide' }),
  P('tier_3', 'The Third Tide', 'Unlock tier 3', { cosmetic: 'cloak_frost' }),
  P('tier_4', 'The Fourth Tide', 'Unlock tier 4', { title: 'of the Fourth Tide' }),
  P('tier_5', 'The Fifth Tide', 'Unlock tier 5', { cosmetic: 'cloak_dusk' }),
  P('tier_6', 'The Sixth Tide', 'Unlock tier 6', { cosmetic: 'cloak_starlit' }),

  C('branch_bow', 'Master of the Bow', 'Every Bow node at max rank in one run', { cosmetic: 'ring_rune' }),
  C('branch_companions', 'Friends of the Grove', 'Every Companions node at max rank in one run', { cosmetic: 'camp_wolf_statue' }),
  C('branch_armoury', 'Full Armoury', 'Every Armoury node at max rank in one run', { title: 'Armourer' }),
  C('branch_grove', 'Deep Grove', 'Every Grove node at max rank in one run', { title: 'Grovekeeper' }),
  C('branch_barricade', 'Timber and Thorn', 'Every Barricade node at max rank in one run', { cosmetic: 'wall_lanterns' }),
  C('branch_vanguard', 'Shieldwall', 'Every Vanguard node at max rank in one run', { cosmetic: 'shield_fox' }),
  C('branch_spoils', 'Spoils of War', 'Every Spoils node at max rank in one run', { title: 'Quartermaster' }),
  C('tree_full', 'The Whole Tree', 'Every node outside the paths at max rank in one run', { title: 'Worldtree' }),
  C('heartwood_full', 'Heartwood Grown', 'Every Heartwood tree node at max rank', { title: 'Heartwarden' }),
  C('set_nightknife', 'Nightknife', 'Wear all six Nightknife pieces', { title: 'Nightknife' }),
  C('set_emberwright', 'Emberwright', 'Wear all six Emberwright pieces', { cosmetic: 'trail_ember' }),
  C('set_stormcaller', 'Stormcaller', 'Wear all six Stormcaller pieces', { title: 'Stormcaller' }),
  C('set_siegebreaker', 'Siegebreaker', 'Wear all six Siegebreaker pieces', { title: 'Siegebreaker' }),
  C('set_moonveil', 'Moonveil', 'Wear all six Moonveil pieces', { cosmetic: 'bow_moonsilver' }),
  C('set_packlord', 'Packlord', 'Wear all six Packlord pieces', { title: 'Packlord' }),
  C('set_rootwarden', 'Rootwarden', 'Wear all six Rootwarden pieces', { title: 'Rootwarden' }),
  C('set_serpents_coil', "Serpent's Coil", "Wear all six Serpent's Coil pieces", { title: 'Coiled' }),
  C('set_foxfire_pack', 'Foxfire Pack', 'Wear all six Foxfire Pack pieces', { title: 'Foxfire' }),
  C('set_magpies_hoard', "Magpie's Hoard", "Wear all six Magpie's Hoard pieces", { title: 'Magpie' }),
  C('set_all', 'Wardrobe of Legends', 'Earn every set achievement', { cosmetic: 'camp_armour_stand' }),
  C('mythic_first', 'Myth Made Real', 'Find a mythic', { title: 'Mythfinder' }),
  C('mythic_all', 'Every Myth', 'Find all 11 mythics', { cosmetic: 'trail_star' }),
  C('legendary_first', 'Legend in the Grass', 'Find a legendary', { title: 'Lucky' }),
  C('camp_first', 'Breaking Ground', 'Build any camp building', { cosmetic: 'camp_campfire' }),
  C('camp_bowyer', 'Master Bowyer', 'Bowyer at level 3', { title: 'Bowyer' }),
  C('camp_forge', 'Master Smith', 'Forge at level 3', { title: 'Smith' }),
  C('camp_kitchen', 'Full Larder', 'Kitchen at level 3', { title: 'Cook' }),
  C('camp_training', 'Drillmaster', 'Training Area at level 3', { title: 'Drillmaster' }),
  C('camp_full', 'The Encampment', 'All four buildings at level 3', { cosmetic: 'camp_lantern_string' }),
  C('path_serpent', 'Way of the Serpent', 'Clear a boss wave on the Path of the Serpent', { cosmetic: 'banner_serpent' }),
  C('path_fox', 'Way of the Fox', 'Clear a boss wave on the Path of the Fox', { cosmetic: 'banner_fox' }),
  C('path_magpie', 'Way of the Magpie', 'Clear a boss wave on the Path of the Magpie', { cosmetic: 'banner_magpie' }),
  C('bestiary', 'Know Thy Enemy', 'Slay every orc kind, and a Warboss', { title: 'Loremaster' }),
  C('boss_roster', 'Every Champion', 'Clear a boss wave against each of the five bosses', { cosmetic: 'trophy_ogre_creature' }),

  H('no_vanguard', 'Alone on the Wall', 'Reach wave 25 without Muster', { title: 'Lone Warden' }),
  H('bow_only', 'Just the Bow', 'Reach wave 25 owning no Companions or Armoury node', { title: 'Archer' }),
  H('lean_tree', 'Ten Nodes', 'Reach wave 25 owning 10 node ranks or fewer', { title: 'Frugal' }),
  H('bare_wall', 'Plain Timber', 'Reach wave 30 owning no Barricade node', { title: 'Bare-Timbered' }),
  H('untouched_10', 'Not a Scratch', 'Reach wave 10 without the wall taking a hit', { title: 'Untouched' }),
  H('boss_unscathed', 'Clean Sweep', 'Clear a boss wave without the wall taking a hit during it', { title: 'Clean' }),
  H('boss_swift', 'Swift Hunt', 'Clear a boss wave with 20 s or more left on its clock', { cosmetic: 'trophy_orc' }),
  H('boss_naked', 'Bare-Handed', 'Clear a boss wave wearing no gear', { title: 'Unadorned' }),
  H('boss_tier6', 'Sixth Tide Champion', 'Clear a boss wave at tier 6', { cosmetic: 'trophy_raider' }),
  H('boss_last_plank', 'On the Last Plank', 'Clear a boss wave with the wall under 10% health', { title: 'Last Plank' }),
  H('boss_streak', 'Three Crowns', 'Clear three boss waves in one run', { cosmetic: 'trophy_ogre' }),
  H('boss_after_roots', 'Second Life', 'Clear a boss wave after Deep Roots regrew the wall that run', { title: 'Rerooted' }),
  H('all_summoned', 'Come One, Come All', 'Reach wave 40 with every summon node owned', { title: 'Summoner' }),
  H('flood_200', 'The Flood', 'Slay 200 orcs within one wave', { title: 'Floodwarden' }),
  H('first_run_25', 'Natural', 'Reach wave 25 before your first replant', { title: 'Natural' }),
  H('hold_60m', 'An Hour on the Wall', 'One run lasts 60 minutes of play', { cosmetic: 'camp_bell' }),
  H('full_tide', 'Shoulder to Shoulder', '160 orcs on the field at once, and the wall still stands at the next wave', { title: 'Unyielding' }),
  H('tier_up_fast', 'Climber', 'Unlock the next tier within 3 replants of the last one', { title: 'Climber' }),

  F('one_lob_10', 'Bullseye', 'Slay 10 orcs with a single lob', { title: 'Bullseye' }),
  F('shatter_20', 'Glass Orcs', 'Shatter 20 chilled orcs in one wave', { title: 'Frostbringer' }),
  F('storm_5', 'Chain Reaction', 'One Storm Glade strike slays 5 orcs', { title: 'Stormborn' }),
  F('treant_10', 'Stomp', 'One treant stamp slays 10 orcs', { title: 'Rootstomper' }),
  F('wolf_1k', 'Good Dog', 'The Grey Wolf slays 1,000 orcs', { title: 'Packmate' }),
  F('unhorsed_100', 'Unhorsed', 'Throw 100 wolf riders from their wolves', { title: 'Unhorser' }),
  F('drummer_quick', 'Silence the Drum', 'Slay a war drummer before its third beat', { title: 'Drumsplitter' }),
  F('salvage_1k', 'Scrap Heap', 'Salvage 1,000 items', { title: 'Tinker' }),
  F('reroll_100', 'Never Satisfied', 'Reroll 100 affixes', { title: 'Fussy' }),
  F('double_legend', 'Two Pillars', 'Two legendaries or better drop in one wave', { title: 'Blessed' }),
  F('thorns_50', 'Prickly', "The wall's thorns slay 50 orcs in one run", { title: 'Thornwarden' }),
  F('heirloom_50', 'Handed Down', 'Grow your heirloom 50 item levels', { title: 'Heir' }),

  S('secret_last_plank', 'One Plank Left', 'The wall drops below 1% health and is standing when the next wave comes', { cosmetic: 'camp_standing_stone' }),
  S('secret_hands_off', 'Let Them Handle It', 'Clear a whole wave from 20 on without loosing an arrow', { title: 'Delegator' }),
  S('secret_twelve', 'Leave It Standing', 'Replant by hand at exactly wave 12', { title: 'Punctual' }),
  S('secret_let_march', 'Let Them March', 'Summon a boss wave and let its clock run out with every champion alive', { title: 'Spectator' }),
  S('secret_hoarder', 'Five Waiting', 'Leave five boss waves waiting, unsummoned', { title: 'Patient' }),
  S('secret_full_satchel', 'No Room', 'Fill the satchel to its last slot', { title: 'Packrat' }),
  S('secret_thorn_boss', 'Splinters', "A Warboss dies to the wall's thorns", { title: 'Splintered' }),
  S('secret_all', 'The Grove Remembers', 'Earn every other achievement', { title: 'Remembered' }),
];

export const ACH: Readonly<Record<string, AchDef>> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
/** Steam API name for an achievement id. */
export const steamName = (id: string): string => `ACH_${id.toUpperCase()}`;
