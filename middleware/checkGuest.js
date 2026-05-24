module.exports = (req, res, next) => {
  if (!req.session?.userId) {
    return next();
  }
  res.redirect('/');
};