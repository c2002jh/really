const User = require('../models/User');

// Register new user
exports.register = async (req, res) => {
  try {
    const { username, password, nickname, apiKeys } = req.body;

    // Validate input
    if (!username || !password || !nickname) {
      return res.status(400).json({
        success: false,
        message: '아이디, 비밀번호, 닉네임은 필수 항목입니다.',
      });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '이미 사용 중인 아이디입니다.',
      });
    }

    // Create new user
    const user = new User({
      username,
      password,
      nickname,
      apiKeys: apiKeys || {},
    });

    await user.save();

    // Return user data (without password)
    res.status(201).json({
      success: true,
      message: '회원가입이 완료되었습니다.',
      data: {
        userId: user._id,
        username: user.username,
        nickname: user.nickname,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: '회원가입 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '아이디와 비밀번호를 입력해주세요.',
      });
    }

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '아이디 또는 비밀번호가 올바르지 않습니다.',
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: '아이디 또는 비밀번호가 올바르지 않습니다.',
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Return user data (without password)
    res.status(200).json({
      success: true,
      message: '로그인 성공',
      data: {
        userId: user._id,
        username: user.username,
        nickname: user.nickname,
        apiKeys: user.apiKeys,
        genres: user.genres,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: '로그인 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: '프로필 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    // Don't allow password update through this endpoint (use separate password change endpoint)
    delete updates.password;
    // Username is immutable after registration to maintain data consistency
    delete updates.username;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.',
      });
    }

    res.status(200).json({
      success: true,
      message: '프로필이 업데이트되었습니다.',
      data: user,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: '프로필 업데이트 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
};
