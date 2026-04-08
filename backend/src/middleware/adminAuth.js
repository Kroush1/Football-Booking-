function adminAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Basic ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const encoded = auth.slice("Basic ".length);
  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const [username, password] = decoded.split(":");

  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    return next();
  }

  return res.status(401).json({ message: "Invalid credentials" });
}

module.exports = adminAuth;
