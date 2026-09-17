import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import {
  findBookingConflicts,
  findBlockOverlaps,
  previewBlockCost,
  mergeBlockRanges,
} from "../../shared/blockedDates.ts";

// Admin-only CRUD + preview for owner-blocked date ranges.
//
// Actions:
//   list    — return all blocks + active bookings (for the admin calendar)
//   preview — check a proposed range for booking conflicts, block overlaps,
//             and cost (no save)
//   save    — create or update a block. Refuses if it overlaps any active
//             booking (held/deposit_paid/confirmed). If it overlaps existing
//             blocks, requires force: "merge" | "replace" to proceed.
//   delete  — delete a block by id
//
// A block covers nights [start_date, end_date] inclusive. The owner must
// never block dates a guest has paid for — booking conflicts are always
// refused and named. Block overlaps are warned, not refused: the admin can
// merge (combine into one range) or replace (delete the old, save the new).
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin required" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === "list") {
      const [blocks, bookings] = await Promise.all([
        base44.asServiceRole.entities.BlockedDate.list("-start_date", 500),
        base44.asServiceRole.entities.Booking.list("-arrival_date", 500),
      ]);
      return Response.json({
        blocks: blocks || [],
        bookings: (bookings || []).filter((b) => b.status !== "cancelled" && b.status !== "expired"),
      });
    }

    if (action === "preview") {
      const { start_date, end_date, exclude_id } = body;
      if (!start_date || !end_date || start_date > end_date) {
        return Response.json({ error: "Valid start and end dates required" }, { status: 400 });
      }
      const [blocks, bookings] = await Promise.all([
        base44.asServiceRole.entities.BlockedDate.list("-start_date", 500),
        base44.asServiceRole.entities.Booking.list("-arrival_date", 500),
      ]);
      const bookingConflicts = findBookingConflicts(bookings, start_date, end_date);
      const blockOverlaps = findBlockOverlaps(blocks, start_date, end_date, exclude_id);
      const cost = previewBlockCost(start_date, end_date);
      return Response.json({ bookingConflicts, blockOverlaps, cost });
    }

    if (action === "save") {
      const { start_date, end_date, reason, notes, id, force } = body;
      if (!start_date || !end_date || start_date > end_date) {
        return Response.json({ error: "Valid start and end dates required" }, { status: 400 });
      }
      if (!reason) {
        return Response.json({ error: "Reason required" }, { status: 400 });
      }

      const [blocks, bookings] = await Promise.all([
        base44.asServiceRole.entities.BlockedDate.list("-start_date", 500),
        base44.asServiceRole.entities.Booking.list("-arrival_date", 500),
      ]);

      // 1. Booking conflicts — always refuse. Name the bookings.
      const bookingConflicts = findBookingConflicts(bookings, start_date, end_date);
      if (bookingConflicts.length) {
        return Response.json({ error: "Booking conflict", bookingConflicts }, { status: 409 });
      }

      // 2. Block overlaps — require force: merge | replace.
      const blockOverlaps = findBlockOverlaps(blocks, start_date, end_date, id);
      if (blockOverlaps.length && !force) {
        return Response.json({ error: "Block overlap", blockOverlaps }, { status: 409 });
      }

      if (force === "merge" && blockOverlaps.length) {
        const all = [...blockOverlaps, { start_date, end_date }];
        const merged = mergeBlockRanges(all);
        const first = blockOverlaps[0];
        await base44.asServiceRole.entities.BlockedDate.update(first.id, {
          start_date: merged.start_date,
          end_date: merged.end_date,
          reason,
          notes: notes || first.notes,
        });
        for (let i = 1; i < blockOverlaps.length; i++) {
          await base44.asServiceRole.entities.BlockedDate.delete(blockOverlaps[i].id);
        }
        return Response.json({ ok: true, merged: true, id: first.id });
      }

      if (force === "replace" && blockOverlaps.length) {
        for (const b of blockOverlaps) {
          await base44.asServiceRole.entities.BlockedDate.delete(b.id);
        }
      }

      if (id) {
        await base44.asServiceRole.entities.BlockedDate.update(id, { start_date, end_date, reason, notes });
        return Response.json({ ok: true, updated: true, id });
      }

      const created = await base44.asServiceRole.entities.BlockedDate.create({ start_date, end_date, reason, notes });
      return Response.json({ ok: true, created: true, id: created.id });
    }

    if (action === "delete") {
      const { id } = body;
      if (!id) return Response.json({ error: "ID required" }, { status: 400 });
      await base44.asServiceRole.entities.BlockedDate.delete(id);
      return Response.json({ ok: true, deleted: true });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}