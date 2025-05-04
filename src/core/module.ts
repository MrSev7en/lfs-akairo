import type { Player } from '#classes/player';
import type { Akairo } from '#core/akairo';
import { createPacketFilter } from '#core/filter';
import type { Players } from '#managers/players';
import { logger } from '#utils/logger';
import {
  PacketType,
  UserType,
  type CompCar,
  type IS_CNL,
  type IS_CPR,
  type IS_MCI,
  type IS_MSO,
  type IS_NCI,
  type IS_NCN,
  type IS_NPL,
  type IS_PLL,
  type IS_PLP,
  type IS_TOC,
} from 'node-insim/packets';

interface IPacket {
  UCID?: number;
  PLID?: number;
  Info?: CompCar[];
}

type EventHandler<T> = {
  type: PacketType;
  callback: (packet: T) => Promise<void>;
};

type CommandHandler = {
  commands: Set<string>;
  callback: (player: Player, args: string[]) => Promise<void>;
};

type UnknownCommandCallback = (
  player: Player,
  command: string,
  args: string[],
) => Promise<void>;

export class Module {
  private readonly intervals: Set<NodeJS.Timeout>;
  private readonly events: Map<PacketType, EventHandler<any>[]>;
  private readonly commandHandlers: CommandHandler[];
  private readonly registeredCommands: Set<string>;
  private readonly unknownCommandHandlers: UnknownCommandCallback[];

  public constructor(public readonly akairo: Akairo) {
    this.intervals = new Set();
    this.events = new Map();
    this.commandHandlers = [];
    this.registeredCommands = new Set();
    this.unknownCommandHandlers = [];
  }

  /**
   * Registers a packet handler for a specific packet type.
   * @param type The type of packet to handle
   * @param callback Function to be called when packet is received
   */
  public onPacket<T>(
    type: PacketType,
    callback: (player: Player, packet: T) => Promise<void>,
  ): void;

  /**
   * Registers a packet handler for a specific packet type.
   * @param type The type of packet to handle
   * @param callback Function to be called when packet is received
   */
  public onPacket(
    type: PacketType.ISP_MCI,
    callback: (players: Player[], packet: PacketType.ISP_MCI) => Promise<void>,
  ): void;

  /**
   * Registers a packet handler for a specific packet type.
   * @param type The type of packet to handle
   * @param callback Function to be called when packet is received
   */
  public onPacket<T>(
    type: PacketType,
    callback: (...args: any[]) => Promise<void>,
  ): void {
    if (!Object.values(PacketType).includes(type)) {
      throw new Error(`Invalid packet type: ${type}`);
    }

    const handlers = this.events.get(type) || [];
    const wrappedCallback = async (packet: T) => {
      const player = this.getPlayerFromPacket(packet as IPacket, type);
      const filter = createPacketFilter([PacketType.ISP_NCN])
        .onSuccess(() => callback(player, packet))
        .onFailed(() => player && callback(player, packet));

      filter.filter(type);
    };

    handlers.push({ type, callback: wrappedCallback });
    this.events.set(type, handlers);
  }

  /**
   * Registers a periodic task to be executed at specified intervals.
   * @param interval Time in milliseconds between executions
   * @param callback Function to be executed periodically
   */
  public onTick(
    interval: number,
    callback: (players: Players) => Promise<void>,
  ): void {
    if (interval <= 0) {
      throw new Error('Interval must be greater than 0');
    }

    const handler = async () => {
      try {
        await callback(this.akairo.players);
      } catch (error) {
        logger.error(`Error in tick handler: "${error}"`);
      }
    };

    const intervalId = setInterval(handler, interval);
    this.intervals.add(intervalId);
  }

  /**
   * Registers a command handler for one or more commands.
   * @param commands Command or array of commands to handle
   * @param callback Function to be called when command is received
   */
  public onCommand(
    commands: string | string[],
    callback: (player: Player, args: string[]) => Promise<void>,
  ): void {
    const commandList = Array.isArray(commands) ? commands : [commands];

    if (commandList.length === 0) {
      throw new Error('At least one command must be provided');
    }

    const normalizedCommands = new Set(
      commandList.map((cmd) => {
        const normalized = cmd.toLowerCase().trim();

        if (normalized.length === 0) {
          throw new Error('Empty command is not allowed');
        }

        if (this.registeredCommands.has(normalized)) {
          throw new Error(`Command "${normalized}" is already registered`);
        }

        return normalized;
      }),
    );

    normalizedCommands.forEach((cmd) => this.registeredCommands.add(cmd));
    this.commandHandlers.push({ commands: normalizedCommands, callback });
  }

  /**
   * Registers a handler for unknown commands.
   * @param callback Function to be called when an unknown command is received
   */
  public onUnknownCommand(callback: UnknownCommandCallback): void {
    this.unknownCommandHandlers.push(callback);
  }

  /**
   * Bind all packets inside this module through InSim
   */
  public bind(): void {
    this.unbind();

    this.events.forEach((handlers, type) => {
      handlers.forEach((handler) => {
        setTimeout(() => {
          this.akairo.insim.addListener(type, this.createSafeListener(handler));
        });
      });
    });

    this.akairo.insim.addListener(PacketType.ISP_MSO, (packet) =>
      this.handleMessage(packet),
    );
  }

  /**
   * Unbind all packets insidee this module through InSim
   */
  public unbind(): void {
    this.events.forEach((handlers, type) => {
      handlers.forEach((handler) => {
        this.akairo.insim.removeListener(
          type,
          this.createSafeListener(handler),
        );
      });
    });

    this.akairo.insim.removeListener(PacketType.ISP_MSO, (packet) =>
      this.handleMessage(packet),
    );
  }

  private createSafeListener<T>(handler: EventHandler<T>) {
    return async (packet: T) => {
      try {
        await handler.callback(packet);
      } catch (error) {
        logger.error(
          `Error handling packet ${PacketType[handler.type]}: "${error}"`,
        );
      }
    };
  }

  private async handleMessage(packet: IS_MSO): Promise<void> {
    if (packet.UserType !== UserType.MSO_PREFIX) return;

    const parsed = this.parseMessage(packet);
    if (!parsed) return;

    const { command, args } = parsed;
    const player = this.getPlayerFromPacket(packet, PacketType.ISP_MSO);

    if (!player) return;

    const commandExists = this.registeredCommands.has(command.toLowerCase());

    if (commandExists) {
      await this.handleKnownCommand(command, args, player as Player);
    } else {
      await this.handleUnknownCommand(command, args, player as Player);
    }
  }

  private parseMessage(
    packet: IS_MSO,
  ): { command: string; args: string[] } | null {
    const prefix = String(this.akairo.settings?.prefix).slice(0, 1) || '!';
    const message = packet.Msg.substring(packet.TextStart)
      .replace(/\s+/g, ' ')
      .trim();

    if (!message.startsWith(prefix)) return null;

    const [rawCommand, ...args] = message.slice(prefix.length).split(' ');

    return {
      command: rawCommand.toLowerCase(),
      args: args.filter(Boolean),
    };
  }

  private async handleKnownCommand(
    command: string,
    args: string[],
    player: Player,
  ): Promise<void> {
    const promises = this.commandHandlers
      .filter((handler) => handler.commands.has(command.toLowerCase()))
      .map((handler) =>
        handler
          .callback(player, args)
          ?.catch((error) =>
            logger.error(`Error handling command "${command}": "${error}"`),
          ),
      );

    await Promise.all(promises);
  }

  private async handleUnknownCommand(
    command: string,
    args: string[],
    player: Player,
  ): Promise<void> {
    const promises = this.unknownCommandHandlers.map((handler) =>
      handler(player, command, args)?.catch((error) =>
        logger.error(`Error handling unknown command "${command}": "${error}"`),
      ),
    );

    await Promise.all(promises);
  }

  private getPlayerFromPacket(
    packet: IPacket,
    type: PacketType,
  ): Player | Player[] {
    const player = () => {
      switch (type) {
        case PacketType.ISP_NCN: {
          const parsed = packet as IS_NCN;
          const found =
            this.akairo.players.getByUserName(parsed.UName) ??
            this.akairo.players.getByUniqueId(parsed.UCID);

          return found;
        }

        case PacketType.ISP_NCI: {
          const parsed = packet as IS_NCI;
          const found = this.akairo.players.getByUniqueId(parsed.UCID);

          return found;
        }

        case PacketType.ISP_CNL: {
          const parsed = packet as IS_CNL;
          const found = this.akairo.players.getByUniqueId(parsed.UCID);

          return found;
        }

        case PacketType.ISP_NPL: {
          const parsed = packet as IS_NPL;
          const found =
            this.akairo.players.getByUniqueId(parsed.UCID) ??
            this.akairo.players.getByPlayerId(parsed.PLID) ??
            this.akairo.players.getByPlayerName(parsed.PName);

          return found;
        }

        case PacketType.ISP_PLP: {
          const parsed = packet as IS_PLP;
          const found = this.akairo.players.getByPlayerId(parsed.PLID);

          return found;
        }

        case PacketType.ISP_PLL: {
          const parsed = packet as IS_PLL;
          const found = this.akairo.players.getByPlayerId(parsed.PLID);

          return found;
        }

        case PacketType.ISP_TOC: {
          const parsed = packet as IS_TOC;

          // This can cause issues, since player list is updated.
          const byOldUniqueId = this.akairo.players.getByUniqueId(
            parsed.OldUCID,
          );
          if (byOldUniqueId) return byOldUniqueId;

          // This can cause issues too, since may have an player with "NewUCID".
          const byNewUniqueId = this.akairo.players.getByUniqueId(
            parsed.NewUCID,
          );
          if (byNewUniqueId) return byNewUniqueId;

          const byPlayerId = this.akairo.players.getByPlayerId(parsed.PLID);
          if (byPlayerId) return byPlayerId;

          return null;
        }

        case PacketType.ISP_CPR: {
          const parsed = packet as IS_CPR;
          const found = this.akairo.players.getByUniqueId(parsed.UCID);

          return found;
        }

        case PacketType.ISP_MCI: {
          const list: Player[] = [];
          const parsed = packet as IS_MCI;

          for (const info of parsed.Info) {
            const byPlayerId = this.akairo.players.getByPlayerId(info.PLID);

            if (byPlayerId) {
              list.push(byPlayerId);
            }
          }

          return list;
        }

        default:
          return null;
      }
    };

    const find = player();
    if (find) return find;

    // Fallback in other packets.
    return this.akairo.players
      .array()
      .find(
        (player) =>
          (typeof player.uniqueId === 'number' &&
            player.uniqueId === packet.UCID) ||
          (typeof player.playerId === 'number' &&
            player.playerId === packet.PLID),
      )!;
  }
}
