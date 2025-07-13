import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Send, Users, Wifi, WifiOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import WebSocketService, { ChatMessage, VideoMessage } from '@/services/WebSocketService';
import VideoPlayer from '@/components/VideoPlayer';

const ChatRoom = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { username, isAuthenticated, getAuthHeader } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const videoMessageHandlerRef = useRef<((message: VideoMessage) => void) | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }

    const connectWebSocket = async () => {
      try {
        setIsConnecting(true);
        await WebSocketService.connect(getAuthHeader());
        setIsConnected(true);

        // Subscribe to chat messages
        WebSocketService.subscribeToChat(roomId!, (message) => {
          setMessages(prev => [...prev, message]);
        });

        // Subscribe to video updates
        WebSocketService.subscribeToVideo(roomId!, (videoData) => {
          console.log('Video update received:', videoData);
          if (videoMessageHandlerRef.current) {
            videoMessageHandlerRef.current(videoData);
          }
        });

        toast({
          title: "Connected",
          description: `Successfully joined room ${roomId}`,
        });
      } catch (error) {
        console.error('WebSocket connection error:', error);
        setIsConnected(false);
        toast({
          title: "Connection Error",
          description: "Failed to connect to chat room. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsConnecting(false);
      }
    };

    connectWebSocket();

    return () => {
      WebSocketService.disconnect();
    };
  }, [roomId, isAuthenticated, getAuthHeader, navigate, toast]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !isConnected) {
      return;
    }

    try {
      WebSocketService.sendMessage(roomId!, newMessage.trim(), username!);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleVideoUpdate = (state: boolean, timestamp: number) => {
    try {
      WebSocketService.sendVideoUpdate(roomId!, state, timestamp, username!);
    } catch (error) {
      console.error('Error sending video update:', error);
      toast({
        title: "Error",
        description: "Failed to sync video. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleLeaveRoom = () => {
    WebSocketService.disconnect();
    navigate('/dashboard');
  };

  if (isConnecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-96 shadow-lg">
          <CardContent className="p-6 text-center">
            <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Connecting to room {roomId}...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleLeaveRoom}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <h1 className="font-semibold">Room {roomId}</h1>
                  <p className="text-sm text-gray-600">Chat & Video Room</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <div className="flex items-center gap-1 text-green-600 text-sm">
                  <Wifi className="h-4 w-4" />
                  Connected
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-600 text-sm">
                  <WifiOff className="h-4 w-4" />
                  Disconnected
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-4 py-4 flex flex-col max-w-4xl">
        {/* Video Player */}
        <VideoPlayer
          roomId={roomId!}
          username={username!}
          onVideoUpdate={handleVideoUpdate}
          videoMessageHandler={videoMessageHandlerRef}
        />

        {/* Chat Messages */}
        <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-lg shadow-lg border-0 mb-4 flex flex-col">
          <div className="flex-1 p-4 overflow-y-auto max-h-[calc(100vh-400px)]">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.userUUID === username ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.userUUID === username
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      {message.userUUID !== username && (
                        <p className="text-xs opacity-75 mb-1">{message.userUUID}</p>
                      )}
                      <p className="text-sm">{message.message}</p>
                      <p className="text-xs opacity-75 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Message Input */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4">
            <form onSubmit={sendMessage} className="flex gap-2">
              <Input
                type="text"
                placeholder={isConnected ? "Type your message..." : "Connecting..."}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={!isConnected}
                className="flex-1 transition-all duration-200 focus:ring-2 focus:ring-blue-500"
              />
              <Button 
                type="submit" 
                disabled={!isConnected || !newMessage.trim()}
                className="bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChatRoom;
