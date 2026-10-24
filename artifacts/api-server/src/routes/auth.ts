import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RegisterBody, LoginBody, SwitchDemoUserBody, GetMeResponse, GetDemoUsersResponse, LoginResponse, RegisterResponse } from "@workspace/api-zod";
import { clearSession, currentUser, hashPassword, publicUser, setSession, verifyPassword } from "../lib/auth";
import { HttpError } from "../lib/errors";

const router: IRouter = Router();
// Basic bounded in-process protection for password endpoints.
const attempts = new Map<string, { count: number; reset: number }>();
router.use("/auth", (req, res, next) => {
  if (req.method !== "POST" || !["/login", "/register", "/demo"].includes(req.path)) { next(); return; }
  const key = req.ip ?? "unknown";
  const now = Date.now();
  let record = attempts.get(key);
  if (!record || record.reset < now) { record = { count: 0, reset: now + 60000 }; attempts.set(key, record); }
  if (++record.count > 40) { res.status(429).json({ error: "Too many attempts. Please wait a minute." }); return; }
  if (attempts.size > 10000) for (const [k, v] of attempts) if (v.reset < now) attempts.delete(k);
  next();
});
router.get("/auth/me", async (req, res): Promise<void> => {
  const user = await currentUser(req);
  res.json(GetMeResponse.parse({ user: user ? publicUser(user) : null }));
});
router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "Use a 3–24 character username, a password of at least 8 characters, and an age of 18 or above.");
  const input = parsed.data;
  const [user] = await db.insert(usersTable).values({
    username: input.username.toLowerCase(), passwordHash: await hashPassword(input.password),
    age: input.age, avatarSeed: input.avatarSeed,
  }).onConflictDoNothing().returning();
  if (!user) throw new HttpError(409, "Username is already taken, please choose another");
  setSession(res, user.id);
  res.status(201).json(RegisterResponse.parse(publicUser(user)));
});
router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "Enter a valid username and password");
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, parsed.data.username.toLowerCase()));
  if (!user || !await verifyPassword(parsed.data.password, user.passwordHash)) throw new HttpError(401, "Incorrect username or password");
  setSession(res, user.id);
  res.json(LoginResponse.parse(publicUser(user)));
});
router.post("/auth/logout", (_req, res) => { clearSession(res); res.json({ success: true }); });
router.get("/demo-users", async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).where(eq(usersTable.isDemo, true)).orderBy(usersTable.age);
  res.json(GetDemoUsersResponse.parse(users.map(publicUser)));
});
router.post("/auth/demo", async (req, res): Promise<void> => {
  const parsed = SwitchDemoUserBody.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "Choose a demo user");
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, parsed.data.userId));
  if (!user?.isDemo) throw new HttpError(404, "Demo user not found");
  setSession(res, user.id);
  res.json(publicUser(user));
});
export default router;
