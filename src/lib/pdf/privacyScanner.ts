import { PDFDocument } from '@cantoo/pdf-lib'

export interface PrivacyRisk {
  category:  string
  severity:  'high' | 'medium' | 'low'
  finding:   string
  value:     string
  canRemove: boolean
}

export interface PrivacyScanResult {
  risks:      PrivacyRisk[]
  riskScore:  number  // 0-100
  riskLevel:  'clean' | 'low' | 'medium' | 'high'
  totalFound: number
}

export async function scanPDFPrivacy(file: File): Promise<PrivacyScanResult> {
  const bytes = await file.arrayBuffer()
  const doc   = await PDFDocument.load(bytes, { throwOnInvalidObject: false })
  const risks: PrivacyRisk[] = []

  const checks: Array<{
    key:      string
    getter:   () => string | undefined
    category: string
    severity: 'high' | 'medium' | 'low'
  }> = [
    { key: 'Author',   getter: () => doc.getAuthor(),   category: 'Personal Identity', severity: 'high'   },
    { key: 'Creator',  getter: () => doc.getCreator(),  category: 'Software Info',     severity: 'low'    },
    { key: 'Producer', getter: () => doc.getProducer(), category: 'Software Info',     severity: 'low'    },
    { key: 'Title',    getter: () => doc.getTitle(),    category: 'Document Info',     severity: 'medium' },
    { key: 'Subject',  getter: () => doc.getSubject(),  category: 'Document Info',     severity: 'low'    },
    { key: 'Keywords', getter: () => doc.getKeywords(), category: 'Document Info',     severity: 'low'    },
  ]

  for (const check of checks) {
    try {
      const value = check.getter()
      if (value && value.trim()) {
        risks.push({
          category:  check.category,
          severity:  check.severity,
          finding:   `${check.key} metadata found`,
          value:     value.trim(),
          canRemove: true,
        })
      }
    } catch { /* skip */ }
  }

  try {
    const created = doc.getCreationDate()
    if (created) {
      risks.push({
        category:  'Timestamps',
        severity:  'medium',
        finding:   'Creation date embedded',
        value:     created.toLocaleDateString(),
        canRemove: true,
      })
    }
  } catch { /* skip */ }

  try {
    const modified = doc.getModificationDate()
    if (modified) {
      risks.push({
        category:  'Timestamps',
        severity:  'low',
        finding:   'Modification date embedded',
        value:     modified.toLocaleDateString(),
        canRemove: true,
      })
    }
  } catch { /* skip */ }

  const score = risks.reduce((acc, r) => {
    return acc + (r.severity === 'high' ? 30 : r.severity === 'medium' ? 15 : 5)
  }, 0)

  const riskLevel: PrivacyScanResult['riskLevel'] =
    score === 0 ? 'clean' :
    score < 20  ? 'low'   :
    score < 50  ? 'medium' : 'high'

  return {
    risks,
    riskScore:  Math.min(100, score),
    riskLevel,
    totalFound: risks.length,
  }
}

export async function stripAllMetadata(file: File): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer()
  const doc   = await PDFDocument.load(bytes, { throwOnInvalidObject: false })

  doc.setTitle('')
  doc.setAuthor('')
  doc.setSubject('')
  doc.setKeywords([])
  doc.setCreator('')
  doc.setProducer('')

  return doc.save()
}
