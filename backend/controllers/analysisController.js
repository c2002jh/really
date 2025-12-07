const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const eegService = require('../services/eegService');
const AnalysisResult = require('../models/AnalysisResult');

/**
 * Configure Multer for file uploads
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only .txt files
  if (path.extname(file.originalname).toLowerCase() === '.txt') {
    cb(null, true);
  } else {
    cb(new Error('Only .txt files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
  }
});

/**
 * Multer middleware for handling 4 file uploads
 */
exports.uploadFiles = upload.fields([
  { name: 'eeg1', maxCount: 1 },
  { name: 'eeg2', maxCount: 1 },
  { name: 'ecg', maxCount: 1 },
  { name: 'gsr', maxCount: 1 }
]);

/**
 * Analyze uploaded EEG data
 * @route POST /api/analyze
 */
exports.analyzeEEG = async (req, res) => {
  try {
    // Check if files were uploaded
    if (!req.files) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded',
      });
    }

    // Validate that all 4 files are present
    const requiredFields = ['eeg1', 'eeg2', 'ecg', 'gsr'];
    for (const field of requiredFields) {
      if (!req.files[field] || req.files[field].length === 0) {
        return res.status(400).json({
          success: false,
          error: `Missing required file: ${field}`,
        });
      }
    }

    // Get file paths
    const filePaths = {
      eeg1: req.files.eeg1[0].path,
      eeg2: req.files.eeg2[0].path,
      ecg: req.files.ecg[0].path,
      gsr: req.files.gsr[0].path,
    };

    // Process EEG data using Python script
    const analysisResult = await eegService.processEEGData(filePaths);

    // Get userId from request body (optional)
    const userId = req.body.userId || 'anonymous';

    // Save results to database
    const savedResult = await AnalysisResult.create({
      userId,
      filePaths: {
        eeg1: filePaths.eeg1,
        eeg2: filePaths.eeg2,
        ecg: filePaths.ecg,
        gsr: filePaths.gsr,
      },
      thetaPower: analysisResult.theta_power,
      hrv: analysisResult.hrv,
      p300Latency: analysisResult.p300_latency,
      engagement: analysisResult.engagement,
      arousal: analysisResult.arousal,
      valence: analysisResult.valence,
      overallPreference: analysisResult.overall_preference,
    });

    // Return results
    res.status(200).json({
      success: true,
      message: 'EEG analysis completed successfully',
      data: {
        id: savedResult._id,
        userId: savedResult.userId,
        results: {
          thetaPower: savedResult.thetaPower,
          hrv: savedResult.hrv,
          p300Latency: savedResult.p300Latency,
          engagement: savedResult.engagement,
          arousal: savedResult.arousal,
          valence: savedResult.valence,
          overallPreference: savedResult.overallPreference,
        },
        createdAt: savedResult.createdAt,
      },
    });
  } catch (error) {
    console.error('Error in analyzeEEG:', error);
    
    // Clean up uploaded files on error
    if (req.files) {
      const allFiles = Object.values(req.files).flat();
      for (const file of allFiles) {
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.error('Error deleting file:', unlinkError);
        }
      }
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze EEG data',
    });
  }
};

/**
 * Get analysis history for a user
 * @route GET /api/analysis/history/:userId
 */
exports.getAnalysisHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10, page = 1 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const results = await AnalysisResult.find({ userId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .select('-filePaths'); // Exclude file paths from response

    const total = await AnalysisResult.countDocuments({ userId });

    res.status(200).json({
      success: true,
      count: results.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: results,
    });
  } catch (error) {
    console.error('Error in getAnalysisHistory:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch analysis history',
    });
  }
};

/**
 * Get latest analysis result for a user
 * @route GET /api/analysis/latest/:userId
 */
exports.getLatestAnalysis = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await AnalysisResult.findOne({ userId })
      .sort({ createdAt: -1 })
      .select('-filePaths');

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'No analysis found for this user',
      });
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error in getLatestAnalysis:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch latest analysis',
    });
  }
};
