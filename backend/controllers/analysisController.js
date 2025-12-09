const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsDirect = require('fs'); // Direct fs access for callbacks
const os = require('os');
const eegService = require('../services/eegService');
const githubService = require('../services/githubService');
const llmService = require('../services/llmService');
const AnalysisResult = require('../models/AnalysisResult');

/**
 * Configure Multer for file uploads
 * Use system temp directory to avoid nodemon restarts and Live Server reloads
 */
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use system temp directory instead of project folder
    // This prevents VS Code Live Server from detecting changes and reloading the page
    const uploadDir = path.join(os.tmpdir(), 'neurotune-uploads');
    
    // Ensure directory exists
    fsDirect.mkdir(uploadDir, { recursive: true }, (err) => {
      if (err) {
        console.error('Failed to create upload directory:', err);
        return cb(err);
      }
      cb(null, uploadDir);
    });
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'neurotune-' + file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
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
    fileSize: parseInt(process.env.MAX_FILE_SIZE || DEFAULT_MAX_FILE_SIZE),
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
  let filePaths = {};
  
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
    filePaths = {
      eeg1: req.files.eeg1[0].path,
      eeg2: req.files.eeg2[0].path,
      ecg: req.files.ecg[0].path,
      gsr: req.files.gsr[0].path,
    };

    console.log('Processing files at:', filePaths);

    // Process EEG data using Python script
    const analysisResult = await eegService.processEEGData(filePaths);

    // Get userId from request body (optional)
    const userId = req.body.userId || 'anonymous';
    const songTitle = req.body.songTitle;
    const artistName = req.body.artistName;
    const likeStatus = req.body.likeStatus || 'none';
    const githubToken = req.body.githubToken; // Optional token for AI analysis

    // AI Analysis (Optional)
    let aiInterpretation = null;
    if (githubToken) {
        console.log('GitHub Token provided, attempting AI analysis...');
        aiInterpretation = await llmService.analyzeEEGWithAI(analysisResult, githubToken);
    }

    // Save results to database
    // Store actual file paths since we are keeping them
    const savedResult = await AnalysisResult.create({
      userId,
      songTitle,
      artistName,
      likeStatus,
      aiInterpretation, // Save AI result
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
      focus: analysisResult.focus,
      relax: analysisResult.relax,
      excite: analysisResult.excite,
      preference: analysisResult.preference,
    });

    console.log('Analysis saved to DB, sending response');

    // Clean up uploaded files (Success case)
    // DISABLED: User requested to keep files
    // cleanupFiles(filePaths);

    // Return results
    try {
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
            focus: savedResult.focus,
            relax: savedResult.relax,
            excite: savedResult.excite,
            aiInterpretation: savedResult.aiInterpretation // Return AI result
          },
          createdAt: savedResult.createdAt,
        },
      });
      console.log('Response sent successfully');
    } catch (resError) {
      console.error('Error sending response:', resError);
    }
  } catch (error) {
    console.error('Error in analyzeEEG:', error);
    
    // Clean up uploaded files (Error case)
    cleanupFiles(filePaths);

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze EEG data',
    });
  }
};

const spotifyService = require('../services/spotifyService');

/**
 * Get analysis history for a user
 * @route GET /api/analysis/history/:userId
 */
exports.getAnalysisHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10, page = 1 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch results
    const results = await AnalysisResult.find({ userId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .select('-filePaths')
      .lean(); // Use lean() to get plain JS objects we can modify

    // Enrich with Album Art if missing
    // We do this in parallel but limit concurrency if needed. For 10 items, Promise.all is fine.
    const enrichedResults = await Promise.all(results.map(async (result) => {
      // If we have song info but no album art (which we don't store yet), fetch it
      if (result.songTitle && result.artistName) {
        // Check if we already have it (future proofing)
        if (!result.albumUrl) {
           try {
             const trackInfo = await spotifyService.searchTrackInfo(result.songTitle, result.artistName);
             if (trackInfo && trackInfo.album && trackInfo.album.images.length > 0) {
               result.albumUrl = trackInfo.album.images[0].url;
             }
           } catch (e) {
             console.error(`Failed to fetch album art for ${result.songTitle}:`, e.message);
           }
        }
      }
      return result;
    }));

    const total = await AnalysisResult.countDocuments({ userId });

    res.status(200).json({
      success: true,
      count: enrichedResults.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: enrichedResults,
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
        error: 'No analysis history found',
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

/**
 * Analyze GitHub Activity
 * @route POST /api/analyze/github
 */
exports.analyzeGithub = async (req, res) => {
  try {
    const { token, userId } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, error: 'GitHub token is required' });
    }

    // 1. Analyze GitHub Data
    const analysis = await githubService.analyzeUserActivity(token);

    // 2. Save as an AnalysisResult (Simulated EEG data from GitHub metrics)
    // We map GitHub metrics to EEG metrics so the frontend can visualize it similarly
    const savedResult = await AnalysisResult.create({
      userId: userId || analysis.username,
      songTitle: 'GitHub Coding Session',
      artistName: 'Coding Mode',
      likeStatus: 'none',
      filePaths: {}, // No files
      
      // Mapping
      focus: analysis.focus,
      relax: analysis.relax,
      // Stress -> Low Valence?
      valence: 1.0 - analysis.stress, 
      engagement: analysis.focus,
      arousal: analysis.stress, // Stress is high arousal
      
      // Dummy values for others
      thetaPower: 0,
      hrv: 0,
      p300Latency: 0,
      overallPreference: 0.5,
      excite: analysis.stress
    });

    res.status(200).json({
      success: true,
      message: 'GitHub analysis completed',
      data: {
        id: savedResult._id,
        userId: savedResult.userId,
        classification: analysis.classification,
        results: {
          focus: savedResult.focus,
          relax: savedResult.relax,
          stress: analysis.stress, // Pass explicit stress
          engagement: savedResult.engagement,
          valence: savedResult.valence
        }
      }
    });

  } catch (error) {
    console.error('Error in analyzeGithub:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze GitHub activity',
    });
  }
};

/**
 * Reset User Analysis History
 * @route DELETE /api/analysis/history/:userId
 */
exports.resetHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    await AnalysisResult.deleteMany({ userId });

    res.status(200).json({
      success: true,
      message: 'Analysis history has been reset.'
    });
  } catch (error) {
    console.error('Error resetting history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get Analysis Count
 * @route GET /api/analysis/count/:userId
 */
exports.getAnalysisCount = async (req, res) => {
  try {
    const { userId } = req.params;
    const count = await AnalysisResult.countDocuments({ userId });
    res.status(200).json({ success: true, count });
  } catch (error) {
    console.error('Error getting count:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};


/**
 * Generate AI Interpretation for existing analysis
 * @route POST /api/analyze/ai-interpretation
 */
exports.generateAIInterpretation = async (req, res) => {
  try {
    const { userId } = req.body;

    // Get latest analysis
    const result = await AnalysisResult.findOne({ userId })
      .sort({ createdAt: -1 });

    if (!result) {
      return res.status(404).json({ success: false, error: 'No analysis found' });
    }

    // Generate AI Report
    const aiText = await llmService.analyzeEEGWithAI({
        focus: result.focus,
        relax: result.relax,
        arousal: result.arousal,
        valence: result.valence
    });

    // Save to DB
    result.aiInterpretation = aiText;
    await result.save();

    res.status(200).json({
      success: true,
      data: {
        aiInterpretation: aiText
      }
    });

  } catch (error) {
    console.error('Error in generateAIInterpretation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Helper function to delete files
 */
async function cleanupFiles(filePaths) {
  if (!filePaths) return;
  
  const paths = Object.values(filePaths);
  for (const filePath of paths) {
    if (!filePath) continue;
    try {
      await fs.unlink(filePath);
      console.log(`Deleted temp file: ${filePath}`);
    } catch (unlinkError) {
      // Ignore error if file doesn't exist
      if (unlinkError.code !== 'ENOENT') {
        console.error(`Error deleting file ${filePath}:`, unlinkError);
      }
    }
  }
}
