import { Injectable } from '@nestjs/common'

/** Per-instance presence (userId -> open socket count) per quiz. */
@Injectable()
export class PresenceService {
  private rooms = new Map<string, Map<string, number>>()

  add(quizId: string, userId: string) {
    const m = this.rooms.get(quizId) ?? new Map<string, number>()
    m.set(userId, (m.get(userId) ?? 0) + 1)
    this.rooms.set(quizId, m)
  }
  remove(quizId: string, userId: string) {
    const m = this.rooms.get(quizId)
    if (!m) return
    const n = (m.get(userId) ?? 1) - 1
    if (n <= 0) m.delete(userId)
    else m.set(userId, n)
  }
  online(quizId: string) {
    return this.rooms.get(quizId)?.size ?? 0
  }
}
