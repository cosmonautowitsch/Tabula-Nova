// src/lib/obsidian.ts

export interface NoteMeta {
  path: string;
  name: string;
}

export interface NoteContent {
  path: string;
  content: string;
}

export type VaultBridgeMessage =
  | { type: 'notes'; payload: NoteMeta[] }
  | { type: 'noteContent'; payload: NoteContent }
  | { type: 'noteCreated', payload: NoteMeta }
  | { type: 'noteUpdated', payload: NoteMeta };

type ActionRequest =
  | { action: 'getNotes' }
  | { action: 'readNote'; data: { path: string } }
  | { action: 'createNote'; data: { path: string, content: string } }
  | { action: 'updateNote'; data: { path: string, content: string } };

type MessageCallback = (msg: VaultBridgeMessage) => void;

export class VaultBridgeClient {
  private ws: WebSocket | null = null;
  private isReady: boolean = false;
  private messageQueue: ActionRequest[] = [];
  private onMessage: MessageCallback | null = null;
  private onConnectionStatusChange: ((status: 'connecting' | 'connected' | 'disconnected' | 'error') => void) | null = null;

  constructor(url = 'ws://localhost:15715') {
    this.connect(url);
  }

  public connect(url = 'ws://localhost:15715') {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        return;
    }
    
    this.ws = new WebSocket(url);
    this.updateStatus('connecting');

    this.ws.onopen = () => {
      console.log('[VaultBridgeClient] Connected ✅');
      this.isReady = true;
      this.updateStatus('connected');
      this.messageQueue.forEach(msg => this.send(msg));
      this.messageQueue = [];
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (this.onMessage) this.onMessage(data);
    };

    this.ws.onerror = (err) => {
      console.warn('[VaultBridgeClient] WebSocket error:', err);
      this.updateStatus('error');
    };

    this.ws.onclose = () => {
      console.log('[VaultBridgeClient] Connection closed ❌');
      this.isReady = false;
      this.ws = null;
      this.updateStatus('disconnected');
    };
  }
  
  private updateStatus(status: 'connecting' | 'connected' | 'disconnected' | 'error') {
    if (this.onConnectionStatusChange) {
      this.onConnectionStatusChange(status);
    }
  }

  public onStatusChange(callback: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void) {
    this.onConnectionStatusChange = callback;
  }


  public send(msg: ActionRequest) {
    if (this.isReady && this.ws) {
      this.ws.send(JSON.stringify(msg));
    } else {
      this.messageQueue.push(msg);
    }
  }

  public fetchAllNotes() {
    this.send({ action: 'getNotes' });
  }

  public fetchNoteContent(path: string) {
    this.send({ action: 'readNote', data: { path } });
  }
  
  public createNote(path: string, content: string) {
    this.send({ action: 'createNote', data: { path, content } });
  }
  
  public updateNote(path: string, content: string) {
    this.send({ action: 'updateNote', data: { path, content } });
  }

  public onVaultMessage(callback: MessageCallback) {
    this.onMessage = callback;
  }

  public close() {
    if (this.ws) {
        this.ws.close();
    }
  }
}
