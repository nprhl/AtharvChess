import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, X } from "lucide-react";

interface AIHintCardProps {
  hint: string;
  onClose: () => void;
  onShowMove: () => void;
}

export default function AIHintCard({ hint, onClose, onShowMove }: AIHintCardProps) {
  return (
    <Card className="bg-gradient-to-r from-purple-600 to-blue-600 border-none">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-4 h-4 text-yellow-300" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm text-white">AI Suggestion</h3>
              <Button
                variant="ghost"
                size="sm"
                className="w-6 h-6 p-0 text-white/70 hover:text-white hover:bg-white/10"
                onClick={onClose}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            <p className="text-xs text-purple-100 leading-relaxed mb-2">
              {hint}
            </p>
            <Button
              size="sm"
              className="text-xs bg-white/20 hover:bg-white/30 text-white border-none"
              variant="outline"
              onClick={onShowMove}
            >
              Show me
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
