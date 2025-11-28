
import { Peer } from 'peerjs';
import { OnlineMessage } from '../types';

export class PeerService {
  private peer: Peer;
  private conn: any;
  private onDataCallback: ((data: OnlineMessage) => void) | null = null;
  private onConnectCallback: (() => void) | null = null;

  constructor() {
    this.peer = new Peer({
      debug: 2
    } as any);

    this.peer.on('connection', (conn: any) => {
      this.conn = conn;
      this.setupConnection();
    });
  }

  public getMyId(): Promise<string> {
    return new Promise((resolve) => {
      if (this.peer.id) {
        resolve(this.peer.id);
      } else {
        this.peer.on('open', (id: string) => {
          resolve(id);
        });
      }
    });
  }

  public connect(peerId: string) {
    this.conn = this.peer.connect(peerId);
    this.setupConnection();
  }

  public send(data: OnlineMessage) {
    if (this.conn && this.conn.open) {
      this.conn.send(data);
    } else {
      console.warn("Connection not open");
    }
  }

  public onData(callback: (data: OnlineMessage) => void) {
    this.onDataCallback = callback;
  }

  public onConnect(callback: () => void) {
    this.onConnectCallback = callback;
  }

  private setupConnection() {
    this.conn.on('open', () => {
      console.log('Peer connection open');
      if (this.onConnectCallback) this.onConnectCallback();
    });

    this.conn.on('data', (data: any) => {
      if (this.onDataCallback) this.onDataCallback(data as OnlineMessage);
    });
    
    this.conn.on('error', (err: any) => console.error(err));
  }
}

export const peerService = new PeerService();
