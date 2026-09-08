import { describe, expect, it } from 'vitest'
import { canEditPlayer, type Player } from '../domain/player.ts'

type EditableFields = Pick<
  Player,
  'createdBy' | 'primaryAssociation' | 'secondaryAssociations'
>

const UID = 'user-1'
const ASSN_A = '00000000-0000-7000-8000-00000000000a'
const ASSN_B = '00000000-0000-7000-8000-00000000000b'

function makePlayer(part: Partial<EditableFields> = {}): EditableFields {
  return {
    createdBy: 'creator-1',
    primaryAssociation: null,
    secondaryAssociations: [],
    ...part,
  }
}

describe('canEditPlayer', () => {
  it('allows admins to edit any player', () => {
    expect(canEditPlayer(makePlayer(), 'someone-else', true, [])).toBe(true)
  })

  it('allows the creator regardless of role', () => {
    expect(canEditPlayer(makePlayer({ createdBy: UID }), UID, false, [])).toBe(true)
  })

  it('allows a manager of the primary association', () => {
    const player = makePlayer({ primaryAssociation: ASSN_A })
    expect(canEditPlayer(player, UID, false, [ASSN_A])).toBe(true)
  })

  it('allows a manager of a secondary association', () => {
    const player = makePlayer({ secondaryAssociations: [ASSN_B] })
    expect(canEditPlayer(player, UID, false, [ASSN_A, ASSN_B])).toBe(true)
  })

  it('rejects users not affiliated with any of the player associations', () => {
    const player = makePlayer({
      primaryAssociation: ASSN_A,
      secondaryAssociations: [ASSN_B],
    })
    expect(canEditPlayer(player, UID, false, ['other-assn'])).toBe(false)
  })

  it('rejects when primaryAssociation is null and secondary associations do not match', () => {
    const player = makePlayer({ createdBy: 'someone-else' })
    expect(canEditPlayer(player, UID, false, [ASSN_A])).toBe(false)
  })
})