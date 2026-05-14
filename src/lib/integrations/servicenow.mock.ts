/**
 * Mock ServiceNow directory + task generator.
 *
 * Stands in for a real `sys_user` lookup and `task` insert against a
 * ServiceNow instance. Designed so the rest of the app can be wired against
 * the real API later by swapping this module for a fetch-based client that
 * hits `/api/now/table/sys_user` and `/api/now/table/task`.
 */

export type SnowUser = {
  sysId: string;
  email: string;
  name: string;
  department: string;
  jobFunction: string;
  managerEmail: string | null;
  location: string;
};

const SEED_USERS: SnowUser[] = [
  {
    sysId: "u_0001",
    email: "alex.morgan@contoso.com",
    name: "Alex Morgan",
    department: "Finance",
    jobFunction: "Analyst",
    managerEmail: "priya.shah@contoso.com",
    location: "London",
  },
  {
    sysId: "u_0002",
    email: "priya.shah@contoso.com",
    name: "Priya Shah",
    department: "Finance",
    jobFunction: "Director",
    managerEmail: "cfo@contoso.com",
    location: "London",
  },
  {
    sysId: "u_0003",
    email: "jordan.lee@contoso.com",
    name: "Jordan Lee",
    department: "IT",
    jobFunction: "Engineer / Developer",
    managerEmail: "sam.patel@contoso.com",
    location: "Austin",
  },
  {
    sysId: "u_0004",
    email: "sam.patel@contoso.com",
    name: "Sam Patel",
    department: "IT",
    jobFunction: "Manager",
    managerEmail: "cto@contoso.com",
    location: "Austin",
  },
  {
    sysId: "u_0005",
    email: "robin.chen@contoso.com",
    name: "Robin Chen",
    department: "Marketing",
    jobFunction: "Specialist",
    managerEmail: "morgan.diaz@contoso.com",
    location: "Singapore",
  },
];

function titleCase(s: string): string {
  return s.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Look up a user by email. If not in seed data, synthesize a deterministic
 * record so the UI behaves the same way the real ServiceNow `sys_user`
 * table would for any company email.
 */
export function lookupSnowUserByEmail(email: string): SnowUser | null {
  const e = email.trim().toLowerCase();
  if (!/.+@.+\..+/.test(e)) return null;

  const seed = SEED_USERS.find((u) => u.email === e);
  if (seed) return seed;

  const local = e.split("@")[0] ?? "";
  const name = titleCase(local) || "AI Requester";
  // Deterministic but synthetic department/job from email hash.
  const buckets: { dept: string; job: string }[] = [
    { dept: "IT", job: "Engineer / Developer" },
    { dept: "Finance", job: "Analyst" },
    { dept: "Operations", job: "Specialist" },
    { dept: "Sales", job: "Manager" },
    { dept: "Marketing", job: "Specialist" },
    { dept: "HR", job: "Manager" },
  ];
  const hash = [...e].reduce((a, c) => a + c.charCodeAt(0), 0);
  const pick = buckets[hash % buckets.length]!;

  return {
    sysId: `u_synth_${hash.toString(16)}`,
    email: e,
    name,
    department: pick.dept,
    jobFunction: pick.job,
    managerEmail: null,
    location: "Remote",
  };
}

export type SnowTaskInput = {
  sessionId: string;
  requesterEmail: string;
  requesterName: string;
  shortDescription: string;
  description: string;
  payload: Record<string, unknown>;
};

export type SnowTask = {
  taskNumber: string;
  sysId: string;
  state: "Open";
  assignmentGroup: "AI Governance";
};

/**
 * Synthesize a ServiceNow task number (TASK0010001 style) deterministically
 * from the session id so re-runs in dev are stable.
 */
export function createMockSnowTask(input: SnowTaskInput): SnowTask {
  const numeric =
    Math.abs(
      [...input.sessionId].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7),
    ) % 9_000_000;
  const taskNumber = `TASK${String(10_000_000 + numeric).slice(-7)}`;
  return {
    taskNumber,
    sysId: `t_${input.sessionId.replace(/-/g, "").slice(0, 24)}`,
    state: "Open",
    assignmentGroup: "AI Governance",
  };
}