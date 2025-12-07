const { spawn } = require('child_process');
const path = require('path');

/**
 * EEG Service for processing EEG data using Python script
 */
class EEGService {
  /**
   * Process EEG data files using Python script
   * @param {Object} filePaths - Object containing paths to the 4 data files
   * @param {string} filePaths.eeg1 - Path to first EEG file
   * @param {string} filePaths.eeg2 - Path to second EEG file
   * @param {string} filePaths.ecg - Path to ECG file
   * @param {string} filePaths.gsr - Path to GSR file
   * @returns {Promise<Object>} Analysis results as JSON
   */
  async processEEGData(filePaths) {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(__dirname, '../analysis/eeg_process.py');
      
      // Check if all file paths are provided
      if (!filePaths.eeg1 || !filePaths.eeg2 || !filePaths.ecg || !filePaths.gsr) {
        return reject(new Error('All 4 file paths are required: eeg1, eeg2, ecg, gsr'));
      }

      // Spawn Python process with file paths as arguments
      const pythonProcess = spawn('python3', [
        scriptPath,
        filePaths.eeg1,
        filePaths.eeg2,
        filePaths.ecg,
        filePaths.gsr,
      ]);

      let outputData = '';
      let errorData = '';

      // Collect stdout data
      pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
      });

      // Collect stderr data
      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
      });

      // Handle process completion
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`Python script exited with code ${code}`);
          console.error('Error output:', errorData);
          return reject(new Error(`EEG processing failed: ${errorData || 'Unknown error'}`));
        }

        try {
          // Parse JSON output from Python script
          const result = JSON.parse(outputData.trim());
          resolve(result);
        } catch (error) {
          console.error('Failed to parse Python output:', outputData);
          reject(new Error('Failed to parse EEG analysis results'));
        }
      });

      // Handle process errors
      pythonProcess.on('error', (error) => {
        console.error('Failed to start Python process:', error);
        reject(new Error('Failed to start EEG processing: ' + error.message));
      });
    });
  }

  /**
   * Validate uploaded files
   * @param {Array} files - Array of uploaded files
   * @returns {boolean} True if valid
   * @throws {Error} If validation fails
   */
  validateFiles(files) {
    if (!files || files.length !== 4) {
      throw new Error('Exactly 4 files are required');
    }

    const requiredFields = ['eeg1', 'eeg2', 'ecg', 'gsr'];
    const uploadedFields = files.map(f => f.fieldname);

    for (const field of requiredFields) {
      if (!uploadedFields.includes(field)) {
        throw new Error(`Missing required file: ${field}`);
      }
    }

    // Check file extensions
    for (const file of files) {
      if (!file.originalname.endsWith('.txt')) {
        throw new Error(`File ${file.originalname} must be a .txt file`);
      }
    }

    return true;
  }
}

module.exports = new EEGService();
