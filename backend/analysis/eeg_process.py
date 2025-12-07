#!/usr/bin/env python3
"""
EEG Signal Processing Script for NeuroTune
Analyzes EEG, ECG, and GSR data to calculate engagement, arousal, valence, and preference scores
"""

import sys
import json
import numpy as np


def load_data(filepath):
    """
    Load data from a text file
    
    Args:
        filepath: Path to the data file
        
    Returns:
        numpy array of data values
    """
    try:
        # Try to load as space/comma separated values
        data = np.loadtxt(filepath)
        return data
    except Exception as e:
        print(f"Error loading {filepath}: {e}", file=sys.stderr)
        print("Expected file format: numeric values separated by spaces or commas, one value per line or multiple values per line", file=sys.stderr)
        raise


def calculate_theta_power(eeg1_data, eeg2_data):
    """
    Calculate theta power (4-8 Hz) from EEG data
    This is a mock/heuristic calculation for demonstration
    
    Args:
        eeg1_data: First EEG channel data
        eeg2_data: Second EEG channel data
        
    Returns:
        Theta power value (normalized 0-1)
    """
    # Simple heuristic: use variance and mean of combined signals
    combined = np.concatenate([eeg1_data.flatten(), eeg2_data.flatten()])
    
    # Calculate variance as a proxy for power
    variance = np.var(combined)
    mean_abs = np.mean(np.abs(combined))
    
    # Normalize using sigmoid-like function
    theta_power = 1 / (1 + np.exp(-0.5 * (variance + mean_abs)))
    
    return float(theta_power)


def calculate_hrv(ecg_data):
    """
    Calculate Heart Rate Variability (HRV) from ECG data
    This is a mock/heuristic calculation for demonstration
    
    Args:
        ecg_data: ECG signal data
        
    Returns:
        HRV value (normalized 0-1)
    """
    # Simple heuristic: use standard deviation of differences
    ecg_flat = ecg_data.flatten()
    
    if len(ecg_flat) < 2:
        return 0.5
    
    # Calculate differences between consecutive points
    diffs = np.diff(ecg_flat)
    
    # Use standard deviation as HRV measure
    hrv = np.std(diffs)
    
    # Normalize to 0-1 range
    hrv_normalized = 1 / (1 + np.exp(-hrv))
    
    return float(hrv_normalized)


def calculate_p300_latency(eeg1_data, eeg2_data):
    """
    Calculate P300 latency from EEG data
    P300 is an event-related potential component
    This is a mock/heuristic calculation for demonstration
    
    Args:
        eeg1_data: First EEG channel data
        eeg2_data: Second EEG channel data
        
    Returns:
        P300 latency value (normalized 0-1)
    """
    # Simple heuristic: find peak in averaged signal
    combined = (eeg1_data.flatten() + eeg2_data.flatten()) / 2
    
    # Find the index of maximum absolute value
    peak_idx = np.argmax(np.abs(combined))
    
    # Normalize by length
    latency = peak_idx / len(combined)
    
    return float(latency)


def calculate_engagement(theta_power, p300_latency):
    """
    Calculate engagement score based on theta power and P300 latency
    
    Args:
        theta_power: Theta power value
        p300_latency: P300 latency value
        
    Returns:
        Engagement score (0-1)
    """
    # Higher theta power and earlier P300 (lower latency) indicate higher engagement
    engagement = (theta_power * 0.6) + ((1 - p300_latency) * 0.4)
    
    return float(np.clip(engagement, 0, 1))


def calculate_arousal(hrv, gsr_data):
    """
    Calculate arousal score based on HRV and GSR
    
    Args:
        hrv: Heart rate variability
        gsr_data: GSR signal data
        
    Returns:
        Arousal score (0-1)
    """
    # Calculate GSR level (mean of absolute values)
    gsr_level = np.mean(np.abs(gsr_data.flatten()))
    
    # Normalize GSR
    gsr_normalized = 1 / (1 + np.exp(-gsr_level))
    
    # Higher GSR and lower HRV typically indicate higher arousal
    arousal = (gsr_normalized * 0.6) + ((1 - hrv) * 0.4)
    
    return float(np.clip(arousal, 0, 1))


def calculate_valence(theta_power, hrv, arousal):
    """
    Calculate valence (positive/negative emotion) score
    
    Args:
        theta_power: Theta power value
        hrv: Heart rate variability
        arousal: Arousal score
        
    Returns:
        Valence score (0-1), where higher values indicate more positive emotion
    """
    # Higher theta power and HRV with moderate arousal indicate positive valence
    valence = (theta_power * 0.4) + (hrv * 0.3) + ((1 - abs(arousal - 0.5) * 2) * 0.3)
    
    return float(np.clip(valence, 0, 1))


def calculate_overall_preference(engagement, arousal, valence):
    """
    Calculate overall music preference score
    
    Args:
        engagement: Engagement score
        arousal: Arousal score
        valence: Valence score
        
    Returns:
        Overall preference score (0-1)
    """
    # Weighted average favoring engagement and valence
    preference = (engagement * 0.4) + (valence * 0.4) + (arousal * 0.2)
    
    return float(np.clip(preference, 0, 1))


def main():
    """
    Main function to process EEG data files and output results as JSON
    """
    if len(sys.argv) != 5:
        print("Error: Exactly 4 file paths are required (eeg1, eeg2, ecg, gsr)", file=sys.stderr)
        sys.exit(1)
    
    # Get file paths from command line arguments
    eeg1_path = sys.argv[1]
    eeg2_path = sys.argv[2]
    ecg_path = sys.argv[3]
    gsr_path = sys.argv[4]
    
    try:
        # Load data from files
        eeg1_data = load_data(eeg1_path)
        eeg2_data = load_data(eeg2_path)
        ecg_data = load_data(ecg_path)
        gsr_data = load_data(gsr_path)
        
        # Calculate signal metrics
        theta_power = calculate_theta_power(eeg1_data, eeg2_data)
        hrv = calculate_hrv(ecg_data)
        p300_latency = calculate_p300_latency(eeg1_data, eeg2_data)
        
        # Calculate derived metrics
        engagement = calculate_engagement(theta_power, p300_latency)
        arousal = calculate_arousal(hrv, gsr_data)
        valence = calculate_valence(theta_power, hrv, arousal)
        overall_preference = calculate_overall_preference(engagement, arousal, valence)
        
        # Prepare result as JSON
        result = {
            "theta_power": round(theta_power, 4),
            "hrv": round(hrv, 4),
            "p300_latency": round(p300_latency, 4),
            "engagement": round(engagement, 4),
            "arousal": round(arousal, 4),
            "valence": round(valence, 4),
            "overall_preference": round(overall_preference, 4)
        }
        
        # Output JSON to stdout
        print(json.dumps(result))
        
    except Exception as e:
        print(f"Error processing data: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
