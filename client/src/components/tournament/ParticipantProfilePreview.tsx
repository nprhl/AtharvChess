import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  Trophy, 
  Target, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  School,
  Phone,
  Mail,
  Award,
  Activity,
  BarChart3,
  History
} from "lucide-react";

interface ParticipantProfilePreviewProps {
  userId: number;
  username: string;
  eloRating?: number;
  trigger?: React.ReactNode;
  showTrigger?: boolean;
}

interface UserProfile {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  eloRating: number;
  isEloCalibrated: boolean;
  gamesWon: number;
  puzzlesSolved: number;
  lessonsCompleted: number;
  currentStreak: number;
  primaryRole: string;
  schoolId?: number;
  federationId?: string;
  phoneNumber?: string;
  parentEmail?: string;
  dateOfBirth?: string;
  createdAt: string;
}

interface TournamentHistory {
  tournamentId: number;
  tournamentName: string;
  tournamentDate: string;
  finalPosition: number;
  totalPlayers: number;
  score: number;
  rounds: number;
  performance: number;
  result: string; // "1st place", "Top 10", etc.
}

interface RecentGames {
  id: number;
  date: string;
  opponent: string;
  result: string;
  eloChange: number;
  moves: number;
  duration: string;
  opening?: string;
}

export function ParticipantProfilePreview({ 
  userId, 
  username, 
  eloRating, 
  trigger,
  showTrigger = true 
}: ParticipantProfilePreviewProps) {
  const [open, setOpen] = useState(false);

  // Fetch detailed user profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['/api/users', userId, 'profile'],
    queryFn: () => fetch(`/api/users/${userId}/profile`).then(res => res.json()),
    enabled: open,
  });

  // Fetch tournament history
  const { data: tournamentHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['/api/users', userId, 'tournament-history'],
    queryFn: () => fetch(`/api/users/${userId}/tournament-history`).then(res => res.json()),
    enabled: open,
  });

  // Fetch recent games
  const { data: recentGames = [], isLoading: gamesLoading } = useQuery({
    queryKey: ['/api/users', userId, 'recent-games'],
    queryFn: () => fetch(`/api/users/${userId}/recent-games`).then(res => res.json()),
    enabled: open,
  });

  const defaultTrigger = (
    <Button variant="ghost" size="sm" className="h-auto p-0">
      <div className="flex items-center gap-2 text-left">
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <div className="font-medium">{username}</div>
          {eloRating && (
            <div className="text-xs text-gray-500">{eloRating} ELO</div>
          )}
        </div>
      </div>
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          {trigger || defaultTrigger}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{username}</h2>
              <p className="text-sm text-gray-600">Player Profile</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {profileLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        ) : (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
              <TabsTrigger value="games">Recent Games</TabsTrigger>
              <TabsTrigger value="stats">Statistics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <ProfileOverview profile={profile} />
            </TabsContent>

            <TabsContent value="tournaments" className="space-y-4">
              <TournamentHistoryTab 
                history={tournamentHistory} 
                isLoading={historyLoading} 
              />
            </TabsContent>

            <TabsContent value="games" className="space-y-4">
              <RecentGamesTab 
                games={recentGames} 
                isLoading={gamesLoading} 
              />
            </TabsContent>

            <TabsContent value="stats" className="space-y-4">
              <PlayerStatistics profile={profile} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProfileOverview({ profile }: { profile: UserProfile }) {
  if (!profile) return null;

  const getFullName = () => {
    if (profile.firstName || profile.lastName) {
      return `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
    }
    return null;
  };

  const getAgeFromBirthDate = (birthDate: string) => {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'student': return 'bg-blue-100 text-blue-800';
      case 'teacher': return 'bg-green-100 text-green-800';
      case 'coach': return 'bg-purple-100 text-purple-800';
      case 'organizer': return 'bg-orange-100 text-orange-800';
      case 'parent': return 'bg-pink-100 text-pink-800';
      case 'admin': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {getFullName() && (
            <div>
              <label className="text-sm font-medium text-gray-600">Full Name</label>
              <p className="font-medium">{getFullName()}</p>
            </div>
          )}
          
          <div>
            <label className="text-sm font-medium text-gray-600">Username</label>
            <p className="font-medium">{profile.username}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">Role</label>
            <div className="mt-1">
              <Badge className={getRoleColor(profile.primaryRole)}>
                {profile.primaryRole.charAt(0).toUpperCase() + profile.primaryRole.slice(1)}
              </Badge>
            </div>
          </div>

          {profile.dateOfBirth && (
            <div>
              <label className="text-sm font-medium text-gray-600">Age</label>
              <p className="font-medium">{getAgeFromBirthDate(profile.dateOfBirth)} years old</p>
            </div>
          )}

          {profile.federationId && (
            <div>
              <label className="text-sm font-medium text-gray-600">Federation ID</label>
              <p className="font-medium">{profile.federationId}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chess Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Chess Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-600">ELO Rating</label>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-blue-600">{profile.eloRating}</span>
              {profile.isEloCalibrated ? (
                <Badge className="bg-green-100 text-green-800">Calibrated</Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-800">Provisional</Badge>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-600">Games Won</label>
            <span className="font-bold text-green-600">{profile.gamesWon}</span>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-600">Current Streak</label>
            <span className="font-bold">{profile.currentStreak} games</span>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-600">Puzzles Solved</label>
            <span className="font-bold text-purple-600">{profile.puzzlesSolved}</span>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-600">Lessons Completed</label>
            <span className="font-bold text-orange-600">{profile.lessonsCompleted}</span>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      {(profile.email || profile.phoneNumber || profile.parentEmail) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {profile.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-500" />
                <span className="text-sm">{profile.email}</span>
              </div>
            )}

            {profile.phoneNumber && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-500" />
                <span className="text-sm">{profile.phoneNumber}</span>
              </div>
            )}

            {profile.parentEmail && (
              <div>
                <label className="text-sm font-medium text-gray-600">Parent Email</label>
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">{profile.parentEmail}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Account Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Account Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-600">Member Since</label>
            <p className="font-medium">
              {new Date(profile.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>

          {profile.schoolId && (
            <div>
              <label className="text-sm font-medium text-gray-600">School ID</label>
              <div className="flex items-center gap-2 mt-1">
                <School className="w-4 h-4 text-gray-500" />
                <span className="font-medium">{profile.schoolId}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TournamentHistoryTab({ history, isLoading }: { history: TournamentHistory[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Trophy className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium mb-2">No Tournament History</h3>
          <p className="text-gray-600">This player hasn't participated in any tournaments yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((tournament) => (
        <Card key={tournament.tournamentId}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-lg">{tournament.tournamentName}</h4>
              <div className="flex items-center gap-2">
                <Badge className={
                  tournament.finalPosition <= 3 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : tournament.finalPosition <= 10
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }>
                  {tournament.result}
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <label className="text-gray-600">Position</label>
                <p className="font-bold">{tournament.finalPosition} / {tournament.totalPlayers}</p>
              </div>
              <div>
                <label className="text-gray-600">Score</label>
                <p className="font-bold">{tournament.score} / {tournament.rounds}</p>
              </div>
              <div>
                <label className="text-gray-600">Performance</label>
                <p className="font-bold text-blue-600">{tournament.performance}</p>
              </div>
              <div>
                <label className="text-gray-600">Date</label>
                <p className="font-medium">
                  {new Date(tournament.tournamentDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RecentGamesTab({ games, isLoading }: { games: RecentGames[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 rounded animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Activity className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium mb-2">No Recent Games</h3>
          <p className="text-gray-600">This player hasn't played any games recently.</p>
        </CardContent>
      </Card>
    );
  }

  const getResultColor = (result: string) => {
    switch (result) {
      case 'win': return 'text-green-600';
      case 'loss': return 'text-red-600';
      case 'draw': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'win': return <TrendingUp className="w-4 h-4" />;
      case 'loss': return <TrendingDown className="w-4 h-4" />;
      case 'draw': return <Target className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-3">
      {games.map((game) => (
        <Card key={game.id} className="border-l-4" style={{
          borderLeftColor: game.result === 'win' ? '#10b981' : game.result === 'loss' ? '#ef4444' : '#f59e0b'
        }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-1 ${getResultColor(game.result)}`}>
                  {getResultIcon(game.result)}
                  <span className="font-bold capitalize">{game.result}</span>
                </div>
                <span className="text-gray-600">vs {game.opponent}</span>
              </div>
              <div className="text-right">
                <div className={`font-bold ${game.eloChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {game.eloChange >= 0 ? '+' : ''}{game.eloChange}
                </div>
                <div className="text-xs text-gray-500">{game.duration}</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-4">
                {game.opening && (
                  <span>{game.opening}</span>
                )}
                <span>{game.moves} moves</span>
              </div>
              <span>{new Date(game.date).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PlayerStatistics({ profile }: { profile: UserProfile }) {
  if (!profile) return null;

  const totalGames = profile.gamesWon; // Simplified - would need losses/draws for accurate count
  const winRate = totalGames > 0 ? (profile.gamesWon / totalGames) * 100 : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Win Rate</span>
            <span className="text-xl font-bold text-green-600">{winRate.toFixed(1)}%</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full" 
              style={{ width: `${winRate}%` }}
            ></div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Current Streak</span>
            <span className="text-xl font-bold text-blue-600">{profile.currentStreak}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Rating Status</span>
            <Badge className={profile.isEloCalibrated ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
              {profile.isEloCalibrated ? 'Stable' : 'Provisional'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Learning Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Puzzles Solved</span>
            <span className="text-xl font-bold text-purple-600">{profile.puzzlesSolved}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Lessons Completed</span>
            <span className="text-xl font-bold text-orange-600">{profile.lessonsCompleted}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total Games</span>
            <span className="text-xl font-bold text-blue-600">{totalGames}</span>
          </div>

          <div className="pt-2">
            <div className="text-sm font-medium mb-2">Learning Activity</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-purple-50 rounded">
                <div className="text-lg font-bold text-purple-600">{profile.puzzlesSolved}</div>
                <div className="text-xs text-gray-600">Puzzles</div>
              </div>
              <div className="p-2 bg-orange-50 rounded">
                <div className="text-lg font-bold text-orange-600">{profile.lessonsCompleted}</div>
                <div className="text-xs text-gray-600">Lessons</div>
              </div>
              <div className="p-2 bg-green-50 rounded">
                <div className="text-lg font-bold text-green-600">{profile.gamesWon}</div>
                <div className="text-xs text-gray-600">Wins</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}