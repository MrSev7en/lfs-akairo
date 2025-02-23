import type { Button } from '#classes/button';
import type { Akairo } from '#core/akairo';

interface ButtonEntry {
  instance: Button;
  timestamp: number;
}

export class Tags {
  private maxId = 240;
  private instances: Record<string, ButtonEntry> = {};

  public constructor(public readonly akairo: Akairo) {}

  public getUniqueId(instance: Button): number {
    const playerId = instance.playerId() ?? null;

    for (let id = 0; id < this.maxId; id++) {
      const key = this.createKey(playerId, id);

      if (!this.instances[key]) {
        this.instances[key] = this.createEntry(instance);
        return id;
      }
    }

    const oldestEntry = this.findOldestEntry(playerId);

    if (oldestEntry) {
      oldestEntry.entry.instance.destroy();
      delete this.instances[oldestEntry.key];

      const newKey = this.createKey(playerId, oldestEntry.id);
      this.instances[newKey] = this.createEntry(instance);

      return oldestEntry.id;
    }

    return -1;
  }

  public releaseUniqueId(playerId: number | null, id: number): void {
    const parsedPlayerId = this.parsePlayerId(playerId);
    const key = this.createKey(parsedPlayerId, id);

    if (this.instances[key]) {
      delete this.instances[key];
    }
  }

  public releaseAllUniqueIds(playerId: number | null): void {
    const parsedPlayerId = this.parsePlayerId(playerId);
    const prefix = `${parsedPlayerId}:`;

    Object.keys(this.instances).forEach((key) => {
      if (key.startsWith(prefix)) {
        delete this.instances[key];
      }
    });
  }

  private createKey(playerId: number | null, id: number): string {
    return `${playerId}:${id}`;
  }

  private parsePlayerId(playerId: number | null): number | null {
    return typeof playerId === 'number' && playerId >= 0 ? playerId : null;
  }

  private createEntry(instance: Button): ButtonEntry {
    return { instance, timestamp: Date.now() };
  }

  private findOldestEntry(playerId: number | null): {
    key: string;
    id: number;
    entry: ButtonEntry;
  } | null {
    const targetPlayer = playerId !== null ? String(playerId) : 'null';
    let oldest: {
      key: string;
      id: number;
      entry: ButtonEntry;
    } | null = null;

    Object.entries(this.instances).forEach(([key, entry]) => {
      const [storedPlayer, id] = key.split(':');

      if (storedPlayer === targetPlayer) {
        const numericId = Number.parseInt(id);

        if (!oldest || entry.timestamp < oldest.entry.timestamp) {
          oldest = { key, id: numericId, entry };
        }
      }
    });

    return oldest;
  }
}
