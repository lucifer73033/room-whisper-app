import { Client } from '@stomp/stompjs';

export interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: Date;
  userUUID: string;
}

export interface VideoMessage {
  state: string;
  timestamp: string;
  senderTime: string;
  userUUID: string;
}

class WebSocketService {
  private client: Client | null = null;
  private isConnected: boolean = false;

  connect(authHeader: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.client = new Client({
          brokerURL: 'ws://localhost:8080/Lectra',
          connectHeaders: {
            'Authorization': authHeader
          },
          debug: (str) => {
            console.log('STOMP Debug:', str);
          },
          onConnect: () => {
            console.log('WebSocket connected');
            this.isConnected = true;
            resolve();
          },
          onStompError: (frame) => {
            console.error('STOMP error:', frame);
            this.isConnected = false;
            reject(new Error('WebSocket connection failed'));
          },
          onWebSocketError: (error) => {
            console.error('WebSocket error:', error);
            this.isConnected = false;
            reject(error);
          },
          onDisconnect: () => {
            console.log('WebSocket disconnected');
            this.isConnected = false;
          }
        });

        this.client.activate();
      } catch (error) {
        console.error('Error connecting to WebSocket:', error);
        reject(error);
      }
    });
  }

  subscribeToChat(roomId: string, onMessage: (message: ChatMessage) => void) {
    if (!this.client || !this.isConnected) {
      throw new Error('WebSocket not connected');
    }

    return this.client.subscribe(`/topic/room/chat/${roomId}`, (message) => {
      try {
        const receivedData = JSON.parse(message.body);
        console.log('Received chat data:', receivedData);
        
        const chatMessage: ChatMessage = {
          id: receivedData.id || Date.now().toString(),
          username: receivedData.userUUID || receivedData.username || 'Unknown',
          message: receivedData.payload || receivedData.message || '',
          timestamp: new Date(receivedData.timestamp || Date.now()),
          userUUID: receivedData.userUUID || receivedData.username || 'Unknown'
        };
        
        onMessage(chatMessage);
      } catch (error) {
        console.error('Error parsing chat message:', error);
      }
    });
  }

  subscribeToVideo(roomId: string, onVideoUpdate: (data: VideoMessage) => void) {
    if (!this.client || !this.isConnected) {
      throw new Error('WebSocket not connected');
    }

    return this.client.subscribe(`/topic/room/video/${roomId}`, (message) => {
      try {
        const videoData = JSON.parse(message.body);
        console.log('Received video data:', videoData);
        onVideoUpdate(videoData);
      } catch (error) {
        console.error('Error parsing video message:', error);
      }
    });
  }

  sendMessage(roomId: string, message: string, username: string) {
    if (!this.client || !this.isConnected) {
      throw new Error('WebSocket not connected');
    }

    this.client.publish({
      destination: `/app/room/chat/${roomId}`,
      body: JSON.stringify({ 
        purpose: 'chat', 
        payload: message,
        userUUID: username
      })
    });
  }

  sendVideoUpdate(roomId: string, state: boolean, timestamp: number, username: string) {
    if (!this.client || !this.isConnected) {
      throw new Error('WebSocket not connected');
    }

    const videoMessage = {
      state: state.toString(),
      timestamp: timestamp.toString(),
      senderTime: new Date().toISOString(),
      userUUID: username
    };

    console.log('Sending video update:', videoMessage);

    this.client.publish({
      destination: `/app/room/video/${roomId}`,
      body: JSON.stringify(videoMessage)
    });
  }

  disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
      this.isConnected = false;
    }
  }

  isWebSocketConnected(): boolean {
    return this.isConnected;
  }
}

export default new WebSocketService();
