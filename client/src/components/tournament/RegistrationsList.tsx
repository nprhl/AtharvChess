import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Users, 
  Check, 
  X, 
  Clock, 
  Search,
  Filter,
  Download,
  Mail,
  Phone
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Registration {
  id: number;
  userId: number;
  status: string;
  createdAt: string;
  userName: string;
  userEmail: string;
  userElo: number;
  emergencyContact?: string;
  medicalConditions?: string;
  parentConsentDate?: string;
}

interface RegistrationsListProps {
  tournamentId: number;
}

export function RegistrationsList({ tournamentId }: RegistrationsListProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch registrations
  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ['/api/tournaments', tournamentId, 'registrations', statusFilter],
    queryFn: () => apiRequest(`/api/tournaments/${tournamentId}/registrations${
      statusFilter !== 'all' ? `?status=${statusFilter}` : ''
    }`),
  });

  // Approve registration mutation
  const approveMutation = useMutation({
    mutationFn: (registrationId: number) => 
      apiRequest(`/api/registrations/${registrationId}/approve`, { method: 'PUT' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/tournaments', tournamentId, 'registrations'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/tournaments', tournamentId, 'registration-stats'] 
      });
      toast({ title: "Registration approved" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error approving registration", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Reject registration mutation
  const rejectMutation = useMutation({
    mutationFn: ({ registrationId, reason }: { registrationId: number; reason: string }) => 
      apiRequest(`/api/registrations/${registrationId}/reject`, { 
        method: 'PUT',
        body: { reason }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/tournaments', tournamentId, 'registrations'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/tournaments', tournamentId, 'registration-stats'] 
      });
      toast({ title: "Registration rejected" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error rejecting registration", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Filter registrations based on search and status
  const filteredRegistrations = registrations.filter((reg: Registration) => {
    const matchesSearch = reg.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         reg.userEmail.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-500 text-white">Confirmed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500 text-white">Pending</Badge>;
      case 'waitlisted':
        return <Badge className="bg-blue-500 text-white">Waitlisted</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="text-red-600 border-red-600">Cancelled</Badge>;
      case 'refunded':
        return <Badge variant="outline" className="text-gray-600">Refunded</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading registrations...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Tournament Registrations
              </CardTitle>
              <CardDescription>
                Manage player registrations and approvals
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm">
                <Mail className="w-4 h-4 mr-2" />
                Notify All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search players..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="waitlisted">Waitlisted</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Registration Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {[
              { label: 'Total', value: registrations.length, color: 'bg-gray-100' },
              { label: 'Confirmed', value: registrations.filter((r: Registration) => r.status === 'confirmed').length, color: 'bg-green-100' },
              { label: 'Pending', value: registrations.filter((r: Registration) => r.status === 'pending').length, color: 'bg-yellow-100' },
              { label: 'Waitlisted', value: registrations.filter((r: Registration) => r.status === 'waitlisted').length, color: 'bg-blue-100' },
              { label: 'Cancelled', value: registrations.filter((r: Registration) => r.status === 'cancelled').length, color: 'bg-red-100' },
            ].map((stat) => (
              <div key={stat.label} className={`p-3 rounded-lg ${stat.color}`}>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Registrations List */}
      <Card>
        <CardContent className="p-0">
          {filteredRegistrations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {searchQuery ? 'No registrations match your search.' : 'No registrations found.'}
            </div>
          ) : (
            <div className="divide-y">
              {filteredRegistrations.map((registration: Registration) => (
                <RegistrationCard
                  key={registration.id}
                  registration={registration}
                  onApprove={() => approveMutation.mutate(registration.id)}
                  onReject={(reason) => rejectMutation.mutate({ 
                    registrationId: registration.id, 
                    reason 
                  })}
                  isApproving={approveMutation.isPending}
                  isRejecting={rejectMutation.isPending}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RegistrationCard({ 
  registration, 
  onApprove, 
  onReject, 
  isApproving, 
  isRejecting 
}: {
  registration: Registration;
  onApprove: () => void;
  onReject: (reason: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
}) {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const handleReject = () => {
    if (rejectReason.trim()) {
      onReject(rejectReason);
      setRejectDialogOpen(false);
      setRejectReason('');
    }
  };

  return (
    <div className="p-6 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
            <Users className="w-6 h-6 text-gray-600" />
          </div>
          
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h4 className="font-semibold text-lg">{registration.userName}</h4>
              {getStatusBadge(registration.status)}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Mail className="w-4 h-4" />
                {registration.userEmail}
              </div>
              <div>Rating: {registration.userElo}</div>
              <div>Registered: {new Date(registration.createdAt).toLocaleDateString()}</div>
            </div>
            
            {(registration.emergencyContact || registration.medicalConditions) && (
              <div className="mt-2 text-xs text-gray-500">
                {registration.emergencyContact && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    Emergency: {registration.emergencyContact}
                  </div>
                )}
                {registration.medicalConditions && (
                  <div className="mt-1">
                    Medical: {registration.medicalConditions}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {registration.status === 'pending' && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={onApprove}
                disabled={isApproving}
                className="text-green-600 border-green-600 hover:bg-green-50"
              >
                <Check className="w-4 h-4 mr-1" />
                Approve
              </Button>
              
              <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reject Registration</DialogTitle>
                    <DialogDescription>
                      Please provide a reason for rejecting {registration.userName}'s registration.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Reason for rejection..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={4}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleReject}
                        disabled={!rejectReason.trim() || isRejecting}
                        variant="destructive"
                        className="flex-1"
                      >
                        {isRejecting ? 'Rejecting...' : 'Reject Registration'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setRejectDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
          
          {registration.status === 'waitlisted' && (
            <Button
              size="sm"
              variant="outline"
              onClick={onApprove}
              disabled={isApproving}
              className="text-blue-600 border-blue-600 hover:bg-blue-50"
            >
              <Check className="w-4 h-4 mr-1" />
              Confirm
            </Button>
          )}
          
          {registration.status === 'confirmed' && (
            <Badge className="bg-green-500 text-white">
              <Clock className="w-3 h-3 mr-1" />
              Confirmed
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}