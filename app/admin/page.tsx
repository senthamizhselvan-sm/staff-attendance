// admin/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  RefreshCw,
  Phone,
  UserCheck,
  FileText,
  LogOut,
  User,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import QRDisplay from '@/components/QRDisplay';
import * as XLSX from 'xlsx';

interface DutyRecord {
  id: number;
  assigned_staff_name: string;
  reported_staff_name: string | null;
  hall_no: string | null;
  duty_date: string;
  mobile_number: string;
  checkin_time: string | null;
  submission_time: string | null;
  status: string | null;
}

export default function AdminDashboard() {
  const [refreshing, setRefreshing] = useState(false);
  const [dutyRecords, setDutyRecords] = useState<DutyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, username, loading: authLoading, logout } = useAuth();
  const { toast } = useToast();

  // Fetch data from API
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all duty records
      const response = await fetch(' https://staff-attendance-1.onrender.com/duty/all');
      if (response.ok) {
        const data = await response.json();
        setDutyRecords(data);
      } else {
        throw new Error('Failed to fetch duty records');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch data from server',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
    toast({
      title: 'Logged Out',
      description: 'You have been successfully logged out',
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleExport = () => {
    const dutyDate = new Date().toLocaleDateString('en-CA');
    
    // Prepare data for Excel export
    const excelData = dutyRecords.map(record => ({
      'Assigned Staff': record.assigned_staff_name,
      'Reported Staff': record.reported_staff_name || 'Not reported',
      'Hall Number': record.hall_no || 'Not assigned',
      'Duty Date': record.duty_date,
      'Mobile Number': record.mobile_number,
      'Check-in Time': record.checkin_time || 'Not checked in',
      'Submission Time': record.submission_time || 'Not submitted',
      'Status': record.status || 'Not checked in',
      'Is Proxy': record.reported_staff_name && record.reported_staff_name !== record.assigned_staff_name ? 'Yes' : 'No'
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Add summary data
    const summaryData = [
      { 'Summary': 'Total Assignments', 'Count': dutyRecords.length },
      { 'Summary': 'Checked In', 'Count': dutyRecords.filter((d) => d.checkin_time).length },
      { 'Summary': 'Submitted', 'Count': dutyRecords.filter((d) => d.submission_time).length },
      { 'Summary': 'Proxy Check-ins', 'Count': dutyRecords.filter((d) => d.reported_staff_name && d.reported_staff_name !== d.assigned_staff_name).length },
      { 'Summary': 'Not Checked In', 'Count': dutyRecords.filter((d) => !d.checkin_time).length },
      { 'Summary': 'Export Date', 'Count': dutyDate }
    ];

    const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);

    // Add worksheets to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Duty Records');
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invigilation-report-${dutyDate}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Export Successful',
      description: 'Excel report has been downloaded successfully.',
    });
  };

  const getStatusBadge = (record: DutyRecord) => {
    if (record.status === 'Submitted' || record.submission_time) {
      return <Badge className="bg-green-100 text-green-800">Submitted</Badge>;
    } else if (record.status === 'Reported' || record.checkin_time) {
      // Check if it's a proxy case
      const isProxy =
        record.reported_staff_name &&
        record.reported_staff_name !== record.assigned_staff_name;
      return isProxy ? (
        <Badge className="bg-purple-100 text-purple-800">Proxy Check-in</Badge>
      ) : (
        <Badge className="bg-blue-100 text-blue-800">Checked In</Badge>
      );
    } else {
      return (
        <Badge className="bg-orange-100 text-orange-800">Not Checked In</Badge>
      );
    }
  };

  const getProxyBadge = (record: DutyRecord) => {
    if (
      record.reported_staff_name &&
      record.reported_staff_name !== record.assigned_staff_name
    ) {
      return <Badge className="bg-purple-100 text-purple-800">Proxy</Badge>;
    }
    return null;
  };

  // Calculate statistics - use current date
  const dutyDate = new Date().toLocaleDateString('en-CA');

  const todayRecords = dutyRecords.filter(
    (record) => record.duty_date === dutyDate
  );

  const stats = {
    totalAssignments: todayRecords.length,
    checkedIn: todayRecords.filter(
      (record) =>
        record.checkin_time &&
        (!record.reported_staff_name ||
          record.reported_staff_name === record.assigned_staff_name)
    ).length,
    submitted: todayRecords.filter(
      (record) => record.status === 'Submitted' || record.submission_time
    ).length,
    proxies: todayRecords.filter(
      (record) =>
        record.reported_staff_name &&
        record.reported_staff_name !== record.assigned_staff_name
    ).length,
    notCheckedIn: todayRecords.filter((record) => !record.checkin_time).length,
    pendingSubmission: todayRecords.filter(
      (record) =>
        record.checkin_time &&
        !record.submission_time &&
        (!record.reported_staff_name ||
          record.reported_staff_name === record.assigned_staff_name)
    ).length,
  };

  // Show loading or redirect if not authenticated
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useAuth hook
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Invigilation Admin Dashboard
          </h1>
          <p className="text-gray-600">
            Real-time duty tracking and management - {dutyDate}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Logged in as: <span className="font-medium">{username}</span>
          </p>
        </div>
        <div className="flex justify-center gap-2 items-center mb-6">
          <Button
            onClick={handleRefresh}
            variant="outline"
            disabled={refreshing}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
          <Button onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Assignments
                  </p>
                  <p className="text-2xl font-bold">{stats.totalAssignments}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Checked In
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.checkedIn}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Submitted</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.submitted}
                  </p>
                </div>
                <FileText className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Proxies</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {stats.proxies}
                  </p>
                </div>
                <UserCheck className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Not Checked In
                  </p>
                  <p className="text-2xl font-bold text-orange-600">
                    {stats.notCheckedIn}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Pending Submission
                  </p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats.pendingSubmission}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Emergency Alerts */}
        {stats.notCheckedIn > 0 && (
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {stats.notCheckedIn} absent case(s) recorded. Review required.
            </AlertDescription>
          </Alert>
        )}

        {stats.pendingSubmission > 0 && (
          <Alert className="mb-6">
            <Clock className="h-4 w-4" />
            <AlertDescription>
              {stats.pendingSubmission} staff member(s) have checked in but not
              submitted papers yet.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="today" className="space-y-4">
          <TabsList>
            <TabsTrigger value="today">Today's Duty</TabsTrigger>
            <TabsTrigger value="all">All Records</TabsTrigger>
            <TabsTrigger value="proxies">Proxy Cases</TabsTrigger>
          </TabsList>

          <TabsContent value="today">
            <Card>
              <CardHeader>
                <CardTitle>Today's Duty Status ({dutyDate})</CardTitle>
                <CardDescription>
                  Real-time duty tracking with proxy handling
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Assigned Staff</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Reported Staff</TableHead>
                      <TableHead>Hall</TableHead>
                      <TableHead>Check-in Time</TableHead>
                      <TableHead>Submit Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Mobile</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todayRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {record.assigned_staff_name}
                            </p>
                            {getProxyBadge(record)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {record.dept || record.department || 'Not specified'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {record.reported_staff_name || 'Not Checked In'}
                            </p>
                            {record.reported_staff_name &&
                              record.reported_staff_name !==
                                record.assigned_staff_name && (
                                <p className="text-sm text-purple-600">
                                  (Proxy)
                                </p>
                              )}
                          </div>
                        </TableCell>
                        <TableCell>{record.hall_no}</TableCell>
                        <TableCell>
                          {record.checkin_time ? (
                            <span className="text-sm text-green-600">
                              {record.checkin_time}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">
                              Not checked in
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {record.submission_time ? (
                            <span className="text-sm text-green-600">
                              {record.submission_time}
                            </span>
                          ) : record.checkin_time ? (
                            <span className="text-sm text-yellow-600">
                              Pending
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">
                              Not applicable
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(record)}</TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600 font-mono">
                            {record.mobile_number || 'N/A'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all">
            <Card>
              <CardHeader>
                <CardTitle>All Duty Records</CardTitle>
                <CardDescription>
                  Complete history of all duty assignments and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Assigned Staff</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Reported Staff</TableHead>
                      <TableHead>Hall</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Mobile</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dutyRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{record.duty_date}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {record.assigned_staff_name}
                            </p>
                            {getProxyBadge(record)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {record.dept || record.department || 'Not specified'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {record.reported_staff_name || 'Not Checked In'}
                            </p>
                            {record.reported_staff_name &&
                              record.reported_staff_name !==
                                record.assigned_staff_name && (
                                <p className="text-sm text-purple-600">
                                  (Proxy)
                                </p>
                              )}
                          </div>
                        </TableCell>
                        <TableCell>{record.hall_no}</TableCell>
                        <TableCell>{getStatusBadge(record)}</TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600 font-mono">
                            {record.mobile_number || 'N/A'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="proxies">
            <Card>
              <CardHeader>
                <CardTitle>Proxy Cases</CardTitle>
                <CardDescription>
                  All cases where proxy staff reported for absent colleagues
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Absent Staff</TableHead>
                      <TableHead>Proxy Staff</TableHead>
                      <TableHead>Hall</TableHead>
                      <TableHead>Check-in Time</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dutyRecords
                      .filter(
                        (record) =>
                          record.reported_staff_name &&
                          record.reported_staff_name !==
                            record.assigned_staff_name
                      )
                      .map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>{record.duty_date}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {record.assigned_staff_name}
                              </p>
                              <p className="text-sm text-orange-600">
                                (Absent)
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {record.reported_staff_name}
                              </p>
                              <p className="text-sm text-purple-600">(Proxy)</p>
                            </div>
                          </TableCell>
                          <TableCell>{record.hall_no}</TableCell>
                          <TableCell>
                            {record.checkin_time ? (
                              <span className="text-sm text-green-600">
                                {record.checkin_time}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">
                                Not checked in
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(record)}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
