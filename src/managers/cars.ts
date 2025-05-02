import type { Player } from '#classes/player';
import type { Akairo } from '#core/akairo';
import { IS_JRR, JRRAction, ObjectInfo } from 'node-insim/packets';

export class Cars {
  public constructor(public readonly akairo: Akairo) {}

  /**
   * Moves the player's car to specific position.
   * @param {Player} player The player whose car will be moved
   * @param coordinates Coordinates of player car (must be parsed)
   * @param coordinates.x X position of player car
   * @param coordinates.y Y position of player car
   * @param coordinates.z Z position of player car
   * @param coordinates.heading Heading angle of player car
   */
  public movePlayerCar(
    player: Player,
    coordinates: { x: number; y: number; z: number; heading: number },
  ): void {
    this.akairo.insim.send(
      new IS_JRR({
        StartPos: new ObjectInfo({
          X: coordinates.x,
          Y: coordinates.y,
          Zbyte: coordinates.z,
          Heading: coordinates.heading,
          Flags: 0x80,
        }),
        JRRAction: JRRAction.JRR_RESET_NO_REPAIR,
        UCID: player.uniqueId,
        PLID: player.playerId,
      }),
    );
  }

  /**
   * Resets the player's car to its current position.
   * @param {Player} player The player whose car will be reset
   */
  public resetPlayerCar(player: Player): void {
    const coordinates = this.getPlayerCarCoordinates(player);

    this.akairo.insim.send(
      new IS_JRR({
        StartPos: new ObjectInfo({
          X: coordinates.x,
          Y: coordinates.y,
          Zbyte: coordinates.z,
          Heading: coordinates.heading,
          Flags: 0x80,
        }),
        JRRAction: JRRAction.JRR_RESET,
        UCID: player.uniqueId,
        PLID: player.playerId,
      }),
    );
  }

  /**
   * Teleports a player's car to another player's location, with an optional distance offset.
   * @param {Player} from The player whose car will be teleported
   * @param {Player} to The player to whom the car will be teleported
   * @param {number} [distance=4] The distance offset in meters
   */
  public teleportPlayerCar(
    from: Player,
    to: Player,
    distance: number = 4,
  ): void {
    const destination = this.getPlayerCarCoordinates(to);

    this.akairo.insim.send(
      new IS_JRR({
        StartPos: new ObjectInfo({
          X: destination.x + distance * 16,
          Y: destination.y + distance * 16,
          Zbyte: destination.z,
          Heading: destination.heading,
          Flags: 0x80,
        }),
        JRRAction: JRRAction.JRR_RESET_NO_REPAIR,
        UCID: from.uniqueId,
        PLID: from.playerId,
      }),
    );
  }

  /**
   * Retrieves the coordinates and heading of a player's car.
   * @param {Player} player The player whose coordinates will be retrieved
   */
  public getPlayerCarCoordinates(player: Player) {
    const x = player.get('essentials.position.raw.x');
    const y = player.get('essentials.position.raw.y');
    const z = player.get('essentials.position.raw.z');
    const heading = player.get('essentials.heading.raw');

    return this.parseCoordinates({ x, y, z, heading });
  }

  /**
   * Parse and converts player car coordinates.
   * @param coordinates Coordinates of player car
   * @param coordinates.x X position of player car
   * @param coordinates.y Y position of player car
   * @param coordinates.z Z position of player car
   * @param coordinates.heading Heading angle of player car
   */
  public parseCoordinates(coordinates: {
    x: number;
    y: number;
    z: number;
    heading: number;
  }) {
    const x = (coordinates.x / 65536) * 16;
    const y = (coordinates.y / 65536) * 16;
    const z = coordinates.z / 16384;
    const heading = coordinates.heading / 256 + 128;

    return { x, y, z, heading };
  }
}
