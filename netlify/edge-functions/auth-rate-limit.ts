export default function authRateLimit() {
  return undefined;
}

export const config = {
  path: "/api/auth/callback/credentials",
  method: "POST",
  rateLimit: {
    windowLimit: 10,
    windowSize: 60,
    aggregateBy: ["ip", "domain"],
  },
};
