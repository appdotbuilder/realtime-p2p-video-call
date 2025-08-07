
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

interface RoomSetupProps {
  onCreateRoom: (maxParticipants: number) => Promise<void>;
  onJoinRoom: (roomId: string, userId: string) => Promise<void>;
  isJoining: boolean;
  userId: string;
  onUserIdChange: (userId: string) => void;
}

export function RoomSetup({ 
  onCreateRoom, 
  onJoinRoom, 
  isJoining, 
  userId, 
  onUserIdChange 
}: RoomSetupProps) {
  // Create room state
  const [maxParticipants, setMaxParticipants] = useState<number>(2);
  const [isCreating, setIsCreating] = useState(false);

  // Join room state
  const [joinRoomId, setJoinRoomId] = useState<string>('');

  const handleCreateRoom = async () => {
    setIsCreating(true);
    try {
      await onCreateRoom(maxParticipants);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    await onJoinRoom(joinRoomId, userId);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">🚀 Get Started</CardTitle>
          <CardDescription>
            Create a new room or join an existing one to start video calling
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* User ID Setup */}
          <div className="mb-6">
            <Label htmlFor="userId" className="text-sm font-medium">
              Your User ID
            </Label>
            <Input
              id="userId"
              type="text"
              value={userId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                onUserIdChange(e.target.value)
              }
              placeholder="Enter your user ID"
              className="mt-1"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              This identifies you in the room. Choose something memorable!
            </p>
          </div>

          <Separator className="my-6" />

          {/* Room Actions */}
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">🏠 Create Room</TabsTrigger>
              <TabsTrigger value="join">🔗 Join Room</TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-4">
              <div>
                <Label htmlFor="maxParticipants" className="text-sm font-medium">
                  Maximum Participants
                </Label>
                <Select
                  value={maxParticipants.toString()}
                  onValueChange={(value: string) => setMaxParticipants(parseInt(value))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 participants</SelectItem>
                    <SelectItem value="3">3 participants</SelectItem>
                    <SelectItem value="4">4 participants</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Note: Peer-to-peer works best with 2 participants
                </p>
              </div>

              <Button
                onClick={handleCreateRoom}
                disabled={isCreating || !userId.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isCreating ? '🔄 Creating Room...' : '🏠 Create New Room'}
              </Button>
            </TabsContent>

            <TabsContent value="join" className="space-y-4">
              <form onSubmit={handleJoinRoom} className="space-y-4">
                <div>
                  <Label htmlFor="roomId" className="text-sm font-medium">
                    Room ID
                  </Label>
                  <Input
                    id="roomId"
                    type="text"
                    value={joinRoomId}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      setJoinRoomId(e.target.value)
                    }
                    placeholder="Enter room ID (e.g., ABC12345)"
                    className="mt-1"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Get this from the person who created the room
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isJoining || !joinRoomId.trim() || !userId.trim()}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {isJoining ? '🔄 Joining Room...' : '🔗 Join Room'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <Separator className="my-6" />

          {/* Quick Tips */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">💡 Quick Tips:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Room IDs are automatically generated when you create a room</li>
              <li>• Share your Room ID with others to invite them</li>
              <li>• Make sure your User ID is unique in the room</li>
              <li>• Camera and microphone access will be requested when starting a call</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
