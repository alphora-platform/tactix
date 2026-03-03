export interface ChampionData {
  name: string;
  cost: number;
  traits: string[];
  tileIcon: string;
  squareIcon: string;
}

export interface TraitData {
  name: string;
  icon: string;
  description: string;
}

export interface ItemData {
  name: string;
  icon: string;
  description: string;
}

export interface AugmentData {
  name: string;
  icon: string;
  tier: 'silver' | 'gold' | 'prismatic';
}

export interface TftGameData {
  champions: Record<string, ChampionData>;
  traits: Record<string, TraitData>;
  items: Record<string, ItemData>;
  augments: Record<string, AugmentData>;
}
