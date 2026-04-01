export interface Set17Champion {
  id: number;
  apiName: string;
  displayName: string;
  cost: number;
  traits: string[];
  role: string;
  dmgType: string;
  rowPosition: string;
  setNumber: number;
}

export interface Set17Trait {
  id: number;
  apiName: string;
  displayName: string;
  traitType: string;
  breakpoints: number[];
  description: string;
  setNumber: number;
}
