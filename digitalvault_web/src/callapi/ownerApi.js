import axiosClient from './axiosClient'

// Mô tả để trống thì gửi null, vì BE coi description là tuỳ chọn
const optionalText = (value) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export async function getVaults() {
  const { data } = await axiosClient.get('/owner/vaults')
  return data
}

export async function getVault(vaultId) {
  const { data } = await axiosClient.get(`/owner/vaults/${vaultId}`)
  return data
}

// Chỉ gửi đúng các trường BE nhận (BE từ chối trường thừa)
export async function createVault({ name, description }) {
  const { data } = await axiosClient.post('/owner/vaults', {
    name: name.trim(),
    description: optionalText(description),
  })
  return data
}

export async function getAssets() {
  const { data } = await axiosClient.get('/owner/assets')
  return data
}

export async function getAsset(assetId) {
  const { data } = await axiosClient.get(`/owner/assets/${assetId}`)
  return data
}

export async function createAsset({ vaultId, name, type, description }) {
  const { data } = await axiosClient.post('/owner/assets', {
    vaultId,
    name: name.trim(),
    type,
    description: optionalText(description),
  })
  return data
}

// Upload giấy tờ (multipart): còn sống thì kèm chữ ký rời, đã mất thì kèm giấy chứng tử
export async function uploadDocument(assetId, { file, beneficiaryId, ownerAlive, signature, deathCertificate }) {
  const form = new FormData()
  form.append('file', file)
  form.append('beneficiaryId', String(beneficiaryId))
  form.append('ownerAlive', ownerAlive ? 'true' : 'false')
  if (ownerAlive && signature) form.append('signature', signature)
  if (!ownerAlive && deathCertificate) form.append('deathCertificate', deathCertificate)
  const { data } = await axiosClient.post(`/owner/assets/${assetId}/documents`, form)
  return data
}

// Bỏ assetId để lấy người thụ hưởng trên mọi tài sản của user
export async function getBeneficiaries(assetId) {
  const { data } = await axiosClient.get('/owner/beneficiaries', {
    params: assetId === undefined ? undefined : { assetId },
  })
  return data
}

export async function assignBeneficiary(assetId, { email, allocation }) {
  const { data } = await axiosClient.post(`/owner/assets/${assetId}/beneficiaries`, {
    email: email.trim(),
    allocation,
  })
  return data
}
