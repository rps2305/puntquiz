// Shared API / socket contracts (spec §17, §26). Types only — no runtime deps.

export type QuizMode = 'INDIVIDUAL' | 'TEAM'
export type QuizStatus = 'DRAFT' | 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'ARCHIVED'
export type QuestionType = 'MC' | 'MULTI' | 'OPEN' | 'MUSIC'
export type RevealMode = 'ROUND' | 'QUESTION'
export type Phase =
  | 'LOBBY'
  | 'QUESTION_OPEN'
  | 'QUESTION_CLOSED'
  | 'GRADING'
  | 'REVEAL'
  | 'BREAK'
  | 'PAUSED'
  | 'FINISHED'

export const GRACE_PERIOD_MS = 60_000
export const EXTRA_TIME_MS = 15_000

/** Power-ups (spec §8). Skip is deliberately absent: it only makes sense with answer streaks. */
export type PowerUpType = 'FIFTY' | 'DOUBLE' | 'DOUBLE_DOWN' | 'EXTRA_TIME' | 'HINT'
export const POWER_UP_TYPES: PowerUpType[] = ['FIFTY', 'DOUBLE', 'DOUBLE_DOWN', 'EXTRA_TIME', 'HINT']

export interface PowerUpSettings {
  types: PowerUpType[]
  /** Uses of each type per player (individual quiz) or per team (team quiz). */
  uses: number
}

export interface PlayerPowerUps {
  owner: 'TEAM' | 'PLAYER'
  types: PowerUpType[]
  /** Uses left per type for this owner. */
  remaining: Record<string, number>
  /** Types already activated on the current question. */
  usedOnQuestion: PowerUpType[]
  /** Types that can be activated right now. */
  canUse: Record<string, boolean>
  /** 50/50: option ids hidden for this owner on the current question. */
  hidden: string[]
  /** Hint text, once unlocked. */
  hint: string | null
  /** ms epoch until which this owner may still answer thanks to Extra Time, or null. */
  extraUntil: number | null
}
export const MIN_TEAM_SIZE = 3

export interface UserDto {
  id: string
  name: string
  email: string | null
  isGuest: boolean
  avatar: string | null
  isAdmin: boolean
  /** May build and present quizzes (approved, or admin, or approval switched off). */
  canHost: boolean
  hostRequested: boolean
}

export interface HostRequestDto { id: string; name: string; email: string | null; requestedAt: string }
export interface HostAdminDto { requests: HostRequestDto[]; hosts: { id: string; name: string; email: string | null }[] }

export interface OptionDto {
  id: string
  text: string
}

export interface MediaDto {
  kind: 'image' | 'audio' | 'youtube'
  /** Ready-to-use source: our /api/media/<id>, an https URL, or a youtube-nocookie embed URL. */
  src: string
  /** Shown/played on players' phones (audio defaults to false: it plays on the venue's speakers). */
  players: boolean
  assetId?: string
  url?: string
  videoId?: string
  start?: number
  end?: number
}

export interface MusicConfigDto {
  artist: string[]
  title: string[]
  year: number | null
  artistPoints: number
  titlePoints: number
  yearPoints: number
}

export interface MusicResultDto {
  artist: boolean
  title: boolean
  year: boolean
  points: number
}

export interface QuestionDto {
  id: string
  number: number
  text: string
  type: QuestionType
  options: OptionDto[]
  points: number
  seconds: number
  explanation?: string | null
  media?: MediaDto[]
  /** Clue for the Hint power-up; sent to the quizmaster (and everyone after reveal), otherwise only once unlocked. */
  hint?: string | null
  /** MUSIC only: accepted answers and points; sent to the quizmaster or after reveal. */
  music?: MusicConfigDto | null
  /** Link to the question-bank item this was copied from (reuse tracking, spec §18). */
  bankQuestionId?: string | null
  /** Only present for the quizmaster or after reveal. */
  correct?: string[]
}

export type RoundKind = 'STANDARD' | 'PICTURE'

export interface RoundDto {
  id: string
  number: number
  title: string
  category: string | null
  kind: RoundKind
  /** PICTURE: how many following rounds the sheet stays answerable (1-3). */
  openRounds: number
  questions: QuestionDto[]
}

export interface QuizSummaryDto {
  id: string
  title: string
  description: string | null
  joinCode: string
  mode: QuizMode
  status: QuizStatus
  revealMode: RevealMode
  maxTeamSize: number
  minTeamSize: number
  powerUps: PowerUpSettings | null
  joinMethod: 'OPEN'
  questionCount: number
}

export interface QuizDetailDto extends QuizSummaryDto {
  rounds: RoundDto[]
}

export interface TeamDto {
  id: string
  name: string
  members: { participationId: string; name: string; avatar: string | null }[]
}

export interface PictureState {
  roundIndex: number
  /** Round index in which it is still answerable; it closes when play moves beyond it. */
  untilRoundIndex: number
  closed: boolean
  revealed: boolean
}

/** A picture round as shown to players: every question at once, answerable until it closes. */
export interface PictureRoundView {
  roundIndex: number
  title: string
  /** 1-based round number after which it closes. */
  closesAfterRound: number
  closed: boolean
  questions: QuestionDto[]
  /** My (or my team's) saved answers per question id. */
  answers: Record<string, string[]>
}

export interface LiveState {
  phase: Phase
  pausedFrom: Phase | null
  roundIndex: number
  questionIndex: number
  questionId: string | null
  openedAt: number | null
  deadline: number | null
  remainingMs: number | null
  closedAt: number | null
  revealScope: 'question' | 'round' | 'picture' | null
  showStandings: boolean
  /** The question closed because its timer ran out (not by the host): Extra Time may still apply. */
  timedOut?: boolean
  /** Picture rounds that have been opened (they stay answerable for a few rounds, spec §6). */
  pictures?: PictureState[]
  /** Round index of the picture round currently being graded/revealed. */
  activePicture?: number | null
  /** Question ids the host skipped: no scoring, hidden from reveal. */
  skipped?: string[]
  version: number
}

/** One open answer a player/team must judge (peer review, spec §7). The author is not shown. */
export interface GradeItem {
  id: string
  question: string
  /** Accepted answers, visible to graders only. */
  reference: string[]
  answer: string
  verdict: boolean | null
}

export interface GradeAdminRow {
  id: string
  question: string
  answer: string
  gradee: string
  grader: string | null
  verdict: boolean | null
  source: string
}

export interface PlayerLiveView {
  quiz: QuizSummaryDto & { hasOpenQuestions: boolean; rounds: { number: number; title: string; category: string | null; questionCount: number; kind: RoundKind; openRounds: number }[] }
  live: LiveState
  serverNow: number
  question: QuestionDto | null
  /** Revealed questions (with correct answers) for the current reveal scope. */
  revealed: RevealedQuestion[]
  myAnswer: string[] | null
  me: { participationId: string; teamId: string | null; emailResults: boolean } | null
  powerUps: PlayerPowerUps | null
  teams: TeamDto[]
  participants: number
  unteamed: number
  /** Open picture rounds this player can fill in right now. */
  pictures: PictureRoundView[]
  /** Answers this player (or their team) has to judge while phase = GRADING. */
  grading: GradeItem[] | null
}

export interface RevealedQuestion {
  question: QuestionDto
  myAnswer: string[] | null
  myCorrect: boolean | null
  teamAnswer: string[] | null
  teamCorrect: boolean | null
  histogram: Record<string, number>
  /** MUSIC: per-part results for me and my team. */
  musicResult?: { mine: MusicResultDto | null; team: MusicResultDto | null; max: number }
  /** Score booster used by me/my team on this question and the points it ended up with. */
  powerUp?: { type: PowerUpType; earned: number }
}

export interface StandingRow {
  id: string
  name: string
  score: number
  rank: number
  isMine: boolean
  tied: boolean
}

export interface StandingsDto {
  mode: QuizMode
  rows: StandingRow[]
  personal: StandingRow[]
  gradedQuestions: number
}

/** Presenter-only overview of the whole quiz, so media and answers can be checked in advance. */
export interface OutlineQuestionDto {
  id: string
  number: number
  text: string
  type: QuestionType
  media: MediaDto[]
  /** The right answer(s) in words. */
  answer: string
}
export interface OutlineRoundDto {
  number: number
  title: string
  kind: RoundKind
  questions: OutlineQuestionDto[]
}

export interface HostLiveView extends PlayerLiveView {
  outline: OutlineRoundDto[]
  answered: number
  online: number
  currentCorrect: string[] | null
  teamsTooSmall: string[]
  /** Progress of picture rounds: answers received per question id. */
  pictureProgress: Record<string, number> | null
  /** Power-ups activated on the current question, per type. */
  powerUpsUsed: Record<string, number> | null
  /** All grades of the current scope (host overview / override). */
  gradingAdmin: GradeAdminRow[] | null
}

export type HostAction =
  | 'start'
  | 'close'
  | 'next'
  | 'reveal'
  | 'close_picture'
  | 'reveal_picture'
  | 'force_reveal'
  | 'reopen'
  | 'skip'
  | 'standings'
  | 'break'
  | 'pause'
  | 'resume'
  | 'end'

export const SOCKET_EVENTS = {
  changed: 'quiz:changed',
  answered: 'quiz:answered',
  join: 'quiz:join',
  answer: 'quiz:answer',
  chat: 'quiz:chat',
} as const

export interface BankUsage {
  /** Distinct started/published quizzes this question has been used in. */
  count: number
  lastUsed: { quizId: string; title: string; date: string } | null
  inDraft: boolean
}

export interface BankQuestionDto {
  id: string
  text: string
  type: QuestionType
  options: OptionDto[]
  correct: string[]
  points: number
  seconds: number
  explanation: string | null
  category: string | null
  difficulty: number | null
  tags: string[]
  source: string | null
  media?: MediaDto[]
  hint?: string | null
  config?: MusicConfigDto | null
  usage: BankUsage
}

export interface ChatMessageDto {
  id: string
  at: string
  fromHost: boolean
  fromId: string
  /** Display name of the author. */
  from: string
  /** Presenter messages: the addressed player's id (null = everyone). */
  toId: string | null
  to: string | null
  text: string
  mine: boolean
}
export const CHAT_MAX_LENGTH = 300
