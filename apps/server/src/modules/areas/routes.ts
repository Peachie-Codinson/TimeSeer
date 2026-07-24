import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { requireSession } from "../../middleware/auth.js";
import { db } from "../../db/connection.js";
import { areas } from "../../db/schema.js";

const areaKinds = ["course", "research", "teaching", "administration", "personal", "other"] as const;

const areaInput = z.object({
  name: z.string().min(1),
  kind: z.enum(areaKinds),
  color: z.string().optional(),
  icon: z.string().optional(),
  startsAt: z.number().int().optional(),
  endsAt: z.number().int().optional(),
  active: z.boolean().optional(),
});

export const areasRoutes = new Hono()
  .use("*", requireSession)

  .get("/", (c) => {
    return c.json(db.select().from(areas).all());
  })

  .post("/", zValidator("json", areaInput), (c) => {
    const input = c.req.valid("json");
    const now = Date.now();

    const area = db
      .insert(areas)
      .values({
        name: input.name,
        kind: input.kind,
        color: input.color,
        icon: input.icon,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        active: input.active === false ? 0 : 1,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    return c.json(area, 201);
  })

  .patch("/:areaId", zValidator("json", areaInput.partial()), (c) => {
    const input = c.req.valid("json");
    const areaId = c.req.param("areaId");

    const area = db
      .update(areas)
      .set({
        ...input,
        active: input.active === undefined ? undefined : input.active ? 1 : 0,
        updatedAt: Date.now(),
      })
      .where(eq(areas.id, areaId))
      .returning()
      .get();

    if (!area) throw new HTTPException(404, { message: "Area not found" });
    return c.json(area);
  })

  .delete("/:areaId", (c) => {
    db.delete(areas).where(eq(areas.id, c.req.param("areaId"))).run();
    return c.body(null, 204);
  });
