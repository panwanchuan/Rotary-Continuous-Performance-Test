# Rotary-CPT: Continuous Performance Test

A timing-based Continuous Performance Test designed to assess sustained attention, impulsivity, distractibility, vigilance, and hyperactivity.

## Features

- **30-Second Demo Mode**: Quick preview of the test with immediate performance feedback
- **Rotating Pointer**: Continuous rotation around a circular dial
- **Response Windows**: Blue (Go) and Red (No-Go) windows appear randomly around the circle
- **Comprehensive Metrics**: Detailed performance analysis including:
  - Hit rate and false alarm rate
  - Reaction time (mean and variability)
  - Sensitivity (d')
  - Accuracy and error types

## How to Play

1. **Start the Demo**: Click "Start 30-Second Demo" on the welcome screen
2. **Watch the Pointer**: A purple pointer continuously rotates around the circular dial
3. **Respond to Windows**:
   - **Blue Windows (Go trials)**: Click when the pointer is inside the blue window
   - **Red Windows (No-Go trials)**: Do NOT click - withhold your response
4. **View Results**: After 30 seconds, see your performance metrics

## Running the Game

**Easiest: use the launcher**

- **Mac / Linux:** Double‑click `start.sh` or run `./start.sh` in a terminal.  
  A browser will open at `http://localhost:8080`.
- **Windows:** Double‑click `start.bat`.  
  A "Server" window will open and your browser will open at `http://localhost:8080`.  
  Close the Server window when you’re done.

**Or run manually:**

```bash
# From the rotary-cpt folder:
cd rotary-cpt

# Start a local server (Python 3)
python3 -m http.server 8080
# or: python -m http.server 8080

# Then open in your browser:
# http://localhost:8080
```

**Or open the file directly:**  
Open `index.html` in your browser (e.g. double‑click it).  
If the game doesn’t load, use the launcher or manual server steps above.

## Game Mechanics

- **Window Duration**: Response windows appear for 1.5 seconds (exceeding the 1.25s requirement)
- **Random Positioning**: Windows can appear on any side of the circle
- **Reaction Time**: Measured from when the pointer enters the response window
- **Trial Types**: 
  - Go trials (70%): Require a response
  - No-Go trials (30%): Require inhibition

## Performance Metrics

- **Hits**: Correct responses on Go trials
- **Misses**: Failed to respond on Go trials
- **False Alarms**: Incorrect responses on No-Go trials
- **Correct Rejections**: Correctly withheld responses on No-Go trials
- **d' (Sensitivity)**: Signal detection measure of ability to discriminate targets
- **Reaction Time**: Mean and standard deviation of response times

## Technical Details

- Pure HTML5 Canvas implementation
- No external dependencies
- Responsive design
- Frame-rate independent animation

## Future Enhancements

The full test includes four blocks:
1. High Go frequency (80%) - assesses impulsivity
2. Low Go frequency (20%) - assesses vigilance
3. Distractor block - measures distractibility
4. Sustained block - examines performance decline

These can be added as additional game modes.
