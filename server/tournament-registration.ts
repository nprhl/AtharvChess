import { db } from "./db.js";
import { tournaments, registrations, users, teams, tournamentSections } from "../shared/schema.js";
import { eq, and, count, desc } from "drizzle-orm";

export interface RegistrationData {
  tournamentId: number;
  sectionId: number;
  userId: number;
  teamId?: number;
  parentConsentDate?: Date;
  emergencyContact?: string;
  medicalConditions?: string;
  specialRequirements?: string;
}

export interface RegistrationResult {
  success: boolean;
  registrationId?: number;
  message: string;
  waitlistPosition?: number;
}

export class TournamentRegistrationService {
  // Register a player for a tournament
  async registerPlayer(data: RegistrationData): Promise<RegistrationResult> {
    try {
      // Get tournament details
      const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, data.tournamentId));

      if (!tournament) {
        return { success: false, message: "Tournament not found" };
      }

      // Check if registration is open
      if (tournament.status !== 'registration_open') {
        return { success: false, message: "Registration is closed for this tournament" };
      }

      // Check registration deadline
      const now = new Date();
      if (tournament.registrationEndDate && new Date(tournament.registrationEndDate) < now) {
        return { success: false, message: "Registration deadline has passed" };
      }

      // Check if user is already registered
      const [existingRegistration] = await db
        .select()
        .from(registrations)
        .where(and(
          eq(registrations.tournamentId, data.tournamentId),
          eq(registrations.userId, data.userId)
        ));

      if (existingRegistration) {
        return { success: false, message: "Already registered for this tournament" };
      }

      // Check capacity if there's a limit
      if (tournament.maxParticipants) {
        const [{ registrationCount }] = await db
          .select({ registrationCount: count() })
          .from(registrations)
          .where(and(
            eq(registrations.tournamentId, data.tournamentId),
            eq(registrations.status, 'confirmed')
          ));

        if (registrationCount >= tournament.maxParticipants) {
          // Add to waitlist
          const [registration] = await db
            .insert(registrations)
            .values({
              tournamentId: data.tournamentId,
              sectionId: data.sectionId,
              userId: data.userId,
              teamId: data.teamId,
              status: 'waitlisted',
              parentConsentDate: data.parentConsentDate,
              emergencyContact: data.emergencyContact,
              medicalConditions: data.medicalConditions,
              specialRequirements: data.specialRequirements
            })
            .returning();

          // Get waitlist position
          const [{ waitlistCount }] = await db
            .select({ waitlistCount: count() })
            .from(registrations)
            .where(and(
              eq(registrations.tournamentId, data.tournamentId),
              eq(registrations.status, 'waitlisted')
            ));

          return {
            success: true,
            registrationId: registration.id,
            message: "Added to waitlist",
            waitlistPosition: waitlistCount
          };
        }
      }

      // Register with approval status based on tournament settings
      const needsApproval = tournament.requirePayment || !tournament.allowRegistration;
      const status = needsApproval ? 'pending' : 'confirmed';

      const [registration] = await db
        .insert(registrations)
        .values({
          tournamentId: data.tournamentId,
          sectionId: data.sectionId,
          userId: data.userId,
          teamId: data.teamId,
          status,
          parentConsentDate: data.parentConsentDate,
          emergencyContact: data.emergencyContact,
          medicalConditions: data.medicalConditions,
          specialRequirements: data.specialRequirements
        })
        .returning();

      return {
        success: true,
        registrationId: registration.id,
        message: status === 'confirmed' ? "Registration successful" : "Registration pending approval"
      };

    } catch (error) {
      console.error("Registration error:", error);
      return { success: false, message: "Registration failed" };
    }
  }

  // Approve a registration
  async approveRegistration(registrationId: number, approverId: number): Promise<boolean> {
    try {
      const [registration] = await db
        .select()
        .from(registrations)
        .where(eq(registrations.id, registrationId));

      if (!registration) return false;

      // Check tournament capacity before approving
      const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, registration.tournamentId));

      if (tournament?.maxParticipants) {
        const [{ approvedCount }] = await db
          .select({ approvedCount: count() })
          .from(registrations)
          .where(and(
            eq(registrations.tournamentId, registration.tournamentId),
            eq(registrations.status, 'confirmed')
          ));

        if (approvedCount >= tournament.maxParticipants) {
          return false; // Tournament is full
        }
      }

      await db
        .update(registrations)
        .set({
          status: 'confirmed',
          registeredBy: approverId
        })
        .where(eq(registrations.id, registrationId));

      return true;
    } catch (error) {
      console.error("Approval error:", error);
      return false;
    }
  }

  // Reject a registration
  async rejectRegistration(registrationId: number, approverId: number, reason?: string): Promise<boolean> {
    try {
      await db
        .update(registrations)
        .set({
          status: 'cancelled',
          registeredBy: approverId,
          cancellationReason: reason
        })
        .where(eq(registrations.id, registrationId));

      return true;
    } catch (error) {
      console.error("Rejection error:", error);
      return false;
    }
  }

  // Get tournament registrations
  async getTournamentRegistrations(tournamentId: number, status?: string) {
    try {
      let query = db
        .select({
          id: registrations.id,
          userId: registrations.userId,
          teamId: registrations.teamId,
          sectionId: registrations.sectionId,
          status: registrations.status,
          createdAt: registrations.createdAt,
          parentConsentDate: registrations.parentConsentDate,
          emergencyContact: registrations.emergencyContact,
          medicalConditions: registrations.medicalConditions,
          userName: users.username,
          userEmail: users.email,
          userElo: users.eloRating
        })
        .from(registrations)
        .innerJoin(users, eq(registrations.userId, users.id))
        .where(eq(registrations.tournamentId, tournamentId));

      if (status) {
        query = query.where(and(
          eq(registrations.tournamentId, tournamentId),
          eq(registrations.status, status)
        ));
      }

      return await query.orderBy(desc(registrations.createdAt));
    } catch (error) {
      console.error("Get registrations error:", error);
      return [];
    }
  }

  // Get user's registrations
  async getUserRegistrations(userId: number) {
    try {
      return await db
        .select({
          id: registrations.id,
          tournamentId: registrations.tournamentId,
          status: registrations.status,
          createdAt: registrations.createdAt,
          sectionId: registrations.sectionId,
          tournamentName: tournaments.name,
          tournamentStartDate: tournaments.startDate,
          tournamentStatus: tournaments.status
        })
        .from(registrations)
        .innerJoin(tournaments, eq(registrations.tournamentId, tournaments.id))
        .where(eq(registrations.userId, userId))
        .orderBy(desc(registrations.createdAt));
    } catch (error) {
      console.error("Get user registrations error:", error);
      return [];
    }
  }

  // Withdraw from tournament
  async withdrawRegistration(registrationId: number, userId: number): Promise<boolean> {
    try {
      const [registration] = await db
        .select()
        .from(registrations)
        .where(and(
          eq(registrations.id, registrationId),
          eq(registrations.userId, userId)
        ));

      if (!registration) return false;

      // Check if withdrawal is allowed (not during tournament)
      const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, registration.tournamentId));

      if (tournament?.status === 'in_progress') {
        return false; // Cannot withdraw during tournament
      }

      await db
        .update(registrations)
        .set({
          status: 'cancelled'
        })
        .where(eq(registrations.id, registrationId));

      // Move waitlisted player up if there's space
      await this.promoteFromWaitlist(registration.tournamentId);

      return true;
    } catch (error) {
      console.error("Withdrawal error:", error);
      return false;
    }
  }

  // Promote next waitlisted player
  private async promoteFromWaitlist(tournamentId: number): Promise<void> {
    try {
      const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, tournamentId));

      if (!tournament?.maxParticipants) return;

      const [{ approvedCount }] = await db
        .select({ approvedCount: count() })
        .from(registrations)
        .where(and(
          eq(registrations.tournamentId, tournamentId),
          eq(registrations.status, 'confirmed')
        ));

      if (approvedCount < tournament.maxParticipants) {
        // Get next waitlisted player
        const [nextWaitlisted] = await db
          .select()
          .from(registrations)
          .where(and(
            eq(registrations.tournamentId, tournamentId),
            eq(registrations.status, 'waitlisted')
          ))
          .orderBy(registrations.createdAt)
          .limit(1);

        if (nextWaitlisted) {
          await db
            .update(registrations)
            .set({
              status: 'confirmed'
            })
            .where(eq(registrations.id, nextWaitlisted.id));
        }
      }
    } catch (error) {
      console.error("Promotion error:", error);
    }
  }

  // Get registration statistics
  async getRegistrationStats(tournamentId: number) {
    try {
      const stats = await db
        .select({
          status: registrations.status,
          count: count()
        })
        .from(registrations)
        .where(eq(registrations.tournamentId, tournamentId))
        .groupBy(registrations.status);

      const result = {
        total: 0,
        confirmed: 0,
        pending: 0,
        waitlisted: 0,
        cancelled: 0,
        refunded: 0
      };

      stats.forEach(stat => {
        result.total += stat.count;
        result[stat.status as keyof typeof result] = stat.count;
      });

      return result;
    } catch (error) {
      console.error("Stats error:", error);
      return {
        total: 0,
        confirmed: 0,
        pending: 0,
        waitlisted: 0,
        cancelled: 0,
        refunded: 0
      };
    }
  }
}

export const registrationService = new TournamentRegistrationService();