import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ParticipantProfilePreview } from "./ParticipantProfilePreview";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

export function ProfilePreviewDemo() {
  // Mock player data for demonstration
  const mockPlayers = [
    {
      id: 1,
      username: "ChessWiz2024",
      eloRating: 1650,
    },
    {
      id: 2,
      username: "KnightRider",
      eloRating: 1520,
    },
    {
      id: 3,
      username: "PawnStorm",
      eloRating: 1780,
    },
    {
      id: 4,
      username: "CheckMate",
      eloRating: 1430,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Tournament Participant Profiles
        </CardTitle>
        <CardDescription>
          Click on any participant to view their detailed profile preview
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {mockPlayers.map((player) => (
            <div key={player.id} className="p-4 border rounded-lg hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <ParticipantProfilePreview 
                  userId={player.id}
                  username={player.username}
                  eloRating={player.eloRating}
                  trigger={
                    <Button variant="ghost" className="h-auto p-0 justify-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold">
                            {player.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="text-left">
                          <div className="font-semibold hover:text-blue-600">{player.username}</div>
                          <div className="text-sm text-gray-600">{player.eloRating} ELO</div>
                        </div>
                      </div>
                    </Button>
                  }
                />
                <div className="text-sm text-gray-500">
                  Click to view profile
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold mb-2">Profile Preview Features:</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• <strong>Overview:</strong> Basic information, chess performance, contact details</li>
            <li>• <strong>Tournament History:</strong> Past tournament results and rankings</li>
            <li>• <strong>Recent Games:</strong> Latest game results with ELO changes</li>
            <li>• <strong>Statistics:</strong> Performance metrics and learning progress</li>
          </ul>
          <div className="mt-3 p-3 bg-yellow-50 border-l-4 border-yellow-400">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Profile previews are only available on desktop screens (768px+). 
              On mobile devices, participant names remain clickable but won't open detailed profiles 
              to preserve screen space during gameplay.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}