export interface ChampionMetadata {
  [apiName: string]: {
    name: string;
    cost: number;
    traits: string[];
    tileIcon: string;
    squareIcon: string;
  };
}

export interface TraitMetadata {
  [apiName: string]: {
    name: string;
    icon: string;
    description: string;
  };
}

export interface ItemMetadata {
  [apiName: string]: {
    name: string;
    icon: string;
    description: string;
  };
}

export interface AugmentMetadata {
  [apiName: string]: {
    name: string;
    icon: string;
    tier: 'silver' | 'gold' | 'prismatic';
  };
}
