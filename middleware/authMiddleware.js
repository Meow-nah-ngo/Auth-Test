function requireAuth(req, res, next) {
  if (req.session && req.session.isAuthenticated) {
    return next();
  }
  return res.status(401).json({ message: '401 Unauthorized: Please log in' });
}

module.exports = { requireAuth };