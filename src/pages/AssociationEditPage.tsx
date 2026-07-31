import { useTranslation } from 'react-i18next'

export function AssociationEditPage() {
  const { t } = useTranslation()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-xs uppercase tracking-wider opacity-70">
        {t('admin.associations')}
      </div>
      <h1 className="text-2xl font-bold">
        {t('admin.newAssociation')}
      </h1>
      <div className="card bg-base-200 shadow-sm">
        <div className="card-body opacity-70">
          {t('tournament.tabs.placeholder')}
        </div>
      </div>
    </div>
  )
}