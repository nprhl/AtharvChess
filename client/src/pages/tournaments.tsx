import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, Calendar, Users, Trophy, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useHasPermission, PERMISSIONS } from "@/hooks/usePermissions";

interface Tournament {
  id: number;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  maxParticipants?: number;
  status: 'draft' | 'registration_open' | 'registration_closed' | 'in_progress' | 'completed' | 'cancelled';
  format: 'swiss' | 'round_robin' | 'single_elimination' | 'double_elimination';
  timeControl?: {
    type: string;
    minutes: number;
    increment: number;
  };
  venue?: string;
  organizerId: number;
}

export default function TournamentsPage() {
  const canCreateTournament = useHasPermission(PERMISSIONS.TOURNAMENT_CREATE);
  
  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ["/api/tournaments"],
    queryFn: async (): Promise<Tournament[]> => {
      const response = await fetch("/api/tournaments");
      if (!response.ok) throw new Error("Failed to fetch tournaments");
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Tournaments</h1>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-full"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const getStatusColor = (status: Tournament['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'registration_open': return 'bg-green-100 text-green-800';
      case 'registration_closed': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Tournaments</h1>
        {canCreateTournament && (
          <Link href="/tournaments/create">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Create
            </Button>
          </Link>
        )}
      </div>

      {tournaments.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No tournaments yet</h3>
            <p className="text-muted-foreground mb-4">
              {canCreateTournament 
                ? "Create your first tournament to get started"
                : "Check back later for upcoming tournaments"}
            </p>
            {canCreateTournament && (
              <Link href="/tournaments/create">
                <Button>
                  <Plus className="h-4 w-4 mr-1" />
                  Create Tournament
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tournaments.map((tournament) => (
            <Link key={tournament.id} href={`/tournaments/${tournament.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-medium line-clamp-2">
                      {tournament.name}
                    </CardTitle>
                    <Badge className={getStatusColor(tournament.status)}>
                      {tournament.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  {tournament.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {tournament.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>{formatDate(tournament.startDate)} - {formatDate(tournament.endDate)}</span>
                  </div>
                  
                  {tournament.venue && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span>{tournament.venue}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <Users className="h-4 w-4 mr-2" />
                      <span>
                        {tournament.maxParticipants 
                          ? `Max ${tournament.maxParticipants} players`
                          : 'No limit'
                        }
                      </span>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {tournament.format.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {tournament.timeControl ? 
                          `${tournament.timeControl.minutes}+${tournament.timeControl.increment}` : 
                          'Time control TBD'
                        }
                      </Badge>
                    </div>
                  </div>
                  
                  {tournament.status === 'registration_open' && (
                    <div className="text-xs text-green-600">
                      Registration closes: {formatDate(tournament.registrationDeadline)}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}