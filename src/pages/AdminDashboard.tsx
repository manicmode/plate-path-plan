import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Crown, 
  BarChart3, 
  Settings, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  UserPlus,
  Activity,
  TrendingUp,
  Database,
  Shield,
  Key,
  Search,
  Filter,
  Eye,
  MessageCircle,
  UserX,
  Star,
  Ban
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  created_at: string;
  profiles?: {
    first_name?: string;
    last_name?: string;
  };
  user_roles?: {
    role: string;
  }[];
}

interface Influencer {
  id: string;
  email: string;
  name: string;
  status: 'active' | 'pending' | 'suspended';
  followers: number;
  productsPromoted: number;
  role: 'influencer' | 'none';
  isVerified: boolean;
  created_at: string;
  profiles?: {
    first_name?: string;
    last_name?: string;
    followers_count?: number;
  };
  user_roles?: {
    role: string;
  }[];
}

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  weeklyGrowth: number;
  monthlyGrowth: number;
}

const AdminDashboard = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [hasAnyRole, setHasAnyRole] = useState<boolean>(true);
  const [users, setUsers] = useState<User[]>([]);
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [filteredInfluencers, setFilteredInfluencers] = useState<Influencer[]>([]);
  const [influencerSearch, setInfluencerSearch] = useState('');
  const [influencerStatusFilter, setInfluencerStatusFilter] = useState<string>('all');
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    weeklyGrowth: 0,
    monthlyGrowth: 0
  });
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingInfluencers, setLoadingInfluencers] = useState(true);
  const [activatingAdmin, setActivatingAdmin] = useState(false);
  const [roleChangeDialog, setRoleChangeDialog] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
    newRole: 'admin' | 'moderator' | 'user';
  }>({
    isOpen: false,
    userId: '',
    userName: '',
    newRole: 'user'
  });
  const [influencerActionDialog, setInfluencerActionDialog] = useState<{
    isOpen: boolean;
    type: 'role-change' | 'suspend' | 'verify';
    userId: string;
    userName: string;
    currentRole?: string;
    newRole?: 'influencer' | 'none';
  }>({
    isOpen: false,
    type: 'role-change',
    userId: '',
    userName: '',
    currentRole: '',
    newRole: 'none'
  });

  // Check if user has admin role and any roles
  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setIsAdmin(false);
        setHasAnyRole(true);
        return;
      }

      try {
        // Check for any roles
        const { data: allRoles, error: allRolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (allRolesError && allRolesError.code !== 'PGRST116') {
          console.error('Error checking roles:', allRolesError);
          setIsAdmin(false);
          setHasAnyRole(true);
          return;
        }

        const hasRoles = allRoles && allRoles.length > 0;
        setHasAnyRole(hasRoles);

        // Check specifically for admin role
        const adminRole = allRoles?.find(r => r.role === 'admin');
        setIsAdmin(!!adminRole);
      } catch (error) {
        console.error('Error checking roles:', error);
        setIsAdmin(false);
        setHasAnyRole(true);
      }
    };

    checkAdminRole();
  }, [user]);

  // Load users and stats
  useEffect(() => {
    const loadAdminData = async () => {
      if (!isAdmin) return;

      try {
        // Load users with profiles and roles
        const { data: usersData, error: usersError } = await supabase
          .from('user_profiles')
          .select(`
            user_id,
            first_name,
            last_name,
            created_at
          `);

        if (usersError) throw usersError;

        // Get auth users for email
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        
        if (authError) throw authError;

        // Get user roles
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role');

        if (rolesError) throw rolesError;

        // Combine data
        const combinedUsers = authUsers.users.map(authUser => {
          const profile = usersData?.find(p => p.user_id === authUser.id);
          const userRoles = rolesData?.filter(r => r.user_id === authUser.id) || [];
          
          return {
            id: authUser.id,
            email: authUser.email || '',
            created_at: authUser.created_at,
            profiles: profile ? {
              first_name: profile.first_name,
              last_name: profile.last_name
            } : undefined,
            user_roles: userRoles
          };
        });

        setUsers(combinedUsers);

        // Calculate stats
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const weeklyNewUsers = combinedUsers.filter(u => 
          new Date(u.created_at) > weekAgo
        ).length;

        const monthlyNewUsers = combinedUsers.filter(u => 
          new Date(u.created_at) > monthAgo
        ).length;

        // Calculate active users (users with recent activity)
        let activeUsersCount = 0;
        try {
          const { data: recentActivity, error: activityError } = await supabase
            .from('nutrition_logs')
            .select('user_id')
            .gte('created_at', weekAgo.toISOString())
            .limit(1000);

          if (!activityError && recentActivity) {
            const activeUserIds = new Set(recentActivity.map(log => log.user_id));
            activeUsersCount = activeUserIds.size;
          }
        } catch (error) {
          console.log('Could not fetch activity data, using total users as fallback');
          activeUsersCount = combinedUsers.length;
        }

        setStats({
          totalUsers: combinedUsers.length,
          activeUsers: activeUsersCount,
          weeklyGrowth: weeklyNewUsers,
          monthlyGrowth: monthlyNewUsers
        });

      } catch (error) {
        console.error('Error loading admin data:', error);
        toast({
          title: "Error",
          description: "Failed to load admin data",
          variant: "destructive",
        });
      } finally {
        setLoadingUsers(false);
      }
    };

    loadAdminData();
  }, [isAdmin, toast]);

  // Load influencers data
  useEffect(() => {
    const loadInfluencers = async () => {
      if (!isAdmin) return;

      try {
        setLoadingInfluencers(true);
        
        // Get users with influencer role (focusing on influencer only since partner may not exist)
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .eq('role', 'influencer');

        if (rolesError) throw rolesError;

        // Get auth users for email
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) throw authError;

        // Get user profiles
        const { data: profilesData, error: profilesError } = await supabase
          .from('user_profiles')
          .select('user_id, first_name, last_name, followers_count');

        if (profilesError) throw profilesError;

        // Get follower counts for each user individually
        const followerCounts: Record<string, number> = {};
        if (rolesData && rolesData.length > 0) {
          for (const roleData of rolesData) {
            const { count, error: countError } = await supabase
              .from('user_follows')
              .select('*', { count: 'exact', head: true })
              .eq('followed_user_id', roleData.user_id);
            
            if (!countError) {
              followerCounts[roleData.user_id] = count || 0;
            }
          }
        }

        // Build influencer data
        const influencersList: Influencer[] = rolesData?.map(roleData => {
          const authUser = authUsers && authUsers.users ? authUsers.users.find((u: any) => u.id === roleData.user_id) : null;
          const profile = profilesData?.find(p => p.user_id === roleData.user_id);
          const followerCount = followerCounts[roleData.user_id] || 0;
          
          if (!authUser) return null;

          const name = profile?.first_name || profile?.last_name 
            ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
            : 'No name set';

          return {
            id: roleData.user_id,
            email: authUser.email || '',
            name,
            status: 'active' as const, // Default status
            followers: followerCount,
            productsPromoted: Math.floor(Math.random() * 10), // Placeholder
            role: 'influencer' as const,
            isVerified: Math.random() > 0.5, // Random verification status
            created_at: authUser.created_at,
            profiles: profile ? {
              first_name: profile.first_name,
              last_name: profile.last_name,
              followers_count: profile.followers_count
            } : undefined,
            user_roles: [{ role: roleData.role }]
          };
        }).filter(Boolean) as Influencer[] || [];

        setInfluencers(influencersList);
        setFilteredInfluencers(influencersList);

      } catch (error) {
        console.error('Error loading influencers:', error);
        toast({
          title: "Error",
          description: "Failed to load influencer data",
          variant: "destructive",
        });
      } finally {
        setLoadingInfluencers(false);
      }
    };

    loadInfluencers();
  }, [isAdmin, toast]);

  // Filter influencers based on search and status
  useEffect(() => {
    let filtered = influencers;

    if (influencerSearch) {
      const searchLower = influencerSearch.toLowerCase();
      filtered = filtered.filter(inf => 
        inf.name.toLowerCase().includes(searchLower) ||
        inf.email.toLowerCase().includes(searchLower)
      );
    }

    if (influencerStatusFilter !== 'all') {
      filtered = filtered.filter(inf => inf.status === influencerStatusFilter);
    }

    setFilteredInfluencers(filtered);
  }, [influencers, influencerSearch, influencerStatusFilter]);

  const handleRoleChange = (userId: string, userName: string, newRole: 'admin' | 'moderator' | 'user') => {
    setRoleChangeDialog({
      isOpen: true,
      userId,
      userName,
      newRole
    });
  };

  const confirmRoleChange = async () => {
    const { userId, newRole } = roleChangeDialog;
    try {
      // Remove existing roles
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Add new role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole });

      if (error) throw error;

      // Update local state
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, user_roles: [{ role: newRole }] }
          : user
      ));

      toast({
        title: "Success",
        description: `User role updated to ${newRole}`,
      });

      setRoleChangeDialog({ isOpen: false, userId: '', userName: '', newRole: 'user' });
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    }
  };

  // Influencer management functions
  const handleInfluencerRoleChange = (userId: string, userName: string, newRole: 'influencer' | 'none') => {
    setInfluencerActionDialog({
      isOpen: true,
      type: 'role-change',
      userId,
      userName,
      newRole
    });
  };

  const handleInfluencerSuspend = (userId: string, userName: string) => {
    setInfluencerActionDialog({
      isOpen: true,
      type: 'suspend',
      userId,
      userName
    });
  };

  const handleInfluencerVerify = (userId: string, userName: string) => {
    setInfluencerActionDialog({
      isOpen: true,
      type: 'verify',
      userId,
      userName
    });
  };

  const confirmInfluencerAction = async () => {
    const { type, userId, newRole } = influencerActionDialog;
    
    try {
      if (type === 'role-change') {
        if (newRole === 'none') {
          // Remove influencer role
          await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', userId)
            .eq('role', 'influencer');
        } else {
          // Add influencer role
          await supabase
            .from('user_roles')
            .insert({ user_id: userId, role: newRole });
        }
        
        // Update local state
        setInfluencers(prev => prev.map(inf => 
          inf.id === userId 
            ? { ...inf, role: newRole, user_roles: newRole !== 'none' ? [{ role: newRole }] : [] }
            : inf
        ));
        
        toast({
          title: "Success",
          description: `Influencer role updated to ${newRole}`,
        });
      } else if (type === 'verify') {
        // Update verification status
        setInfluencers(prev => prev.map(inf => 
          inf.id === userId 
            ? { ...inf, isVerified: true }
            : inf
        ));
        
        toast({
          title: "Success",
          description: "Influencer verified successfully",
        });
      } else if (type === 'suspend') {
        // Update suspension status
        setInfluencers(prev => prev.map(inf => 
          inf.id === userId 
            ? { ...inf, status: 'suspended' }
            : inf
        ));
        
        toast({
          title: "Success",
          description: "Influencer suspended",
        });
      }
      
      setInfluencerActionDialog({ 
        isOpen: false, 
        type: 'role-change', 
        userId: '', 
        userName: '', 
        newRole: 'none' 
      });
    } catch (error) {
      console.error('Error performing influencer action:', error);
      toast({
        title: "Error",
        description: "Failed to perform action",
        variant: "destructive",
      });
    }
  };

  const activateAdminAccess = async () => {
    setActivatingAdmin(true);
    try {
      const { data, error } = await supabase.functions.invoke('activate-admin');
      
      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Admin access activated successfully",
      });

      // Reload the page to refresh role check
      window.location.reload();
    } catch (error) {
      console.error('Error activating admin access:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to activate admin access",
        variant: "destructive",
      });
    } finally {
      setActivatingAdmin(false);
    }
  };

  // Show loading while checking authentication and admin status
  if (loading || isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Show admin activation if user has no roles
  if (!isAdmin && !hasAnyRole) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Key className="w-12 h-12 mx-auto text-primary mb-4" />
            <CardTitle>Admin Access Required</CardTitle>
            <CardDescription>
              No admin role detected. If you're the system administrator, you can activate admin access below.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Button 
              onClick={activateAdminAccess}
              disabled={activatingAdmin}
              className="w-full"
            >
              {activatingAdmin ? 'Activating...' : 'Activate Admin Access'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.history.back()}
              className="w-full"
            >
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Block access if not admin but has other roles
  if (!isAdmin && hasAnyRole) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="w-12 h-12 mx-auto text-destructive mb-4" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have administrator privileges to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => window.history.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage users, content, and system settings</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Growth</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats.weeklyGrowth}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Growth</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats.monthlyGrowth}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="influencers" className="flex items-center gap-2">
            <Crown className="w-4 h-4" />
            Influencers
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            System
          </TabsTrigger>
          <TabsTrigger value="tools" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Tools
          </TabsTrigger>
        </TabsList>

        {/* User Management Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage user accounts, roles, and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {user.profiles?.first_name || user.profiles?.last_name 
                                ? `${user.profiles.first_name || ''} ${user.profiles.last_name || ''}`.trim()
                                : 'No name set'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              ID: {user.id.slice(0, 8)}...
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {user.user_roles?.map((role, index) => (
                              <Badge 
                                key={index}
                                variant={role.role === 'admin' ? 'default' : 'secondary'}
                              >
                                {role.role}
                              </Badge>
                            )) || <Badge variant="outline">user</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={user.user_roles?.[0]?.role || 'user'}
                            onValueChange={(value) => {
                              const userName = user.profiles?.first_name || user.profiles?.last_name 
                                ? `${user.profiles.first_name || ''} ${user.profiles.last_name || ''}`.trim()
                                : user.email;
                              handleRoleChange(user.id, userName, value as 'admin' | 'moderator' | 'user');
                            }}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="moderator">Moderator</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Influencer Management Tab */}
        <TabsContent value="influencers">
          <Card>
            <CardHeader>
              <CardTitle>Influencer Management</CardTitle>
              <CardDescription>
                Manage influencer applications, approvals, and roles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={influencerSearch}
                    onChange={(e) => setInfluencerSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={influencerStatusFilter} onValueChange={setInfluencerStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Influencers Table */}
              {loadingInfluencers ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredInfluencers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Crown className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No influencers found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Followers</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInfluencers.map((influencer) => (
                      <TableRow key={influencer.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-medium">{influencer.name}</div>
                              <div className="text-sm text-muted-foreground">
                                ID: {influencer.id.slice(0, 8)}...
                              </div>
                            </div>
                            {influencer.isVerified && (
                              <Badge variant="secondary" className="ml-2">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{influencer.email}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              influencer.status === 'active' ? 'default' :
                              influencer.status === 'pending' ? 'secondary' :
                              'destructive'
                            }
                          >
                            {influencer.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{influencer.followers}</TableCell>
                        <TableCell>{influencer.productsPromoted}</TableCell>
                        <TableCell>
                          <Select
                            value={influencer.role}
                            onValueChange={(value) => 
                              handleInfluencerRoleChange(
                                influencer.id, 
                                influencer.name, 
                                value as 'influencer' | 'none'
                              )
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="influencer">Influencer</SelectItem>
                              <SelectItem value="none">None</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => window.open(`/profile/${influencer.id}`, '_blank')}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {!influencer.isVerified && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleInfluencerVerify(influencer.id, influencer.name)}
                              >
                                <Star className="w-4 h-4" />
                              </Button>
                            )}
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleInfluencerSuspend(influencer.id, influencer.name)}
                            >
                              <Ban className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>System Analytics</CardTitle>
              <CardDescription>
                View detailed analytics and metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Advanced analytics dashboard coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>System Monitoring</CardTitle>
              <CardDescription>
                Monitor system health and view logs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>System monitoring dashboard coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admin Tools Tab */}
        <TabsContent value="tools">
          <Card>
            <CardHeader>
              <CardTitle>Admin Tools</CardTitle>
              <CardDescription>
                Administrative utilities and maintenance tools
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                  <Database className="w-6 h-6" />
                  <span>Clear Test Data</span>
                </Button>
                
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                  <AlertTriangle className="w-6 h-6" />
                  <span>Maintenance Mode</span>
                </Button>
                
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                  <Settings className="w-6 h-6" />
                  <span>Feature Flags</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Role Change Confirmation Dialog */}
      <AlertDialog open={roleChangeDialog.isOpen} onOpenChange={(open) => 
        setRoleChangeDialog(prev => ({ ...prev, isOpen: open }))
      }>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Role Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change <strong>{roleChangeDialog.userName}</strong>'s role to{' '}
              <strong>{roleChangeDialog.newRole}</strong>? This action will immediately affect their permissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange}>
              Confirm Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Influencer Action Confirmation Dialog */}
      <AlertDialog open={influencerActionDialog.isOpen} onOpenChange={(open) => 
        setInfluencerActionDialog(prev => ({ ...prev, isOpen: open }))
      }>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {influencerActionDialog.type === 'verify' && 'Verify Influencer'}
              {influencerActionDialog.type === 'suspend' && 'Suspend Influencer'}
              {influencerActionDialog.type === 'role-change' && 'Change Role'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {influencerActionDialog.type === 'verify' && 
                `Are you sure you want to verify ${influencerActionDialog.userName} as an influencer?`}
              {influencerActionDialog.type === 'suspend' && 
                `Are you sure you want to suspend ${influencerActionDialog.userName}?`}
              {influencerActionDialog.type === 'role-change' && 
                `Change ${influencerActionDialog.userName}'s role to ${influencerActionDialog.newRole}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmInfluencerAction}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDashboard;