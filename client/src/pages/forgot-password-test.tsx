import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Test page for forgot password functionality
export default function ForgotPasswordTestPage() {
  const [email, setEmail] = useState('demo@user.com');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const testForgotPassword = async () => {
    setIsLoading(true);
    setResult('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      setResult(`Status: ${response.status}\nResponse: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      setResult(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Test Forgot Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email:</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email to test"
            />
          </div>
          
          <Button 
            onClick={testForgotPassword}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Testing...' : 'Test Forgot Password'}
          </Button>
          
          {result && (
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Result:</label>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-48">
                {result}
              </pre>
            </div>
          )}
          
          <div className="text-sm text-gray-600">
            <p><strong>How to test:</strong></p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Click "Test Forgot Password" with demo@user.com</li>
              <li>Check the server console for the reset link</li>
              <li>Copy the reset token from the logs</li>
              <li>Navigate to /reset-password?token=&lt;token&gt;</li>
              <li>Enter a new password and confirm</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}