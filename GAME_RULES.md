# WWII Strategy Game Rules (1935-1945)

A turn-based hexagonal strategy game simulating World War II conflict between major factions.

## Table of Contents

1. [Game Overview](#game-overview)
2. [Faction System](#faction-system)
3. [Map & Territory](#map--territory)
4. [Resources & Economy](#resources--economy)
5. [Unit System](#unit-system)
6. [Combat System](#combat-system)
7. [Artillery System](#artillery-system)
8. [Turn Structure](#turn-structure)
9. [Seasonal System](#seasonal-system)
10. [Victory Conditions](#victory-conditions)
11. [Game Duration](#game-duration)

---

## Game Overview

**Setting:** World War II (1935-1945)  
**Players:** 2 (controlling chosen factions)  
**Map:** Hexagonal grid  
**Duration:** 11 years (264 turns)  
**Victory:** Control all Strategic Hexes to eliminate opponent

---

## Faction System

### Available Factions
- **German**
- **British** 
- **Italian**
- **American**

### Game Setup
1. **Two Factions Only:** Exactly two factions participate in each game
2. **Faction Selection:** Players choose any two of the four available factions
3. **Possible Combinations:** 6 total combinations possible
4. **Starting Positions:** Factions begin at opposite corners of the hexagonal board
   - One faction starts at the top-left corner
   - The other faction starts at the bottom-right corner

### Starting Strategic Hex Distribution
1. **Limited Allocation:** Each faction receives a maximum of 3 strategic hexes at game start
2. **Random Assignment:** Each faction receives their strategic hexes randomly distributed
3. **Unoccupied Cities:** Additional strategic hexes beyond the 6 allocated (3 per faction) remain unowned
4. **Capture Required:** Unoccupied strategic hexes must be captured through gameplay
5. **No Choice:** Factions do not choose their assigned strategic hexes

### Starting Unit Placement
Each faction begins with **1 Unit** that must be placed in either:
1. **Corner Hex:** Their assigned corner starting position (opposite from opponent)
2. **Strategic Hex:** One of their randomly assigned strategic hexes

**Note:** The choice of starting position (corner vs strategic hex) is the only placement decision players make at game start

---

## Map & Territory

### Hexagonal Grid System
- Game is played on a hexagonal grid map
- Factions control territory by occupying hexes
- Hexes provide strategic positioning and resource generation

### Hex Ownership Rules
- **Ownership Timing:** A hex is owned by the faction that occupied it on the **previous turn**
- **Control Method:** Occupy a hex with your units to claim ownership next turn

### Hex Types
1. **Standard Hexes:** Generate 2 Resources per turn
2. **Strategic Hexes:** Generate 4 Resources per turn (critical for victory)

---

## Resources & Economy

### Resource Generation
**Formula:** `Total Resources = (Standard hexes × 2) + (Strategic hexes × 4)`

**Generation Timing:**
- Starting Resources generated at the start of the first turn
- Based on hexes owned at game start (corner hex + owned strategic hexes)
- Resources calculated each turn based on hexes owned from previous turn

**Starting Resources Example:**
- If a faction owns their corner hex (2 resources) + 2 strategic hexes (8 resources) = 10 starting resources
- Resources accumulate each turn based on current territorial control

### Resource Management
- **No Maximum Limit:** Resources can be accumulated indefinitely
- **Carry Over:** Unused Resources carry over between turns
- **Planning Required:** All expenditures must be planned during planning phase

### Resource Uses
| Use Case | Cost |
|----------|------|
| Unit Purchase | 3 Resources per Unit |
| Unit Movement | Varies by unit type and distance |
| Artillery Shells | 1 Resource = 1 Shell |

---

## Unit System

### Unit Statistics Table

| Unit Type | Health | Strength | Movement Cost | Purchase Cost |
|-----------|--------|----------|---------------|---------------|
| **Light Infantry** | 1 | 1 | 1 Resource/hex | 3 Resources |
| **Heavy Infantry** | 1 | 2 | 2 Resources/hex | 3 Resources |
| **Light Mechanical** | 1 | 3 | 2 Resources/hex | 3 Resources |
| **Heavy Mechanical** | 2 | 4 | 3 Resources/hex | 3 Resources |
| **Artillery** | 1 | 1 | 2 Resources/hex | 3 Resources |

### Unit Mechanics
- **Company Limit:** Maximum 100 total Strength points worth of units per faction
- **Health System:** Most units have 1 Health (destroyed in one hit)
- **Action Limit:** Each unit can perform only one action per turn (move OR fire)

### Movement Rules
1. **Distance:** Units move as far as Resource expenditure allows
2. **Cost:** Movement cost paid per hex moved (see table above)
3. **Group Movement Penalty:** Moving a unit away from a unit group costs +1 Resource

### Multi-Unit Hexes
- **Unit Groups:** Multiple units can occupy the same hex
- **Group Movement:** Units can move together if sufficient Resources available
- **Individual Costs:** Pay movement cost for each unit separately

---

## Combat System

### Combat Basics
- **Health:** All units have 1 Health except Heavy Mechanical (2 Health)
- **Conflict Trigger:** Combat occurs when opposing units move into same hex

### Combat Resolution Process
1. **Total Health Calculation:** Number of units in hex (each unit = +1 Health)
2. **Total Strength Calculation:** Sum of all unit Strength values in hex
3. **Damage Comparison:** Attacking Strength vs. Defending Health
4. **Casualty Resolution:** Faction taking casualties chooses damage distribution

### Combat Outcomes
- **Victory:** If all defending units destroyed, attackers control hex
- **Stalemate:** When attacking Strength equals defending Health, no damage
- **Counter-Attack:** Defenders can damage attackers if defending Strength > attacking Health

### Damage Distribution
- **Player Choice:** The faction taking casualties chooses which units are lost
- **Strategic Decision:** Allows tactical decisions about unit preservation

---

## Artillery System

### Artillery Capabilities
- **Range:** Can target hexes up to 2 hexes away
- **Firing Cost:** 1 Resource = 1 Shell
- **Target Selection:** Can fire at any hex within range (empty or occupied)
- **Action Limit:** Artillery cannot move and fire in the same turn

### Wind System
- **Wind Die:** Roll at the start of each artillery barrage: N, S, E, W, 0, 0
- **Wind Effects:** Apply to all shots in that barrage
- **Against Wind:** Shots fired against wind direction reduce range by 1 hex
- **With Wind:** Shots fired with wind direction increase range by 1 hex
- **Crosswind/Calm:** No effect on artillery accuracy

### Wind Range Effects
- **Planned 2-hex shot against wind:** Hits at 1 hex from artillery position
- **Planned 1-hex shot against wind:** Shot hits artillery's own position (suicide)
- **Planned 2-hex shot with wind:** Hits at 3 hexes from artillery position
- **Planned 1-hex shot with wind:** Hits at 2 hexes from artillery position

### Artillery Combat
- **Lethality:** One Shell = One Unit destroyed (no saves)
- **Target Selection:** If shell hits occupied hex, controlling faction chooses which unit dies
- **Resource Commitment:** Resources spent even when targeting empty hexes

---

## Turn Structure

### Initiative System
1. **Determination:** Random at game start
2. **Alternation:** Initiative alternates yearly between factions
3. **Resolution Order:** Initiative determines who resolves plan steps first

### Turn Execution Process
1. **Planning Phase:** Both factions plan actions simultaneously (hidden)
2. **Sequential Execution:** Plans resolved by alternating steps:
   - Faction A executes Plan Step 1
   - Faction B executes Plan Step 1
   - Faction A executes Plan Step 2
   - Faction B executes Plan Step 2
   - Continue until all steps complete

### Planning Requirements
- **Coordinate System:** Use hex coordinates for all unit actions
- **Resource Allocation:** All expenditures must be planned and submitted
- **Simultaneous Planning:** No communication between factions during planning

---

## Seasonal System

### Turn Counter Format
**`[Year] [Month] [Turn of Two], [Season]`**

**Examples:**
- `1935 March Turn 1, Spring` (Game Start)
- `1935 June Turn 2, Summer`
- `1940 December Turn 1, Winter`

### Turn Progression Rules
1. **Turns Per Year:** 24 turns total
2. **Turns Per Month:** Exactly 2 turns
3. **Turn Numbering:** Alternates 1, 2 within each month
4. **Month Advancement:** After Turn 2, advance to Turn 1 of next month

### Seasonal Boundaries
- **Spring:** March-May (6 turns)
- **Summer:** June-August (6 turns)
- **Fall:** September-November (6 turns)
- **Winter:** December-February (6 turns)

### Season Changes
- **Spring begins:** March Turn 1
- **Summer begins:** June Turn 1
- **Fall begins:** September Turn 1
- **Winter begins:** December Turn 1

### Year Transitions
- **Calendar Years:** Progress naturally (1935 → 1936 → 1937...)
- **Winter Span:** December Year X, January Year X+1, February Year X+1
- **Continuous Play:** No interruption during year transitions

---

## Victory Conditions

### Defeat Conditions
**A faction loses when it controls zero Strategic Hexes**

### Strategic Hexes Importance
- **Resource Value:** Generate 4 Resources per turn (double standard hexes)
- **Victory Requirement:** Must maintain control of at least one Strategic Hex
- **Critical Objectives:** Primary targets for conquest and defense

---

## Game Duration

### Timeline
- **Start Date:** 1935 March Turn 1, Spring
- **End Date:** 1945 February Turn 2, Winter
- **Total Duration:** 11 years
- **Total Turns:** 264 turns

### Historical Context
The game spans the buildup to and duration of World War II, allowing players to experience the full strategic arc of the conflict through their chosen factions.

---

## Quick Reference

### Key Numbers
- **Factions Available:** 4 (German, British, Italian, American)
- **Factions Per Game:** 2
- **Unit Purchase Cost:** 3 Resources (all types)
- **Company Limit:** 100 Strength points maximum
- **Artillery Range:** 2 hexes (modified by wind)
- **Turns Per Month:** 2
- **Turns Per Year:** 24
- **Game Duration:** 11 years (264 turns)

### Victory Summary
**Win:** Eliminate all opponent Strategic Hexes  
**Lose:** Control zero Strategic Hexes yourself

### Wind Die Results
- **N (North):** Wind blows north
- **S (South):** Wind blows south
- **E (East):** Wind blows east
- **W (West):** Wind blows west
- **0 (Calm):** No wind effect (appears twice)

---

### Starting Game State Summary
1. **Board Setup:** Two factions at opposite corners
2. **Strategic Hex Ownership:** Maximum 3 per faction (additional strategic hexes remain unowned)
3. **Starting Units:** Each faction has 1 unit placed at corner or owned strategic hex
4. **Initial Resources:** Generated from owned hexes (corner + up to 3 strategic hexes)
5. **Unoccupied Cities:** Strategic hexes beyond the initial 6 allocation remain neutral until captured
6. **All Other Hexes:** Begin unowned and must be captured through gameplay

---

*Game Rules Version 1.3 - Updated with Limited Strategic Hex Allocation*