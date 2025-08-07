
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { VideoCall } from '@/components/VideoCall';
import { RoomSetup } from '@/components/RoomSetup';
import { trpc } from '@/utils/trpc';
import type { RoomStatus } from '../../server/src/schema';

// WebRTC configuration with Google STUN server
const rtcConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};

interface CallState {
  isInCall: boolean;
  isConnecting: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peerConnection: RTCPeerConnection | null;
  currentRoom: RoomStatus | null;
}

function App() {
  // User and room state
  const [userId, setUserId] = useState<string>('');
  const [roomId, setRoomId] = useState<string>('');
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Call state
  const [callState, setCallState] = useState<CallState>({
    isInCall: false,
    isConnecting: false,
    localStream: null,
    remoteStream: null,
    peerConnection: null,
    currentRoom: null
  });

  // Component state
  const [showRoomSetup, setShowRoomSetup] = useState(true);

  // Refs for cleanup
  const signalingIntervalRef = useRef<number | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Cleanup call resources
  const cleanupCall = useCallback(() => {
    // Stop local stream
    if (callState.localStream) {
      callState.localStream.getTracks().forEach(track => track.stop());
    }

    // Close peer connection
    if (callState.peerConnection) {
      callState.peerConnection.close();
    }

    // Clear signaling interval
    if (signalingIntervalRef.current) {
      window.clearInterval(signalingIntervalRef.current);
      signalingIntervalRef.current = null;
    }

    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  }, [callState.localStream, callState.peerConnection]);

  // Clear messages after timeout
  useEffect(() => {
    if (error || success) {
      const timer = window.setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => window.clearTimeout(timer);
    }
  }, [error, success]);

  // Initialize user ID on component mount
  useEffect(() => {
    if (!userId) {
      setUserId(`user-${Math.random().toString(36).substr(2, 9)}`);
    }
  }, [userId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupCall();
    };
  }, [cleanupCall]);

  // Create a new room
  const handleCreateRoom = async (maxParticipants: number) => {
    try {
      setError(null);
      const room = await trpc.createRoom.mutate({ 
        maxParticipants 
      });
      
      setRoomId(room.id);
      setSuccess(`Room created! Room ID: ${room.id}`);
      setShowRoomSetup(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
    }
  };

  // Join an existing room
  const handleJoinRoom = async (targetRoomId: string, targetUserId: string) => {
    if (!targetRoomId.trim() || !targetUserId.trim()) {
      setError('Please enter both Room ID and User ID');
      return;
    }

    setIsJoiningRoom(true);
    setError(null);

    try {
      // Join the room via tRPC
      const response = await trpc.joinRoom.mutate({
        roomId: targetRoomId.trim(),
        userId: targetUserId.trim()
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to join room');
      }

      // Update state
      setRoomId(targetRoomId.trim());
      setUserId(targetUserId.trim());
      setCallState(prev => ({ ...prev, currentRoom: response.roomStatus || null }));
      setSuccess(`Successfully joined room: ${targetRoomId}`);
      setShowRoomSetup(false);

      // Start listening for other participants
      startSignalingLoop(targetRoomId.trim(), targetUserId.trim());

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setIsJoiningRoom(false);
    }
  };

  // Start listening for signaling messages (simplified polling approach)
  const startSignalingLoop = useCallback((currentRoomId: string, currentUserId: string) => {
    // In a real implementation, this would use WebSockets
    // For now, we'll use polling to check room status
    if (signalingIntervalRef.current) {
      window.clearInterval(signalingIntervalRef.current);
    }

    signalingIntervalRef.current = window.setInterval(async () => {
      try {
        const roomStatus = await trpc.getRoomStatus.query(currentRoomId);
        if (roomStatus) {
          setCallState(prev => ({ ...prev, currentRoom: roomStatus }));
          
          // If there are 2 participants and we're not in a call, initiate call
          if (roomStatus.participantCount === 2 && !callState.isInCall && !callState.isConnecting) {
            // Determine who should initiate (e.g., user who joined second)
            const otherUser = roomStatus.participants.find(p => p.userId !== currentUserId);
            if (otherUser && otherUser.joinedAt > new Date(Date.now() - 5000)) {
              // Other user joined recently, they should initiate
              console.log('Waiting for call initiation from other user');
            }
          }
        }
      } catch (err) {
        console.error('Failed to poll room status:', err);
      }
    }, 2000);
  }, [callState.isInCall, callState.isConnecting]);

  // Initialize WebRTC call
  const startCall = async () => {
    if (!roomId || !userId) {
      setError('Please join a room first');
      return;
    }

    setCallState(prev => ({ ...prev, isConnecting: true }));
    setError(null);

    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      // Create peer connection
      const peerConnection = new RTCPeerConnection(rtcConfiguration);

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log('Received remote stream');
        setCallState(prev => ({ 
          ...prev, 
          remoteStream: event.streams[0] 
        }));
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
          try {
            await trpc.sendSignalingMessage.mutate({
              type: 'ice-candidate',
              payload: {
                candidate: event.candidate.candidate,
                sdpMid: event.candidate.sdpMid,
                sdpMLineIndex: event.candidate.sdpMLineIndex,
                usernameFragment: event.candidate.usernameFragment
              },
              fromUserId: userId,
              roomId: roomId
            });
          } catch (err) {
            console.error('Failed to send ICE candidate:', err);
          }
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
          setCallState(prev => ({ 
            ...prev, 
            isConnecting: false, 
            isInCall: true 
          }));
          setSuccess('Call connected!');
        } else if (peerConnection.connectionState === 'failed') {
          setError('Call connection failed');
          endCall();
        }
      };

      // Create and send offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      await trpc.sendSignalingMessage.mutate({
        type: 'offer',
        payload: {
          type: 'offer',
          sdp: offer.sdp!
        },
        fromUserId: userId,
        roomId: roomId
      });

      // Update state
      setCallState(prev => ({
        ...prev,
        localStream: stream,
        peerConnection: peerConnection,
        isConnecting: true
      }));

      // Display local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start call');
      setCallState(prev => ({ 
        ...prev, 
        isConnecting: false 
      }));
    }
  };

  // End the current call
  const endCall = useCallback(() => {
    cleanupCall();
    setCallState(prev => ({
      isInCall: false,
      isConnecting: false,
      localStream: null,
      remoteStream: null,
      peerConnection: null,
      currentRoom: prev.currentRoom
    }));
    setSuccess('Call ended');
  }, [cleanupCall]);

  // Leave room
  const leaveRoom = async () => {
    try {
      await trpc.leaveRoom.mutate({
        roomId: roomId,
        userId: userId
      });
      
      cleanupCall();
      setCallState({
        isInCall: false,
        isConnecting: false,
        localStream: null,
        remoteStream: null,
        peerConnection: null,
        currentRoom: null
      });
      setRoomId('');
      setShowRoomSetup(true);
      setSuccess('Left room successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave room');
    }
  };

  // Display video component with local and remote streams
  useEffect(() => {
    if (localVideoRef.current && callState.localStream) {
      localVideoRef.current.srcObject = callState.localStream;
    }
    if (remoteVideoRef.current && callState.remoteStream) {
      remoteVideoRef.current.srcObject = callState.remoteStream;
    }
  }, [callState.localStream, callState.remoteStream]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🎥 WebRTC Video Calling
          </h1>
          <p className="text-lg text-gray-600">
            Peer-to-peer video calls with real-time communication
          </p>
        </div>

        {/* Status Messages */}
        {error && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              ❌ {error}
            </AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">
              ✅ {success}
            </AlertDescription>
          </Alert>
        )}

        {/* Room Setup */}
        {showRoomSetup && (
          <RoomSetup
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            isJoining={isJoiningRoom}
            userId={userId}
            onUserIdChange={setUserId}
          />
        )}

        {/* Room Info */}
        {!showRoomSetup && callState.currentRoom && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📱 Room: {callState.currentRoom.roomId}
                <Badge variant="secondary">
                  {callState.currentRoom.participantCount}/{callState.currentRoom.maxParticipants}
                </Badge>
              </CardTitle>
              <CardDescription>
                User ID: {userId}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <Button
                  onClick={startCall}
                  disabled={callState.isInCall || callState.isConnecting || callState.currentRoom.participantCount < 2}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {callState.isConnecting ? '🔄 Connecting...' : '📞 Start Call'}
                </Button>
                
                <Button
                  onClick={endCall}
                  disabled={!callState.isInCall && !callState.isConnecting}
                  variant="destructive"
                >
                  📱 End Call
                </Button>

                <Button
                  onClick={leaveRoom}
                  variant="outline"
                >
                  🚪 Leave Room
                </Button>
              </div>

              {callState.currentRoom.participantCount < 2 && (
                <p className="text-sm text-gray-600">
                  ⏳ Waiting for another participant to join the room...
                </p>
              )}

              <Separator className="my-4" />
              
              <div>
                <h4 className="font-medium mb-2">Participants:</h4>
                <div className="space-y-1">
                  {callState.currentRoom.participants.map((participant) => (
                    <div key={participant.userId} className="flex items-center gap-2 text-sm">
                      <div className={`w-2 h-2 rounded-full ${participant.isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {participant.userId} {participant.userId === userId && '(You)'}
                      <span className="text-gray-500">
                        joined {participant.joinedAt.toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Video Call Interface */}
        {!showRoomSetup && (
          <VideoCall
            localVideoRef={localVideoRef}
            remoteVideoRef={remoteVideoRef}
            callState={callState}
          />
        )}

        {/* Setup Instructions */}
        <Card className="mt-8 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">🔧 Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 space-y-2">
            <p>• For camera access, ensure you're running on HTTPS (use localhost with SSL certificate)</p>
            <p>• Grant camera and microphone permissions when prompted</p>
            <p>• Share the Room ID with another user to start a video call</p>
            <p>• Maximum 2 participants per room for peer-to-peer connection</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default App;
