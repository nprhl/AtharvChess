# Ollama Chess AI Setup Guide

This chess learning app now supports using Ollama to host open-source AI models for enhanced chess gameplay. The system provides intelligent fallbacks to ensure the chess engine always works.

## Quick Setup

### 1. Install Ollama
```bash
# Install Ollama (Linux/Mac)
curl -fsSL https://ollama.com/install.sh | sh

# Or download from: https://ollama.com/download
```

### 2. Pull Chess-Capable Models
```bash
# For beginners/intermediate (faster)
ollama pull llama3.1:8b

# For advanced play (stronger but slower)
ollama pull llama3.1:70b

# Alternative models
ollama pull codellama:13b      # Good at structured reasoning
ollama pull mistral:7b         # Fast and efficient
ollama pull dolphin-mixtral    # Strong reasoning capabilities
```

### 3. Start Ollama Server
```bash
ollama serve
# Server will run on http://localhost:11434
```

## How It Works

### Difficulty-Based Model Selection
- **Beginner**: Uses `llama3.1:8b` with higher temperature (0.7) for varied, educational moves
- **Intermediate**: Uses `llama3.1:8b` with moderate temperature (0.3) for consistent tactical play  
- **Advanced**: Uses `llama3.1:70b` with low temperature (0.1) for strongest possible moves

### Intelligent Prompting
The system uses sophisticated prompts tailored to each difficulty:

**Beginner Prompts**: Focus on basic development, safety, and learning-friendly moves
**Intermediate Prompts**: Emphasize tactics, piece coordination, and positional concepts
**Advanced Prompts**: Analyze complex patterns, strategic planning, and deep calculation

### Automatic Fallback
If Ollama is unavailable, the system automatically falls back to our enhanced traditional chess engine with:
- 4-ply minimax search with alpha-beta pruning
- Advanced position evaluation with piece-square tables
- Tactical awareness and king safety evaluation

## Model Recommendations

### For Educational Chess (Recommended)
- **llama3.1:8b** - Excellent balance of speed and chess understanding
- **mistral:7b** - Very fast, good for real-time play

### For Competitive Chess  
- **llama3.1:70b** - Strongest reasoning for advanced players
- **dolphin-mixtral** - Excellent strategic understanding

### For Analysis and Hints
- **codellama:13b** - Great at explaining chess concepts and reasoning

## Performance Tips

1. **RAM Requirements**: 
   - 8B models: ~8GB RAM
   - 13B models: ~16GB RAM  
   - 70B models: ~64GB RAM

2. **GPU Acceleration**: Ollama automatically uses NVIDIA/AMD GPUs if available

3. **Response Time**: 8B models typically respond in 1-3 seconds, 70B models in 5-15 seconds

## Testing Your Setup

1. Start the chess app: `npm run dev`
2. Go to a chess game and set difficulty to "Advanced"
3. Make a move - if Ollama is working, you'll see stronger, more strategic computer moves
4. Check the console logs for "Ollama AI played: [move]" vs "Traditional AI played: [move]"

## Troubleshooting

**Ollama not responding**: 
- Check if `ollama serve` is running
- Verify models are downloaded with `ollama list`
- Ensure port 11434 is not blocked

**Slow responses**:
- Use smaller models (8B instead of 70B)
- Ensure sufficient RAM is available
- Consider GPU acceleration

**Models not found**:
- Re-run `ollama pull [model-name]`  
- Check available models with `ollama list`

The chess engine will always work even without Ollama, but you'll get significantly stronger and more educational gameplay with the AI models running!