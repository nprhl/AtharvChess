import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, GraduationCap, Clock, TrendingUp, RotateCcw, Palette } from "lucide-react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/theme-provider";

interface Settings {
  hintsEnabled: boolean;
  focusMode: boolean;
  progressTracking: boolean;
  dailyPlayTime: number;
  breakReminders: number;
  difficulty: string;
  autoAdjustDifficulty: boolean;
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
    autoAdjustDifficulty: true
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
      autoAdjustDifficulty: true
    });
    toast({
      title: "Settings reset",
      description: "All settings have been restored to defaults",
    });
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

      {/* Reset Button */}
      <Button 
        className="w-full bg-red-600 hover:bg-red-700 text-white font-medium"
        onClick={resetSettings}
      >
        <RotateCcw className="w-4 h-4 mr-2" />
        Reset All Settings
      </Button>
    </section>
  );
}
