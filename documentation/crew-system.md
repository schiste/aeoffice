# Crew System Design (v0)

> **Status:** In active design
>
> **Related:** [specifications.md](../mechanics/specifications.md) | [faction_id_card.md](../lore/factions/the_unplugged/faction_id_card.md) | [major_families.md](../lore/factions/the_unplugged/major_families.md)

---

## Design Philosophy

Crew members are **small in number, meaningful in identity**. Every crew member should be relatable and their loss should matter. This aligns with the post-apocalyptic scarcity of the world where population is precious.

### Core Principles
- **Intimate Scale:** ~30 crew ceiling (Dunbar's "sympathy group" boundary)
- **Rich Identity:** Every crew has name, portrait, family, creed, profession, and traits
- **Emotional Weight:** Losing crew to Tuning should feel like genuine loss
- **Lore Integration:** Identity axes come directly from Unplugged culture

---

## 1) Crew Scale

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| **Ceiling** | ~30 crew | Dunbar's number research: 15-50 is "sympathy group" where you know names and care about wellbeing |
| **Expandability** | Future mechanics may increase ceiling without breaking intimacy | e.g., "Outpost" system, "Family Quarters" building |

### Psychology Reference (Dunbar's Layers)
- **5:** Intimate (deep trust)
- **15:** Close friends (strong bonds)
- **50:** Sympathy group (know well, invested)
- **150:** Clan (recognize, feel belonging)

Our target (~30) sits in the sweet spot for emotional engagement while allowing meaningful composition choices.

---

## 2) Crew Identity Structure

```
CREW MEMBER
├── Identity
│   ├── Name (first + nickname per Ententernickname tradition)
│   ├── Family (Lindquist, Moreau, Vidal, Lefebvre, etc.)
│   ├── Portrait (visual)
│   └── Backstory snippet (1-2 sentences)
│
├── Beliefs
│   ├── Creed (Piafist, Brassensiste, Trenétiste, Breliste, Lectromusic)
│   └── Politics (Traditionalist, Digger, Democrat, Opener, Earthbound, Neutral)
│
├── Profession (trained at Selection Day, age 8)
│   └── e.g., Healer, Digger, Farmer, Guard, Teacher, Builder...
│
├── Class (current sound production focus)
│   ├── Drummer (Bassline)
│   ├── Vocalist (Chorus)
│   └── Synth (Harmonics)
│
├── Stats
│   ├── Sustain
│   ├── Tempo
│   └── Theory
│
├── Traits (exactly 3)
│   ├── One positive trait
│   ├── One negative trait
│   └── One mixed trait (bonus + small malus)
│
├── Progression
│   ├── XP / Level
│   ├── Class Levels (Drummer L, Vocalist L, Synth L)
│   └── Profession Skills unlocked
│
├── Relationships (simple model)
│   ├── Family matching → flat bonus/malus
│   └── Creed matching → flat bonus/malus
│
└── State
    ├── Assignment (Crystal Circle, Fire Pit, Expedition, Idle)
    ├── Mood (derived from Vibes + personal factors)
    └── Status (Healthy, Tired, Injured, etc.)
```

---

## 3) Family System

### 3.1 Family List (from Lore)

**Founding Families:**
- Marchand, Delacroix, Moreau, Vidal, Lefebvre, Rousseau, Brenner, Duval

**Emerged Families:**
- Perez, Girard, Martinet, Beaumont, Ferrand, Bouche, Lindquist

### 3.2 Lindquist Over-Representation

Going to Studio Echo is the core of the Lindquist creed. Early recruits are almost exclusively Lindquist "true believers."

**Degressive Curve (success-based trigger):**

| Recruit # | Lindquist Chance | Narrative Reason |
|-----------|------------------|------------------|
| 1-5 | 100% | True believers, pilgrims on holy mission |
| 6-10 | 80% | Mostly Lindquist + a few adventurous others |
| 11-15 | 60% | Word spreads, other families test the waters |
| 16-20 | 40% | Studio Echo is "real," political interest grows |
| 21-25 | 30% | Expansion is official policy, diverse volunteers |
| 26-30 | 20% | Established outpost, families send representatives |

**Trigger:** Curve advances based on success (bubble size, objectives completed), not time.

**Non-Lindquist Motivations:**
1. **Primary:** "It actually worked. Maybe the Lindquists aren't crazy after all."
2. Expansion pressure from caves forces reluctant volunteers
3. Political maneuvering (families send representatives to stake claims)
4. Young adventurers who don't share elders' fears

### 3.3 Family Stat Tendencies (Draft)

| Family | Stat Tendency | Unique Perk/Trait Direction |
|--------|---------------|----------------------------|
| **Lindquist** | Balanced | True believers, surface-oriented |
| **Moreau** | High Tempo | Military discipline, organization |
| **Vidal** | High Sustain | Farming, resource yields |
| **Lefebvre** | High Tempo | Mining, Stone harvesting |
| **Rousseau** | High Sustain | Healing, Viral Load recovery |
| **Brenner** | High Theory | Engineering, building speed |
| **Bouche** | Balanced | Emergency rhythm, crisis response |
| **Martinet** | High Theory | Conflict resolution, documentation |

### 3.4 Family Politics

Political factions from lore: Traditionalist, Digger, Democrat, Opener, Earthbound, Neutral

**Mechanical Impact:**
- Crew from opposing political families create tension (minor Vibes drain)
- Politics can trigger special events / encounters / decisions
- Maluses when cooperating, especially on expeditions
- Used to encourage players to try different crew combinations

---

## 4) Creed System

### 4.1 The Five Creeds

| Creed | Prophet | Core Belief |
|-------|---------|-------------|
| **Piafism** | Edith Piaf | Emotional intensity is truth |
| **Brassensisme** | Georges Brassens | Philosophy and wit lead to wisdom |
| **Trenétisme** | Charles Trenet | Optimism conquers darkness |
| **Brelisme** | Jacques Brel | Passion and poetry define humanity |
| **Lectromusic** | The Prophet of the Beat | Future transcendence through rhythm |

### 4.2 Creed Interaction Matrix

| | Piafist | Brassensiste | Trenétiste | Breliste | Lectromusic |
|---|---------|--------------|------------|----------|-------------|
| **Piafist** | ++ Harmony | + Respect | - Tension | + Kinship | -- Heresy |
| **Brassensiste** | + Respect | ++ Harmony | + Respect | - Tension | - Curiosity |
| **Trenétiste** | - Tension | + Respect | ++ Harmony | + Respect | + Openness |
| **Breliste** | + Kinship | - Tension | + Respect | ++ Harmony | - Skepticism |
| **Lectromusic** | -- Heresy | - Curiosity | + Openness | - Skepticism | ++ Unity |

**Key:**
- `++` Same creed (+15% cooperation)
- `+` Compatible (+5% cooperation)
- `-` Mild tension (-5% cooperation)
- `--` Active conflict (-15% cooperation, can trigger events)

**Logic:**
- Piafists (emotion) and Brelistes share intensity → kinship
- Piafists mildly clash with philosophical Brassensistes
- Trenétistes (optimists) most open to Lectromusic (future-focused)
- Lectromusic is heresy to traditionalist Piafists

### 4.3 Creed Mechanical Effects

- Affects crew personality and dialogue
- Mixing creeds at Fire Pit creates harmony OR tension
- Same-creed crews get synergy bonuses
- Different creeds can trigger special events and secrets
- Encourages player experimentation with crew combinations

---

## 5) Trait System

### 5.1 Structure

Every crew member has **exactly 3 traits:**
1. **One positive trait** (pure benefit)
2. **One negative trait** (pure drawback)
3. **One mixed trait** (good bonus + small malus)

### 5.2 Trait Tone

Traits are where the **absurdity of the lore expresses itself most**. Names, descriptions, and sometimes effects should be fun, goofy, and dark. Reference lore events (the Chroom Incident, Bertrand's 3,287 apologies, the Johnny Schism, etc.).

### 5.3 Trait Availability

Every trait has an availability rule determining who can roll it:

| Availability | Meaning | Example |
|--------------|---------|---------|
| **Universal** | Anyone can roll this | "Cheerful", "Stubborn" |
| **Family-weighted** | More likely for certain families | "Rave Gene" (80% Lindquist, 20% others) |
| **Family-locked** | Only this family | "Beatbox Backup" (Bouche only) |
| **Creed-weighted** | More likely for certain creeds | "Devout Piafiste" (70% Piafists) |
| **Creed-locked** | Only this creed | "Lectromusic Zealot" (Lectromusic only) |
| **Multi-condition** | Requires family AND/OR creed combo | "Delacroix Blood" (Delacroix + NOT Brassensiste) |
| **Story-unlocked** | Unlocked by story events | Unique character traits |
| **Unique** | One specific character only | Named NPC traits |

### 5.4 Trait Rarity Tiers

| Tier | Roll Chance | Description |
|------|-------------|-------------|
| **Common** | 60% | Standard traits, broad applicability |
| **Uncommon** | 25% | More specialized, interesting effects |
| **Rare** | 12% | Powerful or narratively rich |
| **Legendary** | 3% | Game-changing, deeply lore-tied |
| **Story** | 0% (unlocked) | Granted by narrative events |
| **Unique** | N/A | Specific named characters only |

### 5.5 Trait Discovery

Traits are revealed **progressively** through time and **behavior**:

#### Discovery Rules

| Slot | Reveal Timing | Method |
|------|---------------|--------|
| **Trait 1** | On arrival | Immediately visible (first impression) |
| **Trait 2** | After ~2-5 assignments | Revealed through work patterns |
| **Trait 3** | Triggered by specific behavior | Emerges when relevant situation occurs |

#### Behavior-Based Triggers (Examples)

| Trait | Reveals When... |
|-------|-----------------|
| **Berserker Blood** | First time they drop below 30% health in combat |
| **Chaos Surfer** | First crisis event they participate in |
| **Loot Goblin** | First expedition where loot is discovered |
| **Johnny Truther** | First time assigned near a Traditionalist |
| **Chroom Flashbacks** | First assignment near mushroom farm |
| **The Quiet Twin** | First time assigned to solo task |
| **Panic Spiral** | First crisis event |
| **Surface Addiction** | First expedition outside bubble |
| **The Betting Problem** | First time a wager opportunity appears |

#### Design Intent
- Creates "getting to know you" moments with crew
- Surprises keep crew feeling fresh even in late game
- Some reveals are delightful discoveries, others are "oh no" moments
- Encourages varied assignments to reveal hidden traits faster
- Legendary/Rare traits more likely to be hidden (higher discovery value)

### 5.6 Trait Opposition Rules

Some traits are **mutually exclusive** and cannot appear together:

| Trait A | Cannot coexist with |
|---------|---------------------|
| Lectromusic Zealot | Certified Chroom-Free |
| Devout [Any Creed] | Creed Apostate (same creed) |
| Surface Addiction | Surface Sick |
| The Quiet Twin | Any "social butterfly" trait |
| Family Pride | Married Above Their Station (same family) |
| Immune to The Lecture | Chronic Lecture Survivor |

*Additional oppositions defined per trait in catalog.*

### 5.6 Trait Catalog

---

#### POSITIVE TRAITS

##### Common Positive

| Trait | Effect | Availability | Description |
|-------|--------|--------------|-------------|
| **Mushroom Whisperer** | +20% farming yield | Universal | Claims the chrooms talk back. No one argues with the results. |
| **Vinyl Theologian** | +10% XP gain | Universal | Has opinions about Brassens vs Brel. Will share them. At length. |
| **Cave-Born Legs** | +20% movement speed underground | Universal | Never seen the sun. Doesn't miss it. |
| **Apology Veteran** | +25% conflict resolution speed | Universal | Survived 47 days of Public Apology. Nothing phases them now. |
| **Steady Hands** | +15% to repair/craft actions | Universal | Precise and careful. Annoyingly so. |
| **Iron Stomach** | -15% Viral Load gain rate | Universal | Eats things that would kill others. Somehow fine. |
| **Survived Selection Day** | +20% under pressure | Universal | Lost rounds 1, 2, and 3. "Whatever's left" became their identity. They adapted. |
| **Borrowed a Bouche** | +10% Vibes during brownouts | Universal | Dated a Bouche once. Learned one (1) rhythm. It's enough. |

##### Uncommon Positive

| Trait | Effect | Availability | Description |
|-------|--------|--------------|-------------|
| **Beatbox Backup** | +15% Vibes during brownouts | Family: Bouche only | Grandma was a Bouche. The rhythm is genetic. |
| **Marchand Patience** | +15% to long-duration tasks | Family: Marchand weighted (70%) | Their family waited 86 years to run for Dadi. They can wait for this. |
| **The Unflappable** | Immune to morale drops from deaths | Universal | "We're all dying. Some just faster." The eyes are empty but the hands are steady. |
| **Professionally Mourned** | +25% Vibes on crew deaths | Family: Perez weighted (60%) | Midwife training includes grief counseling. Knows exactly what to say. Says it anyway. |
| **Certified Chroom-Free** | +15% trust from non-Lindquists | Family: NOT Lindquist | Has documentation proving they've never attended a "gathering." Carries it everywhere. Laminated. |
| **Unmarketable Skills** | +40% to obscure tasks | Universal | Trained for a role that no longer exists. Somehow keeps finding uses for "ceremonial gourd maintenance." |
| **Third Silence Survivor** | +30% crisis performance | Universal | Was in the caves when the power failed. Hummed for 8 straight minutes. Still hums when nervous. |
| **Perfect Pitch** | +15% band output | Universal | Can tune a Crystal by ear. Refuses to explain how. Gets defensive if asked. |

##### Rare Positive

| Trait | Effect | Availability | Description |
|-------|--------|--------------|-------------|
| **Immune to The Lecture** | Cannot be targeted by conflict penalties | Universal | Either deaf, sociopathic, or simply too dense. The Martinets have tried. They've given up. They still talk about it. |
| **3,287 Apologies** | Immune to conflict events entirely | Family: Lindquist weighted (40%) | Descended from Bertrand. Has inherited the family's inexhaustible creativity for making amends. "I have composed a sonnet about my transgression..." |
| **Outlived the Odds** | +15% Viral Load resistance, +10% expedition survival | Family: Lindquist weighted (60%) | Should have died on three separate expeditions. Didn't. Refuses to discuss why. The others who were there won't either. |
| **The Quiet Twin** | +30% solo efficiency | Universal | The other one died. They don't talk about it. They don't talk much at all. The silence is productive. |

##### Legendary Positive

| Trait | Effect | Availability | Description |
|-------|--------|--------------|-------------|
| **Bouche Marriage** | +10% Vibes always, beatbox immunity to brownouts, can teach others | Family: Married into Bouche | Married the sound. Became the sound. Their children will carry it. The rhythm never stops. |
| **Jérôme's Throat** | +50% during crises, can solo-sustain Vibes during brownouts | Family: Bouche only (very rare) | Descended from the legend himself. 58 minutes. The voice that saved everyone. It echoes in the blood. |
| **The Dadi's Blessing** | +20% to all leadership tasks, +15% Vibes generation | Story-unlocked | Sylvain himself acknowledged them. In public. By name. The political implications are still being calculated. |

---

#### NEGATIVE TRAITS

##### Common Negative

| Trait | Effect | Availability | Description |
|-------|--------|--------------|-------------|
| **Service Worker Energy** | -15% manual labor efficiency | Universal | Keeps suggesting "process improvements" instead of digging. Has never held a shovel correctly. |
| **Chronic Lecture Survivor** | -10% work speed near Martinets | Universal | Flinches whenever someone clears their throat meaningfully. The trauma runs deep. |
| **Mandatory Arts Skipper** | -10% base Vibes generation | Universal | "I just don't feel like singing tonight." Everyone notices. Everyone judges. Every single time. |
| **Confidently Incorrect** | -15% to all lore/knowledge checks | Family: Beaumont weighted (50%) | Learned history from a Beaumont who learned from a Beaumont who learned from a Beaumont. The drift is terminal. |
| **Surface Sick** | -25% efficiency outside bubble | Universal | The open sky feels wrong. Too much nothing. Too much everything. The caves are safe. The caves are home. |
| **Stubborn** | -10% task switch speed | Universal | Does things their way. Their way is slow. Their way is wrong. Their way is the only way. |

##### Uncommon Negative

| Trait | Effect | Availability | Description |
|-------|--------|--------------|-------------|
| **Johnny Truther** | -20% Vibes with Traditionalists | Universal | Believes Johnny Hallyday was "actually pretty good." Will not stop. Has prepared a presentation. |
| **Chroom Flashbacks** | -10% efficiency near mushroom farms | Universal | Something happened at a Lindquist gathering. They won't discuss it. Their eye twitches near spores. |
| **Delacroix Grudge** | -15% cooperation with Marchands | Universal | The feud was 90 years ago. They remember. Their grandparents remember. Memory is hereditary, apparently. |
| **Remembers the Feud** | -25% with Marchands OR Delacroix (random at generation) | Universal | Wasn't even born during the Year 210 conflict. Has chosen a side anyway. Will explain why at length. Has diagrams. |
| **Mandatory Arts Enthusiast** | -10% work efficiency (always practicing) | Creed: Trenétiste weighted (60%) | Takes the "mandatory" part as a minimum, not a maximum. Always humming. ALWAYS. Even now. Especially now. |
| **Witnessed a Sweeper** | -10% morale baseline | Universal | Saw Old Sweep Maurice's eyes once. Can't forget. Won't forget. He's still sweeping. He'll always be sweeping. |

##### Rare Negative

| Trait | Effect | Availability | Description |
|-------|--------|--------------|-------------|
| **Eternal Sweep Descendant** | -15% all tasks, cannot refuse cleaning assignments | Family: Any (ironic twist: Delacroix weighted 30%) | Great-great-grandparent was Maurice. The family still sends care packages. The guilt radiates. The broom calls. |
| **Peak Service Worker** | -30% manual labor, generates +20% unsolicited advice | Universal | Ancestor invented "synergy." The bloodline peaked before The Silence. It's been downhill since. Cannot stop suggesting. |
| **Touched Kaylee's MP3 Player** | -20% standing with Lindquists permanently | Family: NOT Lindquist | It was an accident. It's been 40 years. They still bring it up. At every gathering. The MP3 player didn't even work. |
| **Wrong About Johnny** | -20% with BOTH sides of the schism | Universal | Has a nuanced take on the Johnny Question. Both factions hate nuance more than they hate each other. |
| **The Beaumont Version** | -10% accuracy on all lore/history, will spread misinformation | Family: Beaumont weighted (70%) | The version has drifted. They don't know. They'll never know. They're teaching children now. |

##### Legendary Negative

| Trait | Effect | Availability | Description |
|-------|--------|--------------|-------------|
| **Technically a Murderer** | -40% social standing, excluded from leadership | Universal (very rare) | It was self-defense. The Council agreed. The Martinets documented it as justified. Doesn't matter. Everyone knows. Everyone remembers. Everyone steps back slightly when they enter a room. |
| **Hallyday Defender** | -30% Vibes with everyone, will start conflicts about Johnny | Universal (rare) | "He had RANGE, okay?!" Will die on this hill. Possibly literally. Has converted zero people in 40 years of trying. |
| **Knows Too Much** | -25% baseline happiness, triggers paranoia events | Story-unlocked | Learned something they shouldn't have. About Marc. About the drive. About what's really in the deep tunnels. Sleep is difficult now. |

---

#### MIXED TRAITS

##### Common Mixed

| Trait | Effect | Availability | Description |
|-------|--------|--------------|-------------|
| **Devout Piafiste** | +20% Vibes with Piafists, -10% with Brelistes | Creed: Piafist weighted (70%) | Cries during *La Vie en Rose*. Judges those who don't. The emotion is real. The judgment is realer. |
| **Devout Brassensiste** | +20% Vibes with Brassensistes, -10% with Piafists | Creed: Brassensiste weighted (70%) | Has a philosophical take on everything. Everything. Even lunch. Especially lunch. |
| **Devout Trenétiste** | +20% Vibes with Trenétistes, -10% with cynics | Creed: Trenétiste weighted (70%) | Relentlessly optimistic. Aggressively cheerful. The darkness will not win. The smile never falters. It's unsettling. |
| **Devout Breliste** | +20% Vibes with Brelistes, -10% with Brassensistes | Creed: Breliste weighted (70%) | Everything is poetry. Everything is passion. Everything is TOO MUCH. But beautifully so. |
| **Tunnel Rat** | +25% exploration speed, -10% combat | Universal | Knows every shortcut. Runs from every fight. Survival is knowing when to disappear. |
| **Night Owl** | +15% efficiency during "night" cycle, -10% morning | Universal | Prefers the quiet hours. The hours prefer them back. Mornings are violence. |

##### Uncommon Mixed

| Trait | Effect | Availability | Description |
|-------|--------|--------------|-------------|
| **Lefebvre Nose** | +30% Stone detection, -15% social tasks | Family: Lefebvre weighted (70%) | Can smell ore through rock. Cannot smell social cues. The trade-off was not optional. |
| **Lectromusic Zealot** | +25% expedition willingness, -15% base work | Creed: Lectromusic only | The surface is holy. The base is just... a base. The Prophet's beat echoes above, not below. |
| **The Lecturer** | Can resolve conflicts instantly, -20% Vibes with target for 24h | Family: Martinet weighted (60%) | Martinet-trained. Effective. Hated. The eye contact alone could curdle milk. |
| **Perfect Year Baby** | +15% to all group activities, -20% solo efficiency | Universal (age-locked: Year 288) | Born Year 288. Everything aligned once. They expect it to happen again. It won't. The disappointment is perpetual. |
| **Yellow Ribbon Survivor** | +15% rule compliance, -10% creativity | Universal | Wore The Shame. Learned the lesson. Maybe too well. Asks permission to breathe. |
| **The Betting Problem** | +25% risk assessment, -15% Vibes (losses), occasional Vibes (wins) | Universal | The Martinets take 2%. They take everything else. But the rush. The RUSH. |
| **Functional Alcoholic** | +20% social/Vibes tasks, -15% morning efficiency | Universal | The caves have been fermenting things for 300 years. Some families more than others. It helps. It always helps. |

##### Rare Mixed

| Trait | Effect | Availability | Description |
|-------|--------|--------------|-------------|
| **Pas-encore's Blessing** | +20% with children/young crew, -10% to personal morale | Family: Lindquist weighted (40%) | Named after the baby who lived six hours. Carries it. The name means "not yet." The hope never came. |
| **Rémi's Courage** | Immune to creed-based maluses, -10% with Traditionalists | Universal | Chose *Petit Papa Noël* as their song. In July. For their wedding. Regrets nothing. The Traditionalists regret everything about them. |
| **Emergency Essential** | +50% during crises, -25% during peace | Family: Bouche weighted (60%) | Bouche blood. Thrives in chaos. Bored otherwise. Peace is the enemy. Waiting is torture. |
| **Surface Addiction** | +40% expedition performance, -30% base contentment, will volunteer for danger | Family: Lindquist weighted (70%) | The sky. The wind. The SILENCE. They shouldn't love it. They do. The caves feel like a coffin now. |
| **Married Above Their Station** | +20% with spouse's family, -30% with own family | Universal | The Delacroix daughter and the Lefebvre digger. It's been 12 years. Both families are still processing. Christmas is complicated. |
| **Creed Apostate** | +15% with new creed, -40% with birth creed, immune to same-creed bonuses | Universal | Raised Piafiste. Converted to Brassensisme. The family dinner situation is... there are no more family dinners. |

##### Legendary Mixed

| Trait | Effect | Availability | Description |
|-------|--------|--------------|-------------|
| **Authentic Delacroix Guilt** | +30% leadership acceptance, -20% when making hard decisions | Family: Delacroix only | Something in the blood. A weight they can't name. Marc's legacy, though they'll never know how literally. The guilt is real. The source is lost. |
| **Kaylee's Dreams** | +35% exploration drive, -25% sleep quality (reduced recovery) | Family: Lindquist only | Sometimes dreams of music that doesn't exist. Wakes up crying. Wakes up reaching for something. Keeps going. Has to keep going. |
| **The Backup Backup** | +50% during emergencies, -20% when not needed, gains "Restless" if no crisis in 7 days | Family: Bouche only | Third in line for emergency sound duty. Has performed exactly once. Waiting. Always waiting. The silence is coming. They can feel it. |
| **Knows About the Drive** | +20% with Marchands, -30% with Delacroix, triggers special story events | Family: Marchand only (very rare) | One of the few who knows the family has it. Doesn't know what's on it. The secret is heavy enough. Some nights it's too heavy. |
| **Mourning a Send-Back** | +15% loyalty to current crew, -20% trust in leadership, triggers events | Universal (requires send-back to have occurred) | Someone they loved was sent away. They watched. They remember. Every time the player opens the send-back menu, they flinch. |

---

#### COMBAT-SPECIFIC TRAITS

##### Common Combat

| Trait | Effect | Availability | Description |
|-------|--------|--------------|-------------|
| **Scrapper** | +15% damage when wounded | Universal | Fights harder when bleeding. The pain is fuel. The medics hate this. |
| **Coward's Wisdom** | +20% defense, -10% damage | Universal | "Running away is just strategic repositioning." Technically correct. Extremely annoying. |
| **Heavy Hands** | +20% damage, -10% attack speed | Universal | Hits like a cave-in. Moves like one too. |

##### Uncommon Combat

| Trait | Effect | Availability | Description |
|-------|--------|--------------|-------------|
| **Guard Training** | +25% defense, can protect adjacent allies | Family: Moreau weighted (70%) | Drilled since childhood. The stance is automatic now. The vigilance never sleeps. |
| **Dirty Fighter** | +30% damage vs wounded enemies, -15% reputation | Universal | Kicks them when they're down. Bites if necessary. The Martinets have documented concerns. |
| **Tunnel Fighter** | +25% combat in enclosed spaces, -15% in open areas | Universal | The caves trained them. The surface is too big. Too open. Anything could come from anywhere. |

##### Rare Combat

| Trait | Effect | Availability | Description |
|-------|--------|--------------|-------------|
| **Silence Touched** | +40% damage vs Silence creatures, -20% Viral Load resistance | Universal | Something happened out there. They came back different. The creatures recognize them now. Fear them. |
| **Berserker Blood** | +50% damage when below 30% health, cannot retreat | Universal | The red mist descends. Control is optional. Survival is optional. Victory is everything. |

##### Legendary Combat

| Trait | Effect | Availability | Description |
|-------|--------|--------------|-------------|
| **Last One Standing** | +100% damage when only survivor, immune to morale breaks | Universal (very rare) | It's happened before. They were the only one who walked back. The others didn't walk at all. |

---

#### EXPEDITION-SPECIFIC TRAITS

##### Common Expedition

| Trait | Effect | Availability | Description |
|-------|--------|--------------|-------------|
| **Pathfinder** | +15% exploration speed | Universal | Always knows which way is out. Doesn't know how. Doesn't question it. |
| **Light Packer** | +10% movement speed, -10% carry capacity | Universal | "I don't need that." They always need that. They never bring it. |
| **Pack Mule** | +25% carry capacity, -10% movement speed | Universal | Will carry everything. EVERYTHING. The spine will pay later. The spine always pays later. |

##### Uncommon Expedition

| Trait | Effect | Availability | Description |
|-------|--------|--------------|-------------|
| **Surface Navigator** | +30% exploration outside bubble, -15% in caves | Family: Lindquist weighted (60%) | The sky tells them things. The stars speak. The caves are just... caves. |
| **Loot Goblin** | +25% loot discovery, will detour for shinies | Universal | Cannot pass something glittering. Cannot. The detours are legendary. The finds are worth it. Usually. |
| **Danger Sense** | +20% ambush avoidance, -10% loot (too cautious to investigate) | Universal | Hears threats before they exist. Also hears threats that don't exist. Sleep is theoretical. |

##### Rare Expedition

| Trait | Effect | Availability | Description |
|-------|--------|--------------|-------------|
| **Cartographer's Eye** | +40% map revelation, expedition generates permanent map data | Family: Girard weighted (70%) | Sees the shape of things. The tunnels make sense to them. They make sense to the tunnels. |
| **Silence Walker** | Can travel in Silence for +50% longer, -20% Vibes (others are disturbed) | Family: Lindquist only | The quiet doesn't hurt them like it should. They move through it like water. Others watch. Others worry. |

##### Legendary Expedition

| Trait | Effect | Availability | Description |
|-------|--------|--------------|-------------|
| **The One Who Returned** | +60% expedition survival, expeditions generate story events | Story-unlocked | They went further than anyone. They came back. What they found... they don't talk about what they found. Not yet. |

---

#### CRISIS-SPECIFIC TRAITS

##### Common Crisis

| Trait | Effect | Availability | Description |
|-------|--------|--------------|-------------|
| **Cool Head** | +15% efficiency during crises | Universal | Panic is for people with options. They've never had options. |
| **Panic Spiral** | -20% efficiency during crises, can trigger panic in others | Universal | The fear is contagious. The screaming doesn't help. They scream anyway. |

##### Uncommon Crisis

| Trait | Effect | Availability | Description |
|-------|--------|--------------|-------------|
| **Brownout Veteran** | +30% efficiency during power failures | Universal | Lived through the Fifth Silence. 58 minutes. The darkness doesn't scare them anymore. |
| **Tuning Sensitive** | +25% warning of Tuning events, -15% baseline morale | Universal | Can feel it coming. In the teeth. In the bones. The Crystal whispers to them. It whispers wrong things. |

##### Rare Crisis

| Trait | Effect | Availability | Description |
|-------|--------|--------------|-------------|
| **Death Doula** | +40% Vibes generation during crew deaths, can perform Last Rites | Family: Perez or Rousseau weighted | Trained to guide people out. The breathing. The words. The gentle lies. "It doesn't hurt. You're going home." |
| **Chaos Surfer** | +50% to all actions during crises, -30% during peace, will create crises if bored | Universal (rare) | Some people watch the world burn. Some people bring marshmallows. They bring the matches. |

##### Legendary Crisis

| Trait | Effect | Availability | Description |
|-------|--------|--------------|-------------|
| **Tuning Survivor** | +80% during Tuning events, immune to Tuning death (once) | Story-unlocked | They shouldn't have survived. The Crystal collapsed. Everyone died. They walked out of the silence. They don't remember how. They don't remember the three days after. |

---

## 6) Profession System

### 6.1 Concept

At age 8, every Unplugged undergoes Selection Day and chooses their trained profession. This is **separate from their Class** (Drummer/Vocalist/Synth).

A crew member might be:
- A **Drummer** (producing Bassline) who trained as a **Healer**
- A **Vocalist** (producing Chorus) who trained as a **Digger**

### 6.2 Profession Effects

Professions bring:
- Skills
- Perks
- Unique abilities
- Bonuses to related tasks

### 6.3 Profession List (Draft)

From lore Selection Day roles:
- Healer (Rousseau tradition)
- Digger (Lefebvre tradition)
- Farmer (Vidal tradition)
- Builder (Ferrand tradition)
- Guard (Moreau tradition)
- Teacher (Beaumont tradition)
- Engineer (Brenner tradition)
- Drummer (musical, not class)
- Cartographer (Girard tradition)
- Midwife (Perez tradition)

*Profession skills and effects TBD*

---

## 7) Recruitment Flow

### 7.1 Recruitment Model

- **Player cannot refuse recruits** - they are scarce and needed
- **Player can "send back"** crew members after arrival
- Recruitment is player-triggered (manual "Recruit" actions)
- Vibes cost paid at commit time
- Travel time applies (instant stock used first)

### 7.2 The Send-Back Defining Moment

**Trigger:** First time player clicks "Send Back" on any crew member.

**The Confrontation:**
- Crew member refuses to leave
- Reaction is per-character based on personality/traits
- All variants are about staying (even "resigned" = denial: "I guess I'll just sleep by the fire then")

**Leadership Archetypes (Player Choice):**

| Choice | Archetype | Future Send-Back Consequence |
|--------|-----------|------------------------------|
| **A** | **The Pragmatist** | "We can't carry dead weight." Send-backs are clean but cost Vibes and reputation at the Cave. |
| **B** | **The Protector** | "No one gets left behind unless they choose." Send-back disabled; must find role for everyone. **Bonus: +increased Vibes generation** |
| **C** | **The Judge** | "Prove your worth or go." Crew get trial period to redeem before send-back. |
| **D** | **The Manipulator** | "Make them want to leave." Can't send directly; make life miserable until they volunteer. (Dark path) |

**Changing Leadership Style:**
- Locked after initial choice
- Can be changed later via story-triggered events (TBD)

---

## 8) Tuning and Crew Death

### 8.1 Current Rule

Tuning kills all crew (hard reset). This is thematic - Crystal phase shift is lethal.

### 8.2 Future Options (Later Game)

Options to save some/all crew will unlock through progression:
- Specific research/tech
- Artifacts
- Safe spots with special properties
- Story unlocks

*Exact mechanics TBD*

---

## 9) Open Design Questions

- [ ] Trait rarity system? (Common vs rare traits)
- [ ] Trait discovery timing? (Visible immediately vs revealed over time)
- [ ] Family-locked traits? (Some traits exclusive to certain families?)
- [ ] Profession skill trees and effects
- [ ] Specific success triggers for Lindquist curve advancement
- [ ] Full trait catalog (need more absurd traits!)
- [ ] Relationship event triggers
- [ ] Send-back defining moment full narrative design

---

*Crew System Design — v0.1 (December 17, 2025)*
