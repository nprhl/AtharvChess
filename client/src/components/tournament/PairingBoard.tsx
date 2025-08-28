import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Play, 
  Pause, 
  Check, 
  Clock, 
  Users, 
  Trophy,
  Edit3,
  RotateCcw
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ParticipantProfilePreview } from "./ParticipantProfilePreview";

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

interface PairingBoardProps {
  tournamentId: number;
  rounds: Round[];
  canManage: boolean;
}

export function PairingBoard({ tournamentId, rounds, canManage }: PairingBoardProps) {
  const [selectedRound, setSelectedRound] = useState<number | null>(
    rounds.find(r => r.status === 'in_progress')?.id || 
    rounds.find(r => r.status === 'paired')?.id || 
    rounds[rounds.length - 1]?.id || 
    null
  );
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const selectedRoundData = rounds.find(r => r.id === selectedRound);

  // Fetch round details and pairings
  const { data: roundDetails, isLoading } = useQuery({
    queryKey: ['/api/rounds', selectedRound],
    enabled: !!selectedRound,
  });

  // Create new round mutation
  const createRoundMutation = useMutation({
    mutationFn: () => apiRequest(`/api/tournaments/${tournamentId}/rounds`, {
      method: 'POST',
      body: {
        roundNumber: (rounds.length || 0) + 1,
        name: `Round ${(rounds.length || 0) + 1}`
      }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments', tournamentId, 'rounds'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/rounds', selectedRound] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/rounds', selectedRound] });
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

  if (rounds.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Rounds Yet</CardTitle>
          <CardDescription>Create the first round to start generating pairings</CardDescription>
        </CardHeader>
        <CardContent>
          {canManage && (
            <Button 
              onClick={() => createRoundMutation.mutate()}
              disabled={createRoundMutation.isPending}
              className="w-full"
            >
              <Play className="w-4 h-4 mr-2" />
              Create Round 1
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Round Selection and Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Pairing Board
              </CardTitle>
              <CardDescription>Manage tournament pairings and results</CardDescription>
            </div>
            {canManage && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => createRoundMutation.mutate()}
                  disabled={createRoundMutation.isPending}
                >
                  <Play className="w-4 h-4 mr-2" />
                  New Round
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {rounds.map((round) => (
              <Card 
                key={round.id}
                className={`cursor-pointer transition-colors ${
                  selectedRound === round.id 
                    ? 'ring-2 ring-blue-500 bg-blue-50' 
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedRound(round.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{round.name}</h4>
                    <Badge variant={getRoundStatusVariant(round.status)}>
                      {round.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    {round.completedGames}/{round.gamesCount} games completed
                  </div>
                  {round.startTime && (
                    <div className="text-xs text-gray-500 mt-1">
                      Started: {new Date(round.startTime).toLocaleTimeString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Round Details */}
      {selectedRound && selectedRoundData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  {selectedRoundData.name}
                </CardTitle>
                <CardDescription>
                  {selectedRoundData.completedGames}/{selectedRoundData.gamesCount} games completed
                </CardDescription>
              </div>
              {canManage && (
                <RoundControls 
                  round={selectedRoundData}
                  onGeneratePairings={() => generatePairingsMutation.mutate(selectedRound)}
                  onStartRound={() => startRoundMutation.mutate(selectedRound)}
                  isGeneratingPairings={generatePairingsMutation.isPending}
                  isStartingRound={startRoundMutation.isPending}
                />
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-20 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            ) : (
              <PairingsList 
                pairings={roundDetails?.pairings || []} 
                canManage={canManage}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RoundControls({ 
  round, 
  onGeneratePairings, 
  onStartRound, 
  isGeneratingPairings, 
  isStartingRound 
}: {
  round: Round;
  onGeneratePairings: () => void;
  onStartRound: () => void;
  isGeneratingPairings: boolean;
  isStartingRound: boolean;
}) {
  return (
    <div className="flex gap-2">
      {round.status === 'created' && (
        <Button
          size="sm"
          onClick={onGeneratePairings}
          disabled={isGeneratingPairings}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Generate Pairings
        </Button>
      )}
      {round.status === 'paired' && (
        <Button
          size="sm"
          onClick={onStartRound}
          disabled={isStartingRound}
        >
          <Play className="w-4 h-4 mr-2" />
          Start Round
        </Button>
      )}
      {round.status === 'in_progress' && (
        <Badge variant="default" className="h-8">
          <Clock className="w-4 h-4 mr-1" />
          In Progress
        </Badge>
      )}
      {round.status === 'completed' && (
        <Badge variant="default" className="h-8">
          <Check className="w-4 h-4 mr-1" />
          Completed
        </Badge>
      )}
    </div>
  );
}

function PairingsList({ pairings, canManage }: { pairings: any[]; canManage: boolean }) {
  if (pairings.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No pairings generated yet for this round.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pairings.map((pairing) => (
        <PairingCard 
          key={pairing.id} 
          pairing={pairing} 
          canManage={canManage} 
        />
      ))}
    </div>
  );
}

function PairingCard({ pairing, canManage }: { pairing: any; canManage: boolean }) {
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const submitResultMutation = useMutation({
    mutationFn: (data: { result: string; resultReason?: string }) => 
      apiRequest(`/api/games/${pairing.gameId}/result`, {
        method: 'PUT',
        body: data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rounds'] });
      setResultDialogOpen(false);
      toast({ title: "Result submitted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error submitting result", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const getResultDisplay = () => {
    if (!pairing.gameResult) return 'vs';
    if (pairing.gameResult === '1/2-1/2') return '½-½';
    return pairing.gameResult;
  };

  const getStatusColor = () => {
    switch (pairing.gameStatus) {
      case 'completed': return 'bg-green-100 border-green-300';
      case 'in_progress': return 'bg-blue-100 border-blue-300';
      case 'scheduled': return 'bg-gray-100 border-gray-300';
      default: return 'bg-gray-100 border-gray-300';
    }
  };

  return (
    <Card className={`${getStatusColor()} transition-colors`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm font-mono bg-white px-2 py-1 rounded">
              Board {pairing.boardNumber}
            </div>
            
            <div className="flex items-center gap-3 flex-1">
              <div className="text-right min-w-32">
                {pairing.whitePlayerName && pairing.whitePlayerId ? (
                  <ParticipantProfilePreview 
                    userId={pairing.whitePlayerId}
                    username={pairing.whitePlayerName}
                    eloRating={pairing.whitePlayerElo}
                    trigger={
                      <Button variant="ghost" className="h-auto p-0 text-right">
                        <div>
                          <div className="font-semibold hover:text-blue-600">{pairing.whitePlayerName}</div>
                          <div className="text-xs text-gray-600">({pairing.whitePlayerElo})</div>
                        </div>
                      </Button>
                    }
                  />
                ) : (
                  <div>
                    <div className="font-semibold">TBD</div>
                    <div className="text-xs text-gray-600">(-)</div>
                  </div>
                )}
              </div>
              
              <div className="text-center font-bold text-lg px-4 py-2 bg-white rounded">
                {getResultDisplay()}
              </div>
              
              <div className="text-left min-w-32">
                {pairing.blackPlayerName && pairing.blackPlayerId ? (
                  <ParticipantProfilePreview 
                    userId={pairing.blackPlayerId}
                    username={pairing.blackPlayerName}
                    eloRating={pairing.blackPlayerElo}
                    trigger={
                      <Button variant="ghost" className="h-auto p-0 text-left">
                        <div>
                          <div className="font-semibold hover:text-blue-600">{pairing.blackPlayerName}</div>
                          <div className="text-xs text-gray-600">({pairing.blackPlayerElo})</div>
                        </div>
                      </Button>
                    }
                  />
                ) : (
                  <div>
                    <div className="font-semibold">TBD</div>
                    <div className="text-xs text-gray-600">(-)</div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={pairing.gameStatus === 'completed' ? 'default' : 'secondary'}>
              {pairing.gameStatus}
            </Badge>
            
            {canManage && pairing.gameStatus !== 'completed' && (
              <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Edit3 className="w-4 h-4 mr-1" />
                    Result
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Submit Game Result</DialogTitle>
                    <DialogDescription>
                      Board {pairing.boardNumber}: {pairing.whitePlayerName} vs {pairing.blackPlayerName}
                    </DialogDescription>
                  </DialogHeader>
                  <ResultForm 
                    onSubmit={(data) => submitResultMutation.mutate(data)}
                    isSubmitting={submitResultMutation.isPending}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
        
        {pairing.gameDuration && (
          <div className="mt-2 text-xs text-gray-600">
            Duration: {Math.round(pairing.gameDuration / 60)} minutes
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ResultForm({ 
  onSubmit, 
  isSubmitting 
}: { 
  onSubmit: (data: { result: string; resultReason?: string }) => void;
  isSubmitting: boolean;
}) {
  const [result, setResult] = useState('');
  const [resultReason, setResultReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (result) {
      onSubmit({ result, resultReason: resultReason || undefined });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Result</label>
        <Select value={result} onValueChange={setResult}>
          <SelectTrigger>
            <SelectValue placeholder="Select result" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1-0">1-0 (White wins)</SelectItem>
            <SelectItem value="0-1">0-1 (Black wins)</SelectItem>
            <SelectItem value="1/2-1/2">½-½ (Draw)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">Result Reason (Optional)</label>
        <Select value={resultReason} onValueChange={setResultReason}>
          <SelectTrigger>
            <SelectValue placeholder="Select reason" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="checkmate">Checkmate</SelectItem>
            <SelectItem value="resignation">Resignation</SelectItem>
            <SelectItem value="time">Time forfeit</SelectItem>
            <SelectItem value="draw_agreement">Draw agreement</SelectItem>
            <SelectItem value="stalemate">Stalemate</SelectItem>
            <SelectItem value="threefold">Threefold repetition</SelectItem>
            <SelectItem value="fifty_move">Fifty-move rule</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={!result || isSubmitting} className="flex-1">
          {isSubmitting ? 'Submitting...' : 'Submit Result'}
        </Button>
      </div>
    </form>
  );
}

function getRoundStatusVariant(status: string) {
  switch (status) {
    case 'completed': return 'default';
    case 'in_progress': return 'default';
    case 'paired': return 'secondary';
    case 'created': return 'outline';
    default: return 'secondary';
  }
}