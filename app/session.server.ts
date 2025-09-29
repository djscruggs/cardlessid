import { createCookieSessionStorage } from "react-router";

type SessionData = {
  credentialId: string;
  subjectId: string;
  issuerId: string;
  compositeHash: string;
};

type SessionFlashData = {
  error: string;
};

const { getSession, commitSession, destroySession } = createCookieSessionStorage<SessionData, SessionFlashData>({
  cookie: {
    name: "__cardless_session",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/app", // Only available for /app routes
    sameSite: "lax",
    secrets: [process.env.SESSION_SECRET || "cardless-fallback-secret-key"],
    secure: process.env.NODE_ENV === "production",
  },
});

export { getSession, commitSession, destroySession };
