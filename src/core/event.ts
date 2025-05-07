import { Player } from '#classes/player';
import type { Akairo } from '#core/akairo';
import { logger } from '#utils/logger';
import {
  type IS_CNL,
  type IS_CPR,
  type IS_MCI,
  type IS_NCI,
  type IS_NCN,
  type IS_NPL,
  type IS_PLL,
  type IS_PLP,
  type IS_TOC,
  PacketType,
} from 'node-insim/packets';

type BindingPackets =
  | PacketType.ISP_NCN
  | PacketType.ISP_NCI
  | PacketType.ISP_CNL
  | PacketType.ISP_NPL
  | PacketType.ISP_PLP
  | PacketType.ISP_PLL
  | PacketType.ISP_TOC
  | PacketType.ISP_CPR
  | PacketType.ISP_MCI;

export class Event {
  private handlers: Map<BindingPackets, (...args: any[]) => void> = new Map();

  public constructor(
    public readonly akairo: Akairo,
    public readonly exclude: BindingPackets[],
  ) {
    this.initialize();
    logger.info('Event listener was successfully loaded.');
  }

  private initialize(): void {
    const bind = (type: BindingPackets, handler: (packet: any) => void) => {
      if (!this.exclude.includes(type)) {
        const bound = handler.bind(this);

        this.handlers.set(type, bound);
        this.akairo.insim.addListener(type, bound);
      }
    };

    bind(PacketType.ISP_NCN, this.onPlayerConnectHandler);
    bind(PacketType.ISP_NCI, this.onPlayerDetailsHandler);
    bind(PacketType.ISP_CNL, this.onPlayerLeftHandler);
    bind(PacketType.ISP_NPL, this.onPlayerTrackHandler);
    bind(PacketType.ISP_PLP, this.onPlayerPitHandler);
    bind(PacketType.ISP_PLL, this.onPlayerSpectateHandler);
    bind(PacketType.ISP_TOC, this.onPlayerChangeHandler);
    bind(PacketType.ISP_CPR, this.onPlayerRenameHandler);
    bind(PacketType.ISP_MCI, this.onCarMovementHandler);
  }

  public destroy(): void {
    for (const [type, handler] of this.handlers) {
      this.akairo.insim.removeListener(type, handler);
    }

    this.handlers.clear();
    logger.info('Event listeners were successfully removed.');
  }

  private onPlayerConnectHandler(packet: IS_NCN): void {
    const exists = this.akairo.players.getByUniqueId(packet.UCID);

    if (!exists && packet.UName) {
      const player = new Player(this.akairo);
      const userName = this.akairo.settings?.filters?.userNameLowerCase
        ? packet.UName.toLowerCase()
        : packet.UName;

      player.uniqueId = packet.UCID;
      player.playerId = null!;
      player.userName = userName;
      player.playerName = packet.PName;
      player.isAdministrator = !!packet.Admin;
      player.gameLanguage = null!;

      this.akairo.players.list.set(packet.UCID, player);
    }
  }

  private onPlayerDetailsHandler(packet: IS_NCI): void {
    const player = this.akairo.players.getByUniqueId(packet.UCID);

    if (player) {
      player.set('essentials.ip', packet.IPAddress);
      player.set('essentials.license', packet.License);
      player.gameLanguage = packet.Language;
      player.isReady = true;
    }
  }

  private onPlayerLeftHandler(packet: IS_CNL): void {
    this.akairo.players.list.delete(packet.UCID);
  }

  private onPlayerTrackHandler(packet: IS_NPL): void {
    const player =
      this.akairo.players.getByUniqueId(packet.UCID) ??
      this.akairo.players.getByPlayerId(packet.PLID) ??
      this.akairo.players.getByPlayerName(packet.PName);

    if (player) {
      player.playerId = packet.PLID;
      player.set('essentials.plate', packet.Plate);
      player.set('essentials.player-type', packet.PType);
      player.set('essentials.player-flags', packet.Flags);
      player.set('essentials.car-name', packet.CName);
      player.set('essentials.skin-name', packet.SName);
      player.set('essentials.tyre-frontal-left', packet.TyreFL);
      player.set('essentials.tyre-frontal-right', packet.TyreFR);
      player.set('essentials.tyre-rear-left', packet.TyreRL);
      player.set('essentials.tyre-rear-right', packet.TyreRR);
      player.set('essentials.added-mass', packet.H_Mass);
      player.set('essentials.intake-restriction', packet.H_TRes);
      player.set('essentials.model', packet.Model);
      player.set('essentials.passenger-flags', packet.Pass);
      player.set('essentials.frontal-wheels-adjustment', packet.FWAdj);
      player.set('essentials.rear-wheels-adjustment', packet.RWAdj);
      player.set('essentials.race-number', packet.NumP);
      player.set('essentials.car-configuration', packet.Config);
      player.set('essentials.fuel', packet.Fuel);
      player.set('essentials.pit-status', 'TRACK');
    }
  }

  private onPlayerPitHandler(packet: IS_PLP): void {
    const player = this.akairo.players.getByPlayerId(packet.PLID);

    if (player) {
      player.playerId = null!;
      player.set('essentials.pit-status', 'PIT');
    }
  }

  private onPlayerSpectateHandler(packet: IS_PLL): void {
    const player = this.akairo.players.getByPlayerId(packet.PLID);

    if (player) {
      player.playerId = null!;
      player.set('essentials.pit-status', 'SPECTATE');
    }
  }

  private onPlayerChangeHandler(packet: IS_TOC): void {
    const playerA = this.akairo.players.getByUniqueId(packet.OldUCID);
    const playerB = this.akairo.players.getByUniqueId(packet.NewUCID);

    if (playerA && playerB) {
      playerB.playerId = packet.PLID;
      playerA.playerId = null!;

      playerA.set('essentials.pit-status', 'SPECTATE');
      playerB.set('essentials.pit-status', 'TRACK');
    }
  }

  private onPlayerRenameHandler(packet: IS_CPR): void {
    const player = this.akairo.players.getByUniqueId(packet.UCID);

    if (player) {
      player.playerName = packet.PName;
      player.set('essentials.plate', packet.Plate);
    }
  }

  private onCarMovementHandler(packet: IS_MCI): void {
    for (const info of packet.Info) {
      const player = this.akairo.players.getByPlayerId(info.PLID);

      if (player) {
        player.set('essentials.position.x', Math.floor(info.X / 65536));
        player.set('essentials.position.y', Math.floor(info.Y / 65536));
        player.set('essentials.position.z', Math.floor(info.Z / 65536));
        player.set('essentials.position.raw.x', info.X);
        player.set('essentials.position.raw.y', info.Y);
        player.set('essentials.position.raw.z', info.Z);
        player.set(
          'essentials.heading.angle',
          Math.floor(info.Heading / 256 + 128),
        );
        player.set('essentials.heading.raw', info.Heading);
        player.set('essentials.angle', Math.floor(info.AngVel / 16384));
        player.set('essentials.speed.mph', Math.floor(info.Speed / 146.486067));
        player.set('essentials.speed.kph', Math.floor(info.Speed / 91.02));
        player.set('essentials.lap', info.Lap);
      }
    }
  }
}
