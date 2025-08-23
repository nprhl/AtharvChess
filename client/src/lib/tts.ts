// Text-to-Speech service for chess learning app
// Uses browser's Web Speech API for kid-friendly voice narration

export interface TTSSettings {
  enabled: boolean;
  rate: number; // 0.7 - 1.2
  pitch: number; // 0.8 - 1.3
  volume: number; // 0 - 1
  voice: string | null; // voice name or null for default
  lang: string;
}

export interface TTSState {
  isSpeaking: boolean;
  isPaused: boolean;
  currentText: string | null;
  lastHint: string | null;
}

class TTSService {
  private settings: TTSSettings = {
    enabled: true,
    rate: 0.95,
    pitch: 1.1,
    volume: 0.8,
    voice: null,
    lang: 'en-US'
  };

  private state: TTSState = {
    isSpeaking: false,
    isPaused: false,
    currentText: null,
    lastHint: null
  };

  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private speechQueue: string[] = [];
  private listeners: Set<(state: TTSState) => void> = new Set();

  constructor() {
    this.loadSettings();
    this.initializeVoices();
  }

  // Load settings from localStorage
  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('chess-tts-settings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('Failed to load TTS settings:', error);
    }
  }

  // Save settings to localStorage
  private saveSettings(): void {
    try {
      localStorage.setItem('chess-tts-settings', JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Failed to save TTS settings:', error);
    }
  }

  // Initialize voices and find kid-friendly voice
  private initializeVoices(): void {
    if (!this.isSupported()) return;

    const setVoices = () => {
      const voices = speechSynthesis.getVoices();
      
      // Find kid-friendly voice (typically higher pitch, clearer pronunciation)
      const kidFriendlyVoice = voices.find(voice => 
        voice.lang.startsWith('en') && 
        (voice.name.includes('Female') || 
         voice.name.includes('Samantha') ||
         voice.name.includes('Karen') ||
         voice.name.includes('Allison'))
      );

      if (kidFriendlyVoice && !this.settings.voice) {
        this.settings.voice = kidFriendlyVoice.name;
        this.saveSettings();
      }
    };

    // Voices might load asynchronously
    if (speechSynthesis.getVoices().length > 0) {
      setVoices();
    } else {
      speechSynthesis.onvoiceschanged = setVoices;
    }
  }

  // Check if Web Speech API is supported
  public isSupported(): boolean {
    return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  }

  // Get current settings
  public getSettings(): TTSSettings {
    return { ...this.settings };
  }

  // Update settings
  public updateSettings(newSettings: Partial<TTSSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    this.notifyListeners();
  }

  // Get current state
  public getState(): TTSState {
    return { ...this.state };
  }

  // Subscribe to state changes
  public subscribe(listener: (state: TTSState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners of state change
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  // Update state
  private updateState(updates: Partial<TTSState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  // Split long text into sentences for better pacing
  private splitIntoSentences(text: string): string[] {
    // Split by sentence-ending punctuation, keeping reasonable length
    const sentences = text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => s + '.');

    // Further split very long sentences at commas or conjunctions
    const result: string[] = [];
    sentences.forEach(sentence => {
      if (sentence.length > 100) {
        const parts = sentence.split(/,\s+|;\s+|\s+and\s+|\s+but\s+|\s+or\s+/);
        result.push(...parts.map((p, i) => i === parts.length - 1 ? p : p + ','));
      } else {
        result.push(sentence);
      }
    });

    return result.filter(s => s.trim().length > 0);
  }

  // Create utterance with kid-friendly settings
  private createUtterance(text: string): SpeechSynthesisUtterance {
    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.rate = this.settings.rate;
    utterance.pitch = this.settings.pitch;
    utterance.volume = this.settings.volume;
    utterance.lang = this.settings.lang;

    // Set voice if available
    if (this.settings.voice) {
      const voices = speechSynthesis.getVoices();
      const selectedVoice = voices.find(voice => voice.name === this.settings.voice);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }

    return utterance;
  }

  // Main function to speak hint text
  public speakHint(text: string): void {
    if (!this.isSupported() || !this.settings.enabled || !text.trim()) {
      return;
    }

    // Stop any current speech
    this.stopSpeaking();

    // Clean and prepare text for speech
    const cleanText = text
      .replace(/[^\w\s.,!?-]/g, '') // Remove special chars but keep punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    if (!cleanText) return;

    // Store as last hint for replay
    this.state.lastHint = cleanText;

    // Split into manageable chunks
    const sentences = this.splitIntoSentences(cleanText);
    this.speechQueue = [...sentences];

    this.updateState({
      isSpeaking: true,
      isPaused: false,
      currentText: cleanText
    });

    this.speakNextSentence();
  }

  // Speak the next sentence in queue
  private speakNextSentence(): void {
    if (this.speechQueue.length === 0) {
      this.updateState({
        isSpeaking: false,
        currentText: null
      });
      return;
    }

    const sentence = this.speechQueue.shift()!;
    this.currentUtterance = this.createUtterance(sentence);

    this.currentUtterance.onend = () => {
      // Small pause between sentences for better comprehension
      setTimeout(() => {
        if (this.state.isSpeaking && !this.state.isPaused) {
          this.speakNextSentence();
        }
      }, 200);
    };

    this.currentUtterance.onerror = (event) => {
      console.warn('Speech synthesis error:', event);
      this.updateState({
        isSpeaking: false,
        currentText: null
      });
    };

    try {
      speechSynthesis.speak(this.currentUtterance);
    } catch (error) {
      console.warn('Failed to speak:', error);
      this.updateState({
        isSpeaking: false,
        currentText: null
      });
    }
  }

  // Stop current speech
  public stopSpeaking(): void {
    if (this.isSupported()) {
      speechSynthesis.cancel();
    }
    
    this.currentUtterance = null;
    this.speechQueue = [];
    
    this.updateState({
      isSpeaking: false,
      isPaused: false,
      currentText: null
    });
  }

  // Pause current speech
  public pauseSpeaking(): void {
    if (this.isSupported() && this.state.isSpeaking) {
      speechSynthesis.pause();
      this.updateState({ isPaused: true });
    }
  }

  // Resume paused speech
  public resumeSpeaking(): void {
    if (this.isSupported() && this.state.isPaused) {
      speechSynthesis.resume();
      this.updateState({ isPaused: false });
    }
  }

  // Replay the last hint
  public replayLastHint(): void {
    if (this.state.lastHint) {
      this.speakHint(this.state.lastHint);
    }
  }

  // Speak move notation in kid-friendly way
  public speakMove(moveText: string, color: 'white' | 'black'): void {
    if (!this.isSupported() || !this.settings.enabled) return;

    // Convert chess notation to kid-friendly speech
    const friendlyMove = this.convertMoveToSpeech(moveText, color);
    this.speakHint(friendlyMove);
  }

  // Convert chess notation to natural speech
  private convertMoveToSpeech(move: string, color: 'white' | 'black'): string {
    // Basic move conversion for kid-friendly narration
    const pieceNames: { [key: string]: string } = {
      'K': 'king',
      'Q': 'queen', 
      'R': 'rook',
      'B': 'bishop',
      'N': 'knight',
      '': 'pawn'
    };

    // Handle special moves
    if (move === 'O-O') return `${color} castles kingside`;
    if (move === 'O-O-O') return `${color} castles queenside`;
    
    // Extract piece and destination
    const piece = move.charAt(0);
    const pieceName = pieceNames[piece] || 'pawn';
    
    // Extract destination square
    const destination = move.slice(piece === piece.toUpperCase() && piece !== '' ? 1 : 0)
      .replace(/[+#=]/g, '') // Remove check/checkmate/promotion symbols
      .slice(-2); // Get last 2 chars (destination square)

    if (destination.length === 2) {
      const file = destination.charAt(0);
      const rank = destination.charAt(1);
      return `${color} moves ${pieceName} to ${file}${rank}`;
    }

    return `${color} plays ${move}`;
  }

  // Get available voices for settings
  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.isSupported()) return [];
    return speechSynthesis.getVoices().filter(voice => voice.lang.startsWith('en'));
  }
}

// Create singleton instance
export const ttsService = new TTSService();

// Convenience functions for direct use
export const speakHint = (text: string) => ttsService.speakHint(text);
export const stopSpeaking = () => ttsService.stopSpeaking();
export const replayLastHint = () => ttsService.replayLastHint();
export const speakMove = (move: string, color: 'white' | 'black') => ttsService.speakMove(move, color);