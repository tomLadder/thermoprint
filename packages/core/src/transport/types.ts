export interface BlePeripheral {
  id: string;
  name: string;
  rssi: number;
}

export interface ScanOptions {
  timeoutMs?: number;
  namePrefix?: string;
}

export interface ScanHandle {
  stop(): Promise<void>;
}

export interface BleTransport {
  scan(
    onDiscover: (peripheral: BlePeripheral) => void,
    options?: ScanOptions,
  ): Promise<ScanHandle>;
  connect(peripheral: BlePeripheral): Promise<BleConnection>;
}

export interface BleConnection {
  discoverService(uuid: string): Promise<BleService | null>;
  disconnect(): Promise<void>;
  readonly isConnected: boolean;
  onDisconnect?(callback: () => void): void;
}

export interface BleService {
  getCharacteristic(uuid: string): Promise<BleCharacteristic | null>;
}

export interface BleCharacteristic {
  write(data: Uint8Array, withoutResponse: boolean): Promise<void>;
  subscribe(listener: (data: Uint8Array) => void): Promise<void>;
  unsubscribe(): Promise<void>;
}
