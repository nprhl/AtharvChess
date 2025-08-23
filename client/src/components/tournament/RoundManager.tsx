import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Play, 
  Plus, 
  Clock, 
  Users, 
  Trophy,
  RotateCcw,
  Calendar,
  Settings
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Round {
  id: number;
  roundNumber: number;
  name: string;
  status: string;
  gamesCount: number;
  completedGames: number;
  startTime?: string;
  endTime?: string;
}

interface Tournament {
  id: number;
  name: string;
  format: string;
  status: string;
}

interface RoundManagerProps {
  tournamentId: number;
  rounds: Round[];
  tournament: Tournament;
}

export function RoundManager({ tournamentId, rounds, tournament }: RoundManagerProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Create round mutation
  const createRoundMutation = useMutation({
    mutationFn: (data: { roundNumber: number; name: string; startTime?: string }) => 
      apiRequest(`/api/tournaments/${tournamentId}/rounds`, {
        method: 'POST',
        body: data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments', tournamentId, 'rounds'] });
      setCreateDialogOpen(false);
      toast({ title: "Round created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error creating round", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Generate pairings mutation
  const generatePairingsMutation = useMutation({
    mutationFn: (roundId: number) => apiRequest(`/api/rounds/${roundId}/pairings`, {
      method: 'POST'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments', tournamentId, 'rounds'] });
      toast({ title: "Pairings generated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error generating pairings", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Start round mutation
  const startRoundMutation = useMutation({
    mutationFn: (roundId: number) => apiRequest(`/api/rounds/${roundId}/start`, {
      method: 'PUT'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments', tournamentId, 'rounds'] });
      toast({ title: "Round started successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error starting round", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500 text-white';
      case 'in_progress': return 'bg-blue-500 text-white';
      case 'paired': return 'bg-yellow-500 text-white';
      case 'created': return 'bg-gray-500 text-white';
      default: return 'bg-gray-300 text-gray-700';
    }
  };

  const getActionButton = (round: Round) => {
    switch (round.status) {
      case 'created':
        return (
          <Button
            size="sm"
            onClick={() => generatePairingsMutation.mutate(round.id)}
            disabled={generatePairingsMutation.isPending}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Generate Pairings
          </Button>
        );
      case 'paired':
        return (
          <Button
            size="sm"
            onClick={() => startRoundMutation.mutate(round.id)}
            disabled={startRoundMutation.isPending}
          >
            <Play className="w-4 h-4 mr-2" />
            Start Round
          </Button>
        );
      case 'in_progress':
        return (
          <Badge className="bg-blue-500 text-white">
            <Clock className="w-4 h-4 mr-1" />
            In Progress
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-green-500 text-white">
            <Trophy className="w-4 h-4 mr-1" />
            Completed
          </Badge>
        );
      default:
        return null;
    }
  };

  const canCreateNewRound = () => {
    if (rounds.length === 0) return true;
    const lastRound = rounds[rounds.length - 1];
    return lastRound.status === 'completed';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Round Management
              </CardTitle>
              <CardDescription>
                Create and manage tournament rounds for {tournament.name}
              </CardDescription>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={!canCreateNewRound()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Round
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Round</DialogTitle>
                  <DialogDescription>
                    Create round {(rounds.length || 0) + 1} for this tournament
                  </DialogDescription>
                </DialogHeader>
                <CreateRoundForm 
                  roundNumber={(rounds.length || 0) + 1}
                  onSubmit={(data) => createRoundMutation.mutate(data)}
                  isSubmitting={createRoundMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold">{rounds.length}</div>
              <div className="text-sm text-gray-600">Total Rounds</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold">
                {rounds.filter(r => r.status === 'in_progress').length}
              </div>
              <div className="text-sm text-gray-600">In Progress</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold">
                {rounds.filter(r => r.status === 'completed').length}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold">
                {rounds.reduce((sum, r) => sum + r.gamesCount, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Games</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rounds List */}
      <div className="space-y-4">
        {rounds.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-gray-500 mb-4">
                <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                No rounds created yet
              </div>
              <p className="text-gray-600 mb-4">
                Create the first round to start your tournament
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Round 1
              </Button>
            </CardContent>
          </Card>
        ) : (
          rounds.map((round) => (
            <Card key={round.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="font-bold text-blue-600">{round.roundNumber}</span>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-lg">{round.name}</h4>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {round.gamesCount} games
                        </div>
                        <div className="flex items-center gap-1">
                          <Trophy className="w-4 h-4" />
                          {round.completedGames} completed
                        </div>
                        {round.startTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            Started: {new Date(round.startTime).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusColor(round.status)}>
                      {round.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    {getActionButton(round)}
                  </div>
                </div>
                
                {/* Progress Bar */}
                {round.gamesCount > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                      <span>Game Progress</span>
                      <span>{round.completedGames}/{round.gamesCount}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${(round.completedGames / round.gamesCount) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function CreateRoundForm({ 
  roundNumber, 
  onSubmit, 
  isSubmitting 
}: {
  roundNumber: number;
  onSubmit: (data: { roundNumber: number; name: string; startTime?: string }) => void;
  isSubmitting: boolean;
}) {
  const [name, setName] = useState(`Round ${roundNumber}`);
  const [startTime, setStartTime] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      roundNumber,
      name,
      startTime: startTime || undefined
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Round Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`Round ${roundNumber}`}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="startTime">Start Time (Optional)</Label>
        <Input
          id="startTime"
          type="datetime-local"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
        />
      </div>
      
      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? 'Creating...' : 'Create Round'}
        </Button>
      </div>
    </form>
  );
}