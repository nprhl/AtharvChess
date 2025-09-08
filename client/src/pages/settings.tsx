import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, GraduationCap, Clock, TrendingUp, RotateCcw, Palette, Gamepad2, LogOut, Lock, Eye, EyeOff } from "lucide-react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/theme-provider";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import TTSControls from '@/components/tts-controls';

interface Settings {
  hintsEnabled: boolean;
  focusMode: boolean;
  progressTracking: boolean;
  dailyPlayTime: number;
  breakReminders: number;
  difficulty: string;
  autoAdjustDifficulty: boolean;
  gameMode: 'pvp' | 'pvc';
  aiDifficulty: 'beginner' | 'intermediate' | 'advanced';
}

export default function SettingsPage() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useLocalStorage<Settings>('chess-settings', {
    hintsEnabled: true,
    focusMode: false,
    progressTracking: true,
    dailyPlayTime: 30,
    breakReminders: 15,
    difficulty: 'beginner',
    autoAdjustDifficulty: true,
    gameMode: 'pvc',
    aiDifficulty: 'beginner'
  });

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return apiRequest('/api/auth/change-password', {
        method: 'POST',
        body: data
      });
    },
    onSuccess: () => {
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully",
        duration: 3000
      });
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
        duration: 4000
      });
    }
  });

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    toast({
      title: "Setting updated",
      description: "Your preference has been saved",
      duration: 2000
    });
  };

  const resetSettings = () => {
    setSettings({
      hintsEnabled: true,
      focusMode: false,
      progressTracking: true,
      dailyPlayTime: 30,
      breakReminders: 15,
      difficulty: 'beginner',
      autoAdjustDifficulty: true,
      gameMode: 'pvc',
      aiDifficulty: 'beginner'
    });
    toast({
      title: "Settings reset",
      description: "All settings have been restored to defaults",
    });
  };

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields",
        variant: "destructive"
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive"
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "New password must be at least 6 characters long",
        variant: "destructive"
      });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    });
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  return (
    <section className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Parental Controls</h2>
        <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
          <Shield className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Learning Settings */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3 flex items-center text-card-foreground">
            <GraduationCap className="w-5 h-5 mr-2 text-blue-400" />
            Learning Settings
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-card-foreground">Enable Hints</p>
                <p className="text-xs text-muted-foreground">Allow AI suggestions during games</p>
              </div>
              <Switch
                checked={settings.hintsEnabled}
                onCheckedChange={(checked) => updateSetting('hintsEnabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-card-foreground">Focus Mode</p>
                <p className="text-xs text-muted-foreground">Hide distracting elements</p>
              </div>
              <Switch
                checked={settings.focusMode}
                onCheckedChange={(checked) => updateSetting('focusMode', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-card-foreground">Progress Tracking</p>
                <p className="text-xs text-muted-foreground">Save game history and statistics</p>
              </div>
              <Switch
                checked={settings.progressTracking}
                onCheckedChange={(checked) => updateSetting('progressTracking', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Game Mode Settings */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3 flex items-center text-card-foreground">
            <Gamepad2 className="w-5 h-5 mr-2 text-blue-400" />
            Game Mode
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-card-foreground">Play Against</p>
                <p className="text-xs text-muted-foreground">Choose opponent type</p>
              </div>
              <Select value={settings.gameMode} onValueChange={(value: "pvp" | "pvc") => updateSetting('gameMode', value)}>
                <SelectTrigger className="w-32 bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pvp">Human</SelectItem>
                  <SelectItem value="pvc">Computer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {settings.gameMode === 'pvc' && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-card-foreground">AI Difficulty</p>
                  <p className="text-xs text-muted-foreground">Computer strength level</p>
                </div>
                <Select value={settings.aiDifficulty} onValueChange={(value: "beginner" | "intermediate" | "advanced") => updateSetting('aiDifficulty', value)}>
                  <SelectTrigger className="w-32 bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Theme Settings */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3 flex items-center text-card-foreground">
            <Palette className="w-5 h-5 mr-2 text-pink-400" />
            Appearance
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-card-foreground">Theme</p>
                <p className="text-xs text-muted-foreground">Choose light or dark theme</p>
              </div>
              <Select value={theme} onValueChange={(value: "light" | "dark") => setTheme(value)}>
                <SelectTrigger className="w-24 bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Management */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3 flex items-center text-card-foreground">
            <Clock className="w-5 h-5 mr-2 text-purple-400" />
            Time Management
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-card-foreground">Daily Play Time</label>
              <Select
                value={settings.dailyPlayTime.toString()}
                onValueChange={(value) => updateSetting('dailyPlayTime', parseInt(value))}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No Limit</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-card-foreground">Break Reminders</label>
              <Select
                value={settings.breakReminders.toString()}
                onValueChange={(value) => updateSetting('breakReminders', parseInt(value))}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Disabled</SelectItem>
                  <SelectItem value="15">Every 15 minutes</SelectItem>
                  <SelectItem value="30">Every 30 minutes</SelectItem>
                  <SelectItem value="60">Every hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Difficulty Control */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3 flex items-center text-card-foreground">
            <TrendingUp className="w-5 h-5 mr-2 text-emerald-400" />
            Difficulty Control
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-card-foreground">Starting Difficulty</label>
              <div className="grid grid-cols-3 gap-2">
                {['beginner', 'intermediate', 'advanced'].map((level) => (
                  <Button
                    key={level}
                    variant={settings.difficulty === level ? "default" : "secondary"}
                    className={`text-xs font-medium ${
                      settings.difficulty === level 
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                    onClick={() => updateSetting('difficulty', level)}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-card-foreground">Auto-Adjust Difficulty</p>
                <p className="text-xs text-muted-foreground">Adapt based on performance</p>
              </div>
              <Switch
                checked={settings.autoAdjustDifficulty}
                onCheckedChange={(checked) => updateSetting('autoAdjustDifficulty', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3 flex items-center text-card-foreground">
            <Lock className="w-5 h-5 mr-2 text-red-400" />
            Change Password
          </h3>
          
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-sm font-medium text-card-foreground">
                Current Password
              </Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showPasswords.current ? "text" : "password"}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="pr-10 bg-background border-border"
                  placeholder="Enter current password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => togglePasswordVisibility('current')}
                >
                  {showPasswords.current ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sm font-medium text-card-foreground">
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPasswords.new ? "text" : "password"}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="pr-10 bg-background border-border"
                  placeholder="Enter new password (min 6 characters)"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => togglePasswordVisibility('new')}
                >
                  {showPasswords.new ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-card-foreground">
                Confirm New Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPasswords.confirm ? "text" : "password"}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="pr-10 bg-background border-border"
                  placeholder="Confirm new password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => togglePasswordVisibility('confirm')}
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <Button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
              disabled={changePasswordMutation.isPending}
            >
              {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Text-to-Speech Settings */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3 flex items-center text-card-foreground">
            <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 6.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M5 12a1 1 0 011-1h4.343a.5.5 0 01.354.146l6.364 6.364a.5.5 0 01.146.354V19a1 1 0 11-2 0v-1.293L9.293 12H6a1 1 0 01-1-1z" />
            </svg>
            Text-to-Speech
          </h3>
          
          <TTSControls />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button 
          className="w-full bg-red-600 hover:bg-red-700 text-white font-medium"
          onClick={resetSettings}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset All Settings
        </Button>
        
        <Button 
          className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Log Out
        </Button>
      </div>
    </section>
  );
}
