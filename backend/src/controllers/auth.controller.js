const { register, login } = require('../services/auth.service');

async function registerUser(req, res, next) {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'email and password are required', data: null });
    }

    const user = await register({ email, password, role });
    return res.status(201).json({ success: true, message: 'User registered successfully', data: user });
  } catch (err) {
    next(err);
  }
}

async function loginUser(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'email and password are required', data: null });
    }

    const result = await login({ email, password });
    return res.status(200).json({ success: true, message: 'Login successful', data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { registerUser, loginUser };
