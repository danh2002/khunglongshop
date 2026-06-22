# 002 - Replace 30-second notification poll with SSE (or conditional fetch)

**Written against:** `05e69fd3395e4b36540c4f44c1ec900e9b063651`
**Scope:** `hooks/useNotifications.ts`, `app/api/notifications/unread-count/route.ts`, `app/api/notifications/stream/route.ts`
**Out of scope:** notification list UI, read/mark-read endpoints, push notifications
**Executor model:** mid-tier or above (requires understanding SSE)

---

## Background

`hooks/useNotifications.ts` runs `setInterval` around line 209, hitting
`app/api/notifications/unread-count/route.ts`, which issues a `COUNT(*)` query
against the database on every tick - for every logged-in tab, every user,
indefinitely.

**Phase 1 (this plan):** replace the interval with Server-Sent Events so the
server pushes a count update through one long-lived connection.

**Fallback option:** if SSE is architecturally blocked (for example serverless
cold starts or platform connection limits), implement exponential-backoff
polling as a stopgap. Choose one; do not implement both.

---

## Pre-flight

```bash
npm run type-check && npm test
grep -n "setInterval" hooks/useNotifications.ts
# expected: find the polling line around 209
```

---

## Steps - SSE path

### Step 1 - Create the SSE endpoint

Create `app/api/notifications/stream/route.ts`:

```ts
import { getServerSession } from "next-auth/next";
import { NextRequest } from "next/server";
import { authOptions } from "@/utils/authOptions";
import prisma from "@/utils/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const sendUnreadCount = async () => {
        const unreadCount = await prisma.notification.count({
          where: { userId, isRead: false },
        });
        send({ unreadCount });
      };

      await sendUnreadCount();

      const interval = setInterval(async () => {
        try {
          await sendUnreadCount();
        } catch {
          clearInterval(interval);
          controller.close();
        }
      }, 60_000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

This repo's current schema uses `Notification.isRead`, not `read`. Keep the
existing project imports: `authOptions` from `@/utils/authOptions` and Prisma
from `@/utils/db`.

**Verification:**

```bash
npm run type-check
# expected: no errors in the new file
```

---

### Step 2 - Update `useNotifications.ts`

Replace the `setInterval` block around line 209 with an `EventSource`
connection. Keep all existing Zustand state unchanged; only replace the
data-fetching mechanism.

```ts
useEffect(() => {
  if (!session?.user?.id) return;

  const eventSource = new EventSource("/api/notifications/stream");

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data) as { unreadCount?: number };
    if (typeof data.unreadCount === "number") {
      setUnreadCount(data.unreadCount);
    }
  };

  eventSource.onerror = () => {
    eventSource.close();
    void fetchUnreadCount();
  };

  return () => eventSource.close();
}, [fetchUnreadCount, session?.user?.id, setUnreadCount]);
```

Remove the old `setInterval` / `clearInterval` block entirely.

**Verification:**

```bash
grep -n "setInterval" hooks/useNotifications.ts
# expected: no output
```

---

### Step 3 - Keep the old unread-count endpoint

Do not delete `app/api/notifications/unread-count/route.ts`. It is still useful
as an initial fetch, as a fallback fetch after SSE errors, and for any callers
outside the header bell.

---

## Fallback path - exponential-backoff polling

Use this only if SSE cannot be used. In `hooks/useNotifications.ts`, replace
`setInterval` with a recursive `setTimeout` that doubles the interval after
each successful fetch, capping at 5 minutes:

```ts
let delay = 30_000;

const poll = async () => {
  await fetchUnreadCount();
  delay = Math.min(delay * 2, 300_000);
  timeoutRef.current = setTimeout(poll, delay);
};
```

Reset `delay` back to `30_000` when the user opens the notification panel,
because they are actively engaged.

---

## Done criteria

- [ ] No `setInterval` in `hooks/useNotifications.ts`
- [ ] `EventSource("/api/notifications/stream")` or backoff `setTimeout` is in place
- [ ] `npm run type-check` passes
- [ ] `npm test` passes
- [ ] Manual smoke test: log in, then verify the notification bell updates without a hard refresh
