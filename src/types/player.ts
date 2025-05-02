export interface Data {
  'essentials.ip': string;
  'essentials.license': number;
  'essentials.plate': string;
  'essentials.player-type': number;
  'essentials.player-flags': number;
  'essentials.car-name': string;
  'essentials.skin-name': string;
  'essentials.tyre-frontal-left': number;
  'essentials.tyre-frontal-right': number;
  'essentials.tyre-rear-left': number;
  'essentials.tyre-rear-right': number;
  'essentials.added-mass': number;
  'essentials.intake-restriction': number;
  'essentials.model': number;
  'essentials.passenger-flags': number;
  'essentials.frontal-wheels-adjustment': number;
  'essentials.rear-wheels-adjustment': number;
  'essentials.race-number': number;
  'essentials.car-configuration': number;
  'essentials.fuel': number;
  'essentials.pit-status': 'TRACK' | 'PIT' | 'SPECTATE';
  'essentials.position.x': number;
  'essentials.position.y': number;
  'essentials.position.z': number;
  'essentials.position.raw.x': number;
  'essentials.position.raw.y': number;
  'essentials.position.raw.z': number;
  'essentials.heading.angle': number;
  'essentials.heading.raw': number;
  'essentials.angle': number;
  'essentials.speed.mph': number;
  'essentials.speed.kph': number;
  'essentials.lap': number;
}

export type Content = keyof Data | (string & Record<never, never>);
