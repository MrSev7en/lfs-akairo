import type { Player } from '#classes/player';
import type { Akairo } from '#core/akairo';

export class Players {
  /**
   * List of all active players
   * @readonly
   */
  public readonly list: Player[] = [];

  public constructor(public readonly akairo: Akairo) {}

  /**
   * Retrieves a player by their unique identifier.
   * @param uniqueId The unique identifier of the player
   */
  public getByUniqueId(uniqueId: number): Player {
    return this.list.find(
      (player) =>
        typeof player.uniqueId === 'number' &&
        player.uniqueId > 0 &&
        player.uniqueId === uniqueId,
    ) as Player;
  }

  /**
   * Retrieves a player by their player ID.
   * @param playerId The player ID to search for
   */
  public getByPlayerId(playerId: number): Player {
    return this.list.find(
      (player) =>
        typeof player.playerId === 'number' &&
        player.playerId > 0 &&
        player.playerId === playerId,
    ) as Player;
  }

  /**
   * Retrieves a player by their username (case-insensitive).
   * @param userName The username to search for
   */
  public getByUserName(userName: string): Player {
    return this.list.find(
      (player) => player.userName.toLowerCase() === userName.toLowerCase(),
    ) as Player;
  }

  /**
   * Retrieves a player by their player name (case-sensitive).
   * @param playerName The player name to search for
   */
  public getByPlayerName(playerName: string): Player {
    return this.list.find(
      (player) => player.playerName === playerName,
    ) as Player;
  }
}
