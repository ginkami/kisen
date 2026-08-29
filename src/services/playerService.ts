import { uuidv7 } from 'uuidv7'
import { playerSchema, type Player } from '../domain/player.ts'
import { supportedLocales } from '../domain/locale.ts'
import type { PlayerRank } from '../domain/playerRating.ts'
import type { PlayerRepository } from './repository.ts'
import { firestorePlayerRepository } from './firestorePlayerRepository.ts'
import { sanitizeDeep } from '../utils/sanitize.ts'

export interface CreatePlayerInput {
  createdBy: string
  locales: Player['locales']
  nationality: string
  residence?: string
  gender?: Player['gender']
  currentRating?: Player['currentRating']
  birthDate?: Player['birthDate']
  primaryAssociation?: string | null
  secondaryAssociations?: string[]
}

export interface UpdatePlayerInput {
  id: string
  locales?: Player['locales']
  nationality?: string
  residence?: string
  gender?: Player['gender']
  currentRating?: Player['currentRating']
  birthDate?: Player['birthDate']
  primaryAssociation?: string | null
  secondaryAssociations?: string[]
  existing?: Player
}

export interface ImportResult {
  added: number
  updated: number
  invalid: number
  errors: { row: number; reason: string }[]
}

interface ParsedCsvRow {
  enFamilyName: string
  enGivenName: string
  ruFamilyName: string
  ruGivenName: string
  rank: string
  rating: string
  nationality: string
  residence: string
  enLocation: string
  ruLocation: string
}

function parseCsv(text: string): { header: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '')
  if (lines.length < 2) return { header: [], rows: [] }
  const header = lines[0].split(';').map((col) => col.trim())
  const rows = lines.slice(1).map((line) => line.split(';').map((col) => col.trim()))
  return { header, rows }
}

function rowToObject(header: string[], values: string[]): Record<string, string> {
  const obj: Record<string, string> = {}
  for (let i = 0; i < header.length; i++) {
    obj[header[i]] = values[i] ?? ''
  }
  return obj
}

function convertRank(csvRank: string): PlayerRank | null {
  if (!csvRank) return null
  const match = csvRank.match(/^(\d+)\s*(Dan|Kyu)$/i)
  if (!match) return null
  const n = parseInt(match[1], 10)
  const type = match[2].toLowerCase()
  if (type === 'dan') {
    if (n < 1 || n > 9) return null
    return `${n}d` as PlayerRank
  }
  if (type === 'kyu') {
    if (n < 1 || n > 20) return null
    return `${n}k` as PlayerRank
  }
  return null
}

function validateRow(row: ParsedCsvRow, rowNum: number): string | null {
  const hasEn = row.enFamilyName !== '' && row.enGivenName !== ''
  const hasRu = row.ruFamilyName !== '' && row.ruGivenName !== ''
  if (!hasEn && !hasRu) return `Строка ${rowNum}: нет ни одной локали с заполненными familyName и givenName`

  if (!row.nationality || row.nationality.length !== 2) {
    return `Строка ${rowNum}: некорректный nationality "${row.nationality}"`
  }

  if (row.rank && !convertRank(row.rank)) {
    return `Строка ${rowNum}: некорректный формат rank "${row.rank}"`
  }

  if (row.rating && isNaN(Number(row.rating))) {
    return `Строка ${rowNum}: некорректный rating "${row.rating}"`
  }

  if (row.residence && row.residence.length !== 2) {
    return `Строка ${rowNum}: некорректный residence "${row.residence}"`
  }

  return null
}

function buildDedupIndex(existingPlayers: Player[]): Map<string, Player> {
  const index = new Map<string, Player>()
  for (const player of existingPlayers) {
    for (const locale of supportedLocales) {
      const loc = player.locales[locale]
      if (loc?.familyName && loc?.givenName) {
        const key = `${locale}:${loc.familyName.toLowerCase()}:${loc.givenName.toLowerCase()}`
        if (!index.has(key)) {
          index.set(key, player)
        }
      }
    }
  }
  return index
}

function findExistingPlayer(
  row: ParsedCsvRow,
  dedupIndex: Map<string, Player>
): Player | null {
  for (const locale of supportedLocales) {
    const familyName = locale === 'en' ? row.enFamilyName : row.ruFamilyName
    const givenName = locale === 'en' ? row.enGivenName : row.ruGivenName
    if (familyName && givenName) {
      const key = `${locale}:${familyName.toLowerCase()}:${givenName.toLowerCase()}`
      const match = dedupIndex.get(key)
      if (match) return match
    }
  }
  return null
}

function buildLocales(row: ParsedCsvRow): Player['locales'] {
  const locales: Record<string, { familyName: string; givenName: string; location?: string }> = {}
  if (row.enFamilyName && row.enGivenName) {
    locales.en = {
      familyName: row.enFamilyName,
      givenName: row.enGivenName,
      ...(row.enLocation ? { location: row.enLocation } : {}),
    }
  }
  if (row.ruFamilyName && row.ruGivenName) {
    locales.ru = {
      familyName: row.ruFamilyName,
      givenName: row.ruGivenName,
      ...(row.ruLocation ? { location: row.ruLocation } : {}),
    }
  }
  return locales as Player['locales']
}

function buildRating(row: ParsedCsvRow): Player['currentRating'] {
  const value = row.rating ? Number(row.rating) : null
  const rank = row.rank ? convertRank(row.rank) : null
  return { value, rank }
}

export class PlayerService {
  private readonly repository: PlayerRepository

  constructor(repository: PlayerRepository) {
    this.repository = repository
  }

  async getById(id: string): Promise<Player | null> {
    return this.repository.getById(id)
  }

  async create(input: CreatePlayerInput): Promise<Player> {
    const player: Player = {
      id: uuidv7(),
      createdBy: input.createdBy,
      locales: input.locales,
      nationality: input.nationality,
      residence: input.residence,
      gender: input.gender ?? null,
      currentRating: input.currentRating ?? { value: null, rank: null },
      birthDate: input.birthDate ?? null,
      primaryAssociation: input.primaryAssociation ?? null,
      secondaryAssociations: input.secondaryAssociations ?? [],
    }

    const sanitized = sanitizeDeep(player)
    playerSchema.parse(sanitized)
    return this.repository.create(sanitized)
  }

  async update(input: UpdatePlayerInput): Promise<Player> {
    const existing = input.existing ?? (await this.repository.getById(input.id))
    if (!existing) {
      throw new Error(`Player with id ${input.id} not found`)
    }

    const updated: Player = {
      ...existing,
      locales: input.locales ?? existing.locales,
      nationality: input.nationality ?? existing.nationality,
      residence: input.residence ?? existing.residence,
      gender: input.gender !== undefined ? input.gender : existing.gender,
      currentRating: input.currentRating ?? existing.currentRating,
      birthDate: input.birthDate !== undefined ? input.birthDate : existing.birthDate,
      primaryAssociation:
        input.primaryAssociation !== undefined
          ? input.primaryAssociation
          : existing.primaryAssociation,
      secondaryAssociations:
        input.secondaryAssociations ?? existing.secondaryAssociations,
    }

    const sanitized = sanitizeDeep(updated)
    playerSchema.parse(sanitized)
    return this.repository.update(sanitized)
  }

  async delete(id: string): Promise<void> {
    return this.repository.delete(id)
  }

  async searchByFamilyName(prefix: string): Promise<Player[]> {
    return this.repository.searchByFamilyName(prefix)
  }

  async importFromCsv(file: File, createdBy: string): Promise<ImportResult> {
    const text = await file.text()
    const { header, rows } = parseCsv(text)

    if (header.length === 0 || rows.length === 0) {
      return { added: 0, updated: 0, invalid: 0, errors: [{ row: 0, reason: 'Пустой или невалидный CSV-файл' }] }
    }

    const existingPlayers = await this.repository.listAll()
    const dedupIndex = buildDedupIndex(existingPlayers)

    const result: ImportResult = { added: 0, updated: 0, invalid: 0, errors: [] }

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2
      const obj = rowToObject(header, rows[i])
      const csvRow: ParsedCsvRow = {
        enFamilyName: obj['en.familyName'] ?? '',
        enGivenName: obj['en.givenName'] ?? '',
        ruFamilyName: obj['ru.familyName'] ?? '',
        ruGivenName: obj['ru.givenName'] ?? '',
        rank: obj['rank'] ?? '',
        rating: obj['rating'] ?? '',
        nationality: obj['nationality'] ?? '',
        residence: obj['residence'] ?? '',
        enLocation: obj['en.location'] ?? '',
        ruLocation: obj['ru.location'] ?? '',
      }

      const validationError = validateRow(csvRow, rowNum)
      if (validationError) {
        result.invalid++
        result.errors.push({ row: rowNum, reason: validationError })
        continue
      }

      try {
        const existing = findExistingPlayer(csvRow, dedupIndex)
        const locales = buildLocales(csvRow)
        const rating = buildRating(csvRow)

        if (existing) {
          const mergedLocales = { ...existing.locales, ...locales }
          await this.repository.update(sanitizeDeep({
            ...existing,
            locales: mergedLocales as Player['locales'],
            nationality: csvRow.nationality,
            residence: csvRow.residence || undefined,
            currentRating: rating,
          }))
          result.updated++
        } else {
          const player: Player = {
            id: uuidv7(),
            createdBy,
            locales,
            nationality: csvRow.nationality,
            residence: csvRow.residence || undefined,
            gender: null,
            currentRating: rating,
            birthDate: null,
            primaryAssociation: null,
            secondaryAssociations: [],
          }
          await this.repository.create(sanitizeDeep(player))
          result.added++
        }
      } catch (err) {
        result.invalid++
        const reason = err instanceof Error ? err.message : String(err)
        result.errors.push({ row: rowNum, reason: `Ошибка записи: ${reason}` })
      }
    }

    return result
  }
}

export const playerService = new PlayerService(firestorePlayerRepository)