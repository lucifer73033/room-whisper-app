
import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Pause, Upload } from 'lucide-react';
import { VideoMessage } from '@/services/WebSocketService';

interface VideoPlayerProps {
  roomId: string;
  username: string;
  onVideoUpdate: (state: boolean, timestamp: number) => void;
  videoMessageHandler: React.MutableRefObject<((message: VideoMessage) => void) | null>;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ roomId, username, onVideoUpdate, videoMessageHandler }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUpdatingFromRemote, setIsUpdatingFromRemote] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isManualSeek, setIsManualSeek] = useState(false);

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

  const handleSeek = (seekTime: number) => {
    if (videoRef.current && !isUpdatingFromRemote) {
      setIsManualSeek(true);
      videoRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
      // Send sync message only for manual seeks
      onVideoUpdate(isPlaying, seekTime);
      setTimeout(() => setIsManualSeek(false), 100);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && !isUpdatingFromRemote && !isManualSeek) {
      setCurrentTime(videoRef.current.currentTime);
      // Don't send sync messages during normal playback
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const syncWithRemote = (message: VideoMessage) => {
    if (!videoRef.current || message.userUUID === username) {
      console.log('Ignoring message from self:', message.userUUID);
      return;
    }

    setIsUpdatingFromRemote(true);
    
    const receivedTime = new Date(message.senderTime).getTime();
    const currentTime = Date.now();
    const timeDifference = (currentTime - receivedTime) / 1000;
    
    const targetTime = parseFloat(message.timestamp) + timeDifference;
    const shouldPlay = message.state === 'true';

    console.log('Syncing video:', {
      receivedTime: message.senderTime,
      timeDifference,
      targetTime,
      shouldPlay,
      currentlyPlaying: !videoRef.current.paused
    });

    videoRef.current.currentTime = Math.max(0, targetTime);
    setCurrentTime(Math.max(0, targetTime));
    
    if (shouldPlay && videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else if (!shouldPlay && !videoRef.current.paused) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else if (shouldPlay) {
      setIsPlaying(true);
    }

    setTimeout(() => setIsUpdatingFromRemote(false), 100);
  };

  useEffect(() => {
    videoMessageHandler.current = syncWithRemote;
  }, [videoMessageHandler, username]);

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
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                controls={false}
              />
              
              {/* Custom video controls */}
              <div className="space-y-3">
                {/* Progress bar */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>{formatTime(currentTime)}</span>
                  <div className="flex-1 relative">
                    <input
                      type="range"
                      min={0}
                      max={duration || 0}
                      value={currentTime}
                      onChange={(e) => handleSeek(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / duration) * 100}%, #e5e7eb ${(currentTime / duration) * 100}%, #e5e7eb 100%)`
                      }}
                    />
                  </div>
                  <span>{formatTime(duration)}</span>
                </div>
                
                {/* Control buttons */}
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
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default VideoPlayer;
