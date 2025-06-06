import { useQuery } from "@tanstack/react-query";
import { User, Building2, Target, Users, MessageSquare, Mail, Phone, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import MasterHeader from "@/components/master-header";
import MasterFooter from "@/components/master-footer";

interface BrandPurposeData {
  id: number;
  brandName: string;
  productsServices: string;
  corePurpose: string;
  audience: string;
  jobToBeDone: string;
  motivations: string;
  painPoints: string;
  goals: any;
  logoUrl?: string;
  contactDetails: any;
  createdAt: string;
  updatedAt: string;
}

export default function Profile() {
  const [, setLocation] = useLocation();
  
  // Fetch user data
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/user"],
    retry: false,
  });

  // Fetch brand purpose data
  const { data: brandPurpose, isLoading: brandLoading } = useQuery<BrandPurposeData>({
    queryKey: ["/api/brand-purpose"],
    retry: false,
  });

  if (userLoading || brandLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#f5f5f5' }}>
        <MasterHeader showUserMenu={true} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-64 bg-gray-200 rounded"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f5' }}>
      <MasterHeader showUserMenu={true} />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-8">
          <h1 className="text-3xl font-light text-gray-900 mb-4">Your Profile</h1>
          <p className="text-gray-600">Manage your account information and brand purpose</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Account Information */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {user && typeof user === 'object' && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <div className="flex items-center mt-1">
                      <Mail className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-gray-900">{(user as any).email}</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Phone</label>
                    <div className="flex items-center mt-1">
                      <Phone className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-gray-900">{(user as any).phone}</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Subscription Plan</label>
                    <div className="mt-1">
                      <Badge variant="secondary" className="capitalize">
                        {(user as any).subscriptionPlan}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Remaining Posts</label>
                      <div className="text-2xl font-semibold text-blue-600 mt-1">
                        {(user as any).remainingPosts}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Total Posts</label>
                      <div className="text-2xl font-semibold text-gray-600 mt-1">
                        {(user as any).totalPosts}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Brand Purpose Summary */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Building2 className="w-5 h-5 mr-2" />
                  Brand Purpose
                </div>
                {brandPurpose && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation("/brand-purpose")}
                    className="flex items-center"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {brandPurpose ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Brand Name</label>
                    <p className="text-gray-900 mt-1">{brandPurpose.brandName}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Core Purpose</label>
                    <p className="text-gray-900 mt-1 text-sm leading-relaxed">
                      {brandPurpose.corePurpose.length > 100 
                        ? `${brandPurpose.corePurpose.substring(0, 100)}...`
                        : brandPurpose.corePurpose
                      }
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Target Audience</label>
                    <p className="text-gray-900 mt-1 text-sm leading-relaxed">
                      {brandPurpose.audience.length > 100 
                        ? `${brandPurpose.audience.substring(0, 100)}...`
                        : brandPurpose.audience
                      }
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Contact Information</label>
                    <div className="mt-1 space-y-1">
                      {brandPurpose.contactDetails?.email && (
                        <div className="flex items-center text-sm">
                          <Mail className="w-3 h-3 mr-2 text-gray-400" />
                          {brandPurpose.contactDetails.email}
                        </div>
                      )}
                      {brandPurpose.contactDetails?.phone && (
                        <div className="flex items-center text-sm">
                          <Phone className="w-3 h-3 mr-2 text-gray-400" />
                          {brandPurpose.contactDetails.phone}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 mt-4">
                    Last updated: {new Date(brandPurpose.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Building2 className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 mb-4">No brand purpose defined yet</p>
                  <Button
                    onClick={() => setLocation("/brand-purpose")}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Define Brand Purpose
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detailed Brand Purpose (if exists) */}
        {brandPurpose && (
          <Card className="shadow-md mt-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="w-5 h-5 mr-2" />
                Complete Brand Purpose Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Products & Services</label>
                    <p className="text-gray-900 text-sm leading-relaxed bg-gray-50 p-3 rounded">
                      {brandPurpose.productsServices}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Job to be Done</label>
                    <p className="text-gray-900 text-sm leading-relaxed bg-gray-50 p-3 rounded">
                      {brandPurpose.jobToBeDone}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Customer Motivations</label>
                    <p className="text-gray-900 text-sm leading-relaxed bg-gray-50 p-3 rounded">
                      {brandPurpose.motivations}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Pain Points</label>
                    <p className="text-gray-900 text-sm leading-relaxed bg-gray-50 p-3 rounded">
                      {brandPurpose.painPoints}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Business Goals</label>
                    <div className="bg-gray-50 p-3 rounded space-y-2">
                      {brandPurpose.goals && Object.entries(brandPurpose.goals).map(([key, value]) => {
                        if (typeof value === 'boolean' && value) {
                          return (
                            <Badge key={key} variant="secondary" className="mr-2 mb-2">
                              {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                            </Badge>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      <MasterFooter />
    </div>
  );
}