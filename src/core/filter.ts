import type { PacketType } from 'node-insim/packets';

interface PacketFilterCallbacks {
  onSuccess?: () => void;
  onFailed?: () => void;
}

class PacketFilter {
  private readonly packetTypes: PacketType[];
  private callbacks: PacketFilterCallbacks = {};

  constructor(packetTypes: PacketType[]) {
    this.packetTypes = [...packetTypes];
  }

  public onSuccess(callback: () => void): PacketFilter {
    this.callbacks.onSuccess = callback;
    return this;
  }

  public onFailed(callback: () => void): PacketFilter {
    this.callbacks.onFailed = callback;
    return this;
  }

  public filter(packetType: PacketType): void {
    const isPacketIncluded = this.packetTypes.includes(packetType);

    if (!isPacketIncluded && this.callbacks.onSuccess) {
      this.callbacks.onSuccess();
    } else if (isPacketIncluded && this.callbacks.onFailed) {
      this.callbacks.onFailed();
    }
  }
}

export const createPacketFilter = (packetTypes: PacketType[]): PacketFilter => {
  return new PacketFilter(packetTypes);
};
