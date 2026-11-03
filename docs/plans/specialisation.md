# Specialisation paths (TB-193) — plan (a and c built)

Director, 3 Nov: add specialisation with three paths. Each has a unique item set and an extra mythic. Data (TB-193a, save v14)
and UI (TB-193c) are built; balance and art remain.

## 1. The three paths
| Path | Focus | Feel | Leans on |
|---|---|---|---|
| Path of the Serpent | Archery | Patient, lethal strikes: venom, crits and longer reach | Bow, strike circle, moon/fire shots |
| Path of the Fox | Vanguard and companions | A cunning pack: more bodies on the field, fighting together | Vanguard line, wolf, hawk, treant |
| Path of the Magpie | Economy | A hoarder: starlight, loot and summons | Starlight, item find, summons, rerolls |

## 2. How a path is chosen
- At each prestige (Replant), before *March again*, the player picks one path for the coming run. It can change at every
  replant, so there is no lock-in. That fits "costs no progress".
- The chosen path does three things:
  1. It unlocks a small path branch on the run's skill tree: 5–6 nodes, bought with starlight like any branch.
  2. It drops that path's item set and mythic in this run: path items drop only while the path is chosen, which also
     protects the existing seven sets.
  3. It gives a free starting bonus (a minor, flat buff) so the choice is felt at once.
- Systems read only `Stats` (rule 4). The path is saved in `run` (a save migration).

## 3. Item sets (2/4/6-piece, like the existing seven, numbers to BALANCE ## Proposed)
| Set | 2 pieces | 4 pieces | 6 pieces |
|---|---|---|---|
| **Serpent's Coil** | + bow crit chance | Crits poison (damage over time, stacks) | Poisoned orcs that die burst venom to their neighbours |
| **Foxfire Pack** | + vanguard and companion damage % | A vanguard that falls returns faster | Each living companion grants the vanguard a stacking buff |
| **Magpie's Hoard** | + starlight % | Kills can drop a bonus starlight shard (a pickup glint) | Every Nth item dropped is upgraded one rarity |

## 4. Mythic weapons (one per path, `MYTHICS` + `MYTHIC_FX`)
| Mythic | Slot | Power |
|---|---|---|
| **Fang of the Coiled Serpent** | bow | Every 5th shot is a venom arrow that splits on impact into three |
| **Foxfire Tail** (a charm: a fox-tail talisman wreathed in foxfire) | charm | Calls a spectral fox that runs the wall line, biting orcs; it grows with companion count |
| **The Magpie's Talon** | quiver | Arrows that kill steal a glint: +x starlight, and a small chance the orc drops an item |

Each mythic gets a Meshy icon like the existing ones (public/items), and its own drop-moment effect (TB-192 handles drop hype).

## 5. Build steps (one row and one PR each)
1. **TB-193a Data and sim (done):** `data/paths.ts`, path state in `run` with a migration, path branches in `skillTree.ts`
   and SKILL-TREE.md, three sets and three mythics in `lootTables.ts`, and tests for each effect.
2. **TB-193b Balance:** placeholder numbers (P-193) sit in BALANCE ## Proposed; sims and tuning wait for the balance phase (after features, bug bash and performance).
3. **TB-193c UI (done):** cards sit across the top of the Replant tab, usable while the run has fallen (`choosePath`); clicking the chosen card or *No path* clears it; the pick pops and bursts in the path's light (TB-195a juice). Sigils are placeholder vectors (`src/render/sigil.ts`, `PATH_TINT` tokens) until TB-193d. Locked path nodes show a padlock and the hint "Choose the Path of the … at Replant"; path set items and mythics carry a path tag in the satchel.
4. **TB-193d Art (done):** 3 sigils in `public/sigils/` (drawn on the Replant cards since TB-193e; rectified face-on and drawn without a ring, TB-193h), 18 set-piece icons (`<set>-<slot>`) and 3 mythic icons in `public/items/`, from Meshy (548 credits).

## 6. Decisions (director, 3 Nov)
1. **Choice timing:** chosen before each prestige (Replant), changeable every run.
2. **Exclusive drops:** path items drop only while their path is chosen.
3. **Fox mythic slot:** charm (Foxfire Tail).
4. **Icon art spend:** Meshy credits approved for the path icons (sigils, set items, mythics).
