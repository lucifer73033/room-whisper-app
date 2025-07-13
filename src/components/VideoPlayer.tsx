
import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Pause, Upload } from 'lucide-react';
import { VideoMessage } from '@/services/WebSocketService';

interface VideoPlayerProps {
  roomId: string;
  onVideoUpdate: (state: boolean, timestamp: number) => void;
  onVideoMessage: (message: VideoMessage) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ roomId, onVideoUpdate, onVideoMessage }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUpdatingFromRemote, setIsUpdatingFromRemote] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
    }
  };

  const handlePlay = () => {
    if (videoRef.current && !isUpdatingFromRemote) {
      videoRef.current.play();
      setIsPlaying(true);
      onVideoUpdate(true, videoRef.current.currentTime);
    }
  };

  const handlePause = () => {
    if (videoRef.current && !isUpdatingFromRemote) {
      videoRef.current.pause();
      setIsPlaying(false);
      onVideoUpdate(false, videoRef.current.currentTime);
    }
  };

  const handleSeek = () => {
    if (videoRef.current && !isUpdatingFromRemote) {
      onVideoUpdate(isPlaying, videoRef.current.currentTime);
    }
  };

  const syncWithRemote = (message: VideoMessage) => {
    if (!videoRef.current) return;

    setIsUpdatingFromRemote(true);
    
    const receivedTime = new Date(message.senderTime).getTime();
    const currentTime = Date.now();
    const timeDifference = (currentTime - receivedTime) / 1000; // Convert to seconds
    
    const targetTime = parseFloat(message.timestamp) + timeDifference;
    const shouldPlay = message.state === 'true';

    console.log('Syncing video:', {
      receivedTime: message.senderTime,
      timeDifference,
      targetTime,
      shouldPlay
    });

    videoRef.current.currentTime = Math.max(0, targetTime);
    
    if (shouldPlay && videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else if (!shouldPlay && !videoRef.current.paused) {
      videoRef.current.pause();
      setIsPlaying(false);
    }

    setTimeout(() => setIsUpdatingFromRemote(false), 100);
  };

  useEffect(() => {
    onVideoMessage(syncWithRemote);
  }, [onVideoMessage]);

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="space-y-4">
          {!videoSrc ? (
            <div className="text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload Video
              </Button>
              <p className="text-sm text-gray-500 mt-2">
                Upload a video to start synchronized playback
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <video
                ref={videoRef}
                src={videoSrc}
                className="w-full rounded-lg"
                onPlay={handlePlay}
                onPause={handlePause}
                onSeeked={handleSeek}
                onTimeUpdate={handleSeek}
                controls={false}
              />
              <div className="flex items-center justify-center gap-3">
                <Button
                  onClick={isPlaying ? handlePause : handlePlay}
                  variant="outline"
                  size="sm"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  size="sm"
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default VideoPlayer;
