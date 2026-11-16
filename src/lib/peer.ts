export function messageSignature(body: string): string {
  const match = body.match(/【([^】]{1,16})】/)
  const name = match?.[1]?.trim() ?? ''
  if (!name || name === '验证码') return ''
  return name
}

export function threadSignature(bodies: string[]): string {
  for (let index = bodies.length - 1; index >= 0; index -= 1) {
    const name = messageSignature(bodies[index] ?? '')
    if (name) return name
  }
  return ''
}

export function extractOtp(body: string): string | null {
  const match = body.match(/(?:验证码|校验码|动态码|提取码)[^\d]{0,8}(\d{4,8})/)
  return match?.[1] ?? null
}
