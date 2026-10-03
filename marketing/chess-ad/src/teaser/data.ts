// What the teaser shows, taken from the game (worlds.js, characters.js, BossRules.js,
// MiniGamePractice.js). Keep it in step when those change.

// Scene lengths in seconds: the full trailer and the 60-second cut.
export const FULL = {
  awakening: 24,
  title: 16,
  twist: 30,
  arcade: 42,
  shattered: 38,
  worlds: 64,
  journey: 42,
  absolute: 30,
  finale: 14,
};
export const SHORT = {
  awakening: 5,
  title: 5,
  twist: 8,
  arcade: 12,
  shattered: 7,
  worlds: 10,
  journey: 0,
  absolute: 5,
  finale: 8,
};
export type SceneName = keyof typeof FULL;

export type World = {
  id: string;
  name: string;
  guardian: string;
  guardianName: string;
  guardianTitle: string;
  twist: string;
  line: string;
  accent: string;
  moods: [string, string];
};

// The eight guardian worlds of the tour, in journey order (Soulbound Pixel is the finale).
export const WORLDS: World[] = [
  {
    id: "slantedsands", name: "The Slanted Sands", guardian: "bishbosh", guardianName: "Bish-Bosh",
    guardianTitle: "The Diagonal Dreamer", twist: "Four Bishops", line: "No knights. Four bishops. Pure diagonal chaos.",
    accent: "#ffcc58", moods: ["gleeful", "cackle"],
  },
  {
    id: "ironkeep", name: "The Iron Keep", guardian: "rokee", guardianName: "Rook-E",
    guardianTitle: "The Iron Tower", twist: "The Iron Tower", line: "You start without your rooks. Take one of his and a challenge always begins.",
    accent: "#9fb7c9", moods: ["stern", "intense"],
  },
  {
    id: "mistymoors", name: "The Misty Moors", guardian: "knightsade", guardianName: "The Knight of the Mist",
    guardianTitle: "The Shadow Lancer", twist: "The Mist", line: "Fog hides his army. Watch for glowing eyes.",
    accent: "#72ffe0", moods: ["watching", "sly"],
  },
  {
    id: "royalpalace", name: "The Royal Palace", guardian: "queenie", guardianName: "Queenie",
    guardianTitle: "The Royal Tyrant", twist: "The Royal Court", line: "Two queens. Her captures start a challenge 60% of the time.",
    accent: "#ff8fc8", moods: ["smug", "delighted"],
  },
  {
    id: "clockworkcitadel", name: "The Clockwork Citadel", guardian: "castle", guardianName: "CastlE",
    guardianTitle: "The Unbreakable Fortress", twist: "The Fortress", line: "Gear walls lock the centre. Only knights jump over.",
    accent: "#e0b060", moods: ["patient", "stern"],
  },
  {
    id: "grandlibrary", name: "The Grand Library", guardian: "endgamer", guardianName: "EndGamer",
    guardianTitle: "The Patient Scholar", twist: "Straight to the Endgame", line: "A different endgame every time. His position is better.",
    accent: "#8fd0ff", moods: ["calm", "intrigued"],
  },
  {
    id: "forkedgulch", name: "Forked Gulch", guardian: "forkmaster", guardianName: "ForkMaster",
    guardianTitle: "The Tactician", twist: "Double Take", line: "Let him fork two of your pieces and he takes both.",
    accent: "#ff9a4a", moods: ["smug", "yeehaw"],
  },
  {
    id: "obsidiancourt", name: "The Obsidian Court", guardian: "checkmate", guardianName: "Checkmate",
    guardianTitle: "The Executioner", twist: "The Clock", line: "Checkmate him in 25 moves, or the sand runs out.",
    accent: "#ff5b5b", moods: ["grim", "wrath"],
  },
];

// The 18 mini-games (recorded as footage/mini_<cls>.webm), in the order the montage shows them.
export const MINIGAMES: { cls: string; name: string; kind: string }[] = [
  { cls: "MeteorStorm", name: "Meteor Storm", kind: "Aim" },
  { cls: "CheckmateRun", name: "Checkmate Run", kind: "Dodge" },
  { cls: "LavaTilt", name: "Lava Tilt", kind: "Balance" },
  { cls: "PowerMeter", name: "High Striker", kind: "Timing" },
  { cls: "UndertaleDodge", name: "Soul Dodge", kind: "Dodge" },
  { cls: "RhythmTap", name: "Rhythm Rush", kind: "Timing" },
  { cls: "SiegeCannon", name: "Siege Cannon", kind: "Aim" },
  { cls: "BarBalance", name: "Tightrope", kind: "Balance" },
  { cls: "MemoryMatch", name: "Memory Match", kind: "Memory" },
  { cls: "ShieldBlock", name: "Shield Wall", kind: "Timing" },
  { cls: "KnightCollapse", name: "Knight Collapse", kind: "Balance" },
  { cls: "TargetPractice", name: "Crossbow Gallery", kind: "Aim" },
  { cls: "ReactionTest", name: "Quick Draw", kind: "Dodge" },
  { cls: "RookStack", name: "Rook Stack", kind: "Timing" },
  { cls: "PatternPress", name: "Pattern Press", kind: "Memory" },
  { cls: "WhackMole", name: "Whack-a-Pawn", kind: "Aim" },
  { cls: "TimingStrike", name: "Timing Strike", kind: "Timing" },
  { cls: "DodgeFalling", name: "Falling Sky", kind: "Dodge" },
];

export const KIND_COLOR: Record<string, string> = {
  Aim: "#ff5fa8",
  Dodge: "#72ffe0",
  Balance: "#ffcc58",
  Timing: "#ba85ff",
  Memory: "#acffdc",
};

export const TRAINERS = [
  { id: "sergeantsquare", name: "Sergeant Square" },
  { id: "captaincapture", name: "Captain Capture" },
  { id: "joystick", name: "Joy Stick" },
  { id: "rulekeeper", name: "The Rulekeeper" },
  { id: "senseitactic", name: "Sensei Tactic" },
];
