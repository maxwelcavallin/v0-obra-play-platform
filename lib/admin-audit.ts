import { sql } from "./db"

export async function logAdminAction({
  adminId,
  adminName,
  action,
  entityType,
  entityId,
  details,
}: {
  adminId: string
  adminName: string
  action: string
  entityType?: string
  entityId?: string
  details?: Record<string, unknown>
}) {
  await sql`
    INSERT INTO admin_audit_log (admin_id, admin_name, action, entity_type, entity_id, details)
    VALUES (${adminId}, ${adminName}, ${action}, ${entityType ?? null}, ${entityId ?? null}, ${details ? JSON.stringify(details) : null})
  `
}
