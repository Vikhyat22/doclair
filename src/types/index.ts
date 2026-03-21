export interface FileItem {
  id: string
  name: string
  size: number
}

export interface Tool {
  id: string
  name: string
  icon: string
  category:
    | 'Essentials'
    | 'Edit & Organize'
    | 'Security'
    | 'Convert'
    | 'AI Tools'
    | 'Utilities'
  desc: string
  slug: string       // flat — no /tools/ prefix
  colorBg: string    // hex background for icon wrap
  ai?: boolean
  in?: boolean       // India-specific tool
  isNew?: boolean
}

export interface FAQ {
  q: string
  a: string
}

export type ToolState = 'idle' | 'merging' | 'done' | 'error'

export interface CompressWorkerMessage {
  fileBytes: ArrayBuffer
  quality: 'light' | 'medium' | 'heavy'
}

export type CompressWorkerResult =
  | { type: 'progress'; pct: number }
  | { type: 'done'; bytes: ArrayBuffer }
  | { type: 'error'; message: string }

export interface EncryptWorkerMessage {
  fileBytes:     ArrayBuffer
  userPassword:  string
  ownerPassword: string
  permissions:   number   // GS -dPermissions integer
}

export type EncryptWorkerResult =
  | { type: 'progress'; pct: number }
  | { type: 'done'; bytes: ArrayBuffer }
  | { type: 'error'; message: string }
