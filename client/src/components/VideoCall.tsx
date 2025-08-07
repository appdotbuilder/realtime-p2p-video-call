
import { RefObject } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { RoomStatus } from '../../../server/src/schema';

interface CallState {
  isInCall: boolean;
  isConnecting: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peerConnection: RTCPeerConnection | null;
  currentRoom: RoomStatus | null;
}

interface VideoCallProps {
  localVideoRef: RefObject<HTMLVideoElement | null>;
  remoteVideoRef: RefObject<HTMLVideoElement | null>;
  callState: CallState;
}

export function VideoCall({ localVideoRef, remoteVideoRef, callState }: VideoCallProps) {
  const getConnectionStatusBadge = () => {
    if (callState.isConnecting) {
      return <Badge className="bg-yellow-500">🔄 Connecting...</Badge>;
    } else if (callState.isInCall) {
      return <Badge className="bg-green-500">📞 Connected</Badge>;
    } else {
      return <Badge variant="secondary">📴 Not Connected</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            📹 Video Call
            {getConnectionStatusBadge()}
          </CardTitle>
          <CardDescription>
            {callState.isConnecting && 'Establishing connection...'}
            {callState.isInCall && 'Call is active'}
            {!callState.isConnecting && !callState.isInCall && 'Ready to start call'}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Video Streams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Local Video */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📷 Your Video</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              
              {!callState.localStream && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <div className="text-center text-gray-300">
                    <div className="text-4xl mb-2">📹</div>
                    <p className="text-sm">
                      {callState.isConnecting ? 'Starting camera...' : 'Camera not active'}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Local video indicator */}
              {callState.localStream && (
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-white text-xs">
                  You
                </div>
              )}
            </div>
            
            {/* Local stream info */}
            <div className="mt-2 text-sm text-gray-600">
              Status: {callState.localStream ? 
                `✅ Active (${callState.localStream.getTracks().length} tracks)` : 
                '❌ Inactive'
              }
            </div>
          </CardContent>
        </Card>

        {/* Remote Video */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">🎭 Remote Video</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              
              {!callState.remoteStream && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <div className="text-center text-gray-300">
                    <div className="text-4xl mb-2">👤</div>
                    <p className="text-sm">
                      {callState.isConnecting ? 'Waiting for remote video...' : 
                       callState.isInCall ? 'No remote video' : 
                       'Remote user not connected'}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Remote video indicator */}
              {callState.remoteStream && (
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-white text-xs">
                  Remote User
                </div>
              )}
            </div>
            
            {/* Remote stream info */}
            <div className="mt-2 text-sm text-gray-600">
              Status: {callState.remoteStream ? 
                `✅ Active (${callState.remoteStream.getTracks().length} tracks)` : 
                '❌ No remote stream'
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* WebRTC Connection Info */}
      {callState.peerConnection && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg text-blue-900">🔗 Connection Details</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Connection State:</strong> {callState.peerConnection.connectionState}
              </div>
              <div>
                <strong>ICE Connection:</strong> {callState.peerConnection.iceConnectionState}
              </div>
              <div>
                <strong>ICE Gathering:</strong> {callState.peerConnection.iceGatheringState}
              </div>
              <div>
                <strong>Signaling State:</strong> {callState.peerConnection.signalingState}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Troubleshooting */}
      {callState.isConnecting && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-900">⏳ Connection in Progress</CardTitle>
          </CardHeader>
          <CardContent className="text-yellow-800">
            <p className="mb-2">The call is connecting. This process involves:</p>
            <ul className="text-sm space-y-1 ml-4">
              <li>• Accessing camera and microphone</li>
              <li>• Establishing peer connection</li>
              <li>• Exchanging WebRTC offer/answer</li>
              <li>• Finding optimal network path (ICE negotiation)</li>
            </ul>
            <p className="text-sm mt-3">
              If connection takes too long, try refreshing the page or check your network connection.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
