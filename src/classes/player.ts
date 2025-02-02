import { Button } from '#classes/button';
import type { Akairo } from '#core/akairo';
import type { PitStatus } from '#types/player';
import { merge, objectify, remove, retrieve } from '#utils/data';
import { convertLanguage, i18n } from '#utils/i18n';
import type { Scope, TranslateOptions } from 'i18n-js';
import { IS_MTC, type Language, type MessageSound } from 'node-insim/packets';

export class Player {
  /** Unique id inside server (usually it is used in almost all of cases) */
  public uniqueId!: number;

  /** Car id inside server (usually it is used in packets that handles car's) */
  public playerId!: number;

  /** Account username (unique in entire LFS) */
  public userName!: string;

  /** Name visible inside game and servers */
  public playerName!: string;

  /** Determines if player is using admin password */
  public isAdministrator!: boolean;

  /** Game language */
  public gameLanguage!: Language;

  /** Attributes saved in player instance */
  public selfData = {};

  public constructor(public readonly akairo: Akairo) {}

  /**
   * Translate an content to player.
   * @param scope Translation scope
   * @param options Translation scope options
   */
  public t(scope: Scope, options?: TranslateOptions): string {
    i18n.locale = convertLanguage(this.gameLanguage);
    return i18n.t(scope, options);
  }

  /**
   * Send a message to player.
   * @param content Content to be sent (it can be translated)
   * @param sound Sound of message
   */
  public message<T>(content: T, sound?: MessageSound): Player {
    this.akairo.insim.send(
      new IS_MTC({
        Text: String(content),
        Sound: sound,
        UCID: this.uniqueId,
        PLID: this.playerId,
      }),
    );

    return this;
  }

  /**
   * Create an button instance to player.
   */
  public button(): Button {
    return new Button(this.akairo).setPlayerId(() => this.uniqueId);
  }

  /**
   * Detects if player is closer to an position.
   * @param x X coordinates of position
   * @param y Y coordinates of position
   * @param z Z coordinates of position
   * @param radius Margin radius to compare if player is in position
   */
  public close(x: number, y: number, z: number, radius: number): boolean {
    const pitStatus = this.get<PitStatus>('essentials.pit-status');
    const positionX = this.get<number>('essentials.position.x');
    const positionY = this.get<number>('essentials.position.y');
    const positionZ = this.get<number>('essentials.position.x');

    return (
      pitStatus === 'TRACK' &&
      Math.abs(positionX - x) <= radius &&
      Math.abs(positionY - y) <= radius &&
      Math.abs(positionZ - z) <= radius
    );
  }

  /**
   * Get an list of closer players in radius.
   * @param radius Margin radius to search for players
   */
  public closer(radius: number): Player[] {
    const positionX = this.get<number>('essentials.position.x');
    const positionY = this.get<number>('essentials.position.y');
    const positionZ = this.get<number>('essentials.position.x');
    const pitStatus = this.get<PitStatus>('essentials.pit-status');

    if (pitStatus !== 'TRACK') {
      return [];
    }

    return this.akairo.players.list.filter((player) => {
      const otherPositionX = player.get<number>('essentials.position.x');
      const otherPositionY = player.get<number>('essentials.position.y');
      const otherPositionZ = player.get<number>('essentials.position.z');
      const otherPitStatus = player.get<PitStatus>('essentials.pit-status');

      return (
        player.uniqueId !== this.uniqueId &&
        player.playerId !== this.playerId &&
        otherPitStatus === 'TRACK' &&
        Math.abs(positionX - otherPositionX) <= radius &&
        Math.abs(positionY - otherPositionY) <= radius &&
        Math.abs(positionZ - otherPositionZ) <= radius
      );
    });
  }

  /**
   * Retrieves the value from the nested object structure based on the given path.
   * @template T
   * @param {string} path The path to the desired value, using dot notation
   */
  public get<T = any>(path: string): T {
    return retrieve(path, this.selfData);
  }

  /**
   * Sets a value in the nested object structure based on the given path.
   * @template T
   * @param {string} path The path where the value should be set, using dot notation
   * @param {T} value The value to set at the specified path
   */
  public set<T = any>(path: string, value: T): Player {
    this.selfData = merge(this.selfData, objectify(path, value));
    return this;
  }

  /**
   * Removes a specific key from the nested object structure based on the given path.
   * @param {string} path The path to the key that should be removed, using dot notation
   */
  public remove(path: string): Player {
    this.selfData = remove(this.selfData, path.split('.'));
    return this;
  }

  /**
   * Clears all data from the Player instance.
   */
  public clear(): Player {
    this.selfData = {};
    return this;
  }
}
