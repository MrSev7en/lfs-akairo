import type { Button } from '#classes/button';
import { Player } from '#classes/player';
import type { Akairo } from '#core/akairo';

interface ButtonEntry {
  instance: Button;
  timestamp: number;
}

export class Tags {
  private maxId = 240;
  private instances = new Map<string, ButtonEntry>();

  public constructor(public readonly akairo: Akairo) {}

  public getId(instance: Button): number {
    const player = instance.player();

    for (let id = 0; id < this.maxId; id++) {
      const key = this.createKey(player, id);

      if (!this.instances.has(key)) {
        this.instances.set(key, this.createEntry(instance));
        return id;
      }
    }

    const oldestEntry = this.findOldestEntry(player);

    if (oldestEntry) {
      oldestEntry.entry.instance.destroy();
      this.instances.delete(oldestEntry.key);

      const readOldestEntry = this.readKey(oldestEntry.key);
      const newKey = this.createKey(player, readOldestEntry.buttonId);
      this.instances.set(newKey, this.createEntry(instance));

      return readOldestEntry.buttonId;
    }

    return -1;
  }

  public releaseUniqueId(player: Player, id: number): void {
    const key = this.createKey(player, id);
    this.instances.delete(key);
  }

  public releaseAllUniqueIds(player: Player): void {
    const targetPlayer = this.parsePlayer(player);

    for (const [key] of this.instances) {
      const read = this.readKey(key);

      if (read.playerUserName === targetPlayer) {
        this.instances.delete(key);
      }
    }
  }

  private createKey(player: Player, id: number) {
    return [this.parsePlayer(player), id].join(':');
  }

  private readKey(key: string) {
    const split = String(key).split(':');
    const exists = !!split.length;
    const playerUserName = exists ? split[0] : '';
    const buttonId = exists && !Number.isNaN(split[1]) ? Number(split[1]) : 0;

    return { playerUserName, buttonId };
  }

  private parsePlayer(player: Player): string {
    return player instanceof Player && player.userName
      ? player.userName
      : null!;
  }

  private createEntry(instance: Button): ButtonEntry {
    return { instance, timestamp: Date.now() };
  }

  private findOldestEntry(player: Player): {
    key: string;
    entry: ButtonEntry;
  } | null {
    const targetPlayer = this.parsePlayer(player);
    let oldest: { key: string; entry: ButtonEntry } | null = null;

    for (const [key, entry] of this.instances) {
      const read = this.readKey(key);

      if (read.playerUserName === targetPlayer) {
        if (!oldest || entry.timestamp < oldest.entry.timestamp) {
          oldest = { key, entry };
        }
      }
    }

    return oldest;
  }
}
