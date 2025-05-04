import type { Player } from '#classes/player';
import type { Akairo } from '#core/akairo';

export class Players {
  /**
   * List of all active players
   * @readonly
   */
  public readonly list: Map<string, Player> = new Map();

  public constructor(public readonly akairo: Akairo) {}

  /**
   * Retrieves player list as array.
   */
  public array(): Player[] {
    return Array.from(this.list.values());
  }

  /**
   * Retrieves a player by their unique identifier.
   * @param uniqueId The unique identifier of the player
   */
  public getByUniqueId(uniqueId: number): Player {
    return this.array().find(
      (player) =>
        typeof player.uniqueId === 'number' && player.uniqueId === uniqueId,
    )!;
  }

  /**
   * Retrieves a player by their player ID.
   * @param playerId The player ID to search for
   */
  public getByPlayerId(playerId: number): Player {
    return this.array().find(
      (player) =>
        typeof player.playerId === 'number' && player.playerId === playerId,
    )!;
  }

  /**
   * Retrieves a player by their username (case-insensitive).
   * @param userName The username to search for
   */
  public getByUserName(userName: string): Player {
    return this.list.get(
      this.akairo.settings?.filters?.userNameLowerCase
        ? userName.toLowerCase()
        : userName,
    )!;
  }

  /**
   * Retrieves a player by their player name (case-sensitive).
   * @param playerName The player name to search for
   */
  public getByPlayerName(playerName: string): Player {
    return this.array().find((player) => player.playerName === playerName)!;
  }
}
