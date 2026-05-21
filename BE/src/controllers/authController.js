const authService = require('../services/authService');

const register = async (req, res, next) => {
    try {
        const { name, email, phone, password } = req.body;
        const result = await authService.register(name, email, phone, password);
        res.status(201).json({
            message: 'User registered successfully. You can now login as a Patient or Caregiver.',
            ...result,
        });
    } catch (err) {
        next(err);
    }
};

const login = async (req, res, next) => {
    try {
        const { identifier, password, role } = req.body;
        const result = await authService.login(identifier, password, role);
        res.status(200).json({ message: 'Berhasil login', ...result });
    } catch (err) {
        next(err);
    }
};

const oauthLogin = async (req, res, next) => {
    try {
        const { access_token, role } = req.body;
        const result = await authService.oauthLogin(access_token, role);
        res.status(200).json({ message: 'OAuth Login successful', ...result });
    } catch (err) {
        next(err);
    }
};

const getMe = async (req, res, next) => {
    try {
        if (!req.user) throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
        const data = await authService.getMe(req.user);
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
};

const refreshToken = async (req, res, next) => {
    try {
        const result = await authService.refreshToken(req.body.refresh_token);
        res.status(200).json({ message: 'Token berhasil diperbarui', ...result });
    } catch (err) {
        next(err);
    }
};

const logout = async (req, res, next) => {
    try {
        await authService.logout(req.user);
        res.status(200).json({ message: 'Berhasil logout dan chat history dibersihkan.' });
    } catch (err) {
        next(err);
    }
};

module.exports = { register, login, oauthLogin, getMe, refreshToken, logout };