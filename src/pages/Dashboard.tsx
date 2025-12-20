import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, Users, Wrench, User, RefreshCw, Award, CheckCircle2, Clock } from 'lucide-react';

interface TechnicianPerformance {
  technician_name: string;
  assigned_count: number;
  in_progress_count: number;
  completed_count: number;
  total_active: number;
  completion_rate: number;
  efficiency_score: number;
}

// Hardcoded technician list matching Defects page
const TECHNICIANS = [
  { value: 'nevzat', label: 'Nevzat' },
  { value: 'mustafa', label: 'Mustafa' },
  { value: 'hasan', label: 'Hasan' }
];

export default function Dashboard() {
  const [performanceData, setPerformanceData] = useState<TechnicianPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPerformanceData();
    
    // Subscribe to real-time updates for both defects and service requests
    const defectsChannel = supabase
      .channel('defects-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_74b74e94ab_defects'
        },
        () => {
          fetchPerformanceData();
        }
      )
      .subscribe();

    const serviceChannel = supabase
      .channel('service-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_74b74e94ab_service_requests'
        },
        () => {
          fetchPerformanceData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(defectsChannel);
      supabase.removeChannel(serviceChannel);
    };
  }, []);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all defects
      const { data: defects, error: defectsError } = await supabase
        .from('app_74b74e94ab_defects')
        .select('*');

      if (defectsError) throw defectsError;

      // Fetch all service requests
      const { data: serviceRequests, error: serviceError } = await supabase
        .from('app_74b74e94ab_service_requests')
        .select('*');

      if (serviceError) throw serviceError;

      // Extract technician name from defect description
      const extractTechnicianName = (description: string): string | null => {
        const match = description.match(/Teknisyen:\s*(\w+)/i);
        return match ? match[1] : null;
      };

      // Process data for each technician
      const techPerformance = TECHNICIANS.map(tech => {
        // Count defects assigned to this technician
        const techDefects = defects?.filter(d => {
          const techName = extractTechnicianName(d.description || '');
          return techName?.toLowerCase() === tech.label.toLowerCase();
        }) || [];

        // Get device IDs for this technician's defects
        const deviceIds = techDefects.map(d => d.device_id);

        // Count service requests for these devices
        const techServices = serviceRequests?.filter(sr => 
          deviceIds.includes(sr.device_id)
        ) || [];

        const sent = techServices.filter(s => s.status === 'sent').length;
        const inProgress = techServices.filter(s => s.status === 'in_progress').length;
        const completed = techServices.filter(s => s.status === 'completed').length;
        const totalTasks = techDefects.length + completed;
        
        // Calculate completion rate (completed / total tasks)
        const completionRate = totalTasks > 0 ? (completed / totalTasks) * 100 : 0;
        
        // Calculate efficiency score (weighted: 40% completion rate + 60% workload management)
        const workloadScore = techDefects.length > 0 ? Math.max(0, 100 - (techDefects.length * 10)) : 100;
        const efficiencyScore = (completionRate * 0.4) + (workloadScore * 0.6);

        return {
          technician_name: tech.label,
          assigned_count: techDefects.length,
          in_progress_count: inProgress,
          completed_count: completed,
          total_active: techDefects.length + inProgress,
          completion_rate: completionRate,
          efficiency_score: efficiencyScore
        };
      });

      // Sort by efficiency score (descending)
      techPerformance.sort((a, b) => b.efficiency_score - a.efficiency_score);
      
      setPerformanceData(techPerformance);
    } catch (err) {
      console.error('Error fetching performance data:', err);
      setError('Performans verileri yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const getTotalStats = () => {
    return {
      totalTechnicians: performanceData.length,
      totalActive: performanceData.reduce((sum, tech) => sum + tech.total_active, 0),
      totalCompleted: performanceData.reduce((sum, tech) => sum + tech.completed_count, 0),
      avgEfficiency: performanceData.length > 0 
        ? performanceData.reduce((sum, tech) => sum + tech.efficiency_score, 0) / performanceData.length 
        : 0
    };
  };

  const getPerformanceBadge = (score: number) => {
    if (score >= 80) return { label: 'Mükemmel', color: 'bg-green-500' };
    if (score >= 60) return { label: 'İyi', color: 'bg-blue-500' };
    if (score >= 40) return { label: 'Orta', color: 'bg-yellow-500' };
    return { label: 'Düşük', color: 'bg-red-500' };
  };

  const stats = getTotalStats();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Anasayfa</h1>
            <p className="text-muted-foreground">Teknisyen performans takibi ve genel durum</p>
          </div>
          <Button onClick={fetchPerformanceData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenile
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Teknisyen</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTechnicians}</div>
              <p className="text-xs text-muted-foreground">Aktif teknisyen sayısı</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktif Görevler</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalActive}</div>
              <p className="text-xs text-muted-foreground">Devam eden toplam görev</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tamamlanan</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCompleted}</div>
              <p className="text-xs text-muted-foreground">Toplam tamamlanan görev</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ortalama Verimlilik</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgEfficiency.toFixed(0)}%</div>
              <p className="text-xs text-muted-foreground">Genel performans skoru</p>
            </CardContent>
          </Card>
        </div>

        {/* Technician Performance Cards */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">Teknisyen Performans Tabloları</h2>
          
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {performanceData.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  Henüz teknisyen performans verisi bulunmamaktadır.
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {performanceData.map((tech) => {
                const perfBadge = getPerformanceBadge(tech.efficiency_score);
                return (
                  <Card key={tech.technician_name} className="overflow-hidden border-2 hover:shadow-lg transition-shadow">
                    <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="h-5 w-5 text-primary" />
                          <CardTitle className="text-lg">{tech.technician_name}</CardTitle>
                        </div>
                        <Badge className={perfBadge.color}>
                          {perfBadge.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      {/* Efficiency Score */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Verimlilik Skoru</span>
                          <span className="font-bold text-lg">{tech.efficiency_score.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              tech.efficiency_score >= 80 ? 'bg-green-500' :
                              tech.efficiency_score >= 60 ? 'bg-blue-500' :
                              tech.efficiency_score >= 40 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${tech.efficiency_score}%` }}
                          />
                        </div>
                      </div>

                      {/* Completion Rate */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Tamamlama Oranı</span>
                          <span className="font-semibold">{tech.completion_rate.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full bg-blue-500 transition-all"
                            style={{ width: `${tech.completion_rate}%` }}
                          />
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <span className="text-xs text-blue-600 font-medium">Atanan</span>
                          </div>
                          <div className="text-2xl font-bold text-blue-700">{tech.assigned_count}</div>
                        </div>

                        <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                          <div className="flex items-center gap-2 mb-1">
                            <Wrench className="h-4 w-4 text-yellow-600" />
                            <span className="text-xs text-yellow-600 font-medium">Devam Eden</span>
                          </div>
                          <div className="text-2xl font-bold text-yellow-700">{tech.in_progress_count}</div>
                        </div>

                        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <span className="text-xs text-green-600 font-medium">Tamamlanan</span>
                          </div>
                          <div className="text-2xl font-bold text-green-700">{tech.completed_count}</div>
                        </div>

                        <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                          <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="h-4 w-4 text-orange-600" />
                            <span className="text-xs text-orange-600 font-medium">Aktif Toplam</span>
                          </div>
                          <div className="text-2xl font-bold text-orange-700">{tech.total_active}</div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="pt-2 border-t">
                        <Badge 
                          variant="outline"
                          className={`w-full justify-center ${
                            tech.total_active === 0 ? 'bg-gray-100 text-gray-700 border-gray-300' :
                            tech.total_active > 5 ? 'bg-red-100 text-red-700 border-red-300' :
                            'bg-blue-100 text-blue-700 border-blue-300'
                          }`}
                        >
                          {tech.total_active === 0 ? '✓ Müsait' : 
                           tech.total_active > 5 ? '⚠ Yoğun' : 
                           '● Aktif'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}