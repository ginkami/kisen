import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BsPlus } from 'react-icons/bs'
import { ConfirmModal } from '../ConfirmModal.tsx'
import { promotionStatus, type Promotion } from '../../domain/promotion.ts'
import {
  createPromotion,
  deletePromotion,
  listPromotionsByTournament,
  updatePromotion,
} from '../../services/promotionService.ts'

interface PromotionSectionProps {
  tournamentId: string
}

function datetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function PromotionSection({ tournamentId }: PromotionSectionProps) {
  const { t } = useTranslation()
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  // Local editable state per promotion id (dates as datetime-local strings).
  const [drafts, setDrafts] = useState<
    Record<string, { showOnHome: boolean; startedAt: string; endedAt: string }>
  >({})
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let cancelled = false
    listPromotionsByTournament(tournamentId)
      .then((list) => {
        if (cancelled) return
        setPromotions(list)
        setIsLoading(false)
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [tournamentId])

  // Refresh the status badges once a minute.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])

  const handleAdd = async () => {
    if (isCreating) return
    setIsCreating(true)
    try {
      const created = await createPromotion(tournamentId)
      setPromotions((prev) => [...prev, created])
      setDrafts((prev) => ({
        ...prev,
        [created.id]: {
          showOnHome: created.showOnHome,
          startedAt: datetimeLocalValue(created.startedAt),
          endedAt: datetimeLocalValue(created.endedAt),
        },
      }))
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    await deletePromotion(id)
    setPromotions((prev) => prev.filter((p) => p.id !== id))
    setDrafts((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setPendingRemoveId(null)
  }

  const cards = useMemo(
    () =>
      promotions.map((promotion) => {
        const draft =
          drafts[promotion.id] ??
          {
            showOnHome: promotion.showOnHome,
            startedAt: datetimeLocalValue(promotion.startedAt),
            endedAt: datetimeLocalValue(promotion.endedAt),
          }
        const startedAt = draft.startedAt ? new Date(draft.startedAt) : null
        const endedAt = draft.endedAt ? new Date(draft.endedAt) : null
        const invalid =
          startedAt == null ||
          endedAt == null ||
          Number.isNaN(startedAt.getTime()) ||
          Number.isNaN(endedAt.getTime()) ||
          startedAt.getTime() >= endedAt.getTime()
        const dirty =
          draft.showOnHome !== promotion.showOnHome ||
          draft.startedAt !== datetimeLocalValue(promotion.startedAt) ||
          draft.endedAt !== datetimeLocalValue(promotion.endedAt)
        const status = promotionStatus(promotion.startedAt, promotion.endedAt, now)
        return { promotion, draft, startedAt, endedAt, invalid, dirty, status }
      }),
    [promotions, drafts, now],
  )

  const handleSave = async (promotion: Promotion) => {
    const card = cards.find((c) => c.promotion.id === promotion.id)
    if (!card || card.invalid || !card.dirty) return
    const startedAt = card.startedAt as Date
    const endedAt = card.endedAt as Date
    await updatePromotion(promotion.id, {
      showOnHome: card.draft.showOnHome,
      startedAt,
      endedAt,
    })
    setPromotions((prev) =>
      prev.map((p) =>
        p.id === promotion.id
          ? { ...p, showOnHome: card.draft.showOnHome, startedAt, endedAt }
          : p,
      ),
    )
    setDrafts((prev) => {
      const next = { ...prev }
      delete next[promotion.id]
      return next
    })
  }


  const statusLabel = (status: 'notStarted' | 'active' | 'finished') =>
    t(
      status === 'notStarted'
        ? 'tournament.edit.promotion.status.notStarted'
        : status === 'active'
          ? 'tournament.edit.promotion.status.active'
          : 'tournament.edit.promotion.status.finished',
    )
  const statusClass = (status: 'notStarted' | 'active' | 'finished') =>
    status === 'active'
      ? 'badge badge-sm badge-success'
      : status === 'notStarted'
        ? 'badge badge-sm badge-warning'
        : 'badge badge-sm badge-ghost'

  return (
    <div className="card bg-base-200 shadow-sm">
      <div className="card-body gap-4">
        <h2 className="card-title">{t('tournament.edit.promotion.title')}</h2>

        <button
          type="button"
          onClick={() => void handleAdd()}
          disabled={isCreating}
          className="btn btn-ghost justify-start px-2 text-primary flex items-center gap-0"
        >
          <BsPlus className="h-5 w-5" />
          {t('tournament.edit.promotion.add')}
        </button>

        {isLoading && (
          <p className="text-sm opacity-70">{t('tournament.edit.promotion.loading')}</p>
        )}

        {!isLoading && cards.length === 0 && (
          <p className="text-sm opacity-70">{t('tournament.edit.promotion.empty')}</p>
        )}

        <div className="space-y-3">
          {cards.map(({ promotion, draft, invalid, dirty, status }) => (
            <div
              key={promotion.id}
              className="rounded-lg border border-base-300 bg-base-100 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className={statusClass(status)}>{statusLabel(status)}</span>
                <button
                  type="button"
                  onClick={() => setPendingRemoveId(promotion.id)}
                  className="btn btn-xs btn-circle btn-accent tooltip"
                  data-tip={t('tournament.edit.promotion.delete')}
                  aria-label={t('tournament.edit.promotion.delete')}
                >
                  ×
                </button>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    checked={draft.showOnHome}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [promotion.id]: { ...draft, showOnHome: e.target.checked },
                      }))
                    }
                    className="toggle toggle-primary"
                  />
                  <span className="label-text">
                    {t('tournament.edit.promotion.showOnHome')}
                  </span>
                </label>
              </div>

              <div>
                <div className="text-xs opacity-70 mb-1">
                  {t('tournament.edit.promotion.activeLabel')}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="form-control">
                    <label className="label" htmlFor={`promotion-start-${promotion.id}`}>
                      <span className="label-text text-xs">
                        {t('tournament.edit.promotion.startsAt')}
                      </span>
                    </label>
                    <input
                      id={`promotion-start-${promotion.id}`}
                      type="datetime-local"
                      value={draft.startedAt}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [promotion.id]: { ...draft, startedAt: e.target.value },
                        }))
                      }
                      className="input input-bordered input-sm w-full"
                    />
                  </div>
                  <div className="form-control">
                    <label className="label" htmlFor={`promotion-end-${promotion.id}`}>
                      <span className="label-text text-xs">
                        {t('tournament.edit.promotion.endsAt')}
                      </span>
                    </label>
                    <input
                      id={`promotion-end-${promotion.id}`}
                      type="datetime-local"
                      value={draft.endedAt}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [promotion.id]: { ...draft, endedAt: e.target.value },
                        }))
                      }
                      className={`input input-bordered input-sm w-full ${invalid ? 'input-error' : ''}`}
                    />
                  </div>
                </div>
                {invalid && (
                  <p className="text-error text-xs mt-1">
                    {t('tournament.edit.promotion.startBeforeEnd')}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => void handleSave(promotion)}
                disabled={invalid || !dirty}
                className="btn btn-primary btn-sm"
              >
                {t('tournament.edit.promotion.save')}
              </button>
            </div>
          ))}
        </div>
      </div>

      <ConfirmModal
        isOpen={pendingRemoveId !== null}
        title={t('tournament.edit.promotion.deleteConfirmTitle')}
        message={t('tournament.edit.promotion.deleteConfirm')}
        confirmText={t('common.confirm')}
        cancelText={t('common.cancel')}
        variant="error"
        onConfirm={() => {
          if (pendingRemoveId) void handleDelete(pendingRemoveId)
        }}
        onCancel={() => setPendingRemoveId(null)}
      />
    </div>
  )
}


