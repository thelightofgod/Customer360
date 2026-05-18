import { Router } from 'express'
import type { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { Resend } from 'resend'
import { getMongo } from '../db/mongo'
import { requireAuth, JWT_SECRET } from '../middleware/auth'
import type { AuthRequest } from '../middleware/auth'

const router = Router()
const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev'
const APP_URL = process.env.APP_URL || 'http://localhost:5173'

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
}

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

    const user = await getMongo().collection('Users').findOne({ email: email.toLowerCase().trim() })
    if (!user) return res.status(401).json({ error: 'Invalid email or password' })

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' })

    const token = jwt.sign(
      { userId: user._id.toHexString(), email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.cookie('token', token, COOKIE_OPTS)
    res.json({ ok: true, email: user.email, name: user.name })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/logout', (_req, res: Response) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax' })
  res.json({ ok: true })
})

router.get('/me', requireAuth, (req: AuthRequest, res: Response) => {
  res.json({ email: req.userEmail })
})

router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email required' })

    const user = await getMongo().collection('Users').findOne({ email: email.toLowerCase().trim() })
    // Always 200 to prevent email enumeration
    if (!user) return res.json({ ok: true })

    const token = crypto.randomBytes(32).toString('hex')
    const expiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await getMongo().collection('Users').updateOne(
      { _id: user._id },
      { $set: { resetToken: token, resetTokenExpiry: expiry } }
    )

    const resetUrl = `${APP_URL}/reset-password?token=${token}`

    await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: 'Şifre Sıfırlama — Customer 360',
      html: buildResetEmail(user.name || user.email, resetUrl),
    })

    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body
    if (!token || !password) return res.status(400).json({ error: 'Token and password required' })
    if (password.length < 6) return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' })

    const user = await getMongo().collection('Users').findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() },
    })

    if (!user) return res.status(400).json({ error: 'Geçersiz veya süresi dolmuş link' })

    const hash = await bcrypt.hash(password, 10)
    await getMongo().collection('Users').updateOne(
      { _id: user._id },
      { $set: { password: hash }, $unset: { resetToken: '', resetTokenExpiry: '' } }
    )

    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/change-password', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'All fields required' })
    if (newPassword.length < 6) return res.status(400).json({ error: 'Yeni şifre en az 6 karakter olmalı' })

    const user = await getMongo().collection('Users').findOne({ email: req.userEmail })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) return res.status(400).json({ error: 'Mevcut şifre yanlış' })

    const hash = await bcrypt.hash(newPassword, 10)
    await getMongo().collection('Users').updateOne(
      { _id: user._id },
      { $set: { password: hash } }
    )

    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Internal server error' })
  }
})

function buildResetEmail(name: string, resetUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f1629;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1629;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#1a2240;border-radius:16px;border:1px solid rgba(91,158,255,0.12);overflow:hidden;">
        <tr>
          <td style="padding:32px 32px 24px;text-align:center;background:linear-gradient(135deg,rgba(91,158,255,0.08),rgba(46,216,150,0.05));">
            <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;background:linear-gradient(135deg,#2ed896,#18a870);border-radius:14px;margin-bottom:16px;">
              <svg viewBox="0 0 16 16" fill="none" width="24" height="24">
                <path d="M3 8h3l1.5-4 2.5 8 1.5-4H14" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div style="color:#e2e8f0;font-size:20px;font-weight:700;letter-spacing:-0.3px;">Customer 360</div>
            <div style="color:#64748b;font-size:12px;margin-top:2px;">Powered by BI Technology</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 8px;color:#94a3b8;font-size:13px;">Merhaba, <span style="color:#e2e8f0;font-weight:600;">${name}</span></p>
            <p style="margin:0 0 24px;color:#94a3b8;font-size:14px;line-height:1.6;">
              Şifre sıfırlama talebinde bulundunuz. Aşağıdaki butona tıklayarak yeni şifrenizi belirleyebilirsiniz.
              Bu link <strong style="color:#e2e8f0;">1 saat</strong> geçerlidir.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="${resetUrl}" style="display:inline-block;padding:13px 32px;background:linear-gradient(135deg,#5b9eff,#3b7fe0);color:#fff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;letter-spacing:0.2px;">
                  Şifremi Sıfırla
                </a>
              </td></tr>
            </table>
            <p style="margin:24px 0 0;color:#475569;font-size:12px;line-height:1.5;">
              Bu işlemi siz yapmadıysanız bu maili görmezden gelebilirsiniz. Şifreniz değişmeyecektir.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.05);">
            <p style="margin:0;color:#334155;font-size:11px;text-align:center;">
              Buton çalışmıyorsa bu linki kopyalayın:<br>
              <span style="color:#475569;word-break:break-all;">${resetUrl}</span>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export default router
