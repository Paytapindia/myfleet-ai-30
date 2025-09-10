import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, CheckCircle, XCircle, Clock, Database } from 'lucide-react';
import { useDirectApi } from '@/hooks/useDirectApi';

interface TestResult {
  success: boolean;
  status?: string;
  cached?: boolean;
  verifiedAt?: string;
  data?: any;
  error?: string;
  executionTime?: number;
}

export const ApiTestPanel = () => {
  const { healthCheck, verifyRC, verifyFastag, verifyChallan } = useDirectApi();
  
  const [vehicleNumber, setVehicleNumber] = useState('KA03NC5479');
  const [chassisNumber, setChassisNumber] = useState('MDHFBUK13J2802163');
  const [engineNumber, setEngineNumber] = useState('791511D');
  const [forceRefresh, setForceRefresh] = useState(false);
  
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    setLoading(prev => ({ ...prev, [testName]: true }));
    const startTime = Date.now();
    
    try {
      const result = await testFn();
      const executionTime = Date.now() - startTime;
      
      setResults(prev => ({
        ...prev,
        [testName]: {
          ...result,
          executionTime
        }
      }));
    } catch (error: any) {
      setResults(prev => ({
        ...prev,
        [testName]: {
          success: false,
          error: error.message,
          executionTime: Date.now() - startTime
        }
      }));
    } finally {
      setLoading(prev => ({ ...prev, [testName]: false }));
    }
  };

  const getStatusIcon = (result?: TestResult) => {
    if (!result) return <Clock className="h-4 w-4 text-muted-foreground" />;
    if (result.success) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusBadge = (result?: TestResult) => {
    if (!result) return <Badge variant="secondary">Not tested</Badge>;
    if (result.success) {
      return (
        <div className="flex gap-2">
          <Badge variant="default">Success</Badge>
          {result.cached && <Badge variant="outline"><Database className="h-3 w-3 mr-1" />Cached</Badge>}
        </div>
      );
    }
    return <Badge variant="destructive">Failed</Badge>;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Lambda API Integration Test Panel</CardTitle>
          <CardDescription>
            Test all Vehicle Manager Lambda services directly from the frontend
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vehicle">Vehicle Number</Label>
              <Input 
                id="vehicle"
                value={vehicleNumber} 
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="KA03NC5479"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chassis">Chassis Number</Label>
              <Input 
                id="chassis"
                value={chassisNumber} 
                onChange={(e) => setChassisNumber(e.target.value)}
                placeholder="MDHFBUK13J2802163"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="engine">Engine Number</Label>
              <Input 
                id="engine"
                value={engineNumber} 
                onChange={(e) => setEngineNumber(e.target.value)}
                placeholder="791511D"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              id="forceRefresh" 
              checked={forceRefresh}
              onChange={(e) => setForceRefresh(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="forceRefresh">Force Refresh (bypass cache)</Label>
          </div>

          <Separator />

          {/* Test Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              onClick={() => runTest('health', healthCheck)}
              disabled={loading.health}
              variant="outline"
              className="h-auto flex-col py-4"
            >
              {loading.health ? <Loader2 className="h-4 w-4 animate-spin mb-2" /> : getStatusIcon(results.health)}
              Health Check
            </Button>

            <Button
              onClick={() => runTest('rc', () => verifyRC(vehicleNumber, forceRefresh))}
              disabled={loading.rc || !vehicleNumber}
              variant="outline"
              className="h-auto flex-col py-4"
            >
              {loading.rc ? <Loader2 className="h-4 w-4 animate-spin mb-2" /> : getStatusIcon(results.rc)}
              RC Verification
            </Button>

            <Button
              onClick={() => runTest('fastag', () => verifyFastag(vehicleNumber, forceRefresh))}
              disabled={loading.fastag || !vehicleNumber}
              variant="outline"
              className="h-auto flex-col py-4"
            >
              {loading.fastag ? <Loader2 className="h-4 w-4 animate-spin mb-2" /> : getStatusIcon(results.fastag)}
              FASTag Verification
            </Button>

            <Button
              onClick={() => runTest('challans', () => verifyChallan(vehicleNumber, chassisNumber, engineNumber, forceRefresh))}
              disabled={loading.challans || !vehicleNumber || !chassisNumber || !engineNumber}
              variant="outline"
              className="h-auto flex-col py-4"
            >
              {loading.challans ? <Loader2 className="h-4 w-4 animate-spin mb-2" /> : getStatusIcon(results.challans)}
              Challans Verification
            </Button>
          </div>

          <Separator />

          {/* Results */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Test Results</h3>
            
            {Object.entries(results).map(([testName, result]) => (
              <Card key={testName}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="capitalize text-base">{testName} Test</CardTitle>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(result)}
                      {result.executionTime && (
                        <Badge variant="outline">{result.executionTime}ms</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {result.success ? (
                    <div className="space-y-2">
                      {result.verifiedAt && (
                        <p className="text-sm text-muted-foreground">
                          Verified at: {new Date(result.verifiedAt).toLocaleString()}
                        </p>
                      )}
                      {result.data && (
                        <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-40">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  ) : (
                    <div className="text-red-600 text-sm">
                      <p className="font-medium">Error:</p>
                      <p>{result.error}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};