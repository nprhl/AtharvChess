import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, TrendingUp } from "lucide-react";

interface Standing {
  userId: number;
  username: string;
  eloRating: number;
  score: number;
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  buchholz: number;
  sonnebornBerger: number;
  performance: number;
}

interface StandingsTableProps {
  standings: Standing[];
  showPosition?: boolean;
  showStats?: boolean;
}

export function StandingsTable({ standings, showPosition = false, showStats = false }: StandingsTableProps) {
  if (standings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Tournament Standings
          </CardTitle>
          <CardDescription>No players have standings yet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Standings will appear once games have been played.
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1: return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2: return <Medal className="w-5 h-5 text-gray-400" />;
      case 3: return <Award className="w-5 h-5 text-orange-600" />;
      default: return null;
    }
  };

  const getPerformanceColor = (performance: number, rating: number) => {
    const diff = performance - rating;
    if (diff > 100) return 'text-green-600';
    if (diff > 50) return 'text-green-500';
    if (diff > 0) return 'text-blue-500';
    if (diff > -50) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Tournament Standings
        </CardTitle>
        <CardDescription>Current rankings and performance</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                {showPosition && <th className="text-left p-3 font-semibold">Pos</th>}
                <th className="text-left p-3 font-semibold">Player</th>
                <th className="text-center p-3 font-semibold">Score</th>
                <th className="text-center p-3 font-semibold">Games</th>
                {showStats && (
                  <>
                    <th className="text-center p-3 font-semibold">W-D-L</th>
                    <th className="text-center p-3 font-semibold">Rating</th>
                    <th className="text-center p-3 font-semibold">Performance</th>
                    <th className="text-center p-3 font-semibold">Buchholz</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {standings.map((standing, index) => (
                <tr 
                  key={standing.userId} 
                  className={`border-b hover:bg-gray-50 ${
                    index < 3 ? 'bg-yellow-50' : ''
                  }`}
                >
                  {showPosition && (
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {getPositionIcon(index + 1)}
                        <span className="font-semibold">{index + 1}</span>
                      </div>
                    </td>
                  )}
                  
                  <td className="p-3">
                    <div>
                      <div className="font-semibold">{standing.username}</div>
                      {!showStats && (
                        <div className="text-sm text-gray-600">
                          Rating: {standing.eloRating}
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="text-center p-3">
                    <div className="font-bold text-lg">{standing.score}</div>
                  </td>
                  
                  <td className="text-center p-3">
                    <div className="text-gray-600">{standing.gamesPlayed}</div>
                  </td>
                  
                  {showStats && (
                    <>
                      <td className="text-center p-3">
                        <div className="text-sm">
                          <span className="text-green-600 font-semibold">{standing.wins}</span>
                          <span className="mx-1">-</span>
                          <span className="text-yellow-600 font-semibold">{standing.draws}</span>
                          <span className="mx-1">-</span>
                          <span className="text-red-600 font-semibold">{standing.losses}</span>
                        </div>
                      </td>
                      
                      <td className="text-center p-3">
                        <div className="font-medium">{standing.eloRating}</div>
                      </td>
                      
                      <td className="text-center p-3">
                        <div className={`font-medium flex items-center justify-center gap-1 ${
                          getPerformanceColor(standing.performance, standing.eloRating)
                        }`}>
                          {standing.performance > standing.eloRating && (
                            <TrendingUp className="w-4 h-4" />
                          )}
                          {standing.performance}
                        </div>
                      </td>
                      
                      <td className="text-center p-3">
                        <div className="text-gray-600">{standing.buchholz.toFixed(1)}</div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {showStats && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-2">Tiebreak Explanation</h4>
            <div className="grid gap-2 text-sm text-gray-600">
              <div><strong>Score:</strong> Points earned (1 for win, 0.5 for draw, 0 for loss)</div>
              <div><strong>Buchholz:</strong> Sum of opponents' scores (strength of schedule)</div>
              <div><strong>Performance:</strong> Estimated rating based on results and opponents</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}