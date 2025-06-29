import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HeaderNavigation() {
  const mockUser = {
    eloRating: 1250
  };

  return (
    <header className="bg-slate-900 px-4 py-3 flex items-center justify-between border-b border-slate-700">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <span className="text-white text-sm font-bold">♞</span>
        </div>
        <h1 className="text-lg font-bold text-white">AtharvChess</h1>
      </div>
      <div className="flex items-center space-x-3">
        <div className="text-right">
          <div className="text-xs text-slate-400">Elo Rating</div>
          <div className="text-sm font-semibold text-emerald-400">{mockUser.eloRating}</div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-8 h-8 p-0 bg-slate-700 hover:bg-slate-600 rounded-full"
        >
          <Settings className="w-4 h-4 text-slate-300" />
        </Button>
      </div>
    </header>
  );
}
