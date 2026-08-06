const TELEGRAM_API_BASE = 'https://api.telegram.org'

/**
 * Sends a message to the configured Telegram chat.
 * Never throws — logs a warning and returns false so callers (e.g. the weekly
 * cron job) can still persist their work even if Telegram is misconfigured or down.
 */
export async function sendTelegramMessage(text: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim()
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim()

  if (!botToken || !chatId) {
    console.warn('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set; skipping Telegram message')
    return false
  }

  try {
    const res = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.warn(`Telegram sendMessage failed: ${res.status} ${res.statusText} ${body}`)
      return false
    }

    return true
  } catch (error) {
    console.warn('Telegram sendMessage network failure', error)
    return false
  }
}
