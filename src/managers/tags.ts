import type { Button } from '#classes/button';
import type { Akairo } from '#core/akairo';

export class Tags {
  private maxId = 240;
  public instances = new Map<string, Button>();

  public constructor(public readonly akairo: Akairo) {}

  public getUniqueId(instance: Button): number {
    for (let id = 0; id < this.maxId; id++) {
      const key = `${instance.playerId ?? null}:${id}`;

      if (!this.instances.has(key)) {
        this.instances.set(key, instance);
        return id;
      }
    }

    const oldestId = [...this.instances.keys()]
      .map((key) => key.split(':').map(Number))
      .sort((a, b) => a[1] - b[1])[0];

    const oldestKey = `${oldestId[0]}:${oldestId[1]}`;
    const oldestInstance = this.instances.get(oldestKey);

    if (oldestInstance) {
      oldestInstance.destroy();
      this.instances.delete(oldestKey);
    }

    const newKey = `${instance.playerId ?? null}:${oldestId[1]}`;
    this.instances.set(newKey, instance);
    return oldestId[1];
  }

  public releaseUniqueId(playerId: number, id: number): void {
    const key = `${playerId ?? null}:${id}`;

    if (this.instances.has(key)) {
      this.instances.delete(key);
    }
  }
}
