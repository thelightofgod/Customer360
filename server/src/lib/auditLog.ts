import { getMongo } from '../db/mongo'

export type AuditAction = 'create' | 'update' | 'delete'
export type AuditEntityType = 'account' | 'contact' | 'subscription' | 'deal' | 'payment_schedule' | 'sale'

// Maps camelCase req.body key → { mongo field name, human-readable label }
export type FieldMap = Record<string, { mongo: string; label: string }>

function normalizeVal(val: unknown): string {
  if (val == null) return ''
  if (val instanceof Date) return val.toISOString().slice(0, 10)
  if (typeof val === 'string') {
    const stripped = val.replace(/,/g, '')
    if (stripped !== '' && !isNaN(Number(stripped))) return stripped
    return val
  }
  return String(val)
}

export function buildDiff(
  oldDoc: any,
  newData: Record<string, any>,
  fieldMap: FieldMap
): Record<string, { from: string; to: string }> | undefined {
  const changes: Record<string, { from: string; to: string }> = {}
  for (const [key, { mongo, label }] of Object.entries(fieldMap)) {
    if (!(key in newData) || newData[key] === undefined) continue
    const oldStr = normalizeVal(oldDoc?.[mongo])
    const newStr = normalizeVal(newData[key])
    if (oldStr !== newStr) {
      changes[label] = { from: oldStr || '—', to: newStr || '—' }
    }
  }
  return Object.keys(changes).length > 0 ? changes : undefined
}

export async function logActivity(
  userEmail: string,
  action: AuditAction,
  entityType: AuditEntityType,
  entityId: string,
  entityName: string,
  changes?: Record<string, { from: string; to: string }>
): Promise<void> {
  try {
    const doc: Record<string, unknown> = {
      timestamp: new Date(),
      user_email: userEmail,
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
    }
    if (changes) doc.changes = changes
    await getMongo().collection('AuditLogs').insertOne(doc)
  } catch {
    // Audit log failures must not break the main operation
  }
}
