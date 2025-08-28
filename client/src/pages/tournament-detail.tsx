import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Trophy, 
  Users, 
  Calendar, 
  MapPin, 
  Clock,
  Play,
  Settings,
  Plus,
  Eye,
  BarChart3
} from "lucide-react";
import { TournamentBracket } from "@/components/tournament/TournamentBracket";
import { PairingBoard } from "@/components/tournament/PairingBoard";
import { StandingsTable } from "@/components/tournament/StandingsTable";
import { RegistrationsList } from "@/components/tournament/RegistrationsList";
import { RoundManager } from "@/components/tournament/RoundManager";
import { ProfilePreviewDemo } from "@/components/tournament/ProfilePreviewDemo";
import { usePermissions, useHasPermission } from "@/hooks/usePermissions";
import { useState } from "react";

interface Tournament {
  id: number;
  name: string;
  description: string;
  format: string;
  status: string;
  startDate: string;
  endDate: string;
  venue: string;
  maxParticipants: number;
  organizerId: number;
}

export default function TournamentDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { data: permissionsData } = usePermissions();
  const hasPermission = (permission: string) => permissionsData?.permissions?.includes(permission) ?? false;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  const tournamentId = parseInt(id || "0");

  // Fetch tournament details
  const { data: tournament, isLoading } = useQuery({
    queryKey: [`/api/tournaments/${tournamentId}`],
    enabled: !!tournamentId,
  }) as { data: Tournament | undefined; isLoading: boolean };

  // Fetch registration stats
  const { data: regStats } = useQuery({
    queryKey: [`/api/tournaments/${tournamentId}/registration-stats`],
    enabled: !!tournamentId,
  }) as { data: { confirmed: number; pending: number; waitlisted: number } | undefined };

  // Fetch rounds
  const { data: rounds } = useQuery({
    queryKey: [`/api/tournaments/${tournamentId}/rounds`],
    enabled: !!tournamentId,
  }) as { data: any[] | undefined };

  // Fetch standings
  const { data: standings } = useQuery({
    queryKey: [`/api/tournaments/${tournamentId}/standings`],
    enabled: !!tournamentId,
  }) as { data: any[] | undefined };

  // Register for tournament mutation
  const registerMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/tournaments/${tournamentId}/register`, { sectionId: 1 });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}/registration-stats`] });
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="p-4 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Tournament not found</h1>
        <Button onClick={() => setLocation("/tournaments")} className="mt-4">
          Back to Tournaments
        </Button>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-500';
      case 'registration_open': return 'bg-green-500';
      case 'registration_closed': return 'bg-yellow-500';
      case 'in_progress': return 'bg-blue-500';
      case 'completed': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getFormatDisplay = (format: string) => {
    switch (format) {
      case 'swiss': return 'Swiss System';
      case 'round_robin': return 'Round Robin';
      case 'single_elimination': return 'Single Elimination';
      case 'double_elimination': return 'Double Elimination';
      default: return format;
    }
  };

  const canManage = hasPermission('tournament:edit');
  const canRegister = tournament.status === 'registration_open';

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/tournaments")}
            className="text-gray-600"
          >
            ← Back to Tournaments
          </Button>
          {canManage && (
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Manage
            </Button>
          )}
        </div>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{tournament.name}</h1>
            <p className="text-gray-600 mb-4">{tournament.description}</p>
            
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(tournament.startDate).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {tournament.venue || 'TBD'}
              </div>
              <div className="flex items-center gap-1">
                <Trophy className="w-4 h-4" />
                {getFormatDisplay(tournament.format)}
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {regStats?.confirmed || 0} / {tournament.maxParticipants || 'Unlimited'} players
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <Badge className={`${getStatusColor(tournament.status)} text-white`}>
              {tournament.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
            </Badge>
            {canRegister && (
              <Button 
                onClick={() => registerMutation.mutate()}
                disabled={registerMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {registerMutation.isPending ? 'Registering...' : 'Register'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Registered</p>
                <p className="text-2xl font-bold">{regStats?.confirmed || 0}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rounds</p>
                <p className="text-2xl font-bold">{rounds?.length || 0}</p>
              </div>
              <Clock className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold">{regStats?.pending || 0}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Waitlisted</p>
                <p className="text-2xl font-bold">{regStats?.waitlisted || 0}</p>
              </div>
              <Users className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="brackets">Brackets</TabsTrigger>
          <TabsTrigger value="pairings">Pairings</TabsTrigger>
          <TabsTrigger value="standings">Standings</TabsTrigger>
          <TabsTrigger value="profiles">Profiles</TabsTrigger>
          {canManage && <TabsTrigger value="registrations">Registrations</TabsTrigger>}
          {canManage && <TabsTrigger value="rounds">Rounds</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Tournament Information</CardTitle>
                <CardDescription>Details about this tournament</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Format</h4>
                    <p className="text-gray-600">{getFormatDisplay(tournament.format)}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Start Date</h4>
                    <p className="text-gray-600">{new Date(tournament.startDate).toLocaleString()}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Venue</h4>
                    <p className="text-gray-600">{tournament.venue}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Max Participants</h4>
                    <p className="text-gray-600">{tournament.maxParticipants}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {tournament.status === 'in_progress' && standings && (
              <Card>
                <CardHeader>
                  <CardTitle>Current Standings</CardTitle>
                  <CardDescription>Top players in the tournament</CardDescription>
                </CardHeader>
                <CardContent>
                  <StandingsTable standings={standings.slice(0, 10)} showPosition />
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="brackets">
          <TournamentBracket 
            tournamentId={tournamentId} 
            format={tournament.format}
            rounds={rounds || []}
          />
        </TabsContent>

        <TabsContent value="pairings">
          <PairingBoard 
            tournamentId={tournamentId}
            rounds={rounds || []}
            canManage={canManage}
          />
        </TabsContent>

        <TabsContent value="standings">
          <StandingsTable 
            standings={standings || []} 
            showPosition 
            showStats
          />
        </TabsContent>

        <TabsContent value="profiles">
          <ProfilePreviewDemo />
        </TabsContent>

        {canManage && (
          <TabsContent value="registrations">
            <RegistrationsList tournamentId={tournamentId} />
          </TabsContent>
        )}

        {canManage && (
          <TabsContent value="rounds">
            <RoundManager 
              tournamentId={tournamentId}
              rounds={rounds || []}
              tournament={tournament}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}