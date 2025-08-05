'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  QrCode,
  Phone,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import QRDisplay from '@/components/QRDisplay';

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

export default function QRCheckInPage() {
  const [step, setStep] = useState<
    'scan' | 'verify' | 'submit' | 'success' | 'proxy' | 'reported'
  >('scan');
  const [mobileNumber, setMobileNumber] = useState('');
  const [attendanceType, setAttendanceType] = useState<'normal' | 'proxy'>(
    'normal'
  );
  const [absentTeacherMobile, setAbsentTeacherMobile] = useState('');
  const [proxyStaffName, setProxyStaffName] = useState('');
  const [emergencyReason, setEmergencyReason] = useState('');
  const [currentTeacher, setCurrentTeacher] = useState<any>(null);
  const [absentTeacher, setAbsentTeacher] = useState<any>(null);
  const [currentDuty, setCurrentDuty] = useState<DutyRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [isScannerSimulated, setIsScannerSimulated] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchTodayDuty = async () => {
      try {
        const response = await fetch('http://localhost:3000/duty/today');
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            // Set exam session info based on today's duty
            setExamSession({
              exam_name: 'Daily Invigilation Duty',
              time_slot: '09:00 AM - 12:00 PM',
              date: data[0].duty_date,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching today's duty:", error);
      }
    };
    fetchTodayDuty();
  }, []);

  // Refresh data when entering submit step
  useEffect(() => {
    if (step === 'submit' && mobileNumber) {
      refreshDutyData(mobileNumber);
    }
  }, [step, mobileNumber]);

  const [examSession, setExamSession] = useState<any>(null);

  // Helper function to refresh duty data
  const refreshDutyData = async (mobileNumber: string) => {
    try {
      const response = await fetch(
        `http://localhost:3000/duty/check-mobile/${mobileNumber}`
      );
      if (response.ok) {
        const result = await response.json();
        if (result.exists) {
          setCurrentDuty(result.duty);
          return result.duty;
        }
      }
    } catch (error) {
      console.error('Error refreshing duty data:', error);
    }
    return null;
  };

  const handleQRScan = () => {
    setIsScannerSimulated(true);
    toast({
      title: 'QR Code Scanned',
      description: 'Please enter your mobile number to verify identity',
    });
    setAttendanceType('normal');
    setStep('verify');
  };

  const handleMobileVerification = async () => {
    setLoading(true);

    try {
      // Get staff info first
      const staffResponse = await fetch(
        `http://localhost:3000/staff/by-mobile/${mobileNumber}`
      );

      if (!staffResponse.ok) {
        if (staffResponse.status === 404) {
          toast({
            title: 'Staff Not Found',
            description:
              'Mobile number not found in staff database. Please check the number and try again.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Verification Failed',
            description:
              'Error connecting to server. Please check if backend is running.',
            variant: 'destructive',
          });
        }
        setLoading(false);
        return;
      }

      const teacher = await staffResponse.json();
      setCurrentTeacher(teacher);

      // Set current duty from teacher data
      const initialDuty = {
        id: 0, // Will be set by backend
        assigned_staff_name: teacher.name,
        hall_no: teacher.hall,
        duty_date: teacher.duty_date,
        reported_staff_name: null,
        checkin_time: null,
        submission_time: null,
        mobile_number: teacher.mobile_no,
        status: null,
      };
      setCurrentDuty(initialDuty);

      // Try to check-in
      try {
        const reportResponse = await fetch(
          'http://localhost:3000/duty/report',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              mobile_number: mobileNumber,
            }),
          }
        );

        if (reportResponse.ok) {
          const reportResult = await reportResponse.json();

          // Update duty with the result
          if (reportResult.duty) {
            setCurrentDuty(reportResult.duty);
          }

          // Always go to submit step for first-time check-in
          setStep('submit');

          toast({
            title: 'Successfully Checked In',
            description:
              'You have been marked as present. You can now collect papers.',
          });
        } else {
          const errorData = await reportResponse.json();

          // Handle different error cases
          if (errorData.papersCollected) {
            setStep('success');
            toast({
              title: 'Papers Collected',
              description:
                'Papers have been collected for your hall. Please proceed to the exam centre.',
            });
          } else if (errorData.shouldSubmitPapers) {
            setCurrentDuty(errorData.duty);
            setStep('submit');
            toast({
              title: 'Already Checked In',
              description:
                'You have already checked in. Please proceed to submit papers.',
            });
          } else if (errorData.isProxy) {
            setCurrentDuty(errorData.duty);
            setStep('submit'); // Changed: Proxy cases should go to submit page
            toast({
              title: 'Proxy Check-in Found',
              description:
                'Proxy check-in found. Please proceed to submit papers.',
            });
          } else {
            // Fallback: still go to submit step even if there's an error
            setStep('submit');
            toast({
              title: 'Check-in Processed',
              description:
                errorData.message || 'Proceeding to paper submission.',
            });
          }
        }
      } catch (reportError) {
        console.error('Error during check-in:', reportError);
        // Fallback: go to submit step even if check-in fails
        setStep('submit');
        toast({
          title: 'Check-in Processed',
          description: 'Proceeding to paper submission.',
        });
      }
    } catch (error) {
      console.error('Network error:', error);
      toast({
        title: 'Connection Error',
        description:
          'Cannot connect to server. Please ensure the backend is running on port 3000.',
        variant: 'destructive',
      });
    }

    setLoading(false);
  };

  const handleSubmitPapers = async () => {
    setLoading(true);

    try {
      const response = await fetch('http://localhost:3000/duty/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mobile_number: mobileNumber,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Submit successful, result:', result);

        // Refresh duty data to get the latest submission time
        const refreshedDuty = await refreshDutyData(mobileNumber);
        console.log('Refreshed duty data after submit:', refreshedDuty);

        setStep('success');
        toast({
          title: 'Papers Submitted Successfully',
          description: 'Thank you for completing your duty!',
        });
      } else {
        const errorData = await response.json();
        toast({
          title: 'Submission Failed',
          description: errorData.message || 'Failed to submit papers',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error submitting papers:', error);
      toast({
        title: 'Submission Error',
        description: 'Failed to submit papers. Please try again.',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const handleProxyCheckIn = async () => {
    setLoading(true);

    try {
      // Process proxy check-in - absent staff mobile number must exist in duty list
      const proxyCheckInResponse = await fetch(
        'http://localhost:3000/duty/proxy',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            absent_mobile_number: absentTeacherMobile, // Use the absent staff's mobile number
            proxy_staff_name: proxyStaffName,
            emergency_reason: emergencyReason,
            // Note: proxy staff doesn't need to be in duty list
          }),
        }
      );

      if (proxyCheckInResponse.ok) {
        const result = await proxyCheckInResponse.json();
        // Refresh duty data using absent staff's mobile number
        await refreshDutyData(absentTeacherMobile);
        setStep('success');
        toast({
          title: 'Proxy Check-in Successful',
          description:
            'Successfully processed proxy check-in for absent colleague.',
        });
      } else {
        const errorData = await proxyCheckInResponse.json();
        toast({
          title: 'Proxy Check-in Failed',
          description: errorData.message || 'Failed to process proxy check-in',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error processing proxy check-in:', error);
      toast({
        title: 'Proxy Error',
        description: 'Failed to process proxy check-in. Please try again.',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  if (step === 'scan') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        {/* Admin Dashboard Link */}
        <div className="absolute top-4 right-4">
          <Button
            variant="outline"
            onClick={() => window.open('/admin/login', '_blank')}
            className="bg-white/80 backdrop-blur-sm"
          >
            Admin Dashboard
          </Button>
        </div>

        <div className="max-w-md mx-auto pt-20">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <QrCode className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">
                Invigilation Duty Check-in
              </CardTitle>
              <CardDescription>
                {examSession?.exam_name} - {examSession?.time_slot}
                {examSession?.date && <br />}
                {examSession?.date && `Date: ${examSession.date}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="w-48 h-48 mx-auto bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mb-4">
                  <div className="text-center">
                    <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">QR Code Scanner</p>
                  </div>
                </div>
                <Button onClick={handleQRScan} className="w-full" size="lg">
                  Simulate QR Scan
                </Button>
              </div>

              {!isScannerSimulated && (
                <div className="pt-4 border-t">
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent mt-2"
                    onClick={() => {
                      setAttendanceType('proxy');
                      setStep('proxy');
                    }}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Proxy Check-in for Absent Colleague
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'verify') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-md mx-auto pt-20">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Verify Identity
              </CardTitle>
              <CardDescription>
                Enter your mobile number to verify your identity and report for
                duty
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mobile">Your Mobile Number</Label>
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="Enter 10-digit mobile number"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  maxLength={10}
                />
              </div>

              <Button
                onClick={handleMobileVerification}
                className="w-full"
                disabled={mobileNumber.length !== 10 || loading}
              >
                {loading ? 'Verifying...' : 'Verify & Report'}
              </Button>

              <Button
                onClick={() => {
                  setStep('scan');
                  setMobileNumber('');
                  setCurrentTeacher(null);
                  setAbsentTeacher(null);
                  setCurrentDuty(null);
                  setIsScannerSimulated(false);
                }}
                variant="outline"
                className="w-full"
              >
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'submit') {
    // Check if this is a proxy case
    const isProxy =
      currentDuty?.reported_staff_name &&
      currentDuty?.reported_staff_name !== currentDuty?.assigned_staff_name;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-md mx-auto pt-20">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-500" />
                {isProxy ? 'Proxy Check-in Complete' : 'Submit Papers'}
              </CardTitle>
              <CardDescription>
                {isProxy
                  ? 'Proxy check-in found. Please submit the collected papers.'
                  : 'You have successfully checked in. Now please submit the collected papers.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm font-medium">Reported Staff:</p>
                <p className="text-lg">
                  {currentDuty?.assigned_staff_name ||
                    currentDuty?.reported_staff_name ||
                    currentTeacher?.name}
                </p>
                {isProxy && (
                  <p className="text-sm text-purple-600 font-medium">
                    (Proxy Check-in)
                  </p>
                )}
                <p className="text-sm text-gray-600">
                  Hall: {currentDuty?.hall_no}
                </p>
                <p className="text-sm text-gray-600">
                  Mobile:{' '}
                  {currentDuty?.mobile_number || currentTeacher?.mobile_no}
                </p>
                <p className="text-sm text-gray-600">
                  Checked in at: {currentDuty?.checkin_time || 'Not set'}
                </p>
              </div>

              {!isProxy && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    You have been marked as present. Please collect all answer
                    sheets and submit them.
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleSubmitPapers}
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Papers'}
              </Button>

              <Button
                onClick={() => {
                  setStep('scan');
                  setMobileNumber('');
                  setCurrentTeacher(null);
                  setAbsentTeacher(null);
                  setCurrentDuty(null);
                  setIsScannerSimulated(false);
                }}
                variant="outline"
                className="w-full"
              >
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'proxy') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-md mx-auto pt-20">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Proxy Check-in
              </CardTitle>
              <CardDescription>
                Check-in on behalf of an absent colleague
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Emergency proxy check-in procedure. Additional verification
                  required.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="absent-mobile">
                  Absent Staff Mobile Number
                </Label>
                <Input
                  id="absent-mobile"
                  type="tel"
                  placeholder="Enter absent staff's mobile number"
                  value={absentTeacherMobile}
                  onChange={(e) => setAbsentTeacherMobile(e.target.value)}
                  maxLength={10}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="proxy-name">Proxy Staff Name</Label>
                <Input
                  id="proxy-name"
                  type="text"
                  placeholder="Enter proxy staff name"
                  value={proxyStaffName}
                  onChange={(e) => setProxyStaffName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Emergency Reason</Label>
                <Select
                  value={emergencyReason}
                  onValueChange={setEmergencyReason}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medical">Medical Emergency</SelectItem>
                    <SelectItem value="family">Family Emergency</SelectItem>
                    <SelectItem value="transport">Transport Issues</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleProxyCheckIn}
                className="w-full"
                disabled={
                  !absentTeacherMobile ||
                  !proxyStaffName ||
                  !emergencyReason ||
                  loading
                }
              >
                {loading ? 'Processing...' : 'Confirm Proxy Check-in'}
              </Button>

              <Button
                onClick={() => {
                  setStep('scan');
                  setMobileNumber('');
                  setAbsentTeacherMobile('');
                  setProxyStaffName('');
                  setEmergencyReason('');
                  setCurrentTeacher(null);
                  setAbsentTeacher(null);
                  setCurrentDuty(null);
                  setIsScannerSimulated(false);
                }}
                variant="outline"
                className="w-full"
              >
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'reported') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-md mx-auto pt-20">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl text-blue-800">
                Successfully Reported!
              </CardTitle>
              <CardDescription className="text-blue-700">
                You have been marked as present
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold mb-2">Duty Details</h3>
                <div className="space-y-1 text-sm">
                  <p>
                    <strong>Staff:</strong> {currentDuty?.assigned_staff_name}
                  </p>
                  <p>
                    <strong>Hall:</strong> {currentDuty?.hall_no}
                  </p>
                  <p>
                    <strong>Mobile:</strong> {currentDuty?.mobile_number}
                  </p>
                  <p>
                    <strong>Date:</strong> {currentDuty?.duty_date}
                  </p>
                  {currentDuty?.checkin_time && (
                    <p>
                      <strong>Reported at:</strong> {currentDuty.checkin_time}
                    </p>
                  )}
                </div>
                <Badge variant="secondary" className="mt-2">
                  Reported
                </Badge>
              </div>
              <div className="text-center text-sm text-gray-600">
                <p>You can now collect answer sheets.</p>
                <p>Scan QR code again when ready to submit papers.</p>
              </div>
              <Button
                onClick={() => {
                  setStep('scan');
                  setMobileNumber('');
                  setCurrentTeacher(null);
                  setAbsentTeacher(null);
                  setCurrentDuty(null);
                  setIsScannerSimulated(false);
                }}
                className="w-full"
              >
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    // Determine the type of success
    const isProxy =
      currentDuty?.reported_staff_name &&
      currentDuty?.reported_staff_name !== currentDuty?.assigned_staff_name;
    const isSubmitted =
      currentDuty?.submission_time || currentDuty?.status === 'Submitted';
    const isJustCheckedIn =
      currentDuty?.checkin_time && !isSubmitted && !isProxy;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-md mx-auto pt-20">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Thank You!</CardTitle>
              <CardDescription>
                {isSubmitted
                  ? 'Papers submitted successfully!'
                  : isProxy
                  ? 'Proxy check-in completed successfully!'
                  : 'Check-in completed successfully!'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold mb-2">Duty Details</h3>
                <div className="space-y-1 text-sm">
                  <p>
                    <strong>Assigned:</strong>{' '}
                    {currentDuty?.assigned_staff_name}
                  </p>
                  <p>
                    <strong>Reported:</strong>{' '}
                    {currentDuty?.reported_staff_name}
                  </p>
                  {isProxy && (
                    <p className="text-sm text-purple-600 font-medium">
                      (Proxy Check-in)
                    </p>
                  )}
                  <p>
                    <strong>Hall:</strong> {currentDuty?.hall_no}
                  </p>
                  <p>
                    <strong>Mobile:</strong> {currentDuty?.mobile_number}
                  </p>
                  <p>
                    <strong>Date:</strong> {currentDuty?.duty_date}
                  </p>
                  {currentDuty?.checkin_time && (
                    <p>
                      <strong>Checked in at:</strong> {currentDuty.checkin_time}
                    </p>
                  )}
                  {currentDuty?.submission_time && (
                    <p>
                      <strong>Submitted at:</strong>{' '}
                      {currentDuty.submission_time}
                    </p>
                  )}
                </div>
                <Badge variant="secondary" className="mt-2">
                  {isSubmitted
                    ? 'Submitted'
                    : isProxy
                    ? 'Proxy Check-in'
                    : 'Checked In'}
                </Badge>
              </div>

              <Button
                onClick={() => {
                  setStep('scan');
                  setMobileNumber('');
                  setCurrentTeacher(null);
                  setAbsentTeacher(null);
                  setCurrentDuty(null);
                  setIsScannerSimulated(false);
                }}
                className="w-full"
              >
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}
