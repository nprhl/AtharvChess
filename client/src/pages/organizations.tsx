import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, School, Users, MapPin, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useHasPermission, PERMISSIONS } from "@/hooks/usePermissions";

interface Organization {
  id: number;
  name: string;
  type: 'elementary_school' | 'middle_school' | 'high_school' | 'college' | 'chess_club' | 'community_center' | 'other';
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  isVerified: boolean;
  createdAt: string;
}

export default function OrganizationsPage() {
  const canManageOrg = useHasPermission(PERMISSIONS.ORG_MANAGE);
  
  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ["/api/organizations"],
    queryFn: async (): Promise<Organization[]> => {
      const response = await fetch("/api/organizations");
      if (!response.ok) throw new Error("Failed to fetch organizations");
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Organizations</h1>
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

  const getTypeLabel = (type: Organization['type']) => {
    const labels = {
      'elementary_school': 'Elementary School',
      'middle_school': 'Middle School', 
      'high_school': 'High School',
      'college': 'College',
      'chess_club': 'Chess Club',
      'community_center': 'Community Center',
      'other': 'Other'
    };
    return labels[type] || type;
  };

  const getTypeIcon = (type: Organization['type']) => {
    switch (type) {
      case 'elementary_school':
      case 'middle_school':
      case 'high_school':
      case 'college':
        return School;
      case 'chess_club':
      case 'community_center':
      default:
        return Users;
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Organizations</h1>
        {canManageOrg && (
          <Link href="/organizations/create">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </Link>
        )}
      </div>

      {organizations.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <School className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No organizations yet</h3>
            <p className="text-muted-foreground mb-4">
              {canManageOrg 
                ? "Add your first organization to get started"
                : "Organizations will appear here when they're added"}
            </p>
            {canManageOrg && (
              <Link href="/organizations/create">
                <Button>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Organization
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {organizations.map((org) => {
            const TypeIcon = getTypeIcon(org.type);
            
            return (
              <Link key={org.id} href={`/organizations/${org.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <TypeIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-medium line-clamp-1 flex items-center">
                            {org.name}
                            {org.isVerified && (
                              <CheckCircle className="h-4 w-4 text-green-500 ml-2" />
                            )}
                          </CardTitle>
                          <Badge variant="outline" className="text-xs mt-1">
                            {getTypeLabel(org.type)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(org.address || org.city || org.state) && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span>
                          {[org.address, org.city, org.state].filter(Boolean).join(', ')}
                          {org.zipCode && ` ${org.zipCode}`}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-muted-foreground">
                        {org.contactEmail && (
                          <span>{org.contactEmail}</span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {org.isVerified ? (
                          <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Pending
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}