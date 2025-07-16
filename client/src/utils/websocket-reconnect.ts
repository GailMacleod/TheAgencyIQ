/**
 * WebSocket Reconnection Service
 * Handles WebSocket connection failures and automatic reconnection
 */

interface WebSocketReconnectConfig {
  url: string;
  maxRetries: number;
  retryDelay: number;
  maxRetryDelay: number;
  onMessage?: (event: MessageEvent) => void;
  onOpen?: (event: Event) => void;
  onError?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
}

export class WebSocketReconnector {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private isReconnecting = false;
  private shouldReconnect = true;
  private config: WebSocketReconnectConfig;

  constructor(config: WebSocketReconnectConfig) {
    this.config = {
      maxRetries: 5,
      retryDelay: 1000,
      maxRetryDelay: 30000,
      ...config
    };
  }

  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      this.ws = new WebSocket(this.config.url);
      
      this.ws.onopen = (event) => {
        console.log('WebSocket connected successfully');
        this.reconnectAttempts = 0;
        this.isReconnecting = false;
        this.config.onOpen?.(event);
      };

      this.ws.onmessage = (event) => {
        this.config.onMessage?.(event);
      };

      this.ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        this.config.onError?.(event);
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        this.config.onClose?.(event);
        
        if (this.shouldReconnect && !this.isReconnecting) {
          this.scheduleReconnect();
        }
      };

    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxRetries) {
      console.error('Max WebSocket reconnection attempts reached');
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;
    
    const delay = Math.min(
      this.config.retryDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.config.maxRetryDelay
    );

    console.log(`Reconnecting WebSocket in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxRetries})`);
    
    this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect(): void {
    this.shouldReconnect = false;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(data: string | ArrayBuffer | Blob): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      console.warn('WebSocket not connected, cannot send data');
      // Optionally queue the message for sending once connected
    }
  }

  getState(): number {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }

  isConnected(): boolean {
    return this.ws ? this.ws.readyState === WebSocket.OPEN : false;
  }
}

// Global WebSocket reconnection service
let globalWebSocketReconnector: WebSocketReconnector | null = null;

export function initializeWebSocketReconnection(config: WebSocketReconnectConfig): WebSocketReconnector {
  if (globalWebSocketReconnector) {
    globalWebSocketReconnector.disconnect();
  }
  
  globalWebSocketReconnector = new WebSocketReconnector(config);
  return globalWebSocketReconnector;
}

export function getWebSocketReconnector(): WebSocketReconnector | null {
  return globalWebSocketReconnector;
}

// Auto-reconnect for development server connection
export function initializeDevServerReconnection(): void {
  if (process.env.NODE_ENV === 'development') {
    const wsUrl = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const devServerUrl = `${wsUrl}//${window.location.host}`;
    
    const reconnector = initializeWebSocketReconnection({
      url: devServerUrl,
      maxRetries: 10,
      retryDelay: 2000,
      onOpen: () => {
        console.log('Development server WebSocket connected');
      },
      onClose: (event) => {
        if (event.code !== 1000) { // Not a normal closure
          console.log('Development server disconnected, attempting reconnection...');
        }
      },
      onError: (event) => {
        console.warn('Development server WebSocket error, will reconnect');
      }
    });
    
    reconnector.connect();
  }
}