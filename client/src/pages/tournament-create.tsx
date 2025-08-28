import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Calendar, Users, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const tournamentSchema = z.object({
  name: z.string().min(1, "Tournament name is required"),
  description: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  registrationStartDate: z.string().min(1, "Registration start date is required"),
  registrationEndDate: z.string().min(1, "Registration end date is required"),
  maxParticipants: z.string().optional(),
  format: z.enum(['swiss', 'round_robin', 'single_elimination', 'double_elimination']),
  timeControl: z.string().min(1, "Time control is required"),
  venue: z.string().optional(),
  entryFee: z.string().optional(),
  rounds: z.string().optional(),
});

type TournamentForm = z.infer<typeof tournamentSchema>;

export default function TournamentCreatePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const form = useForm<TournamentForm>({
    resolver: zodResolver(tournamentSchema),
    defaultValues: {
      format: 'swiss',
      timeControl: '15+10',
    },
  });

  const createTournament = useMutation({
    mutationFn: async (data: TournamentForm) => {
      const payload = {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
        registrationStartDate: new Date(data.registrationStartDate).toISOString(),
        registrationEndDate: new Date(data.registrationEndDate).toISOString(),
        maxParticipants: data.maxParticipants ? parseInt(data.maxParticipants) : null,
        entryFee: data.entryFee || '0',
        currency: 'INR',
        rounds: data.rounds ? parseInt(data.rounds) : null,
        status: 'draft',
        organizerId: 6, // Current user - should be dynamic in real app
        timeControl: {
          type: 'rapid',
          minutes: parseInt(data.timeControl.split('+')[0]) || 15,
          increment: parseInt(data.timeControl.split('+')[1]) || 10
        }
      };
      
      const response = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create tournament");
      }
      
      return response.json();
    },
    onSuccess: (tournament) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      toast({
        title: "Success",
        description: "Tournament created successfully",
      });
      setLocation(`/tournaments/${tournament.id}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TournamentForm) => {
    createTournament.mutate(data);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center space-x-3">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setLocation("/tournaments")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Create Tournament</h1>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tournament Name *</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="Spring Chess Championship"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...form.register("description")}
                placeholder="A description of your tournament..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="venue">Venue</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="venue"
                  {...form.register("venue")}
                  placeholder="School gymnasium or online"
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  {...form.register("startDate")}
                />
                {form.formState.errors.startDate && (
                  <p className="text-sm text-red-500">{form.formState.errors.startDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  {...form.register("endDate")}
                />
                {form.formState.errors.endDate && (
                  <p className="text-sm text-red-500">{form.formState.errors.endDate.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="registrationStartDate">Registration Start *</Label>
                <Input
                  id="registrationStartDate"
                  type="date"
                  {...form.register("registrationStartDate")}
                />
                {form.formState.errors.registrationStartDate && (
                  <p className="text-sm text-red-500">{form.formState.errors.registrationStartDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="registrationEndDate">Registration End *</Label>
                <Input
                  id="registrationEndDate"
                  type="date"
                  {...form.register("registrationEndDate")}
                />
                {form.formState.errors.registrationEndDate && (
                  <p className="text-sm text-red-500">{form.formState.errors.registrationEndDate.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Format & Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="format">Tournament Format *</Label>
              <Select onValueChange={(value) => form.setValue("format", value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="swiss">Swiss System</SelectItem>
                  <SelectItem value="round_robin">Round Robin</SelectItem>
                  <SelectItem value="single_elimination">Single Elimination</SelectItem>
                  <SelectItem value="double_elimination">Double Elimination</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="timeControl">Time Control *</Label>
                <Input
                  id="timeControl"
                  {...form.register("timeControl")}
                  placeholder="15+10"
                />
                {form.formState.errors.timeControl && (
                  <p className="text-sm text-red-500">{form.formState.errors.timeControl.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="rounds">Rounds</Label>
                <Input
                  id="rounds"
                  type="number"
                  {...form.register("rounds")}
                  placeholder="5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxParticipants">Max Participants</Label>
                <Input
                  id="maxParticipants"
                  type="number"
                  {...form.register("maxParticipants")}
                  placeholder="32"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="entryFee">Entry Fee (₹)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm text-gray-500">₹</span>
                  <Input
                    id="entryFee"
                    type="number"
                    step="0.01"
                    {...form.register("entryFee")}
                    placeholder="500.00"
                    className="pl-8"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation("/tournaments")}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createTournament.isPending}
            className="flex-1"
          >
            {createTournament.isPending ? "Creating..." : "Create Tournament"}
          </Button>
        </div>
      </form>
    </div>
  );
}