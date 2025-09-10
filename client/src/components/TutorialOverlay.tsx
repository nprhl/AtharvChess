import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, ChevronLeft, ChevronRight, Brain, Clock, Target, Lightbulb } from 'lucide-react';

interface TutorialOverlayProps {
  onClose: () => void;
  onComplete: () => void;
}

export default function TutorialOverlay({ onClose, onComplete }: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const tutorialSteps = [
    {
      title: "Welcome to Chess Learning!",
      icon: <Lightbulb className="w-8 h-8 text-blue-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-lg">
            This quick tutorial will help you understand how to play against the computer and improve your chess skills.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              💡 Tip: You can always access this tutorial again from the settings menu.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Computer Move Mechanics",
      icon: <Brain className="w-8 h-8 text-purple-500" />,
      content: (
        <div className="space-y-4">
          <p>When playing against the computer:</p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-purple-500">•</span>
              <span><strong>Make your move</strong> by clicking and dragging pieces</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-500">•</span>
              <span><strong>Wait for the computer</strong> - it will think for a few seconds</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-500">•</span>
              <span><strong>The computer responds</strong> automatically with its move</span>
            </li>
          </ul>
          <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
            <p className="text-sm text-purple-800 dark:text-purple-200">
              The computer plays at different skill levels: Beginner, Intermediate, and Advanced.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Computer Thinking Indicator",
      icon: <Clock className="w-8 h-8 text-orange-500" />,
      content: (
        <div className="space-y-4">
          <p>When the computer is thinking, you'll see:</p>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
              <span className="text-sm">Computer is thinking...</span>
            </div>
          </div>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-orange-500">•</span>
              <span><strong>Don't make another move</strong> while the computer thinks</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500">•</span>
              <span><strong>Be patient</strong> - higher difficulties take longer</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500">•</span>
              <span><strong>The board will update</strong> when the computer finishes</span>
            </li>
          </ul>
        </div>
      )
    },
    {
      title: "Move Classification System",
      icon: <Target className="w-8 h-8 text-green-500" />,
      content: (
        <div className="space-y-4">
          <p>Your moves are analyzed and classified:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Badge variant="default" className="bg-yellow-500 text-white">Brilliant</Badge>
            <Badge variant="default" className="bg-green-500 text-white">Best</Badge>
            <Badge variant="default" className="bg-blue-500 text-white">Great</Badge>
            <Badge variant="default" className="bg-cyan-500 text-white">Good</Badge>
            <Badge variant="default" className="bg-gray-500 text-white">Book</Badge>
            <Badge variant="default" className="bg-orange-500 text-white">Inaccuracy</Badge>
            <Badge variant="default" className="bg-red-400 text-white">Mistake</Badge>
            <Badge variant="default" className="bg-red-600 text-white">Blunder</Badge>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This helps you understand the quality of your moves and learn from mistakes.
          </p>
        </div>
      )
    },
    {
      title: "Ready to Play!",
      icon: <Target className="w-8 h-8 text-green-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-lg">You're all set to start playing chess!</p>
          <div className="space-y-2 text-sm">
            <p><strong>Remember:</strong></p>
            <ul className="space-y-1 ml-4">
              <li>• Make your move and wait for the computer</li>
              <li>• Pay attention to move classifications</li>
              <li>• Use hints if you get stuck</li>
              <li>• Practice regularly to improve</li>
            </ul>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              🎉 Have fun learning chess! You can adjust difficulty and settings anytime.
            </p>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const currentStepData = tutorialSteps[currentStep];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center relative">
          <button
            onClick={onClose}
            className="absolute right-2 top-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex justify-center mb-2">
            {currentStepData.icon}
          </div>
          <CardTitle className="text-xl">{currentStepData.title}</CardTitle>
          <div className="flex justify-center gap-1 mt-2">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentStep ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="min-h-[200px]">
            {currentStepData.content}
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
              >
                Skip Tutorial
              </Button>
              <Button
                onClick={handleNext}
                size="sm"
              >
                {currentStep === tutorialSteps.length - 1 ? (
                  'Start Playing!'
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}