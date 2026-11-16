import { peerThreadId } from './ids'
import type { Message } from '../types'

/** URL `?demo=` → true / false / null (absent). Demo mode is query-only. */
export function readDemoQuery(
  search = typeof window !== 'undefined' ? window.location.search : '',
): boolean | null {
  const raw = new URLSearchParams(search).get('demo')
  if (raw === null) return null
  const v = raw.trim().toLowerCase()
  if (v === '0' || v === 'false' || v === 'off' || v === 'no') return false
  return true
}

const SEEDS: Array<{ peer: string; body: string }> = [
  {
    peer: '106901112233',
    body: '【滴滴出行】验证码630573，您正在登录滴滴，10分钟内有效。',
  },
  {
    peer: '106901112233',
    body: '【滴滴出行】验证码418902，您正在登录滴滴，10分钟内有效。',
  },
  {
    peer: '95588',
    body: '【工商银行】验证码882146，用于登录手机银行，5分钟内有效。切勿泄露。',
  },
  {
    peer: '95188',
    body: '【支付宝】验证码663201，用于登录支付宝，请勿告知他人。详情 https://www.alipay.com',
  },
  {
    peer: '10086',
    body: '【中国移动】您的套餐将于本月底到期，续订请访问 https://wx.10086.cn 或回复 KT。',
  },
  {
    peer: '106903332211',
    body: '【京东】您的订单已发货，物流详情 https://www.jd.com 查看。',
  },
  {
    peer: '13800138000',
    body: '晚上七点见，位置发你了：https://maps.apple.com/?q=cafe',
  },
  {
    peer: '13800138000',
    body: '好的，那就这么定。',
  },
]

/** Small demo inbox: a few OTP and link samples. */
export function buildDemoMessages(now = Date.now()): Message[] {
  return SEEDS.map((seed, index) => ({
    id: `demo:${index + 1}`,
    threadId: peerThreadId(seed.peer),
    backend: 'demo',
    direction: 'in',
    peer: seed.peer,
    body: seed.body,
    date: now - (SEEDS.length - index) * 8 * 60_000,
  }))
}
