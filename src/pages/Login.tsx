import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth, validateCredentials } from "@/contexts/AuthContext";
import { PWAInstallPrompt } from "@/components/common/PWAInstallPrompt";
import { toast } from "@/components/ui/use-toast";

const generateOtp = (length = 6): string => {
  const digits = "0123456789";
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
};

const isValidOtp = (value: string) => /^\d{6}$/.test(value);

const OTP_EMAIL = "balajieng.works12@gmail.com";
const OTP_SUBJECT = "Your BalajiBook login OTP";

const sendOtp = async (otp: string) => {
  const response = await fetch("https://otp-khaki-iota.vercel.app/send-mail", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: OTP_EMAIL,
      subject: OTP_SUBJECT,
      message: `Your one-time password (OTP) for BalajiBook login is: ${otp}`,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to send OTP");
  }
};

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [step, setStep] = useState<"CREDENTIALS" | "OTP">("CREDENTIALS");
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated, user } = useAuth();

  // Redirect if already authenticated
  if (isAuthenticated && user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (step === "CREDENTIALS") {
      setIsLoading(true);
      try {
        const userData = validateCredentials(username.trim(), password.trim());
        if (!userData) {
          setError('Invalid username or password');
          return;
        }

        const newOtp = generateOtp();
        await sendOtp(newOtp);
        setGeneratedOtp(newOtp);
        setOtp('');
        setStep("OTP");

        toast({
          title: "OTP sent",
          description: "Enter the 6-digit code sent to your registered email.",
        });
      } catch (err) {
        setError('Failed to send OTP. Please try again.');
      } finally {
        setIsLoading(false);
      }
    } else {
      if (!generatedOtp) {
        setError('OTP expired. Please restart the login process.');
        setStep("CREDENTIALS");
        setOtp('');
        return;
      }

      const normalizedOtp = otp.trim();

      if (!isValidOtp(normalizedOtp)) {
        setError('Please enter a valid 6-digit numeric OTP.');
        return;
      }

      if (normalizedOtp !== generatedOtp) {
        setError('Invalid OTP. Please try again.');
        return;
      }

      setIsLoading(true);
      try {
        const success = login(username, password);
        if (!success) {
          setError('Session expired. Please login again.');
          setStep("CREDENTIALS");
          setGeneratedOtp(null);
          setOtp('');
        }
      } catch (err) {
        setError('An error occurred during login');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4">
{/*             <span className="text-white font-bold text-2xl">B</span> */}
            <img 
            src="https://5.imimg.com/data5/YD/VE/MY-27589869/balaji-engineering-works-90x90.jpg" 
            alt="App Icon" 
            className="w-12 h-12 rounded-lg flex-shrink-0"
          />
          </div>
          <h1 className="text-3xl font-bold text-foreground">BalajiBook</h1>
          <p className="text-muted-foreground">Sign in to your account</p>
        </div>

        <Card className="shadow-card">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">
              {step === "CREDENTIALS" ? 'Welcome back' : 'Verify OTP'}
            </CardTitle>
            <CardDescription className="text-center">
              {step === "CREDENTIALS"
                ? 'Enter your credentials to access your dashboard'
                : 'For your security, we have sent a one-time password to your email.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {step === "CREDENTIALS" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 bg-primary text-primary-foreground font-medium hover:bg-primary/90"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Sending OTP...' : 'Send OTP'}
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-2 text-center">
                    <p className="text-sm text-muted-foreground">
                      Enter the 6-digit OTP sent to your registered email to complete login.
                    </p>
                  </div>

                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={otp}
                      onChange={(value) => setOtp(value)}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setStep("CREDENTIALS");
                        setGeneratedOtp(null);
                        setOtp('');
                        setError('');
                      }}
                    >
                      Change account
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          setError('');
                          if (!username || !password) {
                            setStep("CREDENTIALS");
                            setGeneratedOtp(null);
                            setOtp('');
                            return;
                          }
                          try {
                            setIsLoading(true);
                            const newOtp = generateOtp();
                            await sendOtp(newOtp);
                            setGeneratedOtp(newOtp);
                            setOtp('');
                            toast({
                              title: "OTP resent",
                              description: "We have sent a new OTP to your email.",
                            });
                          } catch {
                            setError('Failed to resend OTP. Please try again.');
                          } finally {
                            setIsLoading(false);
                          }
                        }}
                        disabled={isLoading}
                      >
                        Resend OTP
                      </Button>
                      <Button
                        type="submit"
                        className="h-11 bg-primary text-primary-foreground font-medium hover:bg-primary/90"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Verifying...' : 'Verify & Sign in'}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </form>

{/* 
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h4 className="font-medium text-sm mb-2">Demo Credentials:</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>Admin: username "admin", password "123"</div>
                <div>User: username "user", password "123"</div>
              </div>
            </div> */}
          </CardContent>
        </Card>
      </div>
      
      <PWAInstallPrompt />
    </div>
  );
};
