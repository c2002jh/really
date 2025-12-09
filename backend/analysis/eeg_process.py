#!/usr/bin/env python3
"""
EEG Signal Processing Script for NeuroTune
Analyzes EEG data to calculate engagement, arousal, valence, and preference scores.
Robustly handles specific file formats provided by the user (Biomarkers.txt).
"""

import sys
import json
import math

# Try to import numpy, but provide a fallback if missing for maximum robustness
try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False
    sys.stderr.write("Warning: numpy not found, using pure Python fallback\n")

def load_biomarkers(filepath):
    """
    Load data from Biomarkers.txt.
    Format: Tab-separated.
    Row 0: Header (Time, Fp1_Delta, ...)
    Col 0: Time string (e.g. " 1:49:25.583") - SKIP
    Cols 1+: Numeric values (Float)
    """
    encodings = ['utf-8', 'cp949', 'euc-kr', 'latin1']
    
    for encoding in encodings:
        try:
            data = []
            with open(filepath, 'r', encoding=encoding) as f:
                lines = f.readlines()
                
                # Need at least header and one data row
                if len(lines) < 2:
                    continue
                
                # Process rows skipping the header
                for line_idx, line in enumerate(lines[1:]):
                    line = line.strip()
                    if not line:
                        continue
                        
                    parts = line.split('\t')
                    
                    # We expect at least 14 columns (Time + 5 bands * 2 channels + Heartbeat + SDNN + RMSSD)
                    # But let's be flexible and just take what's numeric from index 1
                    row_vals = []
                    
                    # Start from index 1 to skip Time column
                    for i in range(1, len(parts)):
                        val_str = parts[i].strip()
                        if not val_str:
                            continue
                        try:
                            val = float(val_str)
                            row_vals.append(val)
                        except ValueError:
                            pass # Skip non-numeric garbage
                            
                    if row_vals:
                        data.append(row_vals)
            
            if data:
                # Normalize row lengths
                # Find the most common row length
                lengths = {}
                for row in data:
                    l = len(row)
                    lengths[l] = lengths.get(l, 0) + 1
                
                if not lengths:
                    return []
                    
                common_len = max(lengths, key=lengths.get)
                
                # Filter rows that don't match the common length
                clean_data = [row for row in data if len(row) == common_len]
                
                sys.stderr.write(f"Successfully loaded {len(clean_data)} rows (filtered from {len(data)}) from {filepath} using {encoding}. Common columns: {common_len}\n")
                return clean_data
                
        except UnicodeDecodeError:
            continue
        except Exception as e:
            sys.stderr.write(f"Warning: Failed to load {filepath} with {encoding}: {e}\n")
            continue

    sys.stderr.write(f"Error: Could not load biomarkers from {filepath}\n")
    return []

def calculate_metrics(data):
    """
    Calculate metrics from the loaded biomarker data.
    Expected columns in data (after skipping Time):
    0: Fp1_Delta
    1: Fp1_Theta
    2: Fp1_Alpha
    3: Fp1_Beta
    4: Fp1_Gamma
    5: Fp2_Delta
    6: Fp2_Theta
    7: Fp2_Alpha
    8: Fp2_Beta
    9: Fp2_Gamma
    10: Heartbeat
    11: SDNN
    12: RMSSD
    """
    if not data:
        return None

    # Calculate column averages
    if HAS_NUMPY:
        avg = np.mean(np.array(data), axis=0)
    else:
        # Pure python average
        cols = len(data[0])
        sums = [0.0] * cols
        count = len(data)
        for row in data:
            for i in range(min(len(row), cols)):
                sums[i] += row[i]
        avg = [s / count for s in sums]

    # Ensure we have enough columns
    # We need at least 10 columns for the bands
    if len(avg) < 10:
        sys.stderr.write("Error: Insufficient columns in biomarker data\n")
        return None

    # Extract Band Powers (Averaged over time)
    fp1_theta = avg[1]
    fp1_alpha = avg[2]
    fp1_beta = avg[3]
    fp1_gamma = avg[4]
    
    fp2_theta = avg[6]
    fp2_alpha = avg[7]
    fp2_beta = avg[8]
    fp2_gamma = avg[9]
    
    # Average Left (Fp1) and Right (Fp2)
    theta = (fp1_theta + fp2_theta) / 2
    alpha = (fp1_alpha + fp2_alpha) / 2
    beta = (fp1_beta + fp2_beta) / 2
    gamma = (fp1_gamma + fp2_gamma) / 2
    
    # Avoid division by zero
    epsilon = 1e-10
    
    # --- Metrics Calculation ---
    
    # Focus: Beta / Theta
    # Higher Beta (active thinking) relative to Theta (drowsy/idling)
    focus = beta / (theta + epsilon)
    
    # Relax: Alpha / Theta
    # Alpha is relaxation, Theta is drowsiness. 
    # Alternatively: Alpha / Beta (Relaxation vs Alertness)
    # Let's use Alpha / Beta as it's more standard for "Relaxation"
    relax = alpha / (beta + epsilon)
    
    # Excite: Beta / Alpha
    # Inverse of relax. Or (Beta + Gamma) / Alpha
    excite = (beta + gamma) / (alpha + epsilon)
    
    # Preference (Valence/Like): Frontal Alpha Asymmetry (FAA)
    # ln(Right Alpha) - ln(Left Alpha)
    # Higher value = More Left Activation (Approach/Like) = Higher Preference
    # Note: Lower Alpha power = Higher Activity.
    # So if Right Alpha > Left Alpha, then Left is more active -> Positive Emotion.
    try:
        # Use log for better asymmetry measure if values are positive
        if fp1_alpha > 0 and fp2_alpha > 0:
            preference_score = math.log(fp2_alpha) - math.log(fp1_alpha)
        else:
            preference_score = (fp2_alpha - fp1_alpha) / (fp2_alpha + fp1_alpha + epsilon)
    except:
        preference_score = 0
        
    # Normalize Preference to 0-1 range roughly
    # FAA is usually between -1 and 1, but can be wider.
    # Sigmoid: 1 / (1 + exp(-x))
    preference = 1 / (1 + math.exp(-preference_score))

    # Other composite metrics
    engagement = beta / (alpha + theta + epsilon)
    arousal = beta / (alpha + epsilon)
    valence = preference # FAA is a measure of valence
    
    # HRV
    hrv = 0
    if len(avg) > 12:
        hrv = avg[12] # RMSSD
    elif len(avg) > 11:
        hrv = avg[11] # SDNN
        
    # P300 Latency
    # Cannot be calculated from spectral biomarkers. 
    # Return a placeholder or 0.
    p300_latency = 300.0 

    return {
        "theta_power": theta,
        "hrv": hrv,
        "p300_latency": p300_latency,
        "engagement": engagement,
        "arousal": arousal,
        "valence": valence,
        "overall_preference": preference, # Use the calculated preference
        "focus": focus,
        "relax": relax,
        "excite": excite,
        "preference": preference
    }

def main():
    if len(sys.argv) != 5:
        sys.stderr.write("Error: Exactly 4 file paths are required\n")
        sys.exit(1)
    
    # eeg1_path = sys.argv[1] # Rawdata
    # eeg2_path = sys.argv[2] # Fp1_FFT
    # ecg_path = sys.argv[3]  # Fp2_FFT
    gsr_path = sys.argv[4]  # Biomarkers.txt
    
    try:
        # We primarily use Biomarkers.txt as it contains the processed band powers
        data = load_biomarkers(gsr_path)
        
        if not data:
            # Fallback: Return default values if data loading fails
            # This prevents the frontend from breaking
            sys.stderr.write("Warning: No data loaded, returning defaults\n")
            result = {
                "theta_power": 0, "hrv": 0, "p300_latency": 0,
                "engagement": 0.5, "arousal": 0.5, "valence": 0.5,
                "overall_preference": 0.5, "focus": 0.5, "relax": 0.5,
                "excite": 0.5, "preference": 0.5
            }
        else:
            metrics = calculate_metrics(data)
            if metrics:
                result = metrics
            else:
                result = {
                    "theta_power": 0, "hrv": 0, "p300_latency": 0,
                    "engagement": 0.5, "arousal": 0.5, "valence": 0.5,
                    "overall_preference": 0.5, "focus": 0.5, "relax": 0.5,
                    "excite": 0.5, "preference": 0.5
                }
                
        # Output JSON to stdout
        print(json.dumps(result))
        
    except Exception as e:
        sys.stderr.write(f"Error in main process: {e}\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
