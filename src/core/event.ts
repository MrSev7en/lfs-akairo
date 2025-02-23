import { Player } from '#classes/player';
import type { Akairo } from '#core/akairo';
import type { PitStatus } from '#types/player';
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
  public constructor(
    public readonly akairo: Akairo,
    exclude?: BindingPackets[],
    callback?: () => void,
  ) {
    if (!exclude?.includes(PacketType.ISP_NCN)) {
      this.akairo.insim.addListener(PacketType.ISP_NCN, (packet) =>
        this.onPlayerConnectHandler(packet),
      );
    }

    if (!exclude?.includes(PacketType.ISP_NCI)) {
      this.akairo.insim.addListener(PacketType.ISP_NCI, (packet) =>
        this.onPlayerDetailsHandler(packet),
      );
    }

    if (!exclude?.includes(PacketType.ISP_CNL)) {
      this.akairo.insim.addListener(PacketType.ISP_CNL, (packet) =>
        this.onPlayerLeftHandler(packet),
      );
    }

    if (!exclude?.includes(PacketType.ISP_NPL)) {
      this.akairo.insim.addListener(PacketType.ISP_NPL, (packet) =>
        this.onPlayerTrackHandler(packet),
      );
    }

    if (!exclude?.includes(PacketType.ISP_PLP)) {
      this.akairo.insim.addListener(PacketType.ISP_PLP, (packet) =>
        this.onPlayerPitHandler(packet),
      );
    }

    if (!exclude?.includes(PacketType.ISP_PLL)) {
      this.akairo.insim.addListener(PacketType.ISP_PLL, (packet) =>
        this.onPlayerSpectateHandler(packet),
      );
    }

    if (!exclude?.includes(PacketType.ISP_TOC)) {
      this.akairo.insim.addListener(PacketType.ISP_TOC, (packet) =>
        this.onPlayerChangeHandler(packet),
      );
    }

    if (!exclude?.includes(PacketType.ISP_CPR)) {
      this.akairo.insim.addListener(PacketType.ISP_CPR, (packet) =>
        this.onPlayerRenameHandler(packet),
      );
    }

    if (!exclude?.includes(PacketType.ISP_MCI)) {
      this.akairo.insim.addListener(PacketType.ISP_MCI, (packet) =>
        this.onCarMovementHandler(packet),
      );
    }

    logger.info('Event listener was successfully load.');
    setTimeout(() => callback?.(), 0);
  }

  private onPlayerConnectHandler(packet: IS_NCN): void {
    const exists = this.akairo.players.getByUniqueId(packet.UCID);

    if (!exists && packet.UName) {
      const player = new Player(this.akairo);

      player.uniqueId = packet.UCID;
      player.playerId = null as never;
      player.userName = packet.UName;
      player.playerName = packet.PName;
      player.isAdministrator = !!packet.Admin;
      player.gameLanguage = null as never;
      player.isReady = false;

      this.akairo.players.list.push(player);
    }
  }

  private onPlayerDetailsHandler(packet: IS_NCI): void {
    const player = this.akairo.players.getByUniqueId(packet.UCID);

    if (player) {
      player.gameLanguage = packet.Language;
      player.isReady = true;
      player
        .set('essentials.ip', packet.IPAddress)
        .set('essentials.license', packet.License);
    }
  }

  private onPlayerLeftHandler(packet: IS_CNL): void {
    const index = this.akairo.players.list.findIndex(
      (player) =>
        typeof player.uniqueId === 'number' &&
        player.uniqueId > 0 &&
        player.uniqueId === packet.UCID,
    );

    if (index !== -1) {
      this.akairo.tags.releaseAllUniqueIds(
        this.akairo.players.list[index].uniqueId,
      );

      this.akairo.players.list.splice(index, 1);
    }
  }

  private onPlayerTrackHandler(packet: IS_NPL): void {
    const player = this.akairo.players.getByUniqueId(packet.UCID);

    if (player) {
      player.playerId = packet.PLID;
      player
        .set('essentials.plate', packet.Plate)
        .set('essentials.player-type', packet.PType)
        .set('essentials.player-flags', packet.Flags)
        .set('essentials.car-name', packet.CName)
        .set('essentials.skin-name', packet.SName)
        .set('essentials.tyre-frontal-left', packet.TyreFL)
        .set('essentials.tyre-frontal-right', packet.TyreFR)
        .set('essentials.tyre-rear-left', packet.TyreRL)
        .set('essentials.tyre-rear-right', packet.TyreRR)
        .set('essentials.added-mass', packet.H_Mass)
        .set('essentials.intake-restriction', packet.H_TRes)
        .set('essentials.model', packet.Model)
        .set('essentials.passenger-flags', packet.Pass)
        .set('essentials.frontal-wheels-adjustment', packet.FWAdj)
        .set('essentials.rear-wheels-adjustment', packet.RWAdj)
        .set('essentials.race-number', packet.NumP)
        .set('essentials.car-configuration', packet.Config)
        .set('essentials.fuel', packet.Fuel)
        .set<PitStatus>('essentials.pit-status', 'TRACK');
    }
  }

  private onPlayerPitHandler(packet: IS_PLP): void {
    const player = this.akairo.players.getByPlayerId(packet.PLID);

    if (player) {
      player.playerId = null as never;
      player.set<PitStatus>('essentials.pit-status', 'PIT');
    }
  }

  private onPlayerSpectateHandler(packet: IS_PLL): void {
    const player = this.akairo.players.getByPlayerId(packet.PLID);

    if (player) {
      player.playerId = null as never;
      player.set<PitStatus>('essentials.pit-status', 'SPECTATE');
    }
  }

  private onPlayerChangeHandler(packet: IS_TOC): void {
    const player = this.akairo.players.getByUniqueId(packet.OldUCID);

    if (player) {
      player.uniqueId = packet.NewUCID;
      player.playerId = packet.PLID;
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
        player
          .set('essentials.position.x', Math.floor(info.X / 65536))
          .set('essentials.position.y', Math.floor(info.Y / 65536))
          .set('essentials.position.z', Math.floor(info.Z / 65536))
          .set('essentials.position.raw.x', info.X)
          .set('essentials.position.raw.y', info.Y)
          .set('essentials.position.raw.z', info.Z)
          .set('essentials.heading.angle', Math.floor(info.Heading / 256 + 128))
          .set('essentials.heading.raw', info.Heading)
          .set('essentials.angle', Math.floor(info.AngVel / 16384))
          .set('essentials.speed.mph', Math.floor(info.Speed / 146.486067))
          .set('essentials.speed.kph', Math.floor(info.Speed / 91.02))
          .set('essentials.lap', info.Lap);
      }
    }
  }
}
