// Tiện ích đọc multipart cho các handler mock upload (khớp ràng buộc file của BE)
export const DOCUMENT_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'text/plain']
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024
export const MAX_SIGNATURE_BYTES = 16384

export const isFile = (value) => value !== null && typeof value === 'object' && typeof value.size === 'number'

// Tên trường multipart không phân biệt hoa thường như model binding của ASP.NET
export const fieldOf = (form, name) => [...form.entries()].find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1] ?? null

export const hasUnknownFormFields = (form, allowed) => [...form.keys()].some((key) => !allowed.some((name) => name.toLowerCase() === key.toLowerCase()))

export const isValidDocument = (value) => isFile(value) && value.size > 0 && value.size <= MAX_DOCUMENT_BYTES && DOCUMENT_TYPES.includes(value.type)

export const isValidSignature = (value) => isFile(value) && value.size > 0 && value.size <= MAX_SIGNATURE_BYTES
